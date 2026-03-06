# Research Note: RES-002 Routing provider and waypoint capability fit

## Question
Which routing provider best supports intersection-aware waypoint generation and route recomputation after waypoint edits?

## Method
- Evaluate provider APIs for:
  - route geometry and leg timing
  - intersection metadata availability
  - waypoint snapping and reorder behavior
  - rate limits and latency

## Findings
- Decision pending concrete provider benchmarking in target deployment environment.

## Recommendation
Select provider that can return stable segment timing data and supports efficient recompute with explicit waypoint arrays. Prefer solutions with transparent usage limits and clear SLA characteristics.

## References
- Epic: [EPIC-002](../epics/EPIC-002-plan-mode-daily-routing.md)
