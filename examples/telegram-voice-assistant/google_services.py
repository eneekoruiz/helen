import base64
from email.mime.text import MIMEText
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

import config

# Alcances (Scopes) necesarios para interactuar con tus servicios de Google
SCOPES = [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/tasks",
]

def get_google_credentials() -> Optional[Credentials]:
    """
    Obtiene o renueva las credenciales OAuth 2.0 del usuario.
    Guarda la sesión en token.json para no tener que volver a iniciar sesión.
    """
    creds = None
    if config.TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(config.TOKEN_FILE), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(config.TOKEN_FILE, "w", encoding="utf-8") as token_file:
                token_file.write(creds.to_json())
        elif config.CREDENTIALS_FILE.exists():
            flow = InstalledAppFlow.from_client_secrets_file(str(config.CREDENTIALS_FILE), SCOPES)
            try:
                creds = flow.run_local_server(port=0, prompt="consent", access_type="offline")
            except Exception:
                creds = flow.run_local_server(port=8080, prompt="consent", access_type="offline")
            with open(config.TOKEN_FILE, "w", encoding="utf-8") as token_file:
                token_file.write(creds.to_json())
        else:
            return None

    return creds

# --- GMAIL ---
def search_emails(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    """Busca correos en Gmail (ej: 'is:unread', 'from:jefe', 'factura')."""
    creds = get_google_credentials()
    if not creds:
        return [{"error": "Google Workspace no está autenticado aún. Se requiere credentials.json."}]
    
    try:
        service = build("gmail", "v1", credentials=creds)
        results = service.users().messages().list(userId="me", q=query, maxResults=max_results).execute()
        messages = results.get("messages", [])
        
        email_summaries = []
        for msg_info in messages:
            msg = service.users().messages().get(userId="me", id=msg_info["id"], format="metadata",
                                                 metadataHeaders=["From", "Subject", "Date"]).execute()
            headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
            email_summaries.append({
                "id": msg["id"],
                "remitente": headers.get("From", "Desconocido"),
                "asunto": headers.get("Subject", "(Sin asunto)"),
                "fecha": headers.get("Date", ""),
                "fragmento": msg.get("snippet", "")
            })
        return email_summaries if email_summaries else [{"info": f"No se encontraron correos para la búsqueda: '{query}'"}]
    except Exception as e:
        return [{"error": f"Error al buscar correos en Gmail: {str(e)}"}]

def send_email(to: str, subject: str, body: str) -> Dict[str, Any]:
    """Envía un correo electrónico desde tu cuenta de Gmail."""
    creds = get_google_credentials()
    if not creds:
        return {"error": "Google Workspace no está autenticado aún."}
    
    try:
        service = build("gmail", "v1", credentials=creds)
        message = MIMEText(body)
        message["to"] = to
        message["subject"] = subject
        raw_msg = base64.urlsafe_b64encode(message.as_bytes()).decode()
        sent = service.users().messages().send(userId="me", body={"raw": raw_msg}).execute()
        return {"status": "success", "message": f"Correo enviado a {to} con éxito.", "id": sent["id"]}
    except Exception as e:
        return {"error": f"Error al enviar correo: {str(e)}"}

# --- GOOGLE CALENDAR ---
def list_calendar_events(days_ahead: int = 7) -> List[Dict[str, Any]]:
    """Consulta los próximos eventos o citas agendadas en tu Google Calendar."""
    creds = get_google_credentials()
    if not creds:
        return [{"error": "Google Workspace no está autenticado aún."}]
    
    try:
        service = build("calendar", "v3", credentials=creds)
        now = datetime.now(timezone.utc)
        until = now + timedelta(days=days_ahead)
        
        events_result = service.events().list(
            calendarId="primary",
            timeMin=now.isoformat(),
            timeMax=until.isoformat(),
            maxResults=15,
            singleEvents=True,
            orderBy="startTime"
        ).execute()
        
        events = events_result.get("items", [])
        if not events:
            return [{"info": f"No tienes eventos programados en los próximos {days_ahead} días."}]
        
        clean_events = []
        for event in events:
            start = event["start"].get("dateTime", event["start"].get("date"))
            clean_events.append({
                "titulo": event.get("summary", "(Sin título)"),
                "inicio": start,
                "descripcion": event.get("description", ""),
                "id": event.get("id")
            })
        return clean_events
    except Exception as e:
        return [{"error": f"Error al leer calendario: {str(e)}"}]

def create_calendar_event(summary: str, start_iso: str, end_iso: str, description: str = "") -> Dict[str, Any]:
    """
    Crea un evento en tu Google Calendar.
    Formatos de fecha: ISO 8601, ej: '2026-10-15T10:00:00+02:00'
    """
    creds = get_google_credentials()
    if not creds:
        return {"error": "Google Workspace no está autenticado aún."}
    
    try:
        service = build("calendar", "v3", credentials=creds)
        event_body = {
            "summary": summary,
            "description": description,
            "start": {"dateTime": start_iso},
            "end": {"dateTime": end_iso},
        }
        event = service.events().insert(calendarId="primary", body=event_body).execute()
        return {"status": "success", "message": f"Evento '{summary}' creado correctamente.", "link": event.get("htmlLink")}
    except Exception as e:
        return {"error": f"Error al crear evento en calendario: {str(e)}"}

# --- GOOGLE TASKS (RECORDATORIOS / TAREAS) ---
def list_tasks() -> List[Dict[str, Any]]:
    """Lista las tareas pendientes y recordatorios en Google Tasks."""
    creds = get_google_credentials()
    if not creds:
        return [{"error": "Google Workspace no está autenticado aún."}]
    
    try:
        service = build("tasks", "v1", credentials=creds)
        results = service.tasks().list(tasklist="@default", showCompleted=False, maxResults=15).execute()
        items = results.get("items", [])
        if not items:
            return [{"info": "No tienes tareas pendientes en tu lista."}]
        
        return [{"titulo": item.get("title", ""), "notas": item.get("notes", ""), "vence": item.get("due", "")} for item in items]
    except Exception as e:
        return [{"error": f"Error al leer Google Tasks: {str(e)}"}]

def create_task(title: str, notes: str = "", due_iso: Optional[str] = None) -> Dict[str, Any]:
    """Crea una nueva tarea o recordatorio en Google Tasks."""
    creds = get_google_credentials()
    if not creds:
        return {"error": "Google Workspace no está autenticado aún."}
    
    try:
        service = build("tasks", "v1", credentials=creds)
        task_body = {"title": title, "notes": notes}
        if due_iso:
            task_body["due"] = due_iso
            
        created = service.tasks().insert(tasklist="@default", body=task_body).execute()
        return {"status": "success", "message": f"Tarea '{title}' añadida correctamente a tus recordatorios."}
    except Exception as e:
        return {"error": f"Error al crear tarea: {str(e)}"}

# --- GOOGLE DRIVE ---
def search_drive_files(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    """Busca archivos en Google Drive por nombre o palabra clave."""
    creds = get_google_credentials()
    if not creds:
        return [{"error": "Google Workspace no está autenticado aún."}]
    
    try:
        service = build("drive", "v3", credentials=creds)
        q_filter = f"name contains '{query}' and trashed = false"
        results = service.files().list(
            q=q_filter,
            pageSize=max_results,
            fields="files(id, name, mimeType, webViewLink, modifiedTime)"
        ).execute()
        
        files = results.get("files", [])
        if not files:
            return [{"info": f"No se encontraron archivos en Google Drive que coincidan con '{query}'."}]
        
        return [{
            "nombre": f.get("name"),
            "tipo": f.get("mimeType"),
            "enlace": f.get("webViewLink"),
            "modificado": f.get("modifiedTime")
        } for f in files]
    except Exception as e:
        return [{"error": f"Error al buscar en Google Drive: {str(e)}"}]
