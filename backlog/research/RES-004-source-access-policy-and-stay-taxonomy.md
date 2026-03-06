# Research Note: RES-004 Source access policy and stay taxonomy strategy

## Question
How should source integration and stay-type taxonomy be designed to support compliant data ingestion and consistent vehicle-aware ranking?

## Method
- Review connector requirements for map/search/accommodation sources.
- Define canonical stay taxonomy and category mapping rules.
- Evaluate policy constraints and attribution obligations.

## Findings
- Provider-specific access and attribution constraints vary and must be handled per connector.
- Category harmonization is required to support stable ranking logic.

## Recommendation
Maintain explicit connector compliance checklists and a versioned taxonomy mapping table. Validate mapping quality with fixture-based tests before enabling new sources.

## References
- Epic: [EPIC-004](../epics/EPIC-004-vehicle-aware-stay-discovery-and-day-assignment.md)
