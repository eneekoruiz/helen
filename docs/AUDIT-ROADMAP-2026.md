# Auditoría de HELEN y del expediente roadmap-2026

Fecha: 5 de noviembre de 2026. Dictamen: **desfavorable al cierre integral del roadmap y a una certificación de publicación**. La base compila y supera los controles estáticos configurados, pero hay errores reproducibles en el asistente, una brecha entre verificación y publicación, y evidencia externa pendiente. No se ha demostrado una vulnerabilidad crítica; tampoco se certifica su ausencia.

## Alcance e identidad

HELEN es un CLI de flujos de trabajo con un asistente personal que comparte memoria, recordatorios y acciones entre terminal, web y Telegram. La carga asumida es un propietario con varios canales y procesos concurrentes; se revisan límites de confianza, almacenamiento, recuperación, derivación a agentes y distribución npm.

| Elemento                    | Evidencia examinada                                                                                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repositorio solicitado      | `https://github.com/eneekoruiz/helen`, rama `codex/plan-helen-20261104`                                                                                    |
| Commit auditado             | `469d30c361fd72f7e29db6decc42c029becbf6ac`                                                                                                                 |
| Correspondencia local       | `HEAD` y la referencia local `origin/codex/plan-helen-20261104` coinciden                                                                                  |
| Estado remoto actual        | **No verificado**: `git ls-remote origin refs/heads/codex/plan-helen-20261104` falla por conexión; la consulta web tampoco obtiene la rama                 |
| Versión declarada y entorno | `helen-cli@2.1.0`; Windows, Node `24.19.0`, npm `11.17.0`; TypeScript instalado `5.9.3`                                                                    |
| Fuente de ejecución         | Exportación `git archive HEAD` en un temporal, con compilación propia y enlace a las dependencias ya instaladas; no es una instalación limpia con `npm ci` |
| Cambio local excluido       | `scripts/assistant-codex-watchdog.mjs` ya estaba modificado; se audita su versión del commit y se preserva el cambio                                       |
| Expediente                  | `.helen/workspace.json`, estado privado ignorado por Git; no forma parte de la rama remota                                                                 |

No había `graphify-out/graph.json`. Se siguieron imports, llamadores y pruebas mediante inspección dirigida, usando el mapa de código disponible. `orca status --json` indica runtime local detenido; el pase independiente se realizó con un agente del host, sin arrancar Orca ni ejecutar proveedores.

Criterios de aceptación: tipado configurado sin errores; controles estáticos reproducibles; revisión de los 21 checks reales del paquete; autorización y privacidad del asistente; estados fieles al turno y agente efectivos; recuperación sin pérdidas ocultas; trazabilidad del cierre del expediente. La auditoría propone correcciones y solo añade este informe; no remedia el producto ni modifica el expediente.

## Hallazgos que requieren corrección

### 1. P1 — Una petición pendiente aparece como terminada con la respuesta de otra

**Evidencia:** `src/assistant/codexBridge.ts:290-339`; consumidor `src/assistant/brain.ts:1916-1925`. `getLastAgentTurn` inicializa `status = "DONE"` y busca por separado el último objetivo y la última respuesta, cruzando el límite entre turnos.

Reproducciones ejecutadas contra el JavaScript compilado del commit, con transcripciones sintéticas:

```text
USER_INPUT "Trabajo nuevo sin respuesta"
→ status DONE; respuesta "(En progreso o ejecutando herramientas sin texto final)"

USER_INPUT "Trabajo A"
PLANNER_RESPONSE DONE "Terminado A"
USER_INPUT "Trabajo B pendiente"
→ objetivo "Trabajo B pendiente"; respuesta "Terminado A"; status DONE
```

**Impacto:** el propietario recibe una falsa finalización y puede actuar sobre conclusiones ajenas al encargo actual. La prueba existente solo cubre un turno completo y no detecta estos casos.

