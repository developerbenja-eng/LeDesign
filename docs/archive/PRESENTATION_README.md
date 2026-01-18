# LeDesign Video Presentation

Complete professional video presentation with AI-generated voiceover and synchronized slides.

## ✅ What's Complete

1. **Presentation slides** - 6 animated slides with glassmorphism design
2. **Professional audio** - Gemini 2.5 Flash TTS in Spanish (Chilean accent)
3. **Updated pricing** - Now matches main website ($50/$100/$200)
4. **Two versions** - Manual control and auto-play video

## 🎬 View Presentation

### Option 1: Manual Control (Practice Mode)
**URL**: http://localhost:4000/presentation

**Features**:
- Manual slide navigation (arrow keys)
- Auto-play mode (spacebar)
- Hide controls for recording (H key)
- Perfect for practicing narration

**Controls**:
- `Space` - Start/stop auto-play
- `←` `→` - Navigate slides
- `R` - Reset to beginning
- `H` - Hide controls (for recording)

### Option 2: Video Mode (Auto-Play with Audio)
**URL**: http://localhost:4000/presentation/video

**Features**:
- Automatically plays audio and advances slides
- Play/Pause button
- Mute/Unmute
- Time display (2:03 total)
- Ready to record as final video

**Controls**:
- Click Play to start
- `F` - Fullscreen
- Slides advance automatically with audio

## 📊 Pricing (Updated)

The presentation now shows the correct pricing:

| Plan | Price | Description |
|------|-------|-------------|
| **Módulo Individual** | $50/mes | Un módulo de ingeniería |
| **Plan Completo** | $100/mes | Todos los módulos incluidos |
| **Equipos** | $200/mes | Hasta 5 usuarios + colaboración |

This matches the main website pricing.

## 🎙️ Audio Files

All audio generated with **Gemini 2.5 Flash TTS** (December 2025):

### Individual Slides (WAV format)
Location: `/scripts/presentation-audio/`

- `01_hook.wav` - 6 seconds
- `02_problem.wav` - 10 seconds
- `03_solution.wav` - 8 seconds
- `04_features.wav` - 35 seconds
- `05_value.wav` - 10 seconds
- `06_cta.wav` - 10 seconds (updated with correct pricing)

### Combined Audio
- `full_presentation.wav` - Full audio (5.7 MB, 2:03)
- `full_presentation.mp3` - Compressed (1.2 MB, 2:03)
- Public URL: `/presentation-audio/full_presentation.mp3`

## 📹 Recording Final Video

### Method 1: Screen Recording

1. Open http://localhost:4000/presentation/video
2. Press `F` for fullscreen
3. Start screen recording (QuickTime, OBS, etc.)
4. Click Play button
5. Wait for 2:03 until complete
6. Stop recording
7. Export as MP4

**Recommended settings**:
- Resolution: 1920x1080 (Full HD)
- Frame rate: 60fps
- Format: MP4 (H.264)

### Method 2: FFmpeg (Advanced)

If you want to generate video from slides + audio:

```bash
# Export slides as images first (screenshot each slide)
# Then combine with FFmpeg:

ffmpeg -framerate 1/6 -i slide_%d.png -i full_presentation.mp3 \
  -c:v libx264 -tune stillimage -c:a aac -b:a 192k \
  -pix_fmt yuv420p -shortest ledesign_presentation.mp4
```

## 📝 Script

The full narration script is in [PRESENTATION_SCRIPT.md](PRESENTATION_SCRIPT.md) with:
- Spanish text for each slide
- English translation
- Style prompts used for TTS
- Timing breakdown
- Production notes

## 🎨 Design Features

- **Glassmorphism theme** - Matches main website
- **Smooth transitions** - Framer Motion animations
- **Responsive design** - Works on all screen sizes
- **Auto-advancing features** - Features rotate automatically
- **Progress indicators** - Shows current slide
- **Time-synced** - Slides change exactly with audio

## 🔄 Making Changes

### Update Slide Content
Edit: `/apps/web/src/app/presentation/page.tsx` (manual mode)
Or: `/apps/web/src/app/presentation/video/page.tsx` (video mode)

### Regenerate Audio
Edit: `/scripts/generate-tts.py`
Run: `python3 generate-tts.py`

### Update Pricing
Already updated to match main website. To change again:
1. Edit slide CTA component
2. Update TTS script
3. Regenerate audio

## 📊 Presentation Structure

| Slide | Title | Duration | Content |
|-------|-------|----------|---------|
| 1 | Hook | 6s | 40% time wasted problem |
| 2 | Problem | 10s | Fragmented tools grid |
| 3 | Solution | 8s | LeDesign unified platform |
| 4 | Features | 35s | 4 engineering modules |
| 5 | Value | 10s | Benefits (time, cost, quality) |
| 6 | CTA | 10s | Pricing + ledesign.cl |
| **Total** | | **79s** | |

## 🚀 Next Steps

1. ✅ Test both presentation modes
2. ✅ Review pricing accuracy
3. ✅ Practice narration if needed
4. 📹 Record final video in fullscreen
5. 🎬 Export as MP4 for distribution
6. 📱 Share on LinkedIn, YouTube, etc.

## 💡 Tips

- **For best recording**: Use Video Mode (auto-play)
- **For practice**: Use Manual Mode first
- **For editing**: Individual WAV files are in `/scripts/presentation-audio/`
- **For web**: MP3 is already optimized (1.2 MB)

---

**Questions?** Check [PRESENTATION_SCRIPT.md](PRESENTATION_SCRIPT.md) or [scripts/TTS_GENERATION_GUIDE.md](scripts/TTS_GENERATION_GUIDE.md)
