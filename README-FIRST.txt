Profytly PDF full-photo layout fix

Updated file:
- lib/vehicle-ai-report.ts

What changed:
- Replaced CSS Grid photo layout with a print-safe HTML table.
- Displays up to six auction photos in a true 2 x 3 layout.
- Uses fixed table cells and proportional max dimensions.
- Removes overflow clipping and photo captions to maximize image area.
- Forces width/height auto and object-fit contain with !important.
- Keeps the complete image frame visible in browser print/PDF output.

No SQL or npm package changes are required.
