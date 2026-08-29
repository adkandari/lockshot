# Lockshot 3D Bookshelf Hero

## Overview

The bookshelf hero is a Three.js 3D scene that showcases Lockshot's four screenshot templates as phone-shaped volumes standing on a dark walnut bookshelf. Inspired by ThreeUI's Complete Shelf (Working Volumes), this implementation transforms the book metaphor into a template showcase.

## Design Philosophy

### Visual Inspiration: Working Volumes
- **Shelf structure**: Dark walnut wood (`#3a2118`)
- **Background**: Paper dark (`#171a24`)
- **Accent lighting**: Copper/walnut tone (`#c87046`)
- **Typography**: Warm library aesthetic

### Lockshot Adaptation
Instead of books about creative tools, the shelf displays phone-shaped volumes representing App Store screenshot templates:
1. **Full Bleed** - Blue-gray volume
2. **Caption Top** - Indigo volume  
3. **Framed** - Purple volume
4. **Gradient** - Pink volume

Each volume is a 3D phone bezel (1.2 × 2.4 units) with an emissive screen showing the template's characteristic color.

## Scene Structure

### Bookshelf Components
```
Back Panel: 12 × 6 × 0.3 units (walnut)
├── Shelf 1 (top): 12 × 0.3 × 2.5 units
├── Shelf 2 (middle): 12 × 0.3 × 2.5 units ← template volumes here
├── Shelf 3 (bottom): 12 × 0.3 × 2.5 units
├── Left Support: 0.4 × 6 × 2.5 units
└── Right Support: 0.4 × 6 × 2.5 units
```

### Phone Volumes
Each volume consists of:
- **Bezel**: Dark metal frame (`#1a1a1a`, metalness 0.7)
- **Screen**: Emissive colored surface (template-specific color)
- **Glow**: Subtle halo effect (10% opacity)

Volumes are positioned on the middle shelf with slight random rotations for visual interest.

## Lighting Setup

Three-point lighting for warm library ambience:
1. **Ambient Light**: Warm white (`#f4eee6`, intensity 0.4)
2. **Spot Light**: Key light from above (FOV π/4, soft shadows)
3. **Rim Light**: Copper accent from back-left (`#c87046`, intensity 0.6)

Shadows use PCFSoftShadowMap at 1024×1024 resolution.

## Interaction

### Mouse Parallax
Camera position smoothly follows cursor:
- Horizontal: ±2 units based on X position
- Vertical: ±1 unit based on Y position
- Smooth lerp (2% per frame)

### Idle Animation
Volumes gently bob and rotate:
- Vertical sine wave (amplitude 0.0003 units/frame)
- Y-axis rotation (amplitude 0.0001 rad/frame)
- Phase offset per volume prevents synchronization

## Performance Features

### Optimization
- **Intersection Observer**: Pauses rendering when hero scrolled offscreen
- **Pixel Ratio**: Capped at `Math.min(devicePixelRatio, 2)`
- **Shadow Quality**: 1024×1024 maps with PCF soft shadows
- **Geometry Reuse**: All volumes share same geometries

### Cleanup
Proper disposal on unmount:
- Cancel animation frame
- Dispose renderer
- Dispose all geometries and materials
- Clear scene

### Accessibility
Static fallback for `prefers-reduced-motion`:
- Title and tagline
- Template badges in grid
- Functional scroll-to-desk button
- Same brand colors

## WebMCP Compatibility

### Hard Constraints (All Met)
✅ Hero mounted ABOVE the desk  
✅ Desk component completely unchanged  
✅ No iframe or sandboxing  
✅ WebMCP tools stay on top-level document  
✅ All 8 tools remain accessible:
   - get_page_state
   - add_locale
   - set_locale
   - set_overlay
   - set_template
   - check_overflow
   - rewrite_overlay
   - apply_locale_pass
   - comment_on_slide
   - export_zip

✅ No new environment variables  
✅ Build passes (`npm run build`)  
✅ Honors `prefers-reduced-motion`  
✅ Pixel ratio ≤ 2

## Code Structure

```
components/
  └── LockhotBookshelfHero.tsx    # Main hero component
app/
  ├── page.tsx                    # Hero + Desk integration
  └── globals.css                 # fadeIn animation
```

## Template Placeholders

Currently using solid emissive colors for template screens:
- Full Bleed: `#4a5568` (blue-gray)
- Caption Top: `#6366f1` (indigo)
- Framed: `#8b5cf6` (purple)
- Gradient: `#ec4899` (pink)

Future: Replace with actual phone screenshot images via texture mapping.

## Comparison to Five-Phone Hero

### Removed (Five-Phone Arc)
- ❌ 5 phones in circular arc
- ❌ 15-second animation loop
- ❌ EN → DE locale morph
- ❌ Overflow pulsing demo
- ❌ Lock/unlock button
- ❌ WebMCP tools HUD

### Added (Bookshelf)
- ✅ 3D wooden bookshelf structure
- ✅ 4 template volumes (matches actual templates)
- ✅ Mouse parallax exploration
- ✅ Warm library aesthetic
- ✅ Complete Shelf design language
- ✅ Simpler, more product-focused

## Browser Support

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (Metal acceleration)
- **Mobile**: Optimized (pixel ratio cap helps)

## Dependencies

- `three` (via `@designcodeio/threeui`)
- `@types/three` (devDependency)

Note: While `@designcodeio/threeui` is installed, we build a custom Three.js scene rather than using the pre-packaged `BookshelfScene` or `CompleteShelfLandingPage` components to avoid iframe sandboxing that would hide WebMCP tools.

## License

MIT - Same as the main Lockshot project
