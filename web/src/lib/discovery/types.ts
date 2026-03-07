export type MichelinRating = 1 | 2 | 3;

export type ExperienceCategory =
  | 'natural_wonder'
  | 'historical'
  | 'culinary'
  | 'cultural'
  | 'architectural'
  | 'scenic'
  | 'experience';

export interface DiscoveredExperience {
  name: string;
  michelinStars: MichelinRating;
  category: ExperienceCategory;
  /** Why this place is exceptional (1-2 sentences) */
  description: string;
  /** Why this specific star rating was assigned */
  reasoning: string;
  approximateLat: number;
  approximateLng: number;
  nearestCity: string;
  country: string;
  /** Approximate detour distance from the route in km */
  estimatedDetourKm: number;
  seasonalNotes?: string;
  /** References that led to the classification */
  sources?: string[];
}

export interface DiscoveryResult {
  experiences: DiscoveredExperience[];
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cached: boolean;
}

export interface RouteSegmentDescription {
  /** e.g. "Oslo, Norway" */
  from: string;
  fromLat: number;
  fromLng: number;
  /** e.g. "Gothenburg, Sweden" */
  to: string;
  toLat: number;
  toLng: number;
  distanceKm: number;
}

export interface RouteChunk {
  destinations: Array<{
    name: string;
    lat: number;
    lng: number;
    dayDate: string;
  }>;
  segments: RouteSegmentDescription[];
  totalDistanceKm: number;
}
