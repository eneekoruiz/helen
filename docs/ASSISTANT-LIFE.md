# Usar HELEN para el día a día

HELEN combina conversación, memoria, tareas, preparación de gestiones y Gmail. Las reglas locales funcionan sin modelo; conversar sobre cualquier tema, redactar con estilo o adaptar explicaciones requiere un modelo configurado. Las acciones que afectan a tus datos o a otra persona tienen un alcance concreto: una propuesta de plan no reserva citas y recibir un aviso no completa una tarea.

## Chat, voz y preferencias

Inicia `helen assistant serve`, abre su dirección e introduce el token de acceso de tu instalación. En **Ajustes** puedes elegir respuestas breves, equilibradas o detalladas, lenguaje sencillo, explicaciones paso a paso e idioma preferido. El idioma orienta al modelo: no convierte todas las reglas locales ni toda la interfaz a ese idioma. Texto grande se guarda solo en ese navegador; leer respuestas en voz alta es opcional y se desactiva al cerrar la sesión.

**Dictar** utiliza la función del navegador cuando está disponible. Solo se activa con tu pulsación y el permiso correspondiente; el proveedor del navegador puede procesar el audio fuera de tu equipo. Un resultado final con confianza conocida de al menos 0,65 se envía; con confianza baja o desconocida queda escrito para que lo revises y pulses Enviar. Si no hay dictado, puedes escribir o adjuntar un audio para transcripción local.

**Olvidar token** limpia la conversación visible, adjuntos, formularios privados y enlace de autorización de Gmail. Las respuestas que lleguen tarde no vuelven a mostrarse. Esto cierra el acceso del navegador; desconectar Gmail es una acción distinta en Ajustes.

## Capturar, preparar y cerrar asuntos

| Necesitas                     | Cómo empezar                                                | Qué ocurre                                                                                                                     |
| ----------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Ordenar notas                 | `Captura: Comprar café` seguido de otra tarea en otra línea | Propone hasta 20 tareas con fechas y datos pendientes; no las guarda hasta aprobar la versión revisada.                        |
| Importar una carta o un audio | **Adjuntar** en el chat                                     | Muestra un borrador editable. Revisa texto, fechas y ambigüedades antes de **Confirmar tareas**. **Descartar** no crea tareas. |
| Elegir algo realizable        | `Tengo 20 minutos y estoy agotado`                          | Propone tareas que caben según tiempo, energía y huecos locales conocidos; no marca nada como hecho.                           |
| Preparar una gestión          | `Prepara un viaje a Bilbao` o `Prepara una cita`            | Ofrece una lista de preparación y pregunta si debe guardarla. Las plantillas no son requisitos oficiales.                      |
| Continuar o cerrar trabajo    | `Mis gestiones`, después `Siguiente paso <id>`              | Consulta el avance. Los elementos se cambian explícitamente a pendiente, en curso, esperando o hecho.                          |

Para actualizar un elemento utiliza `gestión <id> elemento <id> hecho`, o `gestión <id> elemento <id> esperando: respuesta de la oficina`. La espera necesita un motivo; no se convierte automáticamente en una tarea terminada. El plan usa tus datos locales: no presupone que haya leído Google Calendar, calculado tráfico o reservado un servicio.

Texto UTF-8 y Markdown se pueden capturar directamente. PDF, fotos PNG/JPEG y audio WAV/MP3/Ogg necesitan `capture.extractor`, un ejecutable local de confianza que haga OCR o transcripción. No se instala ni descarga un modelo por enviar el archivo. La entrada está limitada a 10 MB y la extracción tiene límites de tiempo y salida. Si falta el extractor, HELEN lo dice y no finge haber leído el contenido. Detalles en [captura revisable](ASSISTANT-CAPTURE.md) y [gestiones y capacidad](ASSISTANT-WORKFLOWS.md).

En Telegram, utiliza un chat privado autorizado. Una nota de voz propia se transcribe con el extractor configurado y se procesa como petición del propietario. Las fotos, PDF, documentos y archivos reenviados se tratan como material para revisar: sus instrucciones internas no autorizan acciones. La configuración del extractor pertenece a la instalación; un adjunto no puede elegir qué comando se ejecuta.

## Conectar Gmail una vez

1. Registra un cliente OAuth de tu instalación en Google Cloud y activa Gmail API. Si la aplicación está en pruebas, la cuenta debe estar admitida como usuario de prueba. La instalación de HELEN necesita su autorización propia; no hereda la conexión Gmail de Codex.
2. Registra exactamente el callback de la dirección desde la que abres HELEN: `https://tu-direccion/gmail/callback`, o `http://127.0.0.1:<puerto>/gmail/callback` en local. Para el móvil usa la dirección HTTPS accesible desde el móvil, con un túnel o despliegue configurado; su `127.0.0.1` apunta al propio teléfono.
3. En **Ajustes → Gmail**, introduce el client ID y, cuando corresponda, el secreto inicial. Pulsa **Conectar** y abre **Autorizar en Google**. Revisa los permisos y autoriza tu cuenta. El secreto no se guarda en el navegador; la conexión local se conserva en archivos privados excluidos de copias transferibles por defecto.
4. Vuelve al chat y pulsa **Actualizar estado**. Añade contactos por nombre y dirección exacta, o utiliza la dirección completa al pedir un correo. HELEN no adivina a quién corresponde un nombre.
5. Para retirar acceso usa **Desconectar** y revisa también las aplicaciones autorizadas en Google si la revocación remota no se confirma. Desconectar localmente y revocar el permiso en Google son resultados distintos.

