# Modos y revisión semanal

`normal`, `examenes` y `vacaciones` se guardan en `app-mode.json` mediante el bloqueo y la escritura privada habituales. El estado incluye `updatedAt` y, opcionalmente, `until` y `reason`. Una expiración devuelve el comportamiento normal sin borrar esos datos. Un estado dañado se rechaza y se conserva para reparación.

En exámenes, las propuestas favorecen estudio y fechas límite, y reducen el peso de tareas domésticas. En vacaciones disminuye el peso académico. `shouldDispatchReminder` permite al scheduler omitir avisos académicos sin cambiar fechas ni estados: el llamador debe aplicar esta decisión en cada envío. La clasificación por texto es una heurística; el llamador puede aportar `academic` explícitamente. Los exámenes médicos y de conducir quedan fuera de la heurística académica. Los avisos nativos de dispositivos externos necesitan su propia integración; este helper no puede cancelar alarmas ya creadas.

La revisión semanal cuenta tareas marcadas como completadas durante las últimas 168 horas, excluyendo fechas futuras. Las rachas cuentan días civiles distintos en la zona indicada, aunque el día tenga 23 o 25 horas. Si todavía no hay una finalización hoy, una racha que terminó ayer sigue vigente. Solo existe evidencia de las tareas conservadas: reabrir o eliminar una tarea borra su aportación a esa estadística, y no se inventa un historial de hábitos.

Un área se considera desatendida cuando tiene tareas abiertas y han pasado más de 14 días completos desde su última finalización registrada o, si nunca hubo una, desde la primera tarea observada. Una lista nueva no recibe una edad ficticia de 30 días. El cierre diario utiliza el mismo criterio con un umbral de siete días completos.

El top tres del lunes es una propuesta ordenada por la urgencia existente y el modo efectivo a las 07:30 del siguiente lunes local. No completa tareas ni cambia vencimientos. Los informes omiten contenido sensible por defecto; `showSensitive` solo corresponde a un canal autorizado. El texto hablado siempre oculta identificadores sensibles, aunque el informe privado de pantalla los permita.

`nextSundayReviewAt(now, timezone, time)` calcula la siguiente revisión dominical, por defecto a las 18:00 locales. `nextMondayAt` calcula el siguiente lunes a las 07:30. Ambas usan la conversión horaria compartida: en un salto de primavera avanzan al primer horario representable y, si una hora se repite en otoño, eligen su primera instancia. No crean una automatización por sí solas.

API de integración: `getAppModeState`, `getAppMode`, `setAppMode`, `shouldDispatchReminder`, `runWeeklyReview`, `nextSundayReviewAt` y `nextMondayAt`. Los rituales diarios aceptan `mode`, `showSensitive` y `speaker`; si no se aporta modo, consultan el persistido. No se llama a proveedores ni se añade gasto de modelos.
