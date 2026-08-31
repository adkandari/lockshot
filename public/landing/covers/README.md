# Lockshot Cover Images - pose.ai Screenshots

## Required Files (EXACT FILES FROM ADI)

Place these three pose.ai screenshot images in this directory:

### 1. full-bleed.png
- **Dimensions**: 738×1597 (portrait)
- **Content**: pose.ai result screen - blonde woman in striped top with Video/Reuse buttons
- **Template**: Full Bleed
- **Position**: LEFT book on the shelf

### 2. caption-top.png  
- **Dimensions**: 882×1909 (portrait)
- **Content**: pose.ai Models page showing "Sam" model and "Create Model" button
- **Template**: Caption Top
- **Position**: MIDDLE book on the shelf

### 3. framed.png
- **Dimensions**: 738×1597 (portrait)
- **Content**: pose.ai result screen - woman in Santa hat with gift, Christmas bokeh background
- **Template**: Framed
- **Position**: RIGHT book on the shelf

## Critical Requirements

- **Do NOT crop, stretch, generate, or composite** - use the exact files provided
- **Format**: PNG as provided
- **Orientation**: Portrait (already correct in source files)
- **Use**: Loaded as THREE.js textures for 3D book covers

## Implementation

The Complete Shelf HTML loads these via:

```javascript
const coverPaths = {
  "full-bleed": "/landing/covers/full-bleed.png",
  "caption-top": "/landing/covers/caption-top.png",
  "framed": "/landing/covers/framed.png"
};

const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load(coverPaths[book.id]);
```

Portrait UV mapping is configured to keep the screenshots tall on the book covers.