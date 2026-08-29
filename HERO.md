# Lockshot Three.js Marketing Hero

## Overview

The marketing hero is a 15-second looping Three.js animation that showcases Lockshot's iOS App Store screenshot localization capabilities for the OpenAI WebMCP challenge.

## Animation Sequence

### Phase 1: Fan Out (0-3s)
- Five iPhone bezels display in a dark perspective arc
- Center phone is highlighted with a blue glow
- Gentle idle motion creates a living scene

### Phase 2: Locale Morph (3-7s)
- Text overlay shows EN → DE transition
- English headline morphs to German
- Locale badges pulse to indicate the switch

### Phase 3: Overflow Alert (7-11s)
- Slide 2 (second phone) shows overflow indicator
- Red overlay pulses on the screen
- Warning message displays below

### Phase 4: Lock & Tools (11-15s)
- Interactive lock button appears
- WebMCP tools HUD displays in top-right
- Shows all 8 registered tools

## Technical Implementation

### Scene Setup
- **Renderer**: WebGL with antialiasing
- **Camera**: Perspective (FOV 50°)
- **Lighting**: Ambient + Spotlight + Rim light
- **Background**: Dark graphite (#0a0a0a)
- **Fog**: Subtle depth effect

### Phone Models
- **Bezel**: Dark metal with high metalness/low roughness
- **Screen**: Emissive material for glow effect
- **Glow**: Semi-transparent blue halo on center phone
- **Overflow**: Red overlay with animated opacity

### Performance Features
- Intersection Observer pauses rendering when offscreen
- PixelRatio capped at 2 for performance
- Reduced motion fallback for accessibility
- Efficient phase-based animation updates

### Accessibility
- `prefers-reduced-motion` shows static hero
- Keyboard accessible lock button
- Clear visual hierarchy
- High contrast text

## Recording the Loop

The hero is designed to be easily recorded for social media and demos:

1. Open http://localhost:3000 (or production URL)
2. Wait for the animation to complete one full loop
3. Use any screen recording tool:
   - macOS: Cmd+Shift+5
   - Windows: Win+G (Game Bar)
   - Browser DevTools Performance tab
   - Screen recorder extensions (Loom, Screencastify)
4. Trim to exactly 15 seconds
5. Export for X/Twitter or Devpost

The animation loops seamlessly, so you can start recording at any point.

## Integration with WebMCP

The hero maintains full compatibility with WebMCP:

- All 8 tools register on the top-level document
- No iframes or origin issues
- Hero and desk coexist on same page
- Tools remain accessible after scrolling

## Dependencies

- `@designcodeio/threeui`: Community edition for CSS utilities
- `three`: 3D rendering engine (via threeui)
- `@types/three`: TypeScript definitions

## File Structure

```
components/
  └── LockhotHero.tsx    # Main hero component
app/
  ├── page.tsx           # Hero + Desk integration
  └── globals.css        # Animation keyframes
```

## Customization

To modify the animation:

1. **Timing**: Change `ANIMATION_DURATION` constant
2. **Colors**: Update material colors in phone creation
3. **Text**: Edit `PHONE_DATA` array
4. **Tools**: Update `WEBMCP_TOOLS` array
5. **Arc layout**: Adjust `arcRadius` and `arcSpan`

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (with Metal)
- Mobile: Optimized with reduced complexity

## License

MIT - Same as the main Lockshot project
