Profytly Listing Evidence + Stability Upgrade

Changed files:
- lib/auction-analyzer.ts
- app/api/market-analysis/route.ts

What this upgrade does:
1. Expands server-side auction HTML extraction for embedded JSON/script data, odometer text, and likely vehicle-image URLs.
2. During Full AI Analysis, explicitly opens the exact Copart/IAAI lot URL first and may capture listing mileage only when:
   - the source URL is from the expected auction domain,
   - the source URL contains the same lot number,
   - the URL appears in OpenAI web-search sources,
   - confidence is at least 80.
3. Saves verified listing mileage to vehicles.listing_mileage and also uses it as working mileage only when working mileage is empty.
4. Stabilizes repeated AI values against the previous analysis only when vehicle evidence, images, and financial assumptions have not changed.
5. Does not overwrite an already saved listing mileage.

No SQL migration is required.

After extraction:
  npx tsc --noEmit
  npm run build
  npm run dev

Test with a new or existing vehicle, then run Full AI Analysis.