**Corrección mínima:** delimitar el último turno por su entrada de usuario; aceptar únicamente respuestas posteriores a esa entrada y dejar el estado pendiente o desconocido sin evidencia explícita. Añadir ambas regresiones a `tests/assistantCodexBridge.test.ts`. Esfuerzo pequeño.

### 2. P1 — Se anuncia Codex, pero se deriva la tarea a Claude

**Evidencia:** `src/assistant/intents.ts:263-270`, `src/assistant/brain.ts:1943-1967`, `src/assistant/systemObserver.ts:214-215`. El parser conserva el agente solicitado; el llamador no lo transmite y Observer usa `config.agent`. La confirmación muestra el nombre solicitado, no el efectivo.

Reproducción offline ejecutada con `execFile` sustituido por un stub; no se lanzó PowerShell ni un proveedor:

```text
observer.agent = claude
Entrada: mandale a codex: Revisar los tests del proyecto
Argumento efectivo: -Agent claude
Respuesta: Tarea encolada para codex
```

**Impacto:** el destino real contradice la instrucción y la confirmación. Puede seleccionar una cuenta, cuota o política de ejecución diferente. La misma respuesta promete ejecución futura, aunque Observer devuelve `execution: "not-verified"` y `windowsSchedule: "not-verified"` (`systemObserver.ts:285-289`).

**Corrección mínima:** rechazar discrepancias con el proveedor configurado y comunicar el agente efectivo. Confirmar únicamente la presencia comprobada en cola. Añadir el caso de discrepancia a las pruebas de integración del asistente. Esfuerzo pequeño. La orden directa autoriza encolar; la ausencia de la aprobación por hash de la otra ruta no se califica aquí como bypass de seguridad.

### 3. P1 — La publicación no exige superar la instalación real del paquete

**Evidencia:** `.github/workflows/release.yml:48-78`. `publish` depende solo de `release-please`; ejecuta build, pruebas y `check-pack`, pero no `verify-package`. Este último está en otro workflow, `.github/workflows/ci.yml:86-102`.

**Caso concreto:** una instalación del tarball puede fallar mientras pasan las pruebas del checkout y la inspección estática del inventario; el job de publicación no comprueba ese resultado antes de `npm publish`. El camino manual con un tag existente también carece del gate. No se verificaron protecciones remotas del entorno `npm` ni de la rama, por lo que no se afirma que sean inexistentes.

**Impacto:** el artefacto publicable no tiene una condición de aceptación equivalente a la verificación que se documenta como requisito previo de release.

**Corrección mínima:** ejecutar el verificador sobre el checkout del tag en el propio job, antes de publicar, y conservar su evidencia con `if: always()`. Esfuerzo pequeño; completar instalación requiere acceso al registro o caché suficiente.

### 4. P2 — Telegram puede perder una entrada tras un fallo

**Evidencia:** `src/assistant/telegram.ts:773-789`. Se persiste `offset = update.update_id + 1` antes de ejecutar `handleUpdate`. Un error posterior solo se registra.

**Caso concreto:** caída entre guardar el offset y completar el procesamiento, o rechazo de `handleUpdate`. Al reiniciar, el offset guardado excluye esa entrada. Esto se deriva del orden de escritura; no se provocó una caída de un bot real.

**Impacto:** un recordatorio o encargo recibido puede desaparecer del flujo sin confirmación. El comentario explica la decisión de evitar respuestas duplicadas, pero la contrapartida es procesamiento como máximo una vez, sin recepción duradera.

**Corrección:** documentar expresamente la garantía actual. Para ofrecer recepción duradera, persistir una entrada pendiente con identificador estable y reconciliar sus efectos antes de reintentar. Mover únicamente el offset después del envío permitiría duplicados y no resuelve por sí solo el problema. Añadir una regresión de reinicio en esa ventana. Esfuerzo mediano.

### 5. P2 — Una consulta de cuota bloqueada paraliza el watchdog

