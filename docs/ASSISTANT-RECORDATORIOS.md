# Conectar la aplicación de Recordatorios

La conexión necesita que la aplicación tenga desplegado el endpoint `/api/helen/sync` y que tu cuenta pueda acceder a él. Preparar este código en el repositorio no despliega ese endpoint. Si responde 404, HELEN indica que la integración está pendiente de desplegar y no guarda una conexión nueva.

En el chat privado de HELEN, abre **Ajustes → Recordatorios**. Comprueba la dirección de la aplicación (por defecto `https://eneko-ruiz.com`), introduce el correo y contraseña de esa aplicación y pulsa **Conectar Recordatorios**. Las credenciales se envían a esa dirección por HTTPS; no son las del token de acceso de HELEN.

Si tienes verificación en dos pasos, escribe el código de seis cifras y vuelve a introducir la contraseña cuando se solicite. HELEN limpia contraseña y código del formulario al enviar cada intento, al cerrar Ajustes y al cerrar la sesión. No los guarda en el navegador ni en la configuración del asistente.

Antes de conservar el token privado, HELEN comprueba el endpoint de sincronización y que su cuenta coincida con la autenticada. El vínculo de origen y cuenta impide mezclar tareas de otra cuenta con un registro de sincronización existente. Solo guarda autorización cuando esta comprobación termina correctamente. El estado mostrado no expone el token ni los textos de las tareas.

**Actualizar conexión** comprueba el estado disponible. **Desconectar Recordatorios** elimina la autorización local y desactiva la conexión; conserva tareas y registro de sincronización para no perder datos ni duplicarlos al volver a conectar la misma cuenta. Desconectar HELEN no cambia tu contraseña ni cierra otras sesiones de la aplicación.

La sincronización necesita el servidor de HELEN en ejecución y la integración remota desplegada. Las pruebas usan transporte simulado y datos de prueba: no comprueban una cuenta real ni confirman que el despliegue público esté actualizado. El correo, la contraseña y los tokens nunca deben pegarse en una conversación con un modelo.
