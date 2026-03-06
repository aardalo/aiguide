export interface NearbyPlace {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  /** Optional enriched properties saved from OSM tags or Google Places API */
  website?: string;
  phone?: string;
  openingHours?: string;
  address?: string;
  rating?: number;
  ratingCount?: number;
  /** Source provider for UI badge and "Open in…" link */
  provider?: string;
  /** Short description (e.g. from Park4Night) */
  description?: string;
  /** Amenity/feature tags (e.g. ['Water', 'Electricity', 'WiFi']) */
  amenities?: string[];
  /** URL to a provider-specific marker icon image */
  iconUrl?: string;
  /** Direct URL to the provider's listing page (e.g. Tripadvisor web_url) */
  webUrl?: string;
}
