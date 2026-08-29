# Lockshot

iOS App Store screenshot localization desk powered by WebMCP. Import real App Store apps, add locales, and collaborate with ChatGPT to create localized marketing screenshots. Humans can lock slides, upload images, and export production-ready assets. ChatGPT translates copy, measures overflow, and generates images—all through imperative tool registration on a single page.

**WebMCP Fixed**: As of commit `c3a151d`, all WebMCP registration issues have been resolved. The app now correctly registers tools in ChatGPT Desktop.

## Why WebMCP?

Lockshot demonstrates WebMCP's power for collaborative editing workflows. The agent can import apps, add locales, read page state, translate copy, detect layout issues, and export assets—all through imperative tool registration on a single page. No backend, no polling, no context switching. The human retains full control through locking, and the agent can only modify what's unlocked.

## Quick Start

**Live Demo:** [lockshot-nu.vercel.app](https://lockshot-nu.vercel.app/) or run locally:

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
2. **Prompt:** "Import the Duolingo app: https://apps.apple.com/us/app/duolingo-language-lessons/id570060128"
   - Agent runs `import_app_store` with the URL
   - Lockshot fetches app metadata and up to 5 screenshots from iTunes API
   - Creates a new project with English overlays seeded from app name and description
3. **Prompt:** "Add German locale and translate all slides"
   - Agent runs `add_locale` with locale code "de"
   - Agent then translates each slide by calling `set_overlay` 5 times with German text
   - Overflow badges appear on slides where German text is too long (measured automatically)
4. **Prompt:** "Fix the overflow on slide 2 by making the text shorter"
   - Agent checks overflow with `check_overflow`
   - Agent rewrites German text via `set_overlay` with shorter copy
   - Overflow badge disappears (real measurement, not hardcoded)
5. **Lock slide 1** by clicking the 🔓 button (turns to 🔒 Locked)
6. **Prompt:** "Rewrite slide 1 headline to be even shorter"
   - Agent tries `set_overlay` on locked slide
   - Returns clear error: `{"success": false, "error": "Slide 1 is locked", "locked": true}`
7. **Prompt:** "Export the German App Store screenshots."
   - Agent runs `export_zip`
   - ZIP downloads with 5 PNG files: `duolingo-slide-1-de.png` through `duolingo-slide-5-de.png`
   - Each file is exactly **1320×2868 pixels, no alpha channel, sRGB**

**Expected result:** The agent successfully imports a real app, translates to German, measures overflow, respects human-locked slides, and exports production-ready App Store assets.

## WebMCP Tools Registered

All tools are registered on the top-level page using `document.modelContext.registerTool`:

- `import_app_store(url)`: Parse App Store URL, fetch metadata via iTunes Lookup API, create project with up to 5 screenshots, seed English overlays
- `add_locale(locale)`: Add a new BCP 47 locale code (e.g., de, es, ja, fr, pt-BR, zh-Hans). ChatGPT should then translate via `set_overlay`
- `set_slide_image(slide, url)`: Set a slide's background from a URL (ChatGPT-generated image or any web image)
- `get_page_state` (read-only): Returns project info, locale, all slide overlays, locked status, real-time overflow flags, comments
- `set_locale(locale)`: Switch between available locales
- `set_overlay(slide, headline?, subhead?)`: Update text for a specific slide (fails if locked, auto-measures overflow)
- `check_overflow` (read-only): List all overflowing slides in current locale
- `rewrite_overlay(slide, instruction)`: Helper that guides ChatGPT to generate new text and call `set_overlay` directly
- `apply_locale_pass(locale)`: Identify all unlocked overflowing slides. ChatGPT should then rewrite them via `set_overlay`
- `comment_on_slide(slide, text)`: Add a visible comment to a slide
- `export_zip`: Generate ZIP of 1320×2868 PNGs (no alpha, sRGB) with project-specific filenames

## Technical Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS** for styling
- **JSZip** for asset export
- **Client-side WebMCP** registration via `@mcp-b/webmcp-polyfill`
- **Zero paid APIs** — iTunes Lookup API is free, images proxied via Next.js routes to avoid CORS
- **LocalStorage** for project persistence (no database)
- **Real overflow measurement** — canvas `measureText` against export dimensions, not hardcoded flags

## Architecture

- **iTunes Lookup API**: Free. Parse app ID from URL like `https://apps.apple.com/us/app/x/id123456789`, then `GET https://itunes.apple.com/lookup?id=123456789` for trackName, screenshotUrls, description
- **CORS Proxy**: Next.js API routes at `/api/appstore?id=` and `/api/image?url=` proxy requests to avoid CORS and canvas taint
- **LocalStorage Projects**: Each project has id, name, storeUrl, locales[], slides[], createdAt. No database needed
- **Overflow Measurement**: Canvas `measureText` with export font sizes (80px headline, 56px subhead) and box dimensions (85% width, 30% height). Measured on every `set_overlay` call
- **Empty State**: Habit sample app loads only when no project exists. After import, Habit is hidden

## Scope

- **1 device class:** iPhone 6.9" portrait (1320×2868 PNG)
- **Up to 5 slides per project** (iTunes Lookup returns up to 5 screenshots)
- **Dynamic locales:** Start with English, add any BCP 47 code (de, es, ja, fr, pt-BR, zh-Hans, etc.)
- **Real overflow measurement:** Not hardcoded, measured from actual text rendering
- **Human controls:** Import URL, locale management, lock/unlock per slide, file upload per slide, export ZIP
- **Agent controls:** Import, add locales, translate, rewrite, check overflow, set images, comment, export

## What This Is NOT

- ❌ Keyword ASO tool
- ❌ Simulator screenshot capture
- ❌ Generic collaboration canvas
- ❌ Multi-device-class converter (iPad, Android, etc.)
- ❌ Full-featured app store management suite (no 80 languages, no 3D effects, no App Store Connect upload)

This is a focused localization desk where human judgment (locking, importing, uploading) and agent efficiency (translating, rewriting, measuring) combine to ship polished App Store screenshots.

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

## Constraints

- **Client-side only** + tiny proxy routes (no auth, no secrets, no paid APIs)
- **No OpenAI SDK, no translation SaaS, no image-gen APIs** — ChatGPT in the browser is the translator and image generator
- **ChatGPT Desktop:** No declarative HTML tools, no iframes for tool registration, top-level `document.modelContext` only, polyfill init before register, module-level singleton, do not abort on React unmount
- **Vercel Authentication must stay off** (public demo)
- **MIT licensed, public repo**

## License

MIT — see [LICENSE](LICENSE)

## Submission

Built for the **OpenAI WebMCP Challenge** (deadline: Sep 3, 2026, 1pm PT). This demonstrates real-world WebMCP use in a ChatGPT-first collaborative tool with dynamic data, real measurements, and zero paid APIs.
