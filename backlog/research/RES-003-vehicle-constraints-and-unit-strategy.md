# Research Note: RES-003 Vehicle constraints and unit strategy

## Question
What unit strategy and validation boundaries should be used for vehicle dimensions and speed fields?

## Method
- Review likely user expectations and domain conventions.
- Define unit consistency requirements across API and UI.
- Identify edge-case limits to prevent unrealistic values.

## Findings
- Final unit policy pending product confirmation.
- Validation boundary ranges should be documented and shared between client/server.

## Recommendation
Adopt one canonical unit system for storage and API (e.g., metric), with optional UI conversion later. Keep validation thresholds centralized to avoid drift.

## References
- Epic: [EPIC-003](../epics/EPIC-003-global-vehicle-setup-and-plan-mode-selection.md)
