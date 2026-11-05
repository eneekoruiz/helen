# Google Calendar: lectura privada

Helen consulta eventos y disponibilidad de Google Calendar. Esta integración es independiente del intercambio ICS: no importa eventos a la agenda local, no sincroniza cambios ni crea, edita o borra citas. No necesita dependencias nuevas ni envía datos del calendario a un modelo.

## Conectar la cuenta propia

1. En tu proyecto Google, habilita Calendar API y prepara un cliente OAuth separado para esta integración. Registra exactamente `http://127.0.0.1:8787/google-calendar/callback` como redirect URI y autoriza tu cuenta de prueba si el proyecto está en testing. La instalación debe disponer de su propia autorización: la conexión Google del chat anfitrión no autoriza a Helen. Consulta [OAuth para aplicaciones web](https://developers.google.com/identity/protocols/oauth2/web-server).
2. Arranca el callback local en una terminal: `helen assistant serve --host 127.0.0.1 --port 8787 --no-scheduler --no-telegram`. Estos flags evitan el scheduler, sincronizadores y bot del proceso. No expongas ese puerto en Internet para completar un login local.
3. En otra terminal local privada, configura las referencias y genera la URL de consentimiento con los comandos siguientes. Abre `authorizationUrl` en tu navegador, selecciona la cuenta exacta solicitada y revisa el permiso. Ni el ID ni el secreto se pasan como valores en los argumentos de Helen; el secreto no aparece en la URL de salida. No uses transcript ni pegues secretos, códigos o tokens en el chat.

```powershell
$env:HELEN_CALENDAR_CLIENT_ID = Read-Host "Calendar OAuth client ID"
$env:HELEN_CALENDAR_CLIENT_SECRET = [System.Net.NetworkCredential]::new("", (Read-Host "Calendar OAuth client secret" -AsSecureString)).Password
helen assistant google-calendar connect --account TU_CUENTA --client-id-env HELEN_CALENDAR_CLIENT_ID --client-secret-env HELEN_CALENDAR_CLIENT_SECRET
Remove-Item Env:HELEN_CALENDAR_CLIENT_SECRET
```

Sustituye TU_CUENTA por el correo exacto del calendario principal de la cuenta elegida. El único scope solicitado/aceptado es `https://www.googleapis.com/auth/calendar.readonly`. Gmail conserva sus scopes y archivos originales. El motor PKCE S256, state consumible y caducidad de diez minutos se reutiliza, con almacenes privados `calendar-auth.json` / `calendar-oauth-pending.json` separados. No se muestran access/refresh tokens en los comandos de conexión o estado.

`connect` autoriza localmente solo el canal CLI del propietario para `calendar:read`, tras una acción explícita del propietario. Fuera de ese comando, `googleCalendar` ausente o arrays `allowedChannels`/`permissions` vacíos deniegan acceso. Otros canales requieren configuración local expresa y también pertenecer a `privacy.showSensitiveOn`; voz y canales no verificados se rechazan. `googleCalendar.calendarId` se configura localmente (por defecto primary), nunca se toma del texto de consulta. Antes de consultar se contrasta de nuevo que el calendario principal pertenece a la cuenta configurada.

## Consultar sin transmitir contenido al modelo

```powershell
helen assistant google-calendar status
helen ask "calendario google estado"
```

El estado solo describe configuración/grant almacenado. No certifica acceso remoto actual. `helen assistant doctor` incluye una comprobación google-calendar que distingue falta de preparación y credenciales guardadas, con acceso real todavía sin probar.

En `helen chat`, escribe una de estas solicitudes JSON con fechas reales y offsets explícitos:

```text
calendario google eventos {"timeMin":"2026-11-05T00:00:00+01:00","timeMax":"2026-11-06T00:00:00+01:00","timeZone":"Europe/Madrid"}
calendario google disponibilidad {"timeMin":"2026-11-05T09:00:00+01:00","timeMax":"2026-11-05T18:00:00+01:00","timeZone":"Europe/Madrid"}
```

Estas rutas son deterministas, no son herramientas del modelo y no guardan resultados en su historial. La voz recibe solo un aviso para consultar el canal privado. Los títulos recibidos se tratan como datos; no autorizan instrucciones ni acciones. No se conservan descripciones, asistentes, URLs ni copias de eventos en el home.

Las ventanas deben ser crecientes y de hasta 31 días. Eventos se expanden por Google en instancias, se ordenan por inicio y se deduplican por ID: hasta cuatro páginas de cincuenta elementos. `truncated:true` indica resultados parciales; un page token repetido produce error. Fechas de día completo mantienen su final exclusivo, y las citas conservan offset/zona de la API sin inventar conversiones DST. Un error de disponibilidad nunca se representa como calendario libre.

El POST utilizado en freeBusy es una consulta de disponibilidad, no una escritura de eventos. Solo se consulta el calendario autorizado localmente. Transporte sin redirecciones, límite de respuesta de 512 000 bytes, 15 s por petición y 30 s para la consulta completa, con cancelación. Referencias: [events.list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list), [freebusy.query](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query) y [calendarList.get](https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/get).

## Desconectar

```powershell
helen assistant google-calendar disconnect
```

Elimina las credenciales/consentimiento pendiente locales de Calendar, conservando Gmail. Para pedir también la revocación a Google usa `helen assistant google-calendar disconnect --revoke`; distingue disconnected y revoked y no anuncia revocación si falla. Usa un cliente OAuth separado: Google puede revocar grants asociados al mismo cliente/proyecto, aunque los archivos locales estén separados.

Probado offline con transporte simulado, callback HTTP local y CLI sobre home temporal. No se autorizaron cuentas reales ni se consultaron datos personales de Google en esta implementación. La prueba real de consentimiento y acceso debe hacerse en la instalación del propietario. Crear/editar/borrar citas requiere diseñar un permiso de escritura y aprobación específica; sigue fuera de este bloque.
