# Architecture Note: ARCH-003 Vehicle profile model and trip assignment

## Context
EPIC-003 requires global vehicle management and assignment of one vehicle to a PLAN mode trip.
Vehicle management is owned by SETUP mode, while trip assignment is performed in PLAN mode.

## Decision
Introduce a dedicated `vehicle` domain model and a trip-level `selected_vehicle_id` reference:
- Vehicles are globally scoped entities
- Trip PLAN mode may reference one selected vehicle
- Vehicle attributes include dimensions and speed characteristics

Validation rules:
- All dimensions must be positive
- `maximum_speed >= average_speed`

Delete safety:
- Disallow deleting vehicles referenced by active trips unless reassigned

## Alternatives considered
- Embedding vehicle fields directly into each trip: duplicates data and weakens reuse
- Allowing multiple active vehicles per trip: out of current scope and increases UX complexity

## Consequences
- Reusable standardized vehicle profiles
- Clear trip-to-vehicle linkage with manageable constraints

## Follow-ups
- Confirm canonical unit system (e.g., metric vs imperial)
- Define migration behavior for legacy trips without selected vehicles
- Define SETUP mode UX for provider credentials and global defaults that influence vehicle-aware planning.

## Related architecture notes
- [ARCH-007: UI mode architecture (PLAN, RUN, SETUP)](ARCH-007-ui-modes-plan-run-setup.md)
