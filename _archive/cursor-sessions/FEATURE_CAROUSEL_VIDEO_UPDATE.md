# Feature Carousel Video Update

## Summary
Updated the Feature Carousel component to include 5 sections with embedded Vimeo videos that autoplay seamlessly without Vimeo popups.

## Changes Made

### 1. Feature Sections (5 Total)
The carousel now displays 5 feature sections:

1. **Investment Profile**
   - Video: https://vimeo.com/1132703996
   - Description: Create comprehensive investment profiles with detailed financial planning

2. **Property Blocks**
   - Video: https://vimeo.com/1132704003
   - Description: Build and visualize property portfolios with customizable blocks

3. **Output**
   - Video: https://vimeo.com/1132704462
   - Description: Generate professional reports and visualizations

4. **CRM**
   - Video: https://vimeo.com/1132704462
   - Description: Manage client relationships and scenario tracking

5. **Coming Soon**
   - No video (placeholder for future feature)
   - Description: More exciting features on the way

### 2. Autoplay Configuration
- **Interval**: Changed from 20 seconds to **15 seconds**
- Videos automatically advance to the next feature every 15 seconds

### 3. Vimeo Embed Settings
Updated iframe parameters to ensure seamless playback without Vimeo popups:

```
?background=1&autoplay=1&loop=1&autopause=0&muted=1&title=0&byline=0&portrait=0&controls=0
```

Key parameters:
- `background=1`: Enables background mode (no Vimeo logo, no overlays)
- `autoplay=1`: Videos start playing automatically
- `loop=1`: Videos loop continuously
- `muted=1`: Videos play muted (required for autoplay in most browsers)
- `title=0&byline=0&portrait=0`: Hides Vimeo metadata
- `controls=0`: Hides video controls

## User Experience
- Videos autoplay immediately when a feature is selected
- No Vimeo branding or popups appear
- Smooth transitions between features every 15 seconds
- Users can manually navigate using arrow buttons or dots
- Videos loop seamlessly within each feature

## File Modified
- `/src/landing/components/FeatureCarousel.tsx`

