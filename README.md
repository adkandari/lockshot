# Lockshot

iOS App Store screenshot localization desk powered by WebMCP. Drop device screenshots, collaborate with ChatGPT to write and translate overlay copy, and export production-ready App Store assets. Built for the OpenAI WebMCP Challenge.

**Live Demo:** [lockshot-nu.vercel.app](https://lockshot-nu.vercel.app/)

## What It Does

Lockshot is a single-page desk where you drop clean iOS screenshots (up to 5) and ChatGPT writes marketing overlay text through imperative WebMCP tool registration. No backend, no App Store import, no file uploads from ChatGPT—just drop your screenshots in the browser, pick a template, and let ChatGPT write, translate, and measure overflow across locales.

**Key Features:**
- **Drop Screenshots:** Drag & drop up to 5 device screenshots (WebMCP cannot upload files)
- **Templates:** Studio (`full_bleed_caption_bottom`), Campaign (`caption_top`), Poster (`framed_on_gradient`)
- **Campaign Graphics:** Optional campaign slide with "Generate campaign photo" button (infers copy from product slides, bakes type into image)
- **WebMCP Tools:** ChatGPT uses `document.modelContext.registerTool` via `@mcp-b/webmcp-polyfill`
- **Localization:** Add locales (de, es, ja, fr, pt-BR, zh-Hans, etc.), translate copy, measure overflow in real time
- **Human Controls:** Lock slides to prevent agent edits
- **Export:** 1320×2868 RGB PNG ZIP (no alpha, sRGB)

## Quick Start

**Local Development:**

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in:
- **ChatGPT Desktop** (Sol/Terra) in-app browser with site tools enabled, OR
- **Chrome 149+** with `chrome://flags/#enable-webmcp-testing` enabled

## 90-Second Judge Demo Script

Follow these steps in ChatGPT Desktop (in-app browser):

1. **Open the live URL:** [lockshot-nu.vercel.app](https://lockshot-nu.vercel.app/)
2. **Drop 3-5 clean iOS screenshots** into the drop zone (product screens, not App Store marketing)
3. **Prompt:** "Pick the Studio template and write headlines for all slides"
   - Agent runs `set_template` with `full_bleed_caption_bottom`
   - Agent runs `set_overlay` 3-5 times with headline + subhead for each slide
4. **Prompt:** "Add German locale and translate all slides"
   - Agent runs `add_locale` with locale code "de"
   - Agent translates each slide by calling `set_overlay` 3-5 times with German text
   - Overflow badges appear on slides where German text is too long (measured automatically via canvas)
5. **Lock slide 1** by clicking the 🔓 button (turns to 🔒 Locked)
6. **Prompt:** "Rewrite slide 1 headline to be shorter"
   - Agent tries `set_overlay` on locked slide
   - Returns clear error: `{"success": false, "error": "Slide 1 is locked", "locked": true}`
7. **Prompt:** "Export the German screenshots"
   - Agent runs `export_zip`
   - ZIP downloads with 3-5 PNG files: `lockshot-slide-1-de.png` through `lockshot-slide-5-de.png`
   - Each file is exactly **1320×2868 pixels, no alpha channel, sRGB**

**Expected result:** The agent writes copy, translates to German, measures overflow, respects human-locked slides, and exports production-ready App Store assets.

## WebMCP Tools

All tools are registered on the top-level page using `document.modelContext.registerTool`:

- **`get_page_state`** (read-only): Returns project info, current locale, all slide overlays, locked status, real-time overflow flags, comments
- **`set_overlay(slide, headline?, subhead?)`**: Update text for a specific slide (0 for campaign, 1-5 for product slides). Fails if locked. Auto-measures overflow.
- **`set_template(template, slide?)`**: Set template for all unlocked slides or a specific slide. Templates: `full_bleed_caption_bottom`, `caption_top`, `framed_on_gradient`, `gradient_only`
- **`add_locale(locale)`**: Add a new BCP 47 locale code (e.g., de, es, ja, fr, pt-BR, zh-Hans). New locale overlays start empty—ChatGPT must translate via `set_overlay`.
- **`set_locale(locale)`**: Switch between available locales
- **`check_overflow`** (read-only): List all overflowing slides in current locale
- **`rewrite_overlay(slide, instruction)`**: Helper that guides ChatGPT to generate new text and call `set_overlay` directly
- **`apply_locale_pass(locale)`**: Identify all unlocked overflowing slides. ChatGPT should then rewrite them via `set_overlay`.
- **`comment_on_slide(slide, text)`**: Add a visible comment to a slide
- **`set_slide_colors(slide, text?, background?, accent?)`**: Set custom colors for Kova template (hex format). Overrides auto-sampled colors.
- **`reset_project`**: Clear the current project and start over (wipes localStorage)
- **`export_zip`**: Generate ZIP of 1320×2868 PNGs (no alpha, sRGB) with locale-specific filenames

## Technical Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS** for styling
- **JSZip** for asset export
- **Client-side WebMCP** registration via `@mcp-b/webmcp-polyfill`
- **Zero paid APIs** — No ChatGPT API, no image APIs, no translation SaaS. ChatGPT in the browser is the translator and image generator.
- **LocalStorage** for project persistence (no database)
- **Real overflow measurement** — Canvas `measureText` against export dimensions with real font sizes (80px headline, 56px subhead)

## Architecture

- **Drop Zone:** Human drops up to 5 screenshots. WebMCP cannot upload files, so screenshots must be dropped by the human.
- **LocalStorage Projects:** Each project has id, name, locales[], slides[], createdAt. No database needed.
- **Overflow Measurement:** Canvas `measureText` with export font sizes and box dimensions (85% width, 30% height). Measured on every `set_overlay` call.
- **Campaign Slide:** Optional slide 0 with campaign graphic. "Generate campaign photo" button infers copy from product slides and bakes type into a 9:16 marketing image.
- **Locked Slides:** Human can lock slides to prevent agent edits. Agent receives explicit error when attempting to edit locked slides.

## Scope

- **1 device class:** iPhone 6.9" portrait (1320×2868 PNG)
- **Up to 5 slides per project**
- **Dynamic locales:** Start with English, add any BCP 47 code (de, es, ja, fr, pt-BR, zh-Hans, etc.). New locales start empty—not copied from English.
- **Real overflow measurement:** Not hardcoded, measured from actual text rendering
- **Human controls:** Drop screenshots, template selection, locale management, lock/unlock per slide, export ZIP
- **Agent controls:** Write copy, add locales, translate, rewrite, check overflow, set colors, comment, export

## What This Is NOT

- ❌ App Store URL import (abandoned)
- ❌ iTunes Lookup API integration (removed)
- ❌ Keyword ASO tool
- ❌ Simulator screenshot capture
- ❌ Generic collaboration canvas
- ❌ Multi-device-class converter (iPad, Android, etc.)
- ❌ Full-featured app store management suite

This is a focused localization desk where human judgment (dropping screenshots, locking, template selection) and agent efficiency (writing, translating, measuring) combine to ship polished App Store screenshots.

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

- **Client-side only** — No auth, no secrets, no paid APIs
- **No OpenAI SDK, no translation SaaS, no image-gen APIs** — ChatGPT in the browser is the translator and image generator
- **ChatGPT Desktop:** No declarative HTML tools, no iframes for tool registration, top-level `document.modelContext` only, polyfill init before register, module-level singleton
- **Vercel Authentication must stay off** (public demo for judges)
- **MIT licensed, public repo**

## License

MIT — see [LICENSE](LICENSE)

## Submission

Built for the **OpenAI WebMCP Challenge** (deadline: Sep 3, 2026, 1pm PT). This demonstrates real-world WebMCP use in a ChatGPT-first collaborative tool with dynamic data, real measurements, and zero paid APIs.
