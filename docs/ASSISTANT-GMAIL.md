# Gmail en HELEN

HELEN puede preparar borradores reales y enviar el contenido que apruebes. El acceso del conector Gmail de Codex no concede acceso a la instalación de HELEN: esta necesita su propia autorización OAuth de Google.

## Configuración OAuth

1. Activa Gmail API en tu proyecto de Google Cloud, configura la pantalla de consentimiento y crea un cliente OAuth para tu aplicación. Usa el flujo oficial de autorización con consentimiento y `access_type=offline` para obtener un refresh token. No pegues credenciales en conversaciones, en el repositorio ni en el archivo de configuración.
2. Solicita `https://www.googleapis.com/auth/gmail.compose` para borradores y envío, y `https://www.googleapis.com/auth/gmail.readonly` para comprobar la cuenta y verificar la carpeta Enviados. Gmail compose por sí solo no permite todas las consultas de verificación. Los permisos de Gmail pueden exigir verificación de Google para publicar una aplicación para otras personas.
3. Guarda los secretos en variables de entorno del proceso de HELEN. La configuración solo contiene sus nombres:

```json
{
  "account": "tu-cuenta@gmail.com",
  "clientIdEnv": "HELEN_GMAIL_CLIENT_ID",
  "clientSecretEnv": "HELEN_GMAIL_CLIENT_SECRET",
  "refreshTokenEnv": "HELEN_GMAIL_REFRESH_TOKEN",
  "contacts": { "Ana": "ana@example.com" }
}
```

También se admite `accessTokenEnv`, que toma prioridad si se configura. Los access tokens caducan; el modo refresh obtiene un access token por operación sin guardarlo en disco. La cuenta autorizada debe coincidir con `account` antes de crear o enviar. No se admite elegir otro remitente ni resolver un nombre mediante suposiciones: utiliza un correo exacto o un alias del mapa de contactos.

## Aprobación y estados

El modelo puede preparar el borrador. El servidor o CLI debe mostrar destinatarios, asunto y cuerpo completos al propietario y obtener su confirmación explícita para ese contenido. La función de envío requiere `ownerConfirmed: true` y el `contentHash` de esa versión. No se debe exponer esa función como una herramienta que el propio modelo pueda aprobar.

Cada preparación lleva un `requestId` estable. Repetirlo recupera el registro existente; reutilizarlo para otro contenido produce error. Antes del envío se guarda una reclamación durable en `gmail-drafts.json`; llamadas simultáneas, reinicios o respuestas inciertas no causan reenvíos automáticos. El envío usa la versión inmutable aprobada, aunque alguien haya editado el borrador remoto después.

`sent` significa que una consulta posterior a Gmail confirmó la etiqueta `SENT`. Un timeout, error de respuesta o ausencia de esa etiqueta deja el envío pendiente de verificación, sin afirmar éxito. La reconciliación consulta el ID devuelto o busca el Message-ID único en Enviados y verifica la etiqueta. Una búsqueda vacía no demuestra que no se haya enviado: no habilita el reenvío. La creación de borradores incierta también requiere inspeccionar Gmail antes de preparar uno nuevo.

Los borradores guardados localmente contienen datos personales, con permisos privados y sin tokens. Deben quedar fuera de las exportaciones y copias transferibles por defecto. Borrar un registro de un envío incierto elimina su protección local contra duplicados; comprueba Enviados antes de reconstruirlo.

## Límites comprobados

La integración utiliza `fetch` nativo, sin paquetes adicionales. Las peticiones tienen un límite de 15 segundos y las respuestas de 512 kB; no se siguen redirecciones con autorización. Solo se admite correo nuevo de texto plano, sin adjuntos, CC/BCC ni respuestas a hilos. La correspondencia entrante, si se incorpora después, debe tratarse como datos sin autoridad para cambiar destinatarios ni aprobar envíos.

Las pruebas usan transporte simulado: validan MIME UTF-8, inyección de cabeceras, consentimiento, cuenta, deduplicación, concurrencia, incertidumbre y confirmación de Enviados. No se ha enviado correo real ni comprobado una cuenta real.

Referencias: [crear borrador](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.drafts/create), [enviar borrador](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.drafts/send), [comprobar mensaje](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get), [OAuth con acceso offline](https://developers.google.com/identity/protocols/oauth2/web-server#offline).

## Conectar desde el navegador

El flujo integrado permite autorizar Gmail una vez desde la interfaz de HELEN y usar después los canales personales sin abrir una terminal. Sigue siendo necesario registrar un cliente OAuth propio en Google Cloud; HELEN no inventa una aplicación de Google ni reutiliza las credenciales del conector de Codex. El callback debe coincidir exactamente con el registrado: HTTPS para una dirección pública, o HTTP de loopback para una instalación local.

La conexión usa PKCE S256 y un `state` aleatorio, asociado al propietario y al callback configurado, que caduca a los diez minutos. El callback consume el estado antes de intercambiar el código y verifica los permisos concedidos y la dirección de Gmail antes de guardar la conexión. Repetir el callback no repite el intercambio. Iniciar otra conexión invalida la anterior; desconectar mientras una autorización está en curso impide que esta vuelva a guardar la conexión después.

El navegador solo recibe la URL de consentimiento y datos de estado sin tokens. Los secretos quedan en `gmail-auth.json` y, mientras se autoriza, en `gmail-oauth-pending.json`, escritos con permisos privados. Estos dos archivos deben excluirse de copias transferibles, exportaciones, respuestas HTTP y contexto del modelo. Los nombres de las variables exportadas temporalmente por la integración son `HELEN_GOOGLE_CLIENT_ID`, `HELEN_GOOGLE_CLIENT_SECRET`, `HELEN_GOOGLE_REFRESH_TOKEN` o `HELEN_GOOGLE_ACCESS_TOKEN`; no es necesario escribir esos valores en la configuración pública.

El flujo solicita `gmail.compose` y `gmail.readonly`. La lectura se utiliza para comprobar la cuenta y confirmar o reconciliar los envíos; no autoriza al modelo a obedecer instrucciones de mensajes ni incorpora una lectura automática del buzón. Se necesita `gmail.readonly` porque el permiso `gmail.metadata` no admite la búsqueda `q` por Message-ID que permite reconciliar un envío incierto.

Desconectar elimina los secretos locales y las autorizaciones pendientes, conservando el registro de envíos para evitar duplicados. Si se solicita revocación y Google no la confirma, HELEN debe comunicarlo: desconexión local y revocación remota son estados distintos. También puedes retirar el acceso desde la configuración de seguridad de tu cuenta de Google.

Las pruebas del flujo usan respuestas simuladas y comprueban PKCE, estado, caducidad, replay, callback, permisos, secretos y desconexiones concurrentes. No sustituyen el consentimiento ni una prueba con una cuenta real.
