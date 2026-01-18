#!/usr/bin/env python3
"""
Generate TTS audio for LeDesign presentation using Gemini 2.5 Flash TTS
Latest model: gemini-2.5-flash-preview-tts (December 2025)
"""

import os
import wave
import struct
from google import genai
from google.genai import types

# Initialize Gemini client
GEMINI_API_KEY = os.getenv('GOOGLE_GEMINI_API_KEY', 'AIzaSyD2SutN1FH4wAgKE41i-dvmkzA9WqrNfYA')
client = genai.Client(api_key=GEMINI_API_KEY)

# Model to use
MODEL = "gemini-2.5-flash-preview-tts"

# Voice config - Professional voices for business content:
# - Charon: Informative (recommended for professional/technical)
# - Alnilam: Firm (confident, authoritative)
# - Rasalgethi: Informative (alternative professional)
VOICE_NAME = "Charon"  # Informative voice, ideal for professional presentations

# Output directory
OUTPUT_DIR = "presentation-audio"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Speed configuration - All slides will be spoken 20% faster for dynamic delivery
SPEED_INSTRUCTION = "Speak at a brisk, energetic pace, about 20% faster than normal conversation while maintaining clarity."

# Presentation script with style prompts
SLIDES = {
    "01_hook": {
        "text": "¿Sabías que los ingenieros chilenos pierden el 40% de su tiempo alternando entre múltiples herramientas de diseño? Es hora de cambiar eso.",
        "style": f"{SPEED_INSTRUCTION} Professional and attention-grabbing. Start with curiosity, emphasize '40%' with concern, end with confidence on 'Es hora de cambiar eso.'",
        "duration": 5
    },
    "02_problem": {
        "text": "AutoCAD, Civil 3D, SAP2000, HEC-RAS, planillas de Excel... cada proyecto requiere seis herramientas diferentes. Eso significa más de 5 mil dólares al año en licencias, y 15 horas perdidas cada semana en cambios de contexto.",
        "style": f"{SPEED_INSTRUCTION} Matter-of-fact and building frustration. List tools with slight pauses, emphasize the costs '5 mil dólares' and '15 horas' to highlight the pain.",
        "duration": 8
    },
    "03_solution": {
        "text": "LeDesign es la solución. Una plataforma unificada que integra todo: análisis de terreno, diseño estructural, hidráulica y pavimentos. Todo en un solo lugar, diseñado específicamente para ingenieros chilenos.",
        "style": f"{SPEED_INSTRUCTION} Confident and reassuring. Emphasize 'LeDesign' and 'todo en un solo lugar' with excitement. Speak with pride on 'ingenieros chilenos'.",
        "duration": 7
    },
    "04_features": {
        "text": "Con LeDesign, obtienes análisis de terreno completo: importa archivos DWG, genera superficies automáticamente desde datos del IDE Chile, y calcula volúmenes de corte y relleno al instante. Diseño estructural según normas chilenas: vigas, losas, muros y cimentaciones que cumplen con NCh 430, NCh 433 y NCh 1537. Hidráulica integrada: diseña canales, alcantarillas y sistemas de drenaje siguiendo el Manual de Carreteras del MOP. Y diseño de pavimentos: método AASHTO 93 y análisis chileno, con cálculo automático de espesores y generación de planos.",
        "style": f"{SPEED_INSTRUCTION} Informative but energetic, not monotone. Maintain steady pace but add slight emphasis on each module name. Pronounce technical terms clearly (DWG, NCh, AASHTO).",
        "duration": 29
    },
    "05_value": {
        "text": "Con LeDesign, ahorras más de 15 horas cada semana, reduces tus costos en un 60%, y trabajas con precisión total según normas chilenas. Todo con soporte en español, diseñado por ingenieros chilenos para ingenieros chilenos.",
        "style": f"{SPEED_INSTRUCTION} Enthusiastic and confident. Emphasize benefits: '15 horas', '60%', 'ingenieros chilenos para ingenieros chilenos' with pride.",
        "duration": 8
    },
    "06_cta": {
        "text": "Comienza hoy. Prueba gratis 14 días. Planes desde 50 dólares mensuales. Visita ledesign punto cl.",
        "style": f"{SPEED_INSTRUCTION} Even faster and more energetic. Speak very quickly with excitement. Brief pauses only after each sentence. Keep it punchy and dynamic like a commercial. Emphasize 'ledesign punto cl' clearly but quickly.",
        "duration": 5
    }
}

def pcm_to_wav(pcm_data: bytes, output_path: str, sample_rate: int = 24000):
    """
    Convert PCM audio data to WAV file format

    Args:
        pcm_data: Raw PCM audio bytes
        output_path: Path to save WAV file
        sample_rate: Sample rate (default 24000 Hz for Gemini TTS)
    """
    # Gemini TTS outputs 16-bit PCM mono audio
    num_channels = 1
    sample_width = 2  # 16-bit = 2 bytes

    with wave.open(output_path, 'wb') as wav_file:
        wav_file.setnchannels(num_channels)
        wav_file.setsampwidth(sample_width)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm_data)

    print(f"✅ Saved: {output_path}")

