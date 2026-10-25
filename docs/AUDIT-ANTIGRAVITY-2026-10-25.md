# Auditoría del puente HELEN–Recordatorios

Base revisada: HELEN `c113ec0`, Recordatorios `dc347b9`. Alcance: tareas, modo estacional, compra por Telegram, revisión semanal y avisos móviles. Se conservaron los cambios locales ajenos a esta auditoría.

## Hallazgos y correcciones

1. **Alta: resurrección de tareas.** Una tarea eliminada durante su primer POST reaparecía al aplicar la respuesta. La reproducción ahora comprueba que permanece eliminada y que el siguiente pase envía la baja remota. También se verifican respuestas perdidas, conflictos de versión, cambios independientes y aislamiento de cuentas.
2. **Alta: autorización tardía.** La cancelación de una conexión solo se recordaba dentro de una instancia del servidor. Una generación persistida y protegida por el bloqueo del directorio invalida conexiones pendientes entre procesos y también intentos sustituidos por un inicio de sesión posterior.
3. **Alta: concurrencia del backend.** La comparación de fecha por sí sola no detectaba dos escrituras en el mismo milisegundo. La API compara también el JSON anterior. Conserva metadatos opacos, preferencias de seguridad, rutinas y contadores. Los lotes inválidos y los límites de exportación se rechazan antes de escribir.
4. **Media: hábitos incompletos y copias.** Las tareas recurrentes perdían evidencia al reabrirse. Se conserva un historial acotado, se distingue entre tareas y ejecuciones y se guardan los conflictos recuperables en las copias. Al confirmar un completado remoto se usa su fecha aceptada para que la latencia no cree dos ejecuciones del mismo evento. Las credenciales, generaciones de autorización y cursores no se exportan.
5. **Media: privacidad y operación.** Las listas privadas se excluyen de botones de compra y se ocultan en la agenda. La orden de modo acepta el prefijo hablado de HELEN. Doctor informa de la conexión guardada sin atribuirse una prueba contra Neon. El fallback de la PWA activa pasa de 30 a 5 segundos. CI vuelve a incluir Windows y fija Node 22 para el paquete instalado.

## Verificación reproducible

- HELEN: `assistantRecordatorios`, `assistantRecordatoriosWeb`, `assistantProductivityIntegration`, `assistantSeasonalRitual`, `assistantShopping`, `assistantLifeBackup`; compilación, ESLint, Prettier y coherencia documental.
- PWA: `tests/unit/helen.test.js`, TypeScript y oxlint. Pruebas de cuentas, CAS, tombstones, rutinas, modos, avisos privados, reintentos inciertos y límites.
- Navegador: `scripts/run-assistant-life-qa.mjs`, datos sintéticos, anchos 375/768/1440, interacciones, movimiento reducido, desbordamiento y errores de navegador. Consultar el informe local de ejecución para el resultado.
- Eval de suscripción: `node scripts/run-repo-evals.mjs --live --providers claude --suite implementation-holdout --runs 1 --max-calls 2 --subscription-only --claude-extra-usage-disabled`. Bloqueado antes de llamar al modelo: autenticación Claude no disponible. Cero llamadas; sin fallback API. El modo sin `--live` solo muestra el plan y no equivale a una evaluación ejecutada.
- Integración local entre cliente HELEN compilado y API PWA: creación, edición/completado, historial, modos en ambos sentidos y aviso privado sin duplicados superados. Base de datos y envío push sustituidos por implementaciones de prueba.
- La primera ejecución del CI PWA detectó vulnerabilidades en dependencias de producción. Se actualizaron las versiones resueltas de `body-parser`, `zod` e `ip-address`; `npm audit --omit=dev --audit-level=high` devolvió cero vulnerabilidades.
- Los resultados remotos definitivos corresponden al SHA de cada PR, no al CI previo de main.

## Límites reales

La sincronización requiere el proceso HELEN activo y una cuenta conectada. El fallback es eventual, con consultas cada cinco segundos; no promete actualización instantánea. Los endpoints de la PWA deben estar desplegados antes de conectar desde HELEN. Web Push requiere suscripción y permiso del navegador del móvil. No se han escrito datos personales en Neon ni enviado avisos reales durante estas pruebas. Alexa, micrófono y recepción en una pantalla bloqueada requieren una prueba en los dispositivos del propietario. Los evals con un proveedor real siguen sujetos al límite de uso confirmado; estas comprobaciones no generan consumo de API.