**Evidencia:** versión del commit de `scripts/assistant-codex-watchdog.mjs:18-25` y llamada desde `watch`. `getLiveQuota` ejecuta síncronamente el helper externo sin `timeout`; la consulta se hace antes de procesar la finalización. La notificación usa también `execSync` sin límite. La prueba de salud sí fija 30 segundos, de modo que el límite no cubre estos otros procesos.

**Caso concreto:** si el helper no termina, el bucle deja de comprobar la tarea completada, la cuota y el relevo. El `catch` solo ayuda cuando el proceso devuelve un error, no mientras permanece bloqueado. Hallazgo por inspección del flujo; no se ejecutó el watchdog ni se enviaron avisos.

**Corrección mínima:** imponer timeouts a cada proceso externo y representar el fallo como cuota desconocida, sin convertirlo silenciosamente en 0 %. No presentar la existencia de un `.orca-handoff.md` sin correlación con la tarea como prueba de relevo activo. Esfuerzo pequeño. El script es específico de la máquina y no está incluido en los archivos npm publicados.

### 6. P2 — La cobertura de CI documentada excede la configuración

**Evidencia:** `docs/PACKAGE-VERIFICATION.md:48-50` promete el gate instalado en Linux y Windows y evidencias subidas tanto en éxito como en fallo. `.github/workflows/ci.yml:86-102` solo lo configura en `ubuntu-latest`, Node 22, y no contiene subida de artefactos. El job de portabilidad Windows ejecuta otras comprobaciones; no sustituye la instalación aislada.

**Impacto:** se atribuyen cobertura de plataforma y conservación remota de evidencia que el workflow no implementa. Además, los pushes a la rama auditada no disparan por sí solos este CI: sus filtros cubren `main`/`develop` y PR hacia `main`.

**Corrección mínima:** ajustar la documentación a Linux o añadir el caso Windows al job, conservar evidencias y comprobar el resultado remoto en el SHA que se pretenda aprobar. Esfuerzo pequeño.

## Tipado estricto

`tsconfig.json:12-25` activa `strict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns` y `noFallthroughCasesInSwitch`. El typecheck configurado pasa. `skipLibCheck` omite comprobación de declaraciones de dependencias; `tests`, `templates` y scripts `.mjs` quedan fuera del proyecto TypeScript.

El endurecimiento adicional no está activado: `tsc --noEmit --noUncheckedIndexedAccess` produce **158 diagnósticos**; al añadir `--exactOptionalPropertyTypes`, **272**. Ejemplos: acceso posiblemente indefinido en `src/core/cinematicArt.ts:131`, y opcionales incompatibles en `src/assistant/alexa.ts:696` y `src/assistant/brain.ts:199`. Son deuda de endurecimiento, no 272 fallos de ejecución demostrados ni un incumplimiento del `strict` actual.

ESLint no activa análisis con información de tipos y deshabilita `no-explicit-any` (`eslint.config.mjs:24`). Una inspección AST de los 54 archivos TypeScript de `src/assistant` no encontró tipos `any`; tampoco directivas `@ts-ignore`/`@ts-nocheck`. El resultado de ESLint no certifica por sí solo los límites de confianza. Prioridad: resolver los errores de comportamiento anteriores y endurecer después los accesos y contratos de entrada, con regresiones de resultados.

## Los 21 checks de verify-package

Se revisó el código de los 21 checks y se ejecutó `node scripts/verify-package.mjs --offline` contra el build aislado. Primer intento: `npm pack` falla con `EPERM` al escribir en la caché global restringida. Segundo intento, con `npm_config_cache` en un temporal escribible: empaquetado e inventario pasan; la instalación falla con `ENOTCACHED` para `@anthropic-ai/sdk`. El verificador conserva el fallo y limpia su temporal con comprobación de propietario.

**Resultado actual: 3 checks aprobados, 1 bloqueado por el entorno y 17 no alcanzados.** El informe del script registra el check de instalación como `failed`; se clasifica aquí como bloqueo ambiental, sin convertirlo en aprobado ni atribuirlo a un defecto del paquete.

