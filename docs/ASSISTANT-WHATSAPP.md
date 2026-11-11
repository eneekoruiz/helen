# WhatsApp experimental: autorización y estado real

El script scripts/whatsapp-helen.mjs utiliza Baileys/WhatsApp Web; NO es Meta Cloud API. La biblioteca declara que no está afiliada ni autorizada oficialmente por WhatsApp: [fuente primaria](https://github.com/WhiskeySockets/Baileys#disclaimer). fetchLatestBaileysVersion obtiene compatibilidad del repositorio de Baileys, no una aprobación del servidor Meta. El perfil Desktop y la versión de protocolo no acreditan que una cuenta esté conectada ni que se permita su uso.

Por defecto el script solo muestra ayuda y no lee credenciales ni conecta. La activación manual requiere --connect, WHATSAPP_OWNER_JID declarado localmente, un canal whatsapp privado habilitado y dependencias opcionales ya revisadas. La primera vinculación exige además --allow-pairing y una terminal privada interactiva. QR/códigos solo aparecen allí por petición explícita; no se guardan en Git ni en artefactos del chat. No se instalaron dependencias ni se vinculó ninguna cuenta en esta revisión.

Antes de usarlo, el propietario debe decidir si mantiene este experimento o utiliza la Cloud API oficial prevista en T10, y comprobar elegibilidad, cuenta y condiciones aplicables. No es un reemplazo automático del transporte oficial.

Solo el self-chat configurado cuyo JID coincide con la identidad de la cuenta vinculada puede llamar a Helen como propietario. Se rechazan otros remitentes, grupos, broadcast, history/append y cuenta distinta; no se convierten contactos en propietarios por recibir un mensaje. Se deduplican IDs en memoria y se evita el bucle de respuestas con el prefijo Helen:. No hay deduplicación duradera entre reinicios ni recibo remoto independiente. Los errores no reenvían detalles internos y los logs no incluyen contenido, JID ni credenciales.

Logout conserva las credenciales y exige revisión manual; no borra sesiones ni vuelve a emparejar automáticamente. Un socket abierto se etiqueta SOCKET_CONNECTED con delivery:not-verified, no como entrega completa. La prueba de cuentas reales, cambios phone/LID, reinicio/background y recepción de mensajes sigue pendiente. No se han enviado avisos o mensajes reales.

Pruebas offline: tests/assistantWhatsAppPolicy.test.ts (fakes de handleMessage/sendMessage, sin Baileys ni red) y comandos --help/denegación sin identidad en subprocesos ocultos. Son controles de autorización; no certifican interoperabilidad WhatsApp.
