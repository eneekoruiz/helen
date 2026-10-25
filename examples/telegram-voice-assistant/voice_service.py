import re
import uuid
import edge_tts
from pathlib import Path
import config

def clean_markdown_for_speech(text: str) -> str:
    """
    Elimina caracteres especiales de Markdown para que el sintetizador
    de voz lea el texto de forma limpia y natural.
    """
    # Quitar enlaces markdown [texto](url) -> texto
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    # Quitar bloques de código ```...```
    text = re.sub(r'```.*?```', 'código adjunto en el mensaje', text, flags=re.DOTALL)
    # Quitar código inline `código`
    text = re.sub(r'`([^`]+)`', r'\1', text)
    # Quitar encabezados (#, ##, etc.)
    text = re.sub(r'#+\s*', '', text)
    # Quitar negritas y cursivas (* o _)
    text = re.sub(r'[*_~]', '', text)
    # Quitar listas con guiones o asteriscos al inicio de línea
    text = re.sub(r'^\s*[-*•]\s+', '', text, flags=re.MULTILINE)
    # Quitar saltos de línea excesivos
    text = re.sub(r'\n{2,}', '. ', text)
    text = re.sub(r'\n', ' ', text)
    return text.strip()

async def generate_speech(text: str, voice: str = None) -> Path:
    """
    Sintetiza texto a audio MP3 utilizando edge-tts (voces neuronales gratuitas de alta fidelidad).
    """
    clean_text = clean_markdown_for_speech(text)
    if not clean_text:
        clean_text = "Listo."

    voice_to_use = voice or config.VOICE_NAME
    output_filename = f"reply_{uuid.uuid4().hex[:8]}.mp3"
    output_path = config.TEMP_AUDIO_DIR / output_filename

    communicate = edge_tts.Communicate(clean_text, voice_to_use)
    await communicate.save(str(output_path))

    return output_path
