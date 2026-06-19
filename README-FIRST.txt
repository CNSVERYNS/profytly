PROFYTLY DECISION LABEL UPGRADE

Updated files:
- app/api/market-analysis/route.ts
- app/dashboard/vehicle/[id]/page.tsx

Changes:
- Limited but usable analyses now return Buy With Caution instead of Decision Pending.
- Positive completed analyses return Buy Below $X or Strong Buy — Max $X.
- Zero/negative bid remains Avoid.
- Missing analysis data displays More Data Needed.
- Recommendation logic now considers confidence and repair risk.

No SQL migration is required.
