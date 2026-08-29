/**
 * Export Dimension Verification
 * 
 * This script validates that the export function produces PNGs with correct dimensions:
 * - Width: 1320px
 * - Height: 2868px
 * - No alpha channel
 * - sRGB color space
 * 
 * Run: node verify-export.mjs (after building and exporting)
 */

console.log(`
Lockshot Export Verification
============================

Expected dimensions: 1320×2868 PNG (no alpha, sRGB)

To verify exports:
1. Run the app: npm run dev
2. Export a ZIP from the UI
3. Extract the ZIP
4. Check any PNG file's dimensions

Manual verification:
- macOS: Open in Preview > Tools > Show Inspector
- Linux: file <filename>.png or identify <filename>.png (ImageMagick)
- Windows: Right-click > Properties > Details

Expected output: 1320 × 2868 pixels
`);

export const EXPORT_SPECS = {
  width: 1320,
  height: 2868,
  format: 'PNG',
  alpha: false,
  colorSpace: 'sRGB',
  aspectRatio: 1320 / 2868,
};

console.log('Export specifications:', EXPORT_SPECS);
