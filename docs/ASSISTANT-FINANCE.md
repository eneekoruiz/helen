# Finanzas sin modificar el original

`helen assistant finance preview "He vendido una camiseta por 20 €; recuérdame mañana enviarla"` devuelve una propuesta sin escribir. Solicita fecha, cuenta/caja, persona si corresponde y si el cobro se ha recibido. No confunde una venta pendiente con dinero disponible.

`helen assistant finance record movimiento.json` requiere Python 3.11+ y este formato explícito:

```json
{
  "source": "/ruta/copia-revisada.xlsx",
  "directory": "/ruta/privada/revisiones",
  "requestId": "venta-001",
  "movement": {
    "date": "2026-11-04",
    "operation": "Venta",
    "person": "",
    "account": "Caja de prueba",
    "amount": "20.00",
    "cashImpact": "0.00",
    "concept": "Venta pendiente de cobro"
  }
}
```

La copia resultante y su recibo se guardan por `requestId`. Para el siguiente movimiento se usa como `source` la última copia verificada. Repetir la misma solicitud devuelve esa copia; reutilizar el identificador con otro movimiento o alterar la copia se rechaza. El bloqueo impide escritores simultáneos. Una interrupción puede dejar un bloqueo/recibo pendiente: se debe inspeccionar antes de recuperarlo, nunca borrarlo automáticamente sin comprobar el proceso.

No sustituye el XLSX original ni transmite datos. Conserva las partes no modificadas y las fórmulas, inserta la fecha como número de calendario de Excel y comprueba el movimiento leyendo el archivo generado. Solo admite la estructura conocida de MOVIMIENTOS y hasta la fila 100; se detiene antes de ampliar rangos sin revisar. Los importes son cadenas decimales con dos decimales como máximo, sin redondeo implícito.

El resultado declara `recalculation:pending-excel`: aún hay que abrir la copia en Excel, recalcular y verificar saldos. Las reglas de deudas/transferencias, WhatsApp, voz y justificantes siguen pendientes. No se presenta esta escritura de copias como un sistema financiero conectado ni como validación contable.

## Consultas y aprobación privada

`helen assistant finance recent /ruta/copia.xlsx --limit 10` y `helen assistant finance month /ruta/copia.xlsx 2026-11` leen MOVIMIENTOS sin modificarlo. Agrupan importes por operación e impacto de caja por cuenta con Decimal; no calculan beneficio ni saldos contables. Rechazan fórmulas en movimientos, incluso con caché, y revisiones cambiadas durante la lectura.

El administrador local configura `finance` en el home: `source` (copia XLSX absoluta), `directory` (directorio absoluto de revisiones), `allowedChannels` y `permissions` (`finance:read`, `finance:copy`, `tasks:write`). Ambos conjuntos están vacíos por defecto. El canal debe estar autenticado y autorizado para datos sensibles; los altavoces quedan excluidos. No se conceden permisos desde mensajes.

En ese chat: `finanzas recientes 10`, `finanzas mes 2026-11` o una frase como `He comprado material por 12 euros` producen consultas o propuestas locales sin modelos. Las propuestas naturales nunca escriben: solicitan fecha, cuenta, persona e impacto de caja explícitos. Deudas y transferencias piden dirección, contrapartida y reglas revisadas; no se ejecutan desde chat.

Para completar la propuesta: `finanzas proponer {"requestId":"venta-001","movement":{"date":"2026-11-04","operation":"Venta","person":"","account":"Caja","amount":"20.00","cashImpact":"20.00","concept":"Camiseta"},"task":{"text":"Enviar camiseta","due":"2026-11-05T10:00:00.000Z"}}`. La tarea es opcional; la fecha y hora no se adivinan. Solo `confirmar <SHA-256 completo mostrado>` aprueba los datos exactos y el contenido del libro revisado. Un «sí» no basta. La aprobación pertenece a esa conversación y propietario, caduca a los diez minutos y admite `cancelar`. El flujo avanza la fuente configurada a la copia confirmada para evitar ramas silenciosas. Ante fallos parciales conserva la aprobación para repetir el mismo identificador y devuelve resultados separados.

No se almacenan peticiones/resultados financieros en el historial del modelo. Las tareas de este flujo se ocultan en sus herramientas, agenda e historial. Esto no conecta automáticamente un bot, un banco ni un servicio remoto.

Pruebas: `python3 tests/test_finance_workbook.py` y `npx vitest run tests/assistantFinance.test.ts`. Las pruebas usan paquetes sintéticos y no leen las finanzas del usuario.
