PROFYTLY DECISION + VALUATION STABILITY UPGRADE

Updated files:
- app/api/market-analysis/route.ts
- app/dashboard/vehicle/[id]/page.tsx

What changed:
1. Same vehicle evidence now uses a stable photo fingerprint, not only image count.
2. Prior verified comparable listings are reused for 24 hours when evidence is unchanged.
3. Repaired resale value is anchored to a weighted comparable median.
4. Repeated valuation changes are capped to roughly $400 or 5% when evidence is unchanged.
5. Repair estimates, as-is value, max bid and Profyt Score are stabilized.
6. Large value changes require changed evidence and produce an explanation warning.
7. Avoid / $0 max-bid vehicles receive a low Profyt Score.
8. A $0 max bid returns Avoid even when market data is limited.
9. Manual maximum-bid calculation never displays a negative number.
10. The page explains when current assumptions produce no economically viable bid.

No database migration is required.

After extracting, run:
  npx tsc --noEmit
  npm run build
  npm run dev
