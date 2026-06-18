PROFYTLY AUTOMATIC AI + VISION UPGRADE

Changed files:
- app/api/market-analysis/route.ts
- app/dashboard/page.tsx
- app/dashboard/vehicle/[id]/page.tsx
- lib/market-analysis-client.ts
- supabase/ai-vision-analysis-upgrade.sql

What changes:
1. Analyze Vehicle now saves the vehicle and automatically runs AI analysis.
2. Repaired resale value and repair cost are separated, preventing damage double-counting.
3. Up to 6 available auction images are sent to OpenAI Vision.
4. As-is value, visible damage and hidden-damage risks are stored.
5. Only comparable listing URLs actually present in web-search sources are displayed.
6. Dashboard prefers stored AI market value and recommended max bid.

Important:
- Vision only runs when image_url or auction_images contains accessible HTTPS images.
- This package does not add Copart scraping or anti-bot bypassing.
- Run the SQL file before replacing the TypeScript files.

Verification:
  npx tsc --noEmit
  npm run build
  npm run dev
