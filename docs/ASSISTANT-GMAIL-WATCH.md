# Respuestas y seguimiento de Gmail

Desde el chat o un canal autorizado: «¿Ana ha respondido al correo?», «lee la respuesta de Ana», «resume la respuesta de Ana», «avísame cuando Ana responda y recuérdamelo en 30 minutos» o «avísame si Ana no responde en 2 días». «Mis avisos de correo» muestra los identificadores; «cancela seguimiento <id>» detiene una regla de esa conversación.

`assistant serve` comprueba las reglas cada dos minutos mientras está encendido y tiene el scheduler habilitado. No requiere llamadas a un modelo. El resumen sin modelo es un extracto de las primeras tres frases, identificado como tal. La lectura del cuerpo exige un canal autorizado para información privada; Alexa puede activar un aviso, pero el contenido se consulta en privado.

HELEN puede leer respuestas de un destinatario exacto a correos que haya enviado y verificado previamente. No recorre todo el buzón: consulta el mensaje enviado conocido, obtiene su hilo real y filtra mensajes posteriores del destinatario. Una dirección parecida, un mensaje anterior o un mensaje del propio usuario no cuenta como respuesta.

El texto devuelto contiene `untrusted: true`: asunto y cuerpo son datos recibidos, nunca autorización para enviar, cambiar contactos, interpretar fechas como órdenes o modificar el asistente. Los mensajes de texto se decodifican y el HTML se reduce a texto sin cargar imágenes, enlaces ni adjuntos. Un resumen debe basarse en ese contenido real y conservar sus incertidumbres.

Al pedir explícitamente que avise cuando respondan, se guarda una vigilancia asociada al propietario, al canal, a la conversación y al correo enviado. La primera respuesta genera un aviso genérico mediante el scheduler existente. Solo si el propietario lo solicita también se prepara un recordatorio posterior; el valor predeterminado es treinta minutos. Una espera sin respuesta puede tener un seguimiento con plazo explícito. Ninguna de estas acciones responde al correo por sí sola.

Los avisos no contienen remitente, asunto ni cuerpo porque el scheduler puede distribuirlos a todos los canales configurados. El mensaje pide revisar el correo en privado. Las reservas de identificadores de recordatorio se guardan antes de crearlo: reiniciar entre ambos pasos recupera el mismo identificador y no duplica el aviso. La vigilancia termina al detectar la primera respuesta; el scheduler mantiene su propia confirmación de entrega por canal. Una vigilancia marcada como terminada significa que el aviso quedó preparado, no que el dispositivo lo recibió.

Cancelar una vigilancia detiene consultas posteriores y cancela sus recordatorios todavía pendientes; no retira notificaciones que ya se hayan entregado. Una autorización ausente, un error de red o una cuenta distinta dejan el seguimiento pendiente de comprobación y no se interpretan como ausencia de respuesta.

Límites: veinte vigilancias activas; lectura acotada a cinco correos enviados conocidos por consulta, cien mensajes por hilo y veinte respuestas devueltas; cuerpo de ocho mil caracteres por respuesta. El servidor decide la frecuencia de consulta y aplica permisos antes de crear reglas o mostrar contenido privado. No se envían correos ni se ejecutan modelos en las pruebas.
