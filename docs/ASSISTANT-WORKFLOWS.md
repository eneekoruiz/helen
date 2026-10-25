# Preparación, seguimiento y capacidad

HELEN guarda gestiones, viajes, citas y proyectos en `workflows.json` dentro del hogar personal, con el mismo bloqueo y escritura privada que las tareas. Una gestión contiene requisitos, documentos, preguntas y acciones aportados por la persona. No envía mensajes, reserva citas ni crea recordatorios automáticamente.

Cada elemento admite `todo`, `doing`, `waiting` y `done`. Esperar requiere indicar el motivo y permite una fecha de revisión. La fecha de revisión hace visible una espera pendiente; no marca nada como terminado ni envía avisos. Solo una actualización explícita completa el elemento. `workflowProgress` devuelve el siguiente elemento en curso o pendiente y las esperas cuya revisión ha llegado.

Las plantillas de preparación son preguntas iniciales, identificadas como no oficiales. Los requisitos reales deben confirmarse con la entidad responsable. No sustituyen asesoramiento ni verifican documentación legal.

`capacityPlan` recibe una ventana de hasta 24 horas, minutos disponibles, energía y, opcionalmente, intervalos ocupados y minutos de desplazamiento/margen. Consulta las citas con inicio/fin guardadas, las tareas abiertas y los recordatorios locales. Mantiene ocupadas las citas privadas sin revelar su contenido. Propone bloques completos que caben en huecos reales y en el presupuesto, primero por prioridad, después por vencimiento y finalmente por identificador estable.

Los vencimientos de tareas son fechas límite, no citas. Los recordatorios reservan su minuto de aviso: no se inventa cuánto dura una cita a partir de su texto. Las tareas existentes sin estimación usan provisionalmente 15 minutos y energía baja; el resultado señala esta suposición. Los elementos de gestiones permiten especificar duración y energía. Las estimaciones predeterminadas deben revisarse si el esfuerzo real es distinto. Los calendarios externos solo cuentan si sus intervalos se aportan; HELEN no afirma haberlos consultado.

La planificación es una propuesta de solo lectura. No cambia tareas, estados ni calendarios. Esperas y trabajo terminado quedan fuera. El contenido privado se omite por defecto; el llamador solo debe habilitar `showSensitive` en un canal autorizado. Los datos se validan con Zod, se rechazan credenciales y cada gestión admite hasta 50 elementos, con 200 gestiones por hogar. Un `requestId` opcional hace idempotente la creación y rechaza cambios de contenido con la misma clave.

API interna: `createWorkflow`, `listWorkflows`, `updateWorkflowItem`, `workflowProgress`, `workflowTemplate` y `capacityPlan`, exportadas desde `src/assistant/workflows.ts`. Las fechas son instantes ISO UTC; la zona horaria debe ser IANA válida.
