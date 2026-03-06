# Task: TASK-050 Make nearby search radius cap configurable

## Metadata
- **Priority**: P3
- **Status**: planned

## Goal
Allow the user to configure the maximum radius used by the "Search Nearby" feature (currently hardcoded at 25 km). The search radius is derived from the visible map area but capped at this value.

## Implementation notes
- Add setting key `nearby.maxRadiusKm` (integer, default 25) to `src/lib/settings.ts`.
- Read it in `app/api/nearby-search/route.ts`: replace the hardcoded `max(25_000)` Zod constraint with the setting value, and enforce it server-side.
- Read it in `src/app/map/page.tsx` `handleNearbySearch`: replace `25_000` with the configured value fetched from `/api/settings` at startup (store in a ref alongside `homeCoordsRef`).
- Expose in Settings UI alongside other routing/map options.
- Reasonable range: 5–100 km.

## Definition of done
- [ ] Setting stored and validated
- [ ] Server-side radius cap reads from setting
- [ ] Client-side radius cap reads from setting
- [ ] Settings UI shows the field
- [ ] Tests updated if applicable

## Links
- Feature: Search Nearby (implemented without EPIC assignment, see `app/api/nearby-search/route.ts`)
