# Compra por pasillos en Telegram

`/compra` muestra los productos abiertos agrupados en Frutería/Frescos, Lácteos/Nevera, Carnicería/Pescado, Limpieza y Despensa. Los productos desconocidos aparecen en Sin clasificar; no se consulta un modelo ni se inventa una ubicación. La clasificación usa nombres comunes en español e inglés y puede no coincidir con la distribución de una tienda concreta.

La vista enseña diez productos por página. Cada botón tacha únicamente el identificador exacto de ese producto y actualiza la lista; repetir el botón no cambia la fecha de una compra ya completada. Las flechas permiten recorrer las páginas restantes. Los cambios usan el mismo almacén de tareas del resto del asistente.

Antes de procesar texto, descargar archivos o ejecutar botones, HELEN exige un chat privado autorizado y que el identificador real del remitente coincida con el del chat. Los botones reenviados se rechazan. El texto reenviado sigue siendo contenido para revisar, sin convertirse en una orden del propietario.

La revisión de los botones existentes corrigió tres fallos: los callbacks solo comprobaban la lista de chats; el botón para posponer una tarea cambiaba todas las tareas vencidas; y el polling no solicitaba `callback_query`. Ahora los callbacks comprueban remitente y chat privado, la acción individual solo cambia la tarea elegida y Telegram entrega las pulsaciones al bot.

Las pruebas utilizan Telegram simulado y comprueban agrupación, paginación, repetición idempotente, refresco de la lista, callbacks reenviados o de otro remitente, bloqueo de descargas no autorizadas y posposición individual. No se enviaron mensajes reales ni se comprobó una aplicación móvil real.
