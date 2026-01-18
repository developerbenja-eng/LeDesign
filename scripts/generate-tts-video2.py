#!/usr/bin/env python3
"""
Generate TTS audio for LeDesign Video 2: "The Chilean Engineering Revolution"
Using Gemini 2.5 Flash TTS with Charon voice at 1.2x speed
"""

import os
import wave
from google import genai
from google.genai import types

# Initialize Gemini client
GEMINI_API_KEY = os.getenv('GOOGLE_GEMINI_API_KEY', 'AIzaSyD2SutN1FH4wAgKE41i-dvmkzA9WqrNfYA')
client = genai.Client(api_key=GEMINI_API_KEY)

# Model and voice configuration
MODEL = "gemini-2.5-flash-preview-tts"
VOICE_NAME = "Charon"  # Informative voice, ideal for professional presentations

# Output directory
OUTPUT_DIR = "presentation-audio-video2"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Speed configuration - 20% faster for dynamic delivery
SPEED_INSTRUCTION = "Speak at a brisk, energetic pace, about 20% faster than normal conversation while maintaining clarity."

# Video 2 script with style prompts
SLIDES = {
    "01_hook": {
        "text": "Las herramientas globales de ingeniería cuestan 25 mil dólares al año, pero no entienden las normas chilenas, los datos de la DGA, ni los formatos del MOP. Hay una mejor manera.",
        "style": f"{SPEED_INSTRUCTION} Confident and attention-grabbing. Emphasize '25 mil dólares' with concern, build intrigue on 'hay una mejor manera.'",
        "duration": 8
    },
    "02_fragmentation": {
        "text": "Civil 3D, HEC-RAS, ETABS, Word, Excel... cuatro programas que no se comunican. Duplicas datos, copias resultados manualmente, pierdes 40 horas por proyecto en trabajo que debería ser automático.",
        "style": f"{SPEED_INSTRUCTION} Matter-of-fact, building frustration. List tools with slight pauses. Emphasize '40 horas' and 'automático.'",
        "duration": 12
    },
    "03_chilean_gap": {
        "text": "En Chile es peor. NCh 433 para diseño sísmico, datos de la DGA para hidrología, manuales del MOP para carreteras, formatos de la DOM para permisos. Las herramientas globales no integran nada de esto.",
        "style": f"{SPEED_INSTRUCTION} Serious and emphatic. Clearly pronounce 'NCh 433' as 'ene-ce-hache cuatro-tres-tres', 'DGA', 'MOP', and 'DOM' as separate letters. Emphasize 'nada de esto' with concern.",
        "duration": 13
    },
    "04_ai_breakthrough": {
        "text": "Antes, solo empresas gigantes como Autodesk podían construir software ingenieril. Ahora, con IA moderna, equipos pequeños pueden crear plataformas enterprise diseñadas cien por ciento para Chile, con feedback implementado en días, no años.",
        "style": f"{SPEED_INSTRUCTION} Confident and inspiring. Emphasize 'IA moderna', 'cien por ciento para Chile', and the contrast 'días, no años.'",
        "duration": 14
    },
    "05_solution": {
        "text": "LeDesign integra todo: análisis de terreno, diseño estructural según NCh 433, hidráulica con datos de la DGA, diseño vial siguiendo manuales MOP, y pavimentos. Treinta integraciones de datos chilenos, memorias generadas en 30 segundos, todo en una plataforma programática y colaborativa.",
        "style": f"{SPEED_INSTRUCTION} Energetic and informative. List modules with rhythm. Emphasize '30 integraciones', '30 segundos', and 'una plataforma.'",
        "duration": 18
    },
    "06_cost_revolution": {
        "text": "El stack tradicional cuesta entre 25 mil y 46 mil dólares al año. LeDesign: mil doscientos dólares. Eso es un ahorro del 95 por ciento. Más de 40 mil dólares recuperados cada año.",
        "style": f"{SPEED_INSTRUCTION} Confident and emphatic. Clearly state the numbers. Emphasize '95 por ciento' and '40 mil dólares recuperados.'",
        "duration": 14
    },
    "07_time_transformation": {
        "text": "De 40 horas de trabajo por proyecto a solo 2 horas. Datos cargados automáticamente desde IDE Chile, memorias generadas al instante, especificaciones técnicas listas en minutos. 95 por ciento de tiempo recuperado.",
        "style": f"{SPEED_INSTRUCTION} Enthusiastic and fast-paced. Emphasize the transformation '40 horas' to '2 horas' and '95 por ciento.'",
        "duration": 13
    },
    "08_vision": {
        "text": "El futuro: inicia proyectos desde tu teléfono en terreno, con DEM y datos satelitales al instante. Colaboración en tiempo real. Todo diseñado por ingenieros chilenos, para ingenieros chilenos.",
        "style": f"{SPEED_INSTRUCTION} Inspirational and forward-looking. Emphasize 'desde tu teléfono', 'tiempo real', and 'ingenieros chilenos para ingenieros chilenos.'",
        "duration": 10
    },
    "09_cta": {
        "text": "Únete a más de 2,500 ingenieros chilenos que ya están diseñando más rápido. Cincuenta por ciento de descuento primeros tres meses. Visita ledesign punto cl.",
        "style": f"{SPEED_INSTRUCTION} Even faster, very punchy and energetic like a commercial. Emphasize '2,500 ingenieros', 'cincuenta por ciento de descuento', and clearly state 'ledesign punto cl.'",
        "duration": 8
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
    print(f"   Style: {slide_data['style'][:80]}...")

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
    print("🎬 LeDesign Video 2 TTS Generation")
    print("   'The Chilean Engineering Revolution'")
    print("=" * 60)
    print(f"Model: {MODEL}")
    print(f"Voice: {VOICE_NAME}")
    print(f"Speed: 1.2x (via natural language)")
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
        print("\nSlides generated:")
        print("  01_hook.wav - Hook (8s)")
        print("  02_fragmentation.wav - Fragmentation Problem (12s)")
        print("  03_chilean_gap.wav - Chilean Gap (13s)")
        print("  04_ai_breakthrough.wav - AI Breakthrough (14s)")
        print("  05_solution.wav - LeDesign Solution (18s)")
        print("  06_cost_revolution.wav - Cost Revolution (14s)")
        print("  07_time_transformation.wav - Time Transformation (13s)")
        print("  08_vision.wav - The Vision (10s)")
        print("  09_cta.wav - Call to Action (8s)")
        print("\nEstimated total duration: ~110 seconds (1:50)")
        print("\nNext steps:")
        print("1. Review audio files")
        print("2. Combine audio files with ffmpeg if needed")
        print("3. Create presentation slides")
        print("4. Build video page at /presentation/video2")
    else:
        print(f"\n⚠️  Warning: Only {success_count}/{total_count} slides generated successfully")

    return success_count == total_count

if __name__ == "__main__":
    # Check if API key is set
    if not GEMINI_API_KEY:
        print("❌ Error: GOOGLE_GEMINI_API_KEY not set")
        print("Set it in .env file or export GOOGLE_GEMINI_API_KEY=your_key")
        exit(1)

    # Generate all audio slides
    success = generate_all_slides()

    exit(0 if success else 1)
