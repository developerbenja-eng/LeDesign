# LeDesign Brand Assets

Logo designs for the LeDesign engineering platform.

---

## Logo Variations

### 1. Full Logo ([logo-full.svg](./logo-full.svg))
**Usage**: Main logo for website headers, marketing materials, documentation
- Icon + wordmark + tagline
- Dimensions: 300×80px
- Best for: Light backgrounds

### 2. Full Logo - Dark ([logo-full-dark.svg](./logo-full-dark.svg))
**Usage**: Dark mode interfaces, dark backgrounds
- Same as full logo but optimized for dark backgrounds
- Dimensions: 300×80px
- Best for: Dark backgrounds (#0A0A0A or similar)

### 3. Icon Only ([logo-icon.svg](./logo-icon.svg))
**Usage**: Favicons, app icons, social media avatars, small spaces
- Just the terrain symbol
- Dimensions: 100×100px (square)
- Scalable to 16×16px (favicon), 192×192px (app icon), etc.

### 4. Monogram ([logo-monogram.svg](./logo-monogram.svg))
**Usage**: App tiles, profile pictures, compact branding
- "LD" letters with terrain texture
- Dimensions: 120×120px (square)
- Background: Brand blue (#0052CC)

### 5. Geometric ([logo-geometric.svg](./logo-geometric.svg))
**Usage**: Alternative icon, abstract representation
- Geometric interpretation: topography + structural grid
- Dimensions: 100×100px (square)
- Best for: Technical/engineering contexts

---

## Design Concept

The LeDesign logo combines:

### Terrain Layers
- Topographic contour lines represent **terrain analysis**
- Layered shapes suggest **elevation and depth**
- Organic curves meet **geometric precision**

### Engineering Elements
- Grid overlay represents **structural engineering**
- Clean lines suggest **precision and accuracy**
- Geometric shapes reference **technical design**

### Typography
- **"Le"** in light weight (300) - elegant, approachable
- **"Design"** in bold weight (700) - confident, professional
- Tagline in uppercase with letter-spacing - modern, technical

---

## Color Palette

### Primary Brand Colors

```
Blue Dark    #0052CC    rgb(0, 82, 204)     - Main brand color
Blue Medium  #0066FF    rgb(0, 102, 255)    - Interactive elements
Blue Light   #4C9AFF    rgb(76, 154, 255)   - Highlights, accents
```

### Neutral Colors

```
Black        #1A1A1A    rgb(26, 26, 26)     - Text dark mode
Gray Dark    #666666    rgb(102, 102, 102)  - Secondary text
Gray Light   #E5E5E5    rgb(229, 229, 229)  - Borders, dividers
White        #FFFFFF    rgb(255, 255, 255)  - Background light mode
```

### Usage Guidelines

- **Primary**: Use Blue Dark (#0052CC) for main branding elements
- **Interactive**: Use Blue Medium (#0066FF) for buttons, links, hover states
- **Accents**: Use Blue Light (#4C9AFF) for highlights, selections
- **Contrast**: Ensure 4.5:1 contrast ratio for accessibility (WCAG AA)

---

## Typography

### Recommended Fonts

1. **Inter** (Primary)
   - Modern, highly legible
   - Excellent for UI and technical content
   - Free, open-source
   - Download: https://fonts.google.com/specimen/Inter

2. **System Fallback**
   ```css
   font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
   ```

### Font Weights

- **Light (300)**: "Le" in wordmark, body text
- **Regular (400)**: Body text, descriptions
- **Bold (700)**: "Design" in wordmark, headings

---

## Usage Examples

### Website Header
```html
<img src="branding/logo-full.svg" alt="LeDesign" height="40">
```

### Favicon (HTML)
```html
<link rel="icon" type="image/svg+xml" href="/branding/logo-icon.svg">
```

### App Icon (iOS/Android)
Export `logo-icon.svg` to PNG at these sizes:
- iOS: 180×180px, 167×167px, 152×152px, 120×120px
- Android: 192×192px, 144×144px, 96×96px, 72×72px, 48×48px

### Social Media
- **Profile Picture**: Use `logo-monogram.svg` (square)
- **Cover Image**: Use `logo-full.svg` with adequate padding
- **OG Image**: Create 1200×630px variant of `logo-full.svg`

---

## Technical Specifications

### SVG Benefits
✅ Infinitely scalable without quality loss
✅ Small file size (< 5KB each)
✅ Can be styled with CSS
✅ Works in all modern browsers
✅ Retina-ready by default

### File Formats Available
- **.svg** - Vector (recommended for web and print)
- Export to **.png** as needed for specific platforms
- Export to **.ico** for favicon.ico (combine 16×16, 32×32, 48×48)

---

## Export Commands

### Convert SVG to PNG (using ImageMagick)
```bash
# Icon at various sizes
convert -background none branding/logo-icon.svg -resize 192x192 logo-192.png
convert -background none branding/logo-icon.svg -resize 512x512 logo-512.png

# Full logo
convert -background none branding/logo-full.svg -resize 600x160 logo-600.png
```

### Convert SVG to Favicon
```bash
# Install imagemagick if needed
brew install imagemagick

# Create multi-size favicon.ico
convert branding/logo-icon.svg -define icon:auto-resize=16,32,48 favicon.ico
```

---

## Brand Guidelines

### ✅ Do
- Use the full logo when space allows
- Maintain aspect ratios when scaling
- Provide adequate clear space (minimum 20px around logo)
- Use dark variant on dark backgrounds
- Keep logos crisp and sharp

### ❌ Don't
- Don't distort or skew the logo
- Don't change the colors (except dark/light variants)
- Don't add effects (shadows, gradients, outlines)
- Don't place logo on busy backgrounds
- Don't use low-resolution raster versions when SVG is available

---

## Files in This Directory

```
branding/
├── logo-full.svg          # Main logo (light backgrounds)
├── logo-full-dark.svg     # Main logo (dark backgrounds)
├── logo-icon.svg          # Icon only (square)
├── logo-monogram.svg      # LD monogram (square)
├── logo-geometric.svg     # Alternative geometric design
└── README.md             # This file
```

---

## Next Steps

1. **Choose your favorite** - Pick which logo style you prefer
2. **Export formats** - Generate PNG/ICO versions for specific platforms
3. **Update website** - Add logo to site header
4. **Favicon** - Use `logo-icon.svg` as favicon
5. **Social media** - Update profiles with new logo
6. **Business cards** - Design cards using brand colors and logo

---

## Customization

Want to try different colors or variations?

### Edit Colors
Open any SVG file and modify the `fill` attributes:
```svg
<!-- Change from blue to another color -->
<path fill="#0052CC" ...>  <!-- Change this hex value -->
```

### Edit Text
In `logo-full.svg` or `logo-full-dark.svg`, modify the text content:
```svg
<text>LeDesign</text>  <!-- Change wordmark -->
<text>ENGINEERING PLATFORM</text>  <!-- Change tagline -->
```

---

**Created with Claude Code** 🎨
