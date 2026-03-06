/**
 * Google-encoded polyline decoder (precision 5).
 * Location: src/lib/polyline.ts
 *
 * Reference: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */

/** Decode a Google-encoded polyline string into [latitude, longitude] pairs. */
export function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 32);
    lat += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 32);
    lng += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    coords.push([lat / 1e5, lng / 1e5]);
  }

  return coords;
}
