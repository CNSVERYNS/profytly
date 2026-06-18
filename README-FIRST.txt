Profytly Analysis Quality Fix

Updated files:
- app/api/market-analysis/route.ts
- app/dashboard/vehicle/[id]/page.tsx

Changes:
1. AI may no longer claim Copart/listing facts were verified unless they were explicitly supplied or clearly visible in uploaded photos.
2. Summary, warnings and factor text are cleaned of Markdown links and raw URLs.
3. Comparable vehicles must be unique individual vehicle-detail pages with both price and mileage.
4. Generic model pages, search-result pages, duplicate URLs and weak comparable pages are filtered out.
5. AI status labels now distinguish Vision Verified from Market Data Limited.
6. "Insufficient Data" is shown as "Decision Pending" in the user interface.
7. Duplicate Research Sources cards were removed because Open Listing links already show the evidence.
8. Damage cards fall back to AI vision findings when auction damage fields are unavailable.

No SQL migration is required.

After extracting, run:
  npx tsc --noEmit
  npm run build
  npm run dev
