# Lockshot

iOS App Store screenshot localization desk powered by WebMCP. A human and ChatGPT share one page of iPhone frames — the agent rewrites overlay copy, switches locales, and flags overflow. Only the human can lock a slide. Locked copy is what exports.

## Why WebMCP?

Lockshot demonstrates WebMCP's power for collaborative editing workflows. The agent can read page state, rewrite copy, detect layout issues, and export assets — all through imperative tool registration on a single page. No backend, no polling, no context switching. The human retains full control through locking, and the agent can only modify what's unlocked.

## Quick Start

**Live Demo:** [Deploy to Vercel](https://vercel.com) or run locally:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in:
- **ChatGPT Desktop** (Sol/Terra) in-app browser, OR
- **Chrome 149+** with `chrome://flags/#enable-webmcp-testing` enabled

## 90-Second Judge Demo Script

Follow these exact steps in ChatGPT Desktop (site tools):

1. **Open the live URL** in ChatGPT's in-app browser
2. **Prompt:** "Load the sample Habit app and show the German listing."
   - Agent runs `set_locale de`
   - You'll see overflow warnings on multiple slides (red badges)
3. **Prompt:** "Fix the overflow, keep the brand voice, don't touch locked slides."
   - Agent rewrites overflowing German copy using `rewrite_overlay` or `apply_locale_pass`
   - Overflow badges disappear
4. **Lock a slide** by clicking the 🔓 button (turns to 🔒 Locked)
5. **Prompt:** "Rewrite slide 1 to be even shorter"
   - Agent tries `rewrite_overlay` on locked slide
   - Returns clear error: `{"success": false, "error": "Slide 1 is locked and cannot be rewritten", "locked": true}`
6. **Prompt:** "Export App Store Connect files."
   - Agent runs `export_zip`
   - ZIP downloads with 5 PNG files: `habit-slide-1-de.png` through `habit-slide-5-de.png`
   - Each file is exactly **1320×2868 pixels, no alpha channel, sRGB**

**Expected result:** The agent successfully assists with localization but respects human-locked slides. Export produces production-ready App Store assets.

## WebMCP Tools Registered

All tools are registered on the top-level page using `document.modelContext.registerTool`:

- `get_page_state` (read-only): Returns locale, all slide overlays, locked status, overflow flags, comments
- `set_locale`: Switch between en, de, es, ja
- `set_overlay(slide, headline?, subhead?)`: Update text for a specific slide (fails if locked)
- `check_overflow` (read-only): List all overflowing slides in current locale
- `rewrite_overlay(slide, instruction)`: Apply an AI rewrite instruction (fails if locked)
- `apply_locale_pass(locale)`: Fix all unlocked overflowing slides in one locale
- `comment_on_slide(slide, text)`: Add a visible comment to a slide
- `export_zip`: Generate ZIP of 1320×2868 PNGs (no alpha, sRGB)

## Technical Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS** for styling
- **JSZip** for asset export
- **Client-side WebMCP** registration (feature-detected, no polyfill)
- **Zero backend** — all state in React, tools registered on mount

## Scope

- **1 device class:** iPhone 6.9" portrait (1320×2868 PNG)
- **5 slides:** Sample "Habit" app with bundled assets
- **4 locales:** English, German, Spanish, Japanese
- **German overflow:** Deliberately verbose to demonstrate agent fixes
- **2 templates:** Gradient and framed phone
- **Human controls:** Locale switcher, lock/unlock per slide, export ZIP

## What This Is NOT

- ❌ Keyword ASO tool
- ❌ Simulator screenshot capture
- ❌ Generic collaboration canvas
- ❌ Multi-device-class converter

This is a focused localization desk where human judgment (locking) and agent efficiency (rewriting) combine to ship polished App Store screenshots.

## Testing the Export

To verify export dimensions:

```bash
npm test
```

Or manually inspect any exported PNG:
- Width: 1320px
- Height: 2868px
- Color space: sRGB
- Alpha channel: None

## License

MIT — see [LICENSE](LICENSE)

## Submission

Built for the **OpenAI WebMCP Challenge** (deadline: Sep 3, 2026, 1pm PT). This demonstrates real-world WebMCP use in a ChatGPT-first collaborative tool.