| #   | Check real, abreviado                                     | Resultado de esta auditoría |
| --- | --------------------------------------------------------- | --------------------------- |
| 1   | Tarball real sin lifecycle hooks e integridad SHA-512     | Aprobado                    |
| 2   | Exclusión de estado privado y presencia de runtime/assets | Aprobado                    |
| 3   | Instalación normal del tarball en proyecto limpio         | Bloqueado: `ENOTCACHED`     |
| 4   | Inventario instalado fuera del checkout y aliases bin     | No alcanzado                |
| 5   | Help/version sin CLI de proveedores                       | No alcanzado                |
| 6   | Lint de biblioteca instalada                              | No alcanzado                |
| 7   | Detección de fase y planificación sin proveedor/auth      | No alcanzado                |
| 8   | Work/knowledge/creative de solo lectura sin estado        | No alcanzado                |
| 9   | Contexto de tarea y exclusión de archivos privados        | No alcanzado                |
| 10  | Detección de proveedores ausentes sin modelos             | No alcanzado                |
| 11  | Outcomes con desconocidos y sin crear metadatos           | No alcanzado                |
| 12  | Aliases TED y exportación cache-ready instalada           | No alcanzado                |
| 13  | Descubrimiento de skills y flows                          | No alcanzado                |
| 14  | Setup con propiedad e instrucciones personales            | No alcanzado                |
| 15  | Bloqueo y recuperación de operación interrumpida          | No alcanzado                |
| 16  | Uninstall preservando cambios propios y MCP               | No alcanzado                |
| 17  | Init-project con skills y plan                            | No alcanzado                |
| 18  | MCP stdio: inventario, schemas y lecturas                 | No alcanzado                |
| 19  | Worker productivo rechaza entrada antes de despachar      | No alcanzado                |
| 20  | Launcher sobrevive al padre con runtime simulado          | No alcanzado                |
| 21  | Hooks Git locales/globales sin cambios                    | Aprobado                    |

Manifiesto generado: **564 archivos**, 883 285 bytes comprimidos, 3 198 781 bytes descomprimidos. Integridad: `sha512-wUI1c1128v0Oa+5qqC+JsJgADcF2TEMESTZQB3cQk3SbRZhofOVaVRoFssWUFCiTQXAGSSMw6SE84EzVz9Y17g==`.

Existe evidencia local anterior de **21/21**, con inicio `2026-11-05T20:28:08.163Z`, en `.helen/audit-results/package-verification-2026-11-05T20-28-08-163Z-7aa4fe23/report.json`. Se inspeccionó como antecedente, no como una ejecución propia. Su tarball tiene bytes e integridad diferentes de la exportación auditada; el manifiesto difiere en tamaños de varios archivos de texto. No permite certificar estos bytes ni sustituir los checks no alcanzados. Tampoco el 21/21 de octubre prueba el commit actual.

Los checks están bien orientados: home y configuración aislados, secretos no heredados, PATH sin proveedores, lifecycle hooks desactivados, control de inventario, timeouts, salida acotada y limpieza con token de propiedad. El check 4 compara presencia/tamaño de archivos instalados, no hashes individuales. El check 20 usa runtime simulado; no demuestra ejecución real de Codex/Claude ni supervivencia a suspensión o reinicio. Ninguno de los 21 prueba las nuevas funciones del asistente de extremo a extremo.

## Seguridad y robustez contrastadas

