import type { DiscoveredExperience } from './types';
import type { ProgressCallback } from './index';

interface TextSearchResponse {
  places?: Array<{
    location?: {
      latitude: number;
      longitude: number;
    };
    displayName?: {
      text: string;
    };
  }>;
}

/**
 * Use Google Places Text Search to refine the approximate coordinates
 * returned by the AI. For each experience, searches for the place name
 * near the AI's approximate location and updates lat/lng if found.
 *
 * Processes in batches of 5 to avoid rate-limiting.
 * Silently keeps original coordinates if a lookup fails.
 */
export async function refineCoordinatesViaGoogle(
  experiences: DiscoveredExperience[],
  googleApiKey: string,
  onProgress?: ProgressCallback,
): Promise<{ refined: DiscoveredExperience[]; refinedCount: number }> {
  if (experiences.length === 0) return { refined: experiences, refinedCount: 0 };

  const progress = onProgress ?? (() => {});
  progress(`Refining ${experiences.length} locations via Google Places...`);

  const BATCH_SIZE = 5;
  const refined = [...experiences];
  let refinedCount = 0;

  for (let i = 0; i < refined.length; i += BATCH_SIZE) {
    const batch = refined.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((exp) => lookupPlace(exp, googleApiKey)),
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result) {
        refined[i + j] = {
          ...refined[i + j],
          approximateLat: result.lat,
          approximateLng: result.lng,
        };
        refinedCount++;
      }
    }

    if (i + BATCH_SIZE < refined.length) {
      progress(`Refining locations via Google Places (${Math.min(i + BATCH_SIZE, refined.length)}/${refined.length})...`);
    }
  }

  progress(`Google Places: refined ${refinedCount}/${experiences.length} locations`);
  return { refined, refinedCount };
}

/**
 * Look up a single experience via Google Places Text Search API (new).
 * Returns refined coordinates or null if not found / error.
 */
async function lookupPlace(
  exp: DiscoveredExperience,
  apiKey: string,
): Promise<{ lat: number; lng: number } | null> {
  const textQuery = `${exp.name}, ${exp.nearestCity}, ${exp.country}`;

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.location',
      },
      body: JSON.stringify({
        textQuery,
        locationBias: {
          circle: {
            center: {
              latitude: exp.approximateLat,
              longitude: exp.approximateLng,
            },
            radius: 50000,
          },
        },
        maxResultCount: 1,
      }),
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) {
      console.warn(`[geocode-refine] Google Places API ${res.status} for "${exp.name}"`);
      return null;
    }

    const data: TextSearchResponse = await res.json();
    const place = data.places?.[0];
    if (!place?.location) return null;

    return {
      lat: place.location.latitude,
      lng: place.location.longitude,
    };
  } catch (err) {
    console.warn(`[geocode-refine] Failed for "${exp.name}":`, err instanceof Error ? err.message : err);
    return null;
  }
}
