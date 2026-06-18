Profytly Vision-First Mileage Upgrade

What changed
- Removes Listing Mileage, Working Mileage and mileage-mismatch UI.
- Shows one final Mileage value.
- A clearly readable odometer photo becomes the primary mileage source.
- Reliable Vision mileage is saved automatically to vehicles.mileage.
- Manual Mileage and Mileage Unit remain available only as fallback/correction fields.
- Market research uses the Vision mileage when it can be read.
- Auction-listing mileage no longer blocks or downgrades the recommendation.
- No Supabase SQL migration is required.

Install
1. Commit or back up the current working version.
2. Extract this archive in the Profytly project root.
3. Run:
   npx tsc --noEmit
   npm run build
   npm run dev
4. Upload an odometer photo and run Full AI Analysis.
5. Confirm the single Mileage field is filled automatically.