| Frontera        | Control observado                                                                                                  | Límite                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Web             | Bearer comparado mediante hashes en tiempo constante, límites de cuerpo y peticiones, CSP con nonce y timeouts     | No se probó un despliegue expuesto a Internet                    |
| Telegram        | Chat privado permitido y remitente coincidente                                                                     | Recepción no duradera: hallazgo 4                                |
| OAuth Gmail     | PKCE/state, redirecciones rechazadas, respuestas acotadas y controles de enlaces para credenciales                 | Sin autenticación ni correo real                                 |
| Colecciones     | Validación de envoltorio/esquema, conservación de entradas inválidas, bloqueo y escritura atómica                  | No certifica ACL de Windows ni adversarios locales privilegiados |
| Scheduler       | Ledger por ocurrencia/canal; estados ambiguos impiden reenvíos automáticos                                         | Evitar duplicados no prueba entrega externa                      |
| LLM por comando | `spawn` sin shell, prompt por stdin, timeout y salida acotada                                                      | No se ejecutaron modelos                                         |
| Observer formal | Propietario privado, permisos separados, aprobación vinculada a petición/configuración, caducidad y consumo previo | El atajo de encolado tiene el desvío del hallazgo 2              |
| Distribución    | Lista de archivos, canario privado y exclusiones; `check-pack` pasa con caché escribible                           | Auditoría de dependencias actual bloqueada por red               |

La inspección de archivos seguidos no encontró `.env` real ni las extensiones de modelos prohibidas; `.gitignore` cubre secretos, modelos, cachés habituales y `dist`/`node_modules`. No se leyó el contenido del `.env` local ni se hizo un barrido completo del historial en busca de secretos. `check-pack` emite `DEP0190` por `shell:true` en Windows; sus argumentos actuales son constantes y esto no demuestra una inyección alcanzable desde el usuario.

`npm audit --json --ignore-scripts --fetch-retries=0 --fetch-timeout=10000` no consigue consultar el endpoint de advisories. **Vulnerabilidades de dependencias: estado desconocido**, sin reutilizar el cero histórico como resultado actual.

## Expediente roadmap-2026

Estado observado: feature `active`, revisión de alcance `d71717d4-83ee-41cd-925b-5c673b157db5`, última actualización registrada `2026-10-08T07:17:06.433Z`.

| Tarea                     | Estado persistido                           | Dictamen                                                                      |
| ------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------- |
| `implemented-foundations` | `done`, `checkpoint: false`, scope aceptado | Aceptación narrativa de implementación; no es un gate fresco del SHA auditado |
| `native-ui-observation`   | `blocked`, requiere revisión                | Falta observar formularios, respuesta humana e incorporación por aplicación   |
| `reserved-efficacy`       | `blocked`, requiere revisión                | Falta demostrar eficacia diferencial en casos reservados comparables          |

La tarea terminada cita 829 pruebas, 21 checks y 12 skills de octubre; la biblioteca actual declara 16 skills. No hay contradicción automática en conservar una aceptación histórica, pero esa nota no debe presentarse como verificación completa del estado de noviembre. `src/core/workspace.ts:914-932` exige gate vigente, huella y scope para tareas checkpoint; este registro decidió expresamente no serlo.

El expediente y sus evidencias viven bajo `.helen/`, ignorado por Git. Revisar GitHub solo no permite reconstruir sus decisiones ni probar su aceptación. Para un relevo verificable basta una síntesis sanitizada y versionada como este informe, con SHA, resultados y pendientes; no se deben publicar el estado personal ni sus respuestas privadas.

**Roadmap sin cierre:** quedan dos criterios sustantivos abiertos. No se autorizaron ni ejecutaron nuevas evaluaciones con modelos, llamadas de pago, cambios de cuota o pruebas UI en otras aplicaciones. Las pruebas del repositorio no sustituyen esas evidencias.

## Registro de verificación

