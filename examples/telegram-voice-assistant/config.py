import os
from pathlib import Path
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

# Configuración de IA y Telegram
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash").strip()
VOICE_NAME = os.getenv("VOICE_NAME", "es-ES-AlvaroNeural").strip()

# Usuarios autorizados en Telegram (seguridad)
raw_ids = os.getenv("ALLOWED_TELEGRAM_USER_IDS", "").strip()
ALLOWED_TELEGRAM_USER_IDS = [
    int(x.strip()) for x in raw_ids.split(",") if x.strip().isdigit()
]

# Rutas de Google Workspace
CREDENTIALS_FILE = BASE_DIR / "credentials.json"
TOKEN_FILE = BASE_DIR / "token.json"

# Directorio temporal para audios entrantes y salientes
TEMP_AUDIO_DIR = BASE_DIR / "temp_audio"
TEMP_AUDIO_DIR.mkdir(exist_ok=True)

def is_google_configured() -> bool:
    """Verifica si las credenciales de Google OAuth están presentes."""
    return CREDENTIALS_FILE.exists() or TOKEN_FILE.exists()

def validate_basic_config():
    """Valida las variables mínimas para arrancar el bot."""
    missing = []
    if not GEMINI_API_KEY or GEMINI_API_KEY == "tu_gemini_api_key_aqui":
        missing.append("GEMINI_API_KEY (en archivo .env)")
    if not TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN == "tu_telegram_bot_token_aqui":
        missing.append("TELEGRAM_BOT_TOKEN (en archivo .env)")
    return missing
