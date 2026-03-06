/**
 * Routing Provider Abstraction
 * Location: src/lib/routing/types.ts
 *
 * All routing providers implement the RoutingProvider interface.
 * The factory in src/lib/routing/index.ts returns a provider
 * initialised with its API key, so callers just call getRoute().
 */

export interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * A turn-point step from a routing provider, used to place interval waypoints.
 * Each step represents an intersection where the route changes direction.
 */
export interface RouteStep {
  /** [latitude, longitude] of the maneuver/turn-point */
  coordinate: [number, number];
  /** Cumulative travel time in seconds from route start to this step */
  cumulativeDurationSeconds: number;
}

/**
 * A single leg of a route (one consecutive pair of waypoints).
 */
export interface RouteLeg {
  /** Distance in metres */
  distanceMeters: number;
  /** Duration in seconds */
  durationSeconds: number;
  /**
   * Google-encoded polyline (precision 5) for this leg's geometry.
   * Omitted when the provider does not return geometry or when the
   * full-route geometry cannot be split per-leg.
   */
  encodedPolyline?: string;
  /**
   * Turn-point steps from the routing provider, ordered by cumulative time.
   * Used by the waypoint generation algorithm (STORY-006).
   * Omitted when the provider does not return step data.
   */
  routeSteps?: RouteStep[];
}

export interface RoutingPreferences {
  avoid?: Array<'ferries' | 'motorways' | 'tolls' | 'unpavedRoads'>;
}

export interface RouteRequest {
  /** At least two waypoints are required. */
  waypoints: Coordinate[];
  /**
   * Routing profile. Defaults to 'driving-car'.
   * Providers that do not support a given profile should throw.
   */
  profile?: 'driving-car' | 'driving-hgv' | 'cycling-regular' | 'foot-walking';
  /** Optional trip-level routing preferences (avoid features etc.). */
  preferences?: RoutingPreferences;
}

export interface RouteResult {
  /** One leg per consecutive waypoint pair. */
  legs: RouteLeg[];
  /** Sum of all leg distances (metres). */
  totalDistanceMeters: number;
  /** Sum of all leg durations (seconds). */
  totalDurationSeconds: number;
}

/**
 * Contract every routing provider must satisfy.
 * Providers are constructed with their API key so callers
 * never need to pass it separately.
 */
export interface RoutingProvider {
  /** Short identifier used in database records, e.g. "ors", "mapbox". */
  readonly id: string;
  /** Human-readable name shown in the settings UI. */
  readonly displayName: string;

  /** Compute a route for the given request. Throws on API or network error. */
  getRoute(request: RouteRequest): Promise<RouteResult>;

  /**
   * Validate the structural plausibility of an API key (no network call).
   * Returns an error message string if the key looks invalid, or null if OK.
   */
  validateApiKey(apiKey: string): string | null;
}
