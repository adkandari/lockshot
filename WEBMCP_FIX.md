# WebMCP Fix Summary

## Critical Bugs Fixed

### 1. Missing Origin Isolation Headers
**Problem**: ChatGPT Desktop requires origin isolation for `document.modelContext` to be available.

**Fix**: Added both headers in `next.config.ts` and `vercel.json`:
```
Origin-Agent-Cluster: ?1
Permissions-Policy: tools=(self)
```

### 2. Wrong registerTool API Shape
**Problem**: Code had `abortSignal` on the tool object. Chrome/ChatGPT API expects it as second argument.

**Before**:
```typescript
const tool = {
  name: "get_page_state",
  // ...
  abortSignal: controller.signal,  // ❌ WRONG
};
modelContext.registerTool(tool);  // ❌ Not awaited
```

**After**:
```typescript
const tool = {
  name: "get_page_state",
  // ...
  // No abortSignal property
};
await modelContext.registerTool(tool, { signal: controller.signal });  // ✅ CORRECT
```

### 3. Race Condition on Startup
**Problem**: Code bailed immediately if `modelContext` was undefined. ChatGPT may inject it after first paint.

**Fix**: Poll for up to 10 seconds with 100ms intervals:
```typescript
const waitForModelContext = async () => {
  const startTime = Date.now();
  const timeout = 10000;

  while (Date.now() - startTime < timeout) {
    if (typeof document.modelContext?.registerTool === "function") {
      return document.modelContext;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return null;
};
```

### 4. Re-registration on Every State Change
**Problem**: useEffect depended on `[slides, currentLocale]`, causing tools to re-register on every locale switch or slide edit.

**Fix**: 
- Register only once (empty dependency array)
- Use refs to hold current state
- Execute closures read from refs, always seeing live values

```typescript
const slidesRef = useRef(slides);
const currentLocaleRef = useRef(currentLocale);

// Update refs when state changes
useEffect(() => { slidesRef.current = slides; }, [slides]);
useEffect(() => { currentLocaleRef.current = currentLocale; }, [currentLocale]);

// Register once
useEffect(() => {
  // Registration logic with registeredRef.current guard
}, []); // ✅ Empty deps
```

### 5. Missing additionalProperties
**Problem**: OpenAI's spec requires `additionalProperties: false` on inputSchema.

**Fix**: Added to all 8 tools:
```typescript
inputSchema: {
  type: "object",
  properties: { /* ... */ },
  additionalProperties: false,  // ✅ Added
}
```

## Verification Steps

### Check Headers (after deployment)
```bash
curl -I https://lockshot-nu.vercel.app/
```

Should see:
```
Origin-Agent-Cluster: ?1
Permissions-Policy: tools=(self)
```

### Check Console (ChatGPT Desktop)
1. Open https://lockshot-nu.vercel.app/ in ChatGPT Desktop browser
2. Open DevTools Console
3. Should see: "WebMCP tools registered successfully"
4. Green pill should show "WebMCP Active"
5. Site tools arrow should appear

### Test Tools
In ChatGPT Desktop:
```
"Get the current page state"
→ Should return: {currentLocale: "en", slides: [...]}

"Switch to German"
→ Should return: {success: true, newLocale: "de"}

"Check overflow"
→ Should return: {overflowingSlides: [...]}
```

## What Changed

### Files Modified
1. `next.config.ts` - Added headers() function
2. `vercel.json` - Added headers array
3. `components/LockhotDesk.tsx` - Complete rewrite of registration logic

### Lines Changed
- **464 insertions**, **356 deletions** in LockhotDesk.tsx
- Much cleaner, more correct WebMCP implementation

## Expected Behavior After Fix

✅ Page loads in ChatGPT Desktop  
✅ After ≤10s, "WebMCP Active" pill turns green  
✅ Site tools arrow appears in ChatGPT  
✅ All 8 tools are callable  
✅ Locked slides correctly reject agent writes  
✅ Export produces correct PNG dimensions  

## Build Status

✅ `npm run build` succeeds with no errors  
✅ TypeScript compiles successfully  
✅ Static generation (SSG) works  

## Deploy Status

Latest commit: `c3a151d`  
Branch: `cursor/lockshot-webmcp-0ad2`  
PR: https://github.com/adkandari/lockshot/pull/1

Next: Vercel will auto-deploy from this push. Test at deployment URL.
