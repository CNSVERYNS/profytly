PROFYTLY VISION CALIBRATION UPGRADE

This upgrade:
- removes the duplicate Vision/Full Analysis buttons
- keeps one Run Full AI Analysis button
- separates visible repair cost from hidden-damage contingency
- calculates a combined recommended repair budget
- calibrates repair pricing for independent-shop / flipper economics
- stores mileage detected from auction photos
- shows mileage mismatch and lets the user accept detected mileage

1) Run the SQL in supabase-vision-calibration.sql.
2) Extract this archive in the Profytly project root.
3) Run:
   npx tsc --noEmit
   npm run build
   npm run dev
4) Upload photos and click Run Full AI Analysis.