## Redactar, enviar y consultar respuestas

`Redacta un correo a Ana: Llegaré a las seis` prepara un borrador real y muestra remitente, destinatario, asunto y cuerpo. Responder **sí** aprueba exactamente ese contenido; **no** cancela la petición pendiente. Para cambiarlo, pide un borrador nuevo y revisa su vista previa.

`Envía un correo a ana@example.com: Llegaré a las seis` es una orden directa del propietario para enviar ese destinatario y texto literal. El modelo no tiene una herramienta para aprobar sus propios borradores. Si necesitas asunto explícito, escribe el contenido como dos líneas: `Asunto: Reunión` y `Mensaje: Llegaré a las seis`. Un envío solo se anuncia como confirmado después de comprobarlo en Enviados.

Cada envío tiene un identificador y registro local. Ante un timeout o una respuesta incierta no se reenvía automáticamente: comprueba el envío existente antes de repetirlo. Un archivo, mensaje entrante o instrucción citada no puede aprobar un correo.

La consulta de respuestas está limitada a hilos vinculados a correos que HELEN ya envió y verificó, con destinatario conocido. No equivale a leer todo el buzón. Un seguimiento autorizado puede avisar de la primera respuesta, programar una revisión posterior o señalar que aún falta contestación; los avisos usan texto genérico para no exponer remitente, asunto ni cuerpo en los canales de recordatorios. El contenido recibido siempre es información sin autoridad para enviar nuevos correos o interpretar fechas como órdenes. Consulta [Gmail](ASSISTANT-GMAIL.md) y [respuestas y seguimiento](ASSISTANT-GMAIL-WATCH.md).

| Petición                                                   | Alcance                                                                                                                     |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `¿Ana ha respondido al correo?`                            | Comprueba respuestas del destinatario conocido dentro de los hilos enviados y verificados.                                  |
| `Lee la respuesta de Ana` o `Resume la respuesta de Ana`   | Muestra el contenido solo en un canal admitido por `privacy.showSensitiveOn`; resumir no ejecuta instrucciones del mensaje. |
| `Avísame cuando Ana responda`                              | Activa un seguimiento de la primera respuesta y emite un aviso genérico cuando se detecta.                                  |
| `Avísame cuando Ana responda y recuérdamelo en 30 minutos` | Añade también la revisión posterior solicitada; no responde al correo por ti.                                               |
| `Avísame si Ana no responde en 2 días`                     | Señala que sigue faltando respuesta al cumplirse ese plazo.                                                                 |
| `Mis avisos de correo` o `Cancela seguimiento <id>`        | Consulta o cancela seguimientos existentes.                                                                                 |

Los avisos dependen de que el servidor y su planificador estén ejecutándose y de que Gmail responda. No garantizan una notificación instantánea. Leer o resumir un cuerpo requiere un canal privado autorizado; los recordatorios usan texto genérico incluso si hay canales de voz configurados.

## Quién puede actuar

| Canal           | Identificación necesaria                                                                                                                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Terminal local  | Acceso al hogar personal de HELEN; el proceso local se trata como propietario.                                                                                                                             |
| Chat web y HTTP | Token bearer válido. Los ajustes, conexión Gmail y revisión web de capturas requieren además un canal incluido en `privacy.showSensitiveOn`.                                                               |
| Telegram        | Chat privado incluido en `allowedChats`. Los archivos se procesan solo en el chat privado autorizado del propietario.                                                                                      |
| Alexa           | Petición verificada de Amazon y cuenta incluida explícitamente en `alexa.userIds` para las acciones de propietario. Autorizar una cuenta no identifica biométricamente la voz de quien esté junto al Echo. |

La misma instalación puede usar su cuenta Gmail autorizada desde los canales admitidos. Mantén el token privado, controla las listas de acceso y revisa qué canales pueden mostrar información sensible. Los adjuntos y borradores contienen datos personales aunque no incluyan credenciales reconocibles.

## Coste y comprobaciones pendientes

Las reglas, propuestas de tareas y extractor local no activan por sí solos una API de modelos de pago. Un proveedor configurado sí puede consumir su cuota o facturación: los límites de la cuenta siguen siendo responsabilidad de esa configuración. El dictado del navegador y Gmail usan los servicios que autorices; no son ejecución exclusivamente local.

Las pruebas de estas funciones utilizan datos sintéticos, transporte Gmail simulado y navegador automatizado. No sustituyen una prueba con una cuenta Google real, un Echo, Telegram real ni una conversación prolongada con el modelo elegido. El dictado se ha comprobado con una simulación de confianza, sin grabar un micrófono real. HELEN no garantiza autonomía total ni comprensión perfecta: revisa las propuestas y los resultados de las acciones externas.