def generate_slide_audio(slide_id: str, slide_data: dict):
    """
    Generate TTS audio for a single slide

    Args:
        slide_id: Slide identifier (e.g., '01_hook')
        slide_data: Dict with 'text', 'style', and 'duration'
    """
    print(f"\n🎙️  Generating audio for {slide_id}...")
    print(f"   Text: {slide_data['text'][:60]}...")
    print(f"   Style: {slide_data['style'][:60]}...")

    # Construct prompt with style instructions
    prompt = f"""Style: {slide_data['style']}

Language: Spanish (Latin American, Chilean accent)

Text: {slide_data['text']}"""

    try:
        # Generate audio using Gemini 2.5 Flash TTS
        response = client.models.generate_content(
            model=MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(
                            voice_name=VOICE_NAME
                        )
                    )
                )
            )
        )

        # Extract audio data from response
        # The response contains audio in PCM format at 24000 Hz
        audio_data = b''
        for part in response.candidates[0].content.parts:
            if hasattr(part, 'inline_data') and part.inline_data:
                audio_data += part.inline_data.data

        if not audio_data:
            print(f"❌ No audio data generated for {slide_id}")
            return False

        # Save as WAV file
        output_path = os.path.join(OUTPUT_DIR, f"{slide_id}.wav")
        pcm_to_wav(audio_data, output_path)

        return True

    except Exception as e:
        print(f"❌ Error generating audio for {slide_id}: {e}")
        return False

def generate_all_slides():
    """Generate audio for all presentation slides"""
    print("=" * 60)
    print("🎬 LeDesign Presentation TTS Generation")
    print("=" * 60)
    print(f"Model: {MODEL}")
    print(f"Voice: {VOICE_NAME}")
    print(f"Output: {OUTPUT_DIR}/")
    print("=" * 60)

    success_count = 0
    total_count = len(SLIDES)

    for slide_id, slide_data in SLIDES.items():
        if generate_slide_audio(slide_id, slide_data):
            success_count += 1

    print("\n" + "=" * 60)
    print(f"✅ Completed: {success_count}/{total_count} slides generated")
    print("=" * 60)

    if success_count == total_count:
        print("\n🎉 All audio files generated successfully!")
        print(f"\n📂 Audio files saved to: {OUTPUT_DIR}/")
        print("\nNext steps:")
        print("1. Review audio files: 01_hook.wav through 06_cta.wav")
        print("2. Test with presentation at http://localhost:4000/presentation")
        print("3. Combine audio files if needed using ffmpeg:")
        print(f"   ffmpeg -i concat:$(ls {OUTPUT_DIR}/*.wav | tr '\\n' '|') -acodec copy {OUTPUT_DIR}/full_presentation.wav")
    else:
        print(f"\n⚠️  Warning: Only {success_count}/{total_count} slides generated successfully")

    return success_count == total_count

def apply_ffmpeg_speedup(input_dir: str = OUTPUT_DIR, speedup: float = 1.2):
    """
    Optional: Apply FFmpeg speed adjustment to all audio files
    Use this if natural language speed control isn't sufficient

    Args:
        input_dir: Directory containing audio files
        speedup: Speed multiplier (e.g., 1.2 = 20% faster)
    """
    print(f"\n⚡ Applying {speedup}x speed adjustment with FFmpeg...")

    import subprocess
    import os

    for filename in os.listdir(input_dir):
        if filename.endswith('.wav') and not filename.startswith('fast_'):
            input_path = os.path.join(input_dir, filename)
            output_path = os.path.join(input_dir, f"fast_{filename}")

            cmd = [
                'ffmpeg', '-i', input_path,
                '-filter:a', f'atempo={speedup}',
                '-y',  # Overwrite output
                output_path
            ]

            try:
                subprocess.run(cmd, check=True, capture_output=True)
                print(f"  ✅ Sped up: {filename} → fast_{filename}")
            except subprocess.CalledProcessError as e:
                print(f"  ❌ Failed to speed up {filename}: {e}")

    print("\n💡 Speed-adjusted files saved with 'fast_' prefix")
    print("To use them, rename fast_*.wav to replace originals")

if __name__ == "__main__":
    # Check if API key is set
    if not GEMINI_API_KEY:
        print("❌ Error: GOOGLE_GEMINI_API_KEY not set")
        print("Set it in .env file or export GOOGLE_GEMINI_API_KEY=your_key")
        exit(1)

    # Generate all audio slides
    success = generate_all_slides()

    # Optional: Uncomment to apply additional FFmpeg speed adjustment
    # if success:
    #     print("\n" + "="*60)
    #     apply_ffmpeg_speedup(speedup=1.2)
    #     print("="*60)
