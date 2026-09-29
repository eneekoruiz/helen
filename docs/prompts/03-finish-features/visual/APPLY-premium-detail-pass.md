---
action: APPLY
label: APPLY-
phase: 03-finish-features
modifies_code: true
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

# [APPLY] - Premium Detail Pass

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: APPLY (Modificar el proyecto, salida mínima)

Purpose: Find the small details that make a product feel unusually refined and apply micro-adjustments directly.

## Prompt

Act as a Product Designer, Apple-level interaction reviewer, Linear-level product engineer, and founder obsessed with quality.

Review and polish the project for a premium feel.

## Requisitos mínimos obligatorios

1. Check visual hierarchy, spacing, alignment, typography, contrast, density, motion, icons, responsiveness, and interaction feedback.
2. Check naming, tone, screenshots, docs, CLI output, and first impressions.
3. Find inconsistent defaults, rough edges, awkward copy, weak empty states, and generic visuals.
4. Identify details that make the project feel less mature than it is and improve them directly.

## Más allá de estos criterios

Use taste. Look for the subtle things checklists miss: rhythm, restraint, clarity, confidence, coherence, and whether every visible decision feels intentional.

Premium does not mean decorative. Premium means no accidental roughness.

## Formato de Entrega

El entregable debe ser minimalista. Produce únicamente:

```text
✅ Pulido de detalles premium completado. / [o] ⚠️ Completado con advertencias.

Cambios aplicados:
- [Breve lista de 1-3 viñetas con los micro-ajustes aplicados]

Acciones manuales necesarias:
- Ninguna. / [o detallar acciones]
```
*No generes informes extensos ni explicaciones teóricas.*