| Comando o comprobación                                                     | Resultado                                                                      |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `tsc` y `tsc --noEmit` sobre el commit aislado                             | Aprobados                                                                      |
| `eslint src/ tests/ scripts/`                                              | Aprobado                                                                       |
| `prettier --check "src/**/*.ts" "tests/**/*.ts"`                           | Aprobado                                                                       |
| `node scripts/docs-facts.mjs check`                                        | Aprobado                                                                       |
| `node dist/cli.js lint --json`                                             | Aprobado, sin errores ni advertencias                                          |
| `node scripts/check-pack.mjs`, caché escribible                            | Aprobado: 564 archivos, 3124 KiB; advertencia de deprecación Windows           |
| `tsc --noEmit --noUncheckedIndexedAccess`                                  | No aprobado: 158 diagnósticos; opción adicional                                |
| Anterior más `--exactOptionalPropertyTypes`                                | No aprobado: 272 diagnósticos; opciones adicionales                            |
| Reproducciones sintéticas de turnos y derivación                           | Ambos fallos confirmados con aserciones                                        |
| Suite focal: store/recovery/delivery/privacy/codexBridge                   | 74 pruebas aprobadas en 5 archivos, 8,98 s                                     |
| Suite focal Observer                                                       | 10 pruebas aprobadas                                                           |
| Suite completa sobre snapshot, `vitest run --maxWorkers=2 --reporter=json` | 1451 pruebas: 1420 aprobadas, 16 fallidas y 15 omitidas; 113 archivos, 653,5 s |
| Repetición focal con identidad Git y `HELEN_HOME` aislado                  | 72 aprobadas y 1 fallo de captura UTF-16 en 4 archivos                         |
| Repetición de encoding tras normalizar la captura propia a UTF-8           | 1 aprobada, 0 fallos                                                           |
| Paquete instalado                                                          | 3 aprobados; instalación bloqueada; 17 no alcanzados                           |
| Advisories npm y SHA remoto actual                                         | No verificables por conectividad                                               |

Los 16 fallos iniciales se explicaron y pasaron en repeticiones focalizadas: 2 exigían identidad Git, 13 fallaban al escribir claves de gates fuera del sandbox (incluido el error derivado de CLI) y 1 detectaba el JSON de lint capturado en UTF-16 por PowerShell. Se importó localmente la identidad del mismo commit en el snapshot, se estableció `HELEN_HOME` en un temporal propio y se normalizó únicamente la captura generada. No se alteraron fuente, pruebas ni criterios. El shell de la primera ejecución tuvo además un error al redirigir un bloque `if`; el JSON completo de Vitest sí quedó escrito y es la fuente de los recuentos. **No hubo un segundo pase completo en verde**: todos los fallos originales cuentan con una repetición aprobada, y las 15 omisiones siguen sin probarse. Los contadores `numTotalTestSuites` del JSON incluyen suites anidadas; los 113 archivos se cuentan mediante `testResults`.

Evidencia local de esta auditoría: `.helen/audit-results/roadmap-audit-location.txt` identifica el snapshot; sus logs y JSON están bajo `.helen/audit-results` de ese snapshot. Las reproducciones y sus salidas se conservan como `.helen/audit-results/roadmap-audit-{repro,routing-repro}.mjs` y archivos JSON asociados. Una copia consolidada de logs, informes de paquete y resultados está en `.helen/audit-results/roadmap-audit-2026-11-05/`. Son evidencias locales ignoradas, no adjuntos accesibles desde GitHub.

## Condiciones para un dictamen favorable

1. Corregir falsas finalizaciones y desvío de agente, con las regresiones aquí descritas; fijar las garantías de recepción y supervisión.
2. Exigir instalación real del artefacto antes de publicar y alinear cobertura CI/documentación; reejecutar los 21 checks y conservar la evidencia del SHA.
3. Verificar la rama y el CI remotos, las dependencias y una instalación limpia en un entorno con acceso permitido.
4. Mantener abiertos UI nativa y eficacia comparada hasta observar sus criterios reales; vincular cualquier nueva aceptación al commit y alcance comprobados.

No se revisó cada módulo del repositorio, el historial completo, servicios vivos, Docker ni la matriz de sistemas alojada. Los resultados locales no certifican producción, ausencia absoluta de defectos ni superioridad de las skills. No se modificaron código del producto, credenciales, configuración global ni el expediente.
