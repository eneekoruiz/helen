---
action: PLAN
label: PLAN-
phase: 02-building
modifies_code: false
requires_context:
  - project_state
  - project_scope
stop_conditions:
  - missing_required_context
  - unsafe_to_continue
reflection_loop:
  mode: bounded
  max_material_retries: 2
  stop_when: success_criteria_met_or_no_material_gain
memory_target: .quality_audit_log.md
verification:
  - inspect_relevant_files
  - run_available_checks
---

# [PLAN] - Agentic Loop and Spec-Driven Workflow

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.

**Intención**: PLAN (diseñar estrategias y fases)

## Objetivo

Decidir cuándo y cómo dejar que un agente itere de forma autónoma (bucles tipo "Ralph") o siga un flujo estructurado de especificación (tipo GSD Core), con límites que impidan trabajo infinito, costes descontrolados o cambios peligrosos.

## Cuándo Usarlo

- Tareas grandes con criterio de éxito verificable (tests, build, lint, checklist).
- Al planificar una construcción larga en la fase Building.

## Cuándo NO Usarlo

- Tareas ambiguas sin criterio de éxito comprobable.
- Cambios destructivos, de seguridad o de datos de producción sin supervisión humana.

## Requisitos mínimos obligatorios

1. **Criterio de finalización verificable**: define qué comando o comprobación demuestra que la tarea terminó (por ejemplo, `npm test` en verde). Sin criterio, no hay bucle.
2. **Límite de iteraciones obligatorio** (por ejemplo `--max-iterations`): el límite es la red de seguridad principal; una "promesa de finalización" es texto exacto y no sustituye al límite.
3. **Contexto fresco por tarea** en trabajos largos: divide en planes pequeños con su propio commit para evitar la degradación del contexto.
4. **Puntos de control humanos** antes de: dependencias mayores, migraciones, cambios de autenticación, despliegues.
5. **Registro**: anota en `.quality_audit_log.md` qué se dejó en autónomo, con qué límites y qué resultado dio.
6. **Herramientas** (revisa cada una antes de instalarla): `ralph-loop` para iterar hasta cumplir un criterio, `gsd-core` para especificar y ejecutar por fases (`helen skills external ralph-loop`, `helen skills external gsd-core`). Roo Code figura como discontinuado en el catálogo.

## Más allá de estos criterios

Empieza con un bucle corto (3-5 iteraciones) para comprobar que el criterio de éxito está bien definido antes de subir el límite.

## Límites de Seguridad

- Nunca ejecutes un bucle sin límite de iteraciones.
- Nunca des a un bucle autónomo credenciales de producción.
- Para si dos iteraciones seguidas no aportan progreso material.

## Checks Finales

- [ ] Criterio de éxito ejecutable.
- [ ] Límite de iteraciones y de coste definidos.
- [ ] Puntos de control humanos listados.

## Formato de Entrega

Plan en pasos numerados con criterio de éxito, límite y punto de control por paso.
