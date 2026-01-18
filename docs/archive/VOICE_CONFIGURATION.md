# Voice Configuration Guide

## Current Configuration (Updated: Jan 16, 2026)

### Voice Settings
- **Voice**: Charon (Informative - ideal for professional/technical presentations)
- **Speed**: 1.2x (20% faster via natural language prompt)
- **Total Duration**: 1:32 (92 seconds) - down from 1:54
- **Language**: Spanish Latin American (es-419)

### Audio Files Generated
Located in: `/scripts/presentation-audio/`

| Slide | File | Duration | Description |
|-------|------|----------|-------------|
| 1 | `01_hook.wav` | 8.0s | Hook - "40% time wasted" problem |
| 2 | `02_problem.wav` | 13.6s | Problem - Fragmented tools |
| 3 | `03_solution.wav` | 13.4s | Solution - LeDesign platform |
| 4 | `04_features.wav` | 36.1s | All 4 engineering modules |
| 5 | `05_value.wav` | 14.3s | Value proposition |
| 6 | `06_cta.wav` | 6.9s | Call to action |
| **Total** | `full_presentation.mp3` | **92s** | Combined MP3 (933KB) |

---

## Available Voice Options

Based on [Gemini TTS documentation](https://ai.google.dev/gemini-api/docs/speech-generation), here are the best voices for professional presentations:

### Recommended Professional Voices

| Voice | Characteristic | Best For | Current |
|-------|---------------|----------|---------|
| **Charon** | Informative | Professional/technical content | ✅ Active |
| **Rasalgethi** | Informative | Alternative professional voice | |
| **Alnilam** | Firm | Confident, authoritative delivery | |
| **Schedar** | Even | Measured, balanced delivery | |
| **Iapetus** | Clear | Clear enunciation | |
| **Erinome** | Clear | Clear vocal quality | |

### All 30 Available Voices

The Gemini 2.5 Flash TTS model supports **30 prebuilt voices** that work across all 24 languages including Spanish:

Achernar, Achird, Algenib, Algieba, Alnilam, Aoede, Autonoe, Callirrhoe, **Charon**, Despina, Enceladus, **Erinome**, Fenrir, Gacrux, **Iapetus**, Kore, Laomedeia, Leda, Orus, Puck, Pulcherrima, **Rasalgethi**, Sadachbia, Sadaltager, **Schedar**, Sulafat, Umbriel, Vindemiatrix, Zephyr, Zubenelgenubi

**Note**: You can listen to all voice samples in [Google AI Studio](https://aistudio.google.com/)

---

## How to Change Voice

### Method 1: Update Script Directly

Edit `/scripts/generate-tts.py`:

```python
# Change this line (currently line 24):
VOICE_NAME = "Charon"

# To try another voice:
VOICE_NAME = "Alnilam"  # Firm, confident
# or
VOICE_NAME = "Rasalgethi"  # Informative alternative
```

Then regenerate:
```bash
cd /Users/benjaledesma/Benja/LeDesign/scripts
source venv/bin/activate
python generate-tts.py
```

### Method 2: Test Multiple Voices

Create a test script to compare voices:

```python
# Test different voices
voices_to_test = ["Charon", "Alnilam", "Rasalgethi", "Schedar"]

for voice in voices_to_test:
    VOICE_NAME = voice
    generate_slide_audio("01_hook", SLIDES["01_hook"])
    # Saves as 01_hook.wav, rename to 01_hook_charon.wav etc.
```

---

## Speed Control Options

### Option 1: Natural Language Prompts (Current)

**Advantages**:
- More natural sounding
- AI adjusts pacing contextually
- No post-processing needed

**Implementation**:
```python
SPEED_INSTRUCTION = "Speak at a brisk, energetic pace, about 20% faster than normal conversation while maintaining clarity."
```

**Variations**:
- Slower: "Speak at a calm, deliberate pace"
- Normal: "Speak at a natural, conversational pace"
- Faster: "Speak quickly and energetically, about 30% faster than normal"
- Very Fast: "Speak very rapidly with high energy, about 40% faster than normal"

### Option 2: FFmpeg Post-Processing

**Advantages**:
- Precise speed control
- Can be applied after generation
- Maintains pitch

**Implementation**:

Uncomment in `generate-tts.py` (lines 225-228):
```python
if success:
    print("\n" + "="*60)
    apply_ffmpeg_speedup(speedup=1.2)  # 1.2 = 20% faster
    print("="*60)
```

Or manually:
```bash
ffmpeg -i input.wav -filter:a "atempo=1.2" output.wav
```

**Limitations**: `atempo` only accepts 0.5-2.0. For values outside this range, chain filters:
```bash
# For 2.4x speed (1.2 * 2.0):
ffmpeg -i input.wav -filter:a "atempo=2.0,atempo=1.2" output.wav
```

### Option 3: Hybrid Approach

1. Generate at 1.2x via natural language
2. Apply additional FFmpeg speedup if needed
3. Best of both worlds

---

## Updating After Voice/Speed Changes

After regenerating audio, update these files:

### 1. Video Page Timings
`/apps/web/src/app/presentation/video/page.tsx`

Update `SLIDE_TIMINGS` array based on actual audio durations:
```typescript
const SLIDE_TIMINGS = [
  { slide: 0, time: 0 },      // Hook: 0-8s
  { slide: 1, time: 8 },      // Problem: 8-22s
  // ... etc
];
```

Check actual durations:
```bash
cd scripts/presentation-audio
for file in 0*.wav; do
  ffprobe -i "$file" -show_entries format=duration -v quiet -of csv="p=0"
done
```

### 2. Manual Presentation Timings
`/apps/web/src/app/presentation/page.tsx`

Update `SLIDE_TIMINGS` object:
```typescript
const SLIDE_TIMINGS = {
  0: 8,   // Hook
  1: 14,  // Problem
  // ... etc
};
```

### 3. Combine and Deploy
```bash
cd scripts/presentation-audio

# Combine WAV files
printf "file '%s'\n" 01_hook.wav 02_problem.wav 03_solution.wav 04_features.wav 05_value.wav 06_cta.wav > filelist.txt
ffmpeg -f concat -safe 0 -i filelist.txt -c copy full_presentation.wav -y

# Convert to MP3
ffmpeg -i full_presentation.wav -codec:a libmp3lame -qscale:a 2 full_presentation.mp3 -y

# Copy to public folder
cp full_presentation.mp3 ../../apps/web/public/presentation-audio/

# Clean up
rm filelist.txt
```

---

## Testing New Configurations

1. **Generate audio** with new voice/speed
2. **Listen to individual files** to check quality
3. **Test with manual mode** at http://localhost:4000/presentation
4. **Test with video mode** at http://localhost:4000/presentation/video
5. **Adjust timings** if slides don't sync with audio

---

## Recommended Configurations by Use Case

### For Chilean Engineering Presentation (Current)
- **Voice**: Charon (Informative)
- **Speed**: 1.2x (brisk, professional)
- **Best for**: Technical, professional audience

### For Marketing/Sales
- **Voice**: Alnilam (Firm)
- **Speed**: 1.3x (energetic, confident)
- **Best for**: Product launches, sales pitches

### For Educational Content
- **Voice**: Schedar (Even) or Iapetus (Clear)
- **Speed**: 1.0x (natural pace)
- **Best for**: Tutorials, explanations

### For Social Media/Ads
- **Voice**: Alnilam (Firm) or Aoede
- **Speed**: 1.4x (very fast, high energy)
- **Best for**: Instagram reels, TikTok, YouTube ads

---

## Resources

- [Gemini TTS Documentation](https://ai.google.dev/gemini-api/docs/speech-generation)
- [Google AI Studio](https://aistudio.google.com/) - Listen to voice samples
- [FFmpeg Audio Speed Control](https://shotstack.io/learn/ffmpeg-speed-up-video-slow-down-videos/)
- [Gemini 2.5 TTS Blog Post](https://blog.google/technology/developers/gemini-2-5-text-to-speech/)

---

## Quick Reference Commands

```bash
# Activate Python environment
cd /Users/benjaledesma/Benja/LeDesign/scripts
source venv/bin/activate

# Generate TTS
python generate-tts.py

# Check audio durations
cd presentation-audio
for f in 0*.wav; do echo -n "$f: "; ffprobe -i "$f" -show_entries format=duration -v quiet -of csv="p=0" | awk '{printf "%.1fs\n", $1}'; done

# Speed up with FFmpeg
ffmpeg -i input.wav -filter:a "atempo=1.2" output.wav

# Convert to MP3
ffmpeg -i input.wav -codec:a libmp3lame -qscale:a 2 output.mp3

# Combine WAV files
printf "file '%s'\n" *.wav > list.txt
ffmpeg -f concat -safe 0 -i list.txt -c copy output.wav
```
