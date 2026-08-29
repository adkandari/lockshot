# Deployment Guide

## Deploy to Vercel (Recommended)

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/adkandari/lockshot)

### Manual Deploy

1. **Install Vercel CLI** (optional):
   ```bash
   npm i -g vercel
   ```

2. **Deploy from repository**:
   ```bash
   vercel
   ```

3. **Or connect via Vercel Dashboard**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Framework Preset: **Next.js**
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Click **Deploy**

### Environment Variables

None required! Lockshot runs entirely client-side with no backend.

## Test WebMCP Integration

### ChatGPT Desktop (Sol/Terra)

1. Open ChatGPT Desktop app
2. In a new chat, ask: "Browse https://your-deployment-url.vercel.app"
3. Follow the [judge demo script](README.md#90-second-judge-demo-script)

### Chrome 149+ with Flag

1. Open Chrome and go to: `chrome://flags/#enable-webmcp-testing`
2. Enable the flag and restart Chrome
3. Navigate to your deployed URL
4. Open DevTools Console to see: "WebMCP tools registered successfully"
5. Test by prompting ChatGPT (if integrated) or verify tools are registered

## Verify Deployment

After deployment, check:

✅ Page loads at your Vercel URL  
✅ All 5 slides are visible  
✅ Locale switcher works (en, de, es, ja)  
✅ German locale shows red "Overflow" badges  
✅ Lock/unlock buttons work  
✅ Export ZIP button downloads files  
✅ DevTools console shows "WebMCP tools registered successfully" (if WebMCP available)

## Production Checklist

- [x] `npm run build` succeeds
- [x] TypeScript compiles without errors
- [x] All 5 slides load with correct overlays
- [x] German locale has visible overflow
- [x] Export generates 1320×2868 PNGs
- [x] WebMCP tools register on page load (when available)
- [x] README includes judge demo script
- [x] MIT LICENSE present

## Troubleshooting

### Build fails on Vercel

Check:
- Node.js version: 18.x or 20.x (recommended)
- Build logs for TypeScript errors
- Ensure all dependencies are in `package.json`

### WebMCP not detected

This is normal if you're not using:
- ChatGPT Desktop with site tools, or
- Chrome 149+ with `chrome://flags/#enable-webmcp-testing`

The app still works fully — WebMCP just enables agent collaboration.

### Export doesn't work

Ensure:
- JSZip is installed: `npm install jszip`
- Browser supports HTML5 Canvas
- No console errors blocking execution

## Performance

Lockshot is optimized for:
- Static generation (SSG)
- Client-side rendering for interactivity
- Fast WebMCP tool registration (<10ms)
- Efficient canvas export (1-2s for 5 PNGs)

## Support

For issues or questions about the OpenAI WebMCP Challenge submission, see:
- [OpenAI WebMCP Learn Docs](https://learn.chatgpt.com/docs/webmcp)
- [Chrome WebMCP Documentation](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
