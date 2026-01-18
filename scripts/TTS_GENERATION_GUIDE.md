# LeDesign TTS Generation Guide

## Overview

This guide explains how to generate professional voiceover audio for the LeDesign presentation using **Gemini 2.5 Flash TTS** (December 2025 update).

## Latest Gemini TTS Features (Dec 2025)

Google's Gemini 2.5 TTS models received major updates:

✨ **Enhanced Expressivity**: Much more expressive with better role adherence to style prompts
⏱️ **Precision Pacing**: Adjusts speed based on context (excitement vs. emphasis)
🗣️ **Multi-Speaker Support**: Consistent character voices across 24 languages
🎯 **Studio Quality**: Professional-grade audio at 24kHz

### Available Models

- `gemini-2.5-flash-preview-tts` - Optimized for low latency
- `gemini-2.5-pro-preview-tts` - Optimized for quality

We're using **Flash** for faster generation with excellent quality.

## Prerequisites

1. **Python 3.8+** installed
2. **Google Gemini API Key** (already set in `.env`)
3. **Google GenAI Python SDK**

## Setup

### 1. Install Dependencies

```bash
cd /Users/benjaledesma/Benja/LeDesign/scripts
pip install -r requirements.txt
```

Or install directly:

```bash
pip install google-genai
```

### 2. Verify API Key

The script reads from environment variables. Your key is already in `.env`:

```bash
GOOGLE_GEMINI_API_KEY=AIzaSyD2SutN1FH4wAgKE41i-dvmkzA9WqrNfYA
```

To verify:

```bash
echo $GOOGLE_GEMINI_API_KEY
# Or source from .env
export $(cat ../.env | grep GOOGLE_GEMINI_API_KEY)
```

## Generate Audio

### Quick Start

```bash
cd /Users/benjaledesma/Benja/LeDesign/scripts
python3 generate-tts.py
```

### What Happens

The script will:
1. Generate 6 audio files (one per slide)
2. Save to `presentation-audio/` directory
3. Output WAV files at 24kHz sample rate

Expected output:

```
============================================================
🎬 LeDesign Presentation TTS Generation
============================================================
Model: gemini-2.5-flash-preview-tts
Voice: Puck
Output: presentation-audio/
============================================================

🎙️  Generating audio for 01_hook...
   Text: ¿Sabías que los ingenieros chilenos pierden el 40% de ...
   Style: Professional and attention-grabbing. Start with curio...
✅ Saved: presentation-audio/01_hook.wav

🎙️  Generating audio for 02_problem...
   Text: AutoCAD, Civil 3D, SAP2000, HEC-RAS, planillas de Exce...
   Style: Matter-of-fact and building frustration. List tools w...
✅ Saved: presentation-audio/02_problem.wav

... (continues for all 6 slides)

============================================================
✅ Completed: 6/6 slides generated
============================================================

🎉 All audio files generated successfully!

📂 Audio files saved to: presentation-audio/

Next steps:
1. Review audio files: 01_hook.wav through 06_cta.wav
2. Test with presentation at http://localhost:4000/presentation
3. Combine audio files if needed using ffmpeg
```

## Output Files

The script generates 6 WAV files:

| File | Slide | Duration | Description |
|------|-------|----------|-------------|
| `01_hook.wav` | Hook | ~6s | Attention-grabbing opener |
| `02_problem.wav` | Problem | ~10s | Pain points and costs |
| `03_solution.wav` | Solution | ~8s | LeDesign introduction |
| `04_features.wav` | Features | ~35s | All 4 modules |
| `05_value.wav` | Value | ~10s | Benefits and savings |
| `06_cta.wav` | CTA | ~8s | Pricing and call-to-action |

**Total duration**: ~77 seconds

## Voice Configuration

### Current Voice

The script uses **"Puck"** - a professional male voice suitable for business presentations.

### Available Voices

You can change the voice by modifying `VOICE_NAME` in the script:

```python
# Line 18 in generate-tts.py
VOICE_NAME = "Puck"  # Change this
```

**Common voices**:
- `Puck` - Professional male
- `Kore` - Warm male
- `Aoede` - Professional female
- `Charon` - Confident female

### Custom Voice Settings

Each slide has a **style prompt** that controls:
- **Tone**: emotional quality (confident, enthusiastic, matter-of-fact)
- **Pacing**: speed and rhythm (emphasize numbers, pause after lists)
- **Accent**: Chilean Spanish

Example from the script:

```python
"01_hook": {
    "text": "¿Sabías que los ingenieros...",
    "style": "Professional and attention-grabbing. Start with curiosity, emphasize '40%' with concern, end with confidence on 'Es hora de cambiar eso.'",
    "duration": 6
}
```

## Customization

### Modify Script Text

Edit the `SLIDES` dictionary in `generate-tts.py`:

```python
SLIDES = {
    "01_hook": {
        "text": "YOUR NEW TEXT HERE",
        "style": "YOUR STYLE INSTRUCTIONS",
        "duration": 6
    },
    # ... more slides
}
```

