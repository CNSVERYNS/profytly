Profytly Listing Mileage Upgrade

1. Run supabase-listing-mileage.sql in Supabase SQL Editor.
2. Extract this archive into the Profytly project root.
3. Run:
   npx tsc --noEmit
   npm run build
   npm run dev

Changes:
- Separates auction-listing mileage from working mileage.
- Compares Vision mileage only with listing mileage.
- Shows an honest message when listing mileage was not captured.
- Allows Vision mileage to be accepted as working mileage when needed.
- Saves analyzer mileage into both listing and working mileage for newly added vehicles.
- Preserves manually accepted working mileage during auction re-analysis.
