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

# [APPLY] - Full Polish Flow

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: APPLY (Modificar el proyecto, salida mínima)

## Objetivo

Elevar un proyecto funcional a un nivel claramente más refinado en UX, diseño visual, responsive, accesibilidad, clean code y rendimiento sin convertir el flujo en release final.

## Fase Ideal

Al finalizar funcionalidades y antes de pruebas de producción o hardening final.

## Prompts Incluidos

1. [initial-project-risk-scan.md](../../01-start-project/audit/AUDIT-initial-project-risk-scan.md)
2. [primary-user-experience-audit.md](../ux/AUDIT-primary-user-experience.md)
3. [premium-visual-polish-pass.md](../visual/APPLY-premium-visual-polish-pass.md)
4. [responsive-pass.md](../visual/APPLY-responsive-pass.md)
5. [empty-states-errors-and-microcopy.md](../ux/APPLY-empty-states-errors-and-microcopy.md)
6. [safe-clean-code-simplification-pass.md](../../02-building/clean-code/APPLY-safe-clean-code-simplification-pass.md)
7. [basic-performance-pass.md](../performance/APPLY-basic-performance-pass.md)
8. [basic-accessibility-pass.md](../performance/APPLY-basic-accessibility-pass.md)
9. [fast-build-test-verification.md](../../04-before-production/qa/AUDIT-fast-build-test-verification.md)

## Checkpoints Entre Pasos

- **Inicio (UX/Visual)**: Cargar [visual-ux-regression-checkpoint.md](AUDIT-visual-ux-regression-checkpoint.md).
- **Post-refactor**: Cargar [lint-and-typecheck-checkpoint.md](../../02-building/checkpoint/AUDIT-lint-and-typecheck-checkpoint.md).
- **Final**: Cargar [test-suite-checkpoint.md](../../02-building/checkpoint/AUDIT-test-suite-checkpoint.md).

## Condiciones para Avanzar

- El proyecto funciona perfectamente y compila sin errores.
- Los cambios aplicados son acotados y seguros.

## Cuándo Detenerse

- Si el linter, compilación o tests fallan de forma no recuperable rápidamente.
- Si un cambio visual o de UX requiere replantear decisiones fundamentales de diseño del producto.

## Formato de Entrega

El entregable debe ser minimalista. Produce únicamente:

```text
✅ Full polish completado con éxito. / [o] ⚠️ Completado con advertencias.

Mejoras aplicadas:
- [Breve lista de 1-3 viñetas con las correcciones visuales, de UX o código aplicadas]

Acciones manuales necesarias:
- Ninguna. / [o especificar acciones]
```
*No generes informes extensos ni explicaciones teóricas.*
