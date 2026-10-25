import io
import logging
import os
from pathlib import Path
from telegram import Update, constants
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    ContextTypes,
    filters,
)

import config
import voice_service
from ai_engine import engine

# Configurar logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

def is_authorized(user_id: int) -> bool:
    """Verifica si el usuario está en la lista de permitidos."""
    if not config.ALLOWED_TELEGRAM_USER_IDS:
        # Si no se definió ninguna lista, se permite por defecto pero se advierte
        return True
    return user_id in config.ALLOWED_TELEGRAM_USER_IDS

async def check_access(update: Update) -> bool:
    """Valida el acceso del remitente y notifica si está bloqueado."""
    user = update.effective_user
    if not user:
        return False
    if not is_authorized(user.id):
        await update.message.reply_text(
            f"⛔ Acceso denegado. Este es un asistente privado.\n\n"
            f"Tu Telegram ID es: `{user.id}`\n"
            f"Para autorizarte, añade este ID a `ALLOWED_TELEGRAM_USER_IDS` en tu archivo `.env`.",
            parse_mode=constants.ParseMode.MARKDOWN
        )
        return False
    return True

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Mensaje de bienvenida con instrucciones claras."""
    if not await check_access(update):
        return

    google_status = "🟢 Conectado" if config.is_google_configured() else "🟡 Pendiente (ejecuta python setup_google_auth.py)"

    welcome_text = (
        "👋 **¡Hola! Soy tu asistente personal inteligente.**\n\n"
        "Puedo hablar y entender tanto por **texto** como por **notas de voz** en tiempo real.\n\n"
        "🎯 **Lo que puedo hacer por ti:**\n"
        "• 🎙️ **Conversar por voz:** Envíame un audio y te responderé con otra nota de voz.\n"
        "• ✉️ **Gmail:** *'¿Tengo correos importantes hoy?'* o *'Manda un email a Carlos diciéndole...'*.\n"
        "• 📅 **Google Calendar:** *'¿Qué eventos tengo esta semana?'* o *'Agenda cita con el dentista el viernes a las 10am'*.\n"
        "• 📝 **Tareas y Recordatorios:** *'Acuérdame comprar café esta tarde'*.\n"
        "• 📁 **Google Drive:** *'Busca mis facturas o archivos de proyecto'*.\n\n"
        f"🔗 **Estado de Google Workspace:** {google_status}\n\n"
        "Comandos útiles:\n"
        "• `/status` - Ver estado de conexiones y configuración.\n"
        "• `/reset`  - Limpiar la memoria de la conversación actual.\n\n"
        "¡Dime algo o grábame una nota de voz para empezar!"
    )
    await update.message.reply_text(welcome_text, parse_mode=constants.ParseMode.MARKDOWN)

async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Comprueba el estado de todas las integraciones."""
    if not await check_access(update):
        return

    gemini_ok = bool(config.GEMINI_API_KEY and config.GEMINI_API_KEY != "tu_gemini_api_key_aqui")
    google_creds_ok = config.CREDENTIALS_FILE.exists()
    google_token_ok = config.TOKEN_FILE.exists()

    status_msg = (
        "📊 **ESTADO DEL ASISTENTE:**\n\n"
        f"• **Motor de IA (Gemini):** {'🟢 Configurado' if gemini_ok else '🔴 Falta GEMINI_API_KEY'}\n"
        f"• **Modelo en uso:** `{config.GEMINI_MODEL}`\n"
        f"• **Voz TTS seleccionada:** `{config.VOICE_NAME}`\n"
        f"• **Google OAuth (credentials.json):** {'🟢 Presente' if google_creds_ok else '⚪ No encontrado'}\n"
        f"• **Sesión Google (token.json):** {'🟢 Activa' if google_token_ok else '🟡 Requiere autenticar con setup_google_auth.py'}\n"
        f"• **Usuarios autorizados:** `{config.ALLOWED_TELEGRAM_USER_IDS or 'Todos (precaución)'}`\n"
    )
    await update.message.reply_text(status_msg, parse_mode=constants.ParseMode.MARKDOWN)

async def cmd_reset(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Reinicia la memoria de la conversación."""
    if not await check_access(update):
        return
    engine.reset_session(update.effective_user.id)
    await update.message.reply_text("🧹 Memoria de conversación reiniciada. Empezamos de cero.")

async def handle_text_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Maneja mensajes de texto entrantes."""
    if not await check_access(update):
        return

    user_text = update.message.text
    if not user_text:
        return

    await context.bot.send_chat_action(chat_id=update.effective_chat.id, action=constants.ChatAction.TYPING)

    try:
        reply_text = await engine.process_text(update.effective_user.id, user_text)
        await update.message.reply_text(reply_text)
    except Exception as e:
        logger.error(f"Error procesando mensaje de texto: {e}", exc_info=True)
        await update.message.reply_text(f"⚠️ Ocurrió un error al procesar tu solicitud: {str(e)}")

async def handle_voice_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Maneja notas de voz entrantes: procesa el audio, consulta herramientas y responde con voz."""
    if not await check_access(update):
        return

    voice = update.message.voice or update.message.audio
    if not voice:
        return

    # Notificar al usuario que estamos escuchando/grabando
    await context.bot.send_chat_action(chat_id=update.effective_chat.id, action=constants.ChatAction.RECORD_VOICE)

    try:
        # Descargar el archivo de audio de Telegram
        file_obj = await context.bot.get_file(voice.file_id)
        audio_stream = io.BytesIO()
        await file_obj.download_to_memory(out=audio_stream)
        audio_bytes = audio_stream.getvalue()

        # Enviar audio a Gemini (multimodal directo con Function Calling)
        reply_text = await engine.process_voice(
            user_id=update.effective_user.id,
            audio_bytes=audio_bytes,
            mime_type="audio/ogg"
        )

        # Sintetizar la respuesta a audio con edge-tts
        await context.bot.send_chat_action(chat_id=update.effective_chat.id, action=constants.ChatAction.RECORD_VOICE)
        audio_reply_path = await voice_service.generate_speech(reply_text)

        # Enviar tanto la nota de voz como el texto
        with open(audio_reply_path, "rb") as voice_file:
            await update.message.reply_voice(voice=voice_file, caption=None)
        
        # También mandamos el texto por si hay enlaces o para lectura rápida
        await update.message.reply_text(reply_text)

        # Limpiar archivo temporal
        try:
            if audio_reply_path.exists():
                audio_reply_path.unlink()
        except Exception:
            pass

    except Exception as e:
        logger.error(f"Error procesando nota de voz: {e}", exc_info=True)
        await update.message.reply_text(f"⚠️ Ocurrió un error al procesar tu nota de voz: {str(e)}")

def main():
    """Punto de entrada principal para lanzar el bot."""
    missing = config.validate_basic_config()
    if missing:
        print("\n" + "=" * 60)
        print("ERROR DE CONFIGURACIÓN")
        print("Faltan las siguientes variables obligatorias:")
        for item in missing:
            print(f" - {item}")
        print("\nPor favor crea un archivo '.env' copiando '.env.example' y completa tus claves.")
        print("=" * 60 + "\n")
        return

    print("Iniciando Bot de Telegram Asistente...")
    app = Application.builder().token(config.TELEGRAM_BOT_TOKEN).build()

    # Comandos
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("reset", cmd_reset))

    # Mensajes
    app.add_handler(MessageHandler(filters.VOICE | filters.AUDIO, handle_voice_message))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text_message))

    print("Bot en ejecución. Presiona Ctrl + C para detener.")
    app.run_polling()

if __name__ == "__main__":
    main()
