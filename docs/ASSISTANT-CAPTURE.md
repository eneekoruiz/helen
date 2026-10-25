# Captura revisable

`createCapture` transforma texto o una transcripción local en un borrador privado de hasta 20 tareas. Cada línea es una propuesta; HELEN detecta fechas con el parser existente y señala fechas sin hora, repeticiones y datos pendientes. No interpreta instrucciones del documento como órdenes ni crea tareas hasta recibir aprobación.

El propietario autenticado puede consultar el borrador con `getCapture`, modificar sus propuestas con `editCapture` y aprobar exactamente esa versión y lista con `confirmCapture`. La confirmación reserva identificadores antes de escribir: repetirla tras una interrupción no duplica tareas. Un borrador cambiado necesita otra revisión. Las tareas resultantes son de la bandeja de entrada; las recurrencias requieren un recordatorio independiente.

Los adjuntos de texto UTF-8 y Markdown funcionan directamente. Para PDF, PNG, JPEG, WAV, MP3 u Ogg hace falta configurar un ejecutable local de confianza que haga OCR o transcripción. HELEN no instala modelos ni llama a servicios de pago. El ejecutable recibe sus argumentos configurados seguidos de la ruta temporal de entrada y el MIME; devuelve únicamente texto UTF-8 por stdout. Se ejecuta sin shell, sin credenciales heredadas, con 30 segundos por defecto (máximo 60), entrada máxima de 10 MB y salida acotada. La entrada temporal se elimina al terminar. Los mensajes de stderr no se guardan ni muestran.

El ejecutable configurado tiene los permisos de tu usuario: debe ser software que controles. La comprobación de cabecera y MIME identifica el formato; no sustituye el análisis de seguridad que necesita un lector de documentos. Los borradores contienen datos personales y deben exponerse solo en canales privados autenticados. No se conserva el adjunto original ni el texto completo separado de las propuestas.

Esto no promete comprender cualquier documento: un documento largo debe dividirse o resumirse con una herramienta local antes de importarlo. Las fechas propuestas deben revisarse, especialmente cuando el origen no indica año, zona horaria u hora.
