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

Pendiente: reglas contables completas para deudas/transferencias, confirmar entrega remota, conectar el bridge de mensajería mediante credenciales propias, adaptadores de sistema y Orca con permisos separados y métricas con proveedores reales.

Pruebas: `npx vitest run tests/assistantOrchestrate.test.ts`, más las del adaptador financiero. Se comprueban identidad, permisos, errores parciales, recuperación y deduplicación.
