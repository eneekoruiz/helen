import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from google import genai
from google.genai import types

import config
import google_services

logger = logging.getLogger(__name__)

SYSTEM_INSTRUCTION = """
Eres un asistente personal de inteligencia artificial de élite (estilo Jarvis), diseñado para gestionar la vida diaria, el trabajo y la productividad del usuario con máxima eficiencia, calidez y naturalidad.

Tienes herramientas integradas para interactuar directamente con el entorno de Google del usuario:
- Gmail: buscar correos entrantes, leer detalles o enviar correos.
- Google Calendar: consultar eventos y citas agendadas, o programar nuevas citas.
- Google Tasks: revisar listas de tareas pendientes y crear nuevos recordatorios.
- Google Drive: buscar documentos y archivos por nombre o palabras clave.

NORMAS DE INTERACCIÓN:
1. Responde de manera concisa, fluida y conversacional en español.
2. Tus respuestas serán escuchadas como notas de voz o leídas en el móvil. Evita tablas gigantes o sintaxis excesiva de código a menos que el usuario lo solicite expresamente.
3. Si el usuario te pide una acción sobre sus correos, agenda o tareas, utiliza la herramienta correspondiente inmediatamente sin pedir permisos redundantes, salvo para ENVIAR correos salientes donde es buena práctica confirmar el destinatario y el mensaje si no está claro.
4. Siempre que hables de fechas o plazos, toma como referencia la fecha y hora actual que se te proporciona en el contexto.
"""

# Lista ordenada de modelos con fallback automático ante sobrecarga o errores 503/429
DEFAULT_FALLBACK_MODELS = [
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
    "gemini-3.7-flash",
]

class AssistantEngine:
    def __init__(self):
        self._client: Optional[genai.Client] = None
        # Guarda por usuario: { "chat": ChatInstance, "model": str, "history": list }
        self._sessions: Dict[int, Any] = {}

    @property
    def client(self) -> genai.Client:
        if self._client is None:
            if not config.GEMINI_API_KEY:
                raise ValueError("GEMINI_API_KEY no está configurada en el archivo .env.")
            self._client = genai.Client(api_key=config.GEMINI_API_KEY)
        return self._client

    def _get_models_chain(self) -> List[str]:
        """Devuelve la lista ordenada de modelos con el configurado como prioridad."""
        priority = config.GEMINI_MODEL or "gemini-3.5-flash"
        chain = [priority]
        for m in DEFAULT_FALLBACK_MODELS:
            if m not in chain:
                chain.append(m)
        return chain

    def _get_tools(self) -> List[Any]:
        """Devuelve la lista de funciones disponibles como herramientas para Gemini."""
        return [
            google_services.search_emails,
            google_services.send_email,
            google_services.list_calendar_events,
            google_services.create_calendar_event,
            google_services.list_tasks,
            google_services.create_task,
            google_services.search_drive_files,
        ]

    def _create_chat_session(self, model_name: str, history: Optional[List[Any]] = None):
        """Crea una sesión de chat con el modelo y herramientas dadas."""
        now_str = datetime.now().strftime("%A %d de %B de %Y, %H:%M:%S")
        sys_prompt = f"{SYSTEM_INSTRUCTION}\n\n[CONTEXTO TEMPORAL ACTUAL]: Hoy es {now_str}."
        
        chat_config = types.GenerateContentConfig(
            system_instruction=sys_prompt,
            tools=self._get_tools(),
            temperature=0.7,
        )
        return self.client.chats.create(
            model=model_name,
            config=chat_config,
            history=history or []
        )

    def _get_or_create_user_session(self, user_id: int):
        """Obtiene la sesión actual del usuario o inicializa una nueva."""
        if user_id not in self._sessions:
            model = self._get_models_chain()[0]
            chat = self._create_chat_session(model)
            self._sessions[user_id] = {
                "chat": chat,
                "model": model,
            }
        return self._sessions[user_id]

    def reset_session(self, user_id: int):
        """Reinicia la memoria de conversación para un usuario."""
        if user_id in self._sessions:
            del self._sessions[user_id]

    async def _send_with_fallback(self, user_id: int, message_payload: Any) -> str:
        """
        Envía un mensaje intentando primero con el modelo actual.
        Si falla por sobrecarga (503, 429, etc.), conmuta automáticamente
        al siguiente modelo disponible conservando todo el historial.
        """
        session_info = self._get_or_create_user_session(user_id)
        current_chat = session_info["chat"]
        current_model = session_info["model"]

        models_chain = self._get_models_chain()
        # Asegurar que el modelo actual sea el primero que intentamos
        ordered_models = [current_model] + [m for m in models_chain if m != current_model]

        last_error = None
        history_snapshot = []
        try:
            history_snapshot = current_chat.get_history()
        except Exception:
            history_snapshot = []

        for model in ordered_models:
            try:
                if model != current_model or current_chat is None:
                    logger.info(f"Conmutando a modelo fallback: {model} para usuario {user_id}")
                    current_chat = self._create_chat_session(model, history=history_snapshot)
                    session_info["chat"] = current_chat
                    session_info["model"] = model

                response = current_chat.send_message(message_payload)
                if response and response.text:
                    return response.text
                return "He recibido tu petición y la he procesado."

            except Exception as e:
                err_msg = str(e)
                logger.warning(f"Error con modelo {model}: {err_msg}. Probando siguiente fallback...")
                last_error = e
                # Preparar para el siguiente intento
                current_model = None
                current_chat = None

        logger.error(f"Todos los modelos de la cadena de fallbacks fallaron. Último error: {last_error}")
        return "Disculpa, hubo una sobrecarga momentánea en los servicios de IA de Google. Por favor, repíteme tu mensaje en unos segundos."

    async def process_text(self, user_id: int, user_message: str) -> str:
        """Procesa una consulta en texto con tolerancia a fallos."""
        return await self._send_with_fallback(user_id, user_message)

    async def process_voice(self, user_id: int, audio_bytes: bytes, mime_type: str = "audio/ogg") -> str:
        """Procesa una nota de voz con tolerancia a fallos."""
        audio_part = types.Part.from_bytes(data=audio_bytes, mime_type=mime_type)
        payload = [
            audio_part,
            "Por favor, escucha atentamente este audio, responde a lo que pido y ejecuta las herramientas pertinentes si es necesario."
        ]
        return await self._send_with_fallback(user_id, payload)

# Instancia singleton
engine = AssistantEngine()
