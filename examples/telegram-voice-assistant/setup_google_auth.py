"""
Script de autenticación única para Google Workspace (Gmail, Drive, Calendar, Tasks).
Ejecuta este archivo una vez para abrir tu navegador y autorizar a tu asistente personal.
"""

import sys
from pathlib import Path
import config
import google_services

def main():
    print("=" * 60)
    print("CONFIGURADOR DE ACCESO A GOOGLE WORKSPACE")
    print("=" * 60)

    if not config.CREDENTIALS_FILE.exists():
        print("\n[!] ERROR: No se ha encontrado el archivo 'credentials.json'.")
        print("Para generarlo en 3 minutos:")
        print("1. Ve a https://console.cloud.google.com/")
        print("2. Crea un proyecto (ej: 'Mi Asistente')")
        print("3. En 'APIs y servicios' -> 'Biblioteca', activa:")
        print("   - Gmail API")
        print("   - Google Calendar API")
        print("   - Google Tasks API")
        print("   - Google Drive API")
        print("4. En 'Pantalla de consentimiento OAuth', selecciona 'Externo' y pon tu email.")
        print("5. En 'Credenciales' -> 'Crear credenciales' -> 'ID de cliente de OAuth'")
        print("   - Tipo de aplicación: 'Aplicación de escritorio' (Desktop App)")
        print("6. Descarga el JSON y guárdalo como 'credentials.json' en la raíz de este proyecto.")
        sys.exit(1)

    print("\nIniciando proceso de autorización...")
    print("Se abrirá una ventana en tu navegador para que inicies sesión en tu cuenta de Google.")
    
    try:
        creds = google_services.get_google_credentials()
        if creds and creds.valid:
            print("\n[✓] ¡Autenticación exitosa!")
            print(f"[✓] Se ha guardado el token en: {config.TOKEN_FILE}")
            
            print("\nProbando conexiones...")
            print("1. Probando Gmail...")
            emails = google_services.search_emails("is:inbox", max_results=1)
            print(f"   Resultado Gmail: {len(emails)} elemento(s) verificado(s).")

            print("2. Probando Google Calendar...")
            events = google_services.list_calendar_events(days_ahead=3)
            print(f"   Resultado Calendar: {len(events)} elemento(s) verificado(s).")

            print("3. Probando Google Tasks...")
            tasks = google_services.list_tasks()
            print(f"   Resultado Tasks: {len(tasks)} elemento(s) verificado(s).")

            print("4. Probando Google Drive...")
            files = google_services.search_drive_files("", max_results=1)
            print(f"   Resultado Drive: {len(files)} elemento(s) verificado(s).")

            print("\n" + "=" * 60)
            print("¡TODO LISTO! Tu asistente ya tiene acceso a tus servicios de Google.")
            print("=" * 60)
        else:
            print("\n[X] No se pudo obtener credenciales válidas.")
    except Exception as e:
        print(f"\n[X] Ocurrió un error durante la autenticación: {e}")

if __name__ == "__main__":
    main()
