# Telegram privado y tareas de Recordatorios

El bot de Telegram existente puede canjear un código de vinculación y consultar, crear o completar tareas mediante el puente de Recordatorios. La función está deshabilitada por defecto. Las pruebas son offline; este cambio no certifica una conexión externa ni registra otro bot.

## Configuración local

En `channels.telegram`, conserva `tokenEnv` y `allowedChats` del transporte existente y añade:

```json
{
  "recordatoriosBridge": {
    "enabled": true,
    "url": "https://recordatorios.example/",
    "secretEnv": "HELEN_TELEGRAM_BRIDGE_SECRET"
  }
}
```

La URL debe ser un origen HTTPS sin credenciales, ruta, query ni fragmento; HTTP solo se admite en loopback para pruebas locales. El entorno de Helen debe contener el secreto de servicio en la variable indicada, al menos 32 caracteres ASCII imprimibles sin espacios. Debe coincidir con `TELEGRAM_BRIDGE_SECRET` del servidor de Recordatorios y ser independiente del JWT y del token del bot. No se guardan JWT de usuario ni secretos en la configuración, historial o recibos de Helen. Reinicia el bot existente después de cambiar su configuración local.

## Uso

1. Inicia sesión en Recordatorios y genera el código desde sus ajustes de canales. Caduca a los diez minutos y es de un solo uso.
2. Envía como mensaje propio al chat privado autorizado del bot existente: `/recordatorios vincular <código de 64 caracteres hexadecimales>`.
3. Consulta con `/recordatorios tareas`. Se muestran hasta cinco tareas con su identificador y versión; las demás se consultan en la aplicación.
4. Crea con `/recordatorios añadir Preparar paquete`, o completa usando la versión leída: `/recordatorios completar <id> <versión>`.
5. Revoca el vínculo desde los ajustes de canales de tu cuenta de Recordatorios. Regenerar código, cambiar la sesión de cuenta o rotar el secreto también puede invalidarlo conforme al contrato del servidor.

El transporte comprueba chat privado, remitente igual al chat y allowlist antes de llamar al puente. Los comandos reenviados se rechazan sin capturarlos ni ejecutarlos. El sujeto procede del identificador del remitente de Telegram; nunca de texto, modelo o `userId` enviado por el usuario. Estos comandos no pasan por el modelo ni por su historial. Los mensajes de error no reproducen secretos ni cuerpos privados del servidor.

## Contrato y límites

Se reutilizan `POST /api/channel-bridge/telegram/redeem` y `/operations`, con bearer de servicio y cuerpo `subject`. El `eventId` es el `update_id` de Telegram, estable al reentregar; los nuevos identificadores de tarea también son deterministas. El servidor mantiene la deduplicación persistente y aplica el contrato existente de tareas con `expectedVersion`. Helen no añade una segunda implementación de tareas remotas ni una cola local alternativa.

Un conflicto no se anuncia como completado. Un `202 uncertain`, error de red o avería puede seguir a una aplicación parcial: revisa las tareas y el estado del vínculo antes de enviar una operación nueva. El adaptador no reintenta automáticamente con un identificador diferente. La rotación/revocación y la aplicación de migraciones son responsabilidad del servidor existente.

El puente solo usa tareas. No comparte finanzas, modo de la cuenta, URLs operativas, comandos de sistema ni MCP. No procesa audio para estos comandos ni verifica notificaciones salientes. Para declarar el canal operativo faltan credenciales propias, migración revisada en el servidor y una prueba externa autorizada de vinculación, operación y revocación.

Pruebas: `npx vitest run tests/assistantTelegramRecordatorios.test.ts tests/assistantRecordatorios.test.ts tests/assistantRecordatoriosWeb.test.ts --maxWorkers=1`. Todas usan respuestas simuladas y no consultan servicios ni bases reales.
