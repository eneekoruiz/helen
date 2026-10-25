# 🤖 Asistente Personal Inteligente (Jarvis) con Voz y Google Workspace

Tu propio asistente personal con IA conectado a **Telegram**, capaz de **hablar y entender notas de voz y texto**, integrado con:
- ✉️ **Gmail** (buscar correos, leer mensajes, redactar y enviar)
- 📅 **Google Calendar** (consultar citas y programar eventos)
- 📝 **Google Tasks / Recordatorios** (gestionar tus listas de pendientes)
- 📁 **Google Drive** (buscar y localizar archivos)

---

## 🚀 Puesta en marcha rápida (Menos de 10 minutos)

### 1. Variables de Entorno (`.env`)
Copia el archivo `.env.example` como `.env`:
```powershell
Copy-Item .env.example .env
```
Abre `.env` y rellena tus claves:
1. **`GEMINI_API_KEY`**: Consíguela gratis e instantáneamente en [Google AI Studio](https://aistudio.google.com/).
2. **`TELEGRAM_BOT_TOKEN`**:
   - Abre Telegram y busca a [@BotFather](https://t.me/BotFather).
   - Escribe `/newbot`, ponle nombre (ej. *Mi Jarvis*) y usuario (ej. *mi_jarvis_personal_bot*).
   - Copia el Token que te da.
3. **`ALLOWED_TELEGRAM_USER_IDS`**:
   - En Telegram, abre [@userinfobot](https://t.me/userinfobot) y pulsa Iniciar para ver tu ID numérico.
   - Pégalo en tu `.env` (así nadie más que tú podrá usar tu bot).

---

### 2. Conectar tu cuenta de Google (Gmail, Calendar, Drive, Tasks)
1. Entra en [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un proyecto (o selecciona uno existente).
3. Ve a **APIs y servicios > Biblioteca** y habilita estas 4 APIs:
   - *Gmail API*
   - *Google Calendar API*
   - *Google Tasks API*
   - *Google Drive API*
4. Ve a **Pantalla de consentimiento de OAuth**:
   - Selecciona **Externo**, pon tu correo y guarda.
   - En **Usuarios de prueba**, añade tu propia dirección de Gmail.
5. Ve a **Credenciales > Crear credenciales > ID de cliente de OAuth**:
   - Tipo de aplicación: **Aplicación de escritorio** (*Desktop App*).
   - Nombre: *Asistente Personal*.
   - Pulsa Crear y **Descargar JSON**.
6. Renombra ese archivo como `credentials.json` y colócalo en la carpeta de este proyecto.

---

### 3. Autorizar Google una sola vez
Ejecuta en tu terminal:
```powershell
python setup_google_auth.py
```
Se abrirá una pestaña en tu navegador para que inicies sesión con tu cuenta de Google y aceptes los permisos. Una vez aceptado, se creará `token.json` automáticamente y no tendrás que volver a iniciar sesión.

---

### 4. Iniciar tu Asistente
```powershell
python bot.py
```

¡Listo! Ve a Telegram, busca a tu bot y pulsa **/start** o envíale un mensaje de voz preguntándole algo como:
- *"Hola, ¿qué correos nuevos tengo hoy?"*
- *"Añade una reunión mañana a las 11:00 am con mi equipo"*
- *"Acuérdame comprar leche esta tarde"*
- *"¿Tengo algún documento sobre presupuestos en mi Drive?"*

---

## 🎙️ ¿Cómo funciona la voz?
- **Al escuchar:** El bot recibe el audio de Telegram y se lo envía a **Gemini 2.5 Flash**, que procesa de forma nativa la entonación, pausas e intenciones y decide qué herramientas ejecutar.
- **Al responder:** El bot genera una respuesta conversacional y la convierte en audio ultranatural en español usando voces neuronales de Microsoft Edge TTS (`es-ES-AlvaroNeural` o la que elijas en tu `.env`), enviándote tanto la nota de voz como el texto.
