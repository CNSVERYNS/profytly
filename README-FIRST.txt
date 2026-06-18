PROFYTLY — PRIVATE AUCTION PHOTO UPLOAD + AI VISION

This package updates:
- components/VehicleAnalysisImageUploader.tsx (new)
- app/dashboard/vehicle/[id]/page.tsx
- app/api/market-analysis/route.ts

What it adds:
- Upload up to 6 private JPG/PNG/WEBP auction photos per vehicle.
- Preview and delete uploaded photos.
- Run AI Vision directly after upload.
- Market-analysis API reads the private image records, creates short-lived signed URLs, and sends the photos to OpenAI Vision.
- Existing public auction image URLs remain supported and are used first.

Before extracting this package, the following Supabase items must already exist:
- private bucket: vehicle-analysis-images
- table: vehicle_analysis_images
- RLS policies for the table and storage.objects

After extracting:
1. npx tsc --noEmit
2. npm run build
3. npm run dev

Test:
- Open an existing vehicle.
- Upload 4–6 Copart photos.
- Click Run Vision Analysis.
- Confirm Vision Evidence shows the number of images analyzed and repair estimate changes.
