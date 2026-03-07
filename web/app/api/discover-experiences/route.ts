import { NextRequest, NextResponse } from 'next/server';
import { discoveryRequestSchema, discoveryBoundsRequestSchema } from '@/lib/schemas/discovery';
import { getSetting, SETTING_KEYS } from '@/lib/settings';
import { discoverExperiences, discoverExperiencesByBounds } from '@/lib/discovery';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Try bounds-based request first, then trip-based
  const boundsResult = discoveryBoundsRequestSchema.safeParse(body);
  const tripResult = discoveryRequestSchema.safeParse(body);

  if (!boundsResult.success && !tripResult.success) {
    return NextResponse.json(
      { error: 'Invalid request: provide either { tripId } or { bounds }' },
      { status: 400 },
    );
  }

  const apiKey =
    process.env.OPENAI_API_KEY ?? (await getSetting(SETTING_KEYS.OPENAI_API_KEY));
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured. Set OPENAI_API_KEY env var or add it in Settings.' },
      { status: 400 },
    );
  }

  try {
    const result = boundsResult.success
      ? await discoverExperiencesByBounds(boundsResult.data.bounds, apiKey)
      : await discoverExperiences(tripResult.data!.tripId, apiKey); // eslint-disable-line @typescript-eslint/no-non-null-assertion -- one of the two must succeed
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (message.includes('at least 2 destinations')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (message.includes('insufficient_quota')) {
      return NextResponse.json(
        {
          error: 'OpenAI quota exceeded or billing issue. For sk-proj- keys, check the project spending limit at platform.openai.com > Settings > Projects.',
          detail: message,
        },
        { status: 402 },
      );
    }

    if (message.includes('invalid_api_key') || message.includes('401')) {
      return NextResponse.json(
        { error: 'OpenAI API key is invalid or revoked. Update it in Settings.' },
        { status: 401 },
      );
    }

    if (message.includes('429')) {
      return NextResponse.json(
        { error: 'OpenAI rate limit exceeded. Try again in a moment.' },
        { status: 429 },
      );
    }

    console.error('[api/discover-experiences] Error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
