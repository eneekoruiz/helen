# Coordinación de operaciones

Helen conserva su agente con herramientas y workflows existentes. No se añaden agentes de proveedores ni procesos independientes para una operación que se resuelve con dos adaptadores. El Excel, Recordatorios y la configuración del equipo siguen siendo sistemas separados.

`helen assistant sale-and-task operacion.json` ejecuta dos acciones revisadas explícitamente y devuelve un resultado por acción. Formato:

```json
{
  "requestId": "venta-camiseta-001",
  "finance": {
    "source": "/ruta/copia-revisada.xlsx",
    "directory": "/ruta/privada/revisiones",
    "movement": {
      "date": "2026-11-04", "operation": "Venta", "person": "",
      "account": "Caja de prueba", "amount": "20.00", "cashImpact": "20.00",
      "concept": "Venta de camiseta"
    }
  },
  "task": { "text": "Enviar camiseta", "due": "2026-11-05T10:00:00.000Z" }
}
```

La CLI representa al propietario local. El ejecutor requiere identidad verificada, coincidencia con el propietario del home y permisos separados `finance:copy` y `tasks:write`. Estos permisos no se leen del mensaje ni se conceden a Alexa, Telegram o HTTP por añadir esta función. Los futuros adaptadores deberán derivarlos de una vinculación autenticada.

El recibo privado reserva un identificador de tarea antes de escribir. Reintentar la misma operación no duplica una venta ni vuelve a abrir tareas completadas; tampoco recrea tareas eliminadas deliberadamente. Un identificador reutilizado con datos distintos se rechaza. La copia financiera se verifica de nuevo en el adaptador en cada reintento. Si una acción falla, la otra conserva su resultado y la respuesta declara `partial-or-failed`; no se pretende una transacción distribuida ni se deshacen silenciosamente acciones ya realizadas.

La tarea se guarda en la bandeja de Helen. Su resultado declara `remoteSync:not-verified`: la sincronización existente con Recordatorios necesita estar conectada y ejecutándose; la escritura local no confirma entrega al servidor. La copia financiera declara recálculo pendiente en Excel.

| Herramienta actual | Entrada/salida | Permiso y límite |
|---|---|---|
| `finance preview` | Texto → propuesta y datos faltantes | No escribe ni completa una cuenta o cobro por suposición |
| `finance record` | Movimiento explícito → copia XLSX verificada | Propietario local; solo copias, sin bancos ni red |
| `sale-and-task` | Dos acciones explícitas → resultados independientes | Propietario y ambos permisos; recibos privados, hasta 200 |
| `saved` | Exportación/metadatos → biblioteca buscable | Canal privado; no scraping ni cambios en Instagram |
| Herramientas existentes de Helen | Tareas, workflows, Alexa, Telegram y sincronización | Conservan sus controles de identidad y privacidad |

El chat privado dispone de propuesta y aprobación exacta con hash, revisión del libro, caducidad y permisos locales separados; véase [ASSISTANT-FINANCE.md](ASSISTANT-FINANCE.md). La frase natural solo propone y pide datos: nunca autoriza por sí sola una escritura. La operación aprobada reporta cada resultado independientemente.

Pendiente: reglas contables completas para deudas/transferencias, confirmar entrega remota, conectar el bridge de mensajería mediante credenciales propias, métricas con proveedores reales.

Pruebas: `npx vitest run tests/assistantOrchestrate.test.ts`, más las del adaptador financiero. Se comprueban identidad, permisos, errores parciales, recuperación y deduplicación.

## Sistema y Observer existente

El chat de `helen chat` admite `sistema estado`, `automatizaciones simular {"goal":"Revisar los tests del proyecto","in":"15m"}` y `automatizaciones proponer` con el mismo JSON. También puedes consultar `helen ask "sistema estado"`. Solo el propietario verificado en un canal privado habilitado puede usarlos. La CLI representa al propietario local; los demás canales deben aportar su identidad autenticada. No son herramientas del modelo ni se guardan en su historial.

Configura localmente `observer` en el home de Helen: `profileRoot` (directorio absoluto del perfil con `system-observer.ps1`), `projectRoot` (directorio absoluto del proyecto), `agent` (`codex`, `claude` o `antigravity`), `allowedChannels` y `permissions`. Los permisos separados son `system:read` y `automation:queue`; los arrays vacíos deniegan acceso por defecto. Estas rutas y permisos nunca se aceptan desde el texto del chat. El canal debe estar también en `privacy.showSensitiveOn`.

La propuesta usa `-DryRun` sin crear tareas, muestra el objetivo y pide `confirmar <sha256>` exacto. Caduca a los diez minutos; cambiar la configuración invalida la aprobación. La confirmación se consume antes de llamar al Observer. No se reintenta una escritura ambigua: inspecciona primero la cola. Los argumentos se pasan literalmente a PowerShell con ventana oculta, timeout de quince segundos y salida limitada. El planificador y los proveedores siguen siendo responsabilidad del Observer existente; Helen no llama `-RunDue`, no crea otro scheduler y no promete deshacer trabajos enviados.

El estado lee una cola JSON de hasta 2 MiB y 10000 tareas, rechaza enlaces dentro del perfil y devuelve solo conteos y fechas. No ejecuta `-List` (que podría reconciliar recibos), no expone objetivos, rutas ni credenciales. `queued` acredita solo un registro nuevo y pendiente en la cola: no confirma ejecución, entrega a proveedor ni registro de Windows. `DISPATCHED` sigue siendo distinto de `COMPLETED`.

Pruebas: `npx vitest run tests/assistantSystemObserver.test.ts --maxWorkers=1`. Incluyen permisos, privacidad, argumentos literales, fallos ambiguos, aprobación/caducidad/replay y una fixture PowerShell temporal sin tareas reales ni llamadas a IA.

Se rechazan credenciales y datos financieros reconocibles (cuentas bancarias, importes, libros XLSX o peticiones de leer extractos). Es una validación acotada, no un detector universal: revisa el objetivo antes de aprobarlo y no incluyas datos personales financieros. Auditar código como `finanzas.ts` sigue permitido. El proyecto debe ser un directorio específico existente; no se admite el home ni la raíz del disco.

Google Calendar dispone de [conexión OAuth y consultas privadas de solo lectura](ASSISTANT-GOOGLE-CALENDAR.md), con cuenta y grant separados de Gmail. No escribe citas ni sincroniza ICS; la autorización de la cuenta real queda pendiente hasta completar el consentimiento en esa instalación.

La programación natural (`programa claude a las 17:00 Revisar los tests`, o `programa codex en 15m Revisar los tests`) genera la misma propuesta privada y hash que el JSON; nunca encola directamente. AM/PM se normaliza, el objetivo es obligatorio y las fechas ambiguas como mañana requieren aclaración. Una hora HH:mm es la próxima ocurrencia local del Observer; si esa hora pasa durante la aprobación, se exige otra vista previa. Los retrasos relativos empiezan al confirmar y su hora de preview es estimativa. Selecciona executionBackend explícitamente en el JSON o en observer.executionBackend; no se delega silenciosamente en el backend por defecto del script. El resultado queued solo acredita la cola, no ejecución puntual ni finalización.

Los adjuntos se limitan a previews de archivos locales revisados dentro del proyecto, sin enlaces, secretos, hojas financieras ni rutas externas. Su mutación/encolado y su uso desde lenguaje natural están deshabilitados hasta que el contrato pueda fijar los bytes aprobados hasta el despacho. Una preview con archivos no constituye autorización para encolarlos.
