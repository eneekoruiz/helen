---
action: RESEARCH
label: RESEARCH-
phase: 01-start-project
modifies_code: false
requires_context:
  - project_state
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

# [RESEARCH] - Market Analysis Flow

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: PLAN (Diseñar estrategias y fases)

## Objetivo

Comparar el proyecto con alternativas y detectar oportunidades estratégicas.

## Fase Ideal

Antes de roadmap, reposicionamiento, launch o rediseño de producto.

## Prompts Incluidos

1. [competitive-benchmark.md](RESEARCH-competitive-benchmark.md)
2. [roadmap-roi-prioritization.md](../strategy/PLAN-roadmap-roi-prioritization.md)

## Checkpoints Entre Pasos

- Después del competitive benchmark: validar si la información externa está suficientemente respaldada.
- Final: resumir decisiones, no aplicar cambios grandes automáticamente.

## Condiciones para Avanzar

- Competidores o sustitutos identificados.
- Gaps separados de gustos personales.
- Oportunidades priorizadas por impacto.

## Cuándo Detenerse

- No hay datos suficientes.
- Se requiere investigación web y el entorno no tiene acceso.
- Las recomendaciones implican pivot fuerte.

## Qué Hacer si Falla Algo

Marcar incertidumbre y pedir autorización para investigación adicional o decisión estratégica.

## Resumen Final

1. Landscape.
2. Gaps.
3. Oportunidades.
4. Roadmap sugerido.
5. Decisiones necesarias.