### Adjust Style Prompts

Make the voice more:
- **Energetic**: Add "with high energy" or "enthusiastically"
- **Calm**: Add "calmly and professionally"
- **Fast**: Add "at a brisk pace"
- **Slow**: Add "slowly for clarity"

Example:

```python
"style": "Speak enthusiastically with high energy, emphasize key numbers like '40%', pause briefly after each tool name."
```

## Combining Audio Files

### Option 1: Manual Combination (FFmpeg)

Combine all slides into one file:

```bash
cd presentation-audio

# Create list of files
(for f in *.wav; do echo "file '$f'"; done) > concat_list.txt

# Concatenate
ffmpeg -f concat -safe 0 -i concat_list.txt -c copy full_presentation.wav
```

### Option 2: Add Silence Between Slides

Add 0.5s silence between slides:

```bash
ffmpeg -i 01_hook.wav -i 02_problem.wav -i 03_solution.wav -i 04_features.wav -i 05_value.wav -i 06_cta.wav \
  -filter_complex "[0][1]concat=n=2:v=0:a=1[a1];[a1][2]concat=n=2:v=0:a=1[a2];[a2][3]concat=n=2:v=0:a=1[a3];[a3][4]concat=n=2:v=0:a=1[a4];[a4][5]concat=n=2:v=0:a=1" \
  -map "[a4]" full_presentation.wav
```

## Testing with Presentation

### Option 1: Use Separate Audio Files

Modify the presentation React component to play audio per slide.

### Option 2: Record with Screen Capture

1. Open presentation: http://localhost:4000/presentation
2. Press **H** to hide controls
3. Start screen recording software (QuickTime, OBS, etc.)
4. Press **Space** to start auto-play
5. Play `full_presentation.wav` in the background
6. Let presentation run through all slides
7. Stop recording

### Option 3: Automated Video Generation

Use FFmpeg to combine presentation screenshots with audio:

```bash
# Export slides as images from presentation
# Then combine with audio:
ffmpeg -loop 1 -i slide_%d.png -i full_presentation.wav \
  -c:v libx264 -tune stillimage -c:a aac -b:a 192k \
  -pix_fmt yuv420p -shortest ledesign_presentation.mp4
```

## Troubleshooting

### Error: "GOOGLE_GEMINI_API_KEY not set"

```bash
# Source from .env file
export $(cat ../.env | grep GOOGLE_GEMINI_API_KEY)

# Or set directly
export GOOGLE_GEMINI_API_KEY="AIzaSyD2SutN1FH4wAgKE41i-dvmkzA9WqrNfYA"
```

### Error: "No module named 'google.genai'"

```bash
pip install --upgrade google-genai
```

### Audio Quality Issues

1. **Too fast**: Adjust style prompts to include "speak slowly" or "pause after key points"
2. **Too monotone**: Add more emotion words: "enthusiastically", "with excitement"
3. **Wrong accent**: Ensure style includes "Chilean Spanish accent" or "Latin American Spanish"

### API Rate Limits

Gemini API has rate limits:
- Free tier: ~60 requests/minute
- If you hit limits, add delays between generations:

```python
import time
time.sleep(2)  # Add 2s delay between slides
```

## Cost Estimate

**Gemini 2.5 Flash TTS Pricing** (as of Dec 2025):
- **Free tier**: Generous quota for testing
- **Paid**: ~$0.001 per 1000 characters

For this presentation:
- Total characters: ~800
- Estimated cost: **< $0.01** (essentially free)

## Advanced: Multi-Speaker Dialogue

For future multi-speaker presentations, use `MultiSpeakerVoiceConfig`:

```python
config=types.GenerateContentConfig(
    response_modalities=["AUDIO"],
    speech_config=types.SpeechConfig(
        voice_config=types.VoiceConfig(
            multi_speaker_voice_config=types.MultiSpeakerVoiceConfig(
                speaker_voices={
                    "Engineer_1": types.PrebuiltVoiceConfig(voice_name='Puck'),
                    "Engineer_2": types.PrebuiltVoiceConfig(voice_name='Aoede')
                }
            )
        )
    )
)
```

## Resources

- [Gemini TTS Documentation](https://ai.google.dev/gemini-api/docs/speech-generation)
- [Gemini 2.5 TTS Announcement](https://blog.google/technology/developers/gemini-2-5-text-to-speech/)
- [Google GenAI Python SDK](https://github.com/google-gemini/generative-ai-python)
- [Gemini API Cookbook](https://github.com/google-gemini/cookbook)

## Next Steps

1. ✅ Generate audio files
2. Review and adjust if needed
3. Combine into single file (optional)
4. Test with presentation
5. Record final video with screen capture
6. Export as MP4 for distribution

---

**Questions or issues?** Check the troubleshooting section or refer to the official Gemini API documentation.
