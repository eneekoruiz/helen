---
action: APPLY
label: APPLY-
phase: 07-client-handoff
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

# [APPLY] - Client Handoff and Delivery Flow

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: PLAN (Diseñar estrategias y fases) / REPORT (Generar conocimiento)

## Objetivo

Preparar el repositorio y los artefactos de entrega al cliente, equipo receptor o futuro mantenedor, garantizando que no se filtra información privada.

## Fase Ideal

Al finalizar la estabilización y empaquetado de la versión (Client Handoff).

## Prompts Incluidos

1. [fast-build-test-verification.md](../../04-before-production/qa/AUDIT-fast-build-test-verification.md)
2. [client-handoff-and-support-readiness.md](AUDIT-client-handoff-and-support-readiness.md)
3. [security-hardening.md](../../02-building/security/APPLY-security-hardening-flow.md)
4. [github-repository-audit.md](../../05-final-audit/presentation/AUDIT-github-repository-flow.md)
5. [release-notes-changelog-and-demo-package.md](../../06-release/notes/GENERATE-release-notes-changelog-and-demo-package.md)

## Checkpoints Entre Pasos

- **Inicio**: Cargar [build-and-compile-checkpoint.md](../../02-building/checkpoint/AUDIT-build-and-compile-checkpoint.md).
- **Post-verificación**: Cargar [test-suite-checkpoint.md](../../02-building/checkpoint/AUDIT-test-suite-checkpoint.md).
- **Post-seguridad**: Cargar [security-risk-checkpoint.md](../../04-before-production/flow/AUDIT-security-risk-checkpoint.md).
- **Final**: Cargar [release-readiness-checkpoint.md](../../06-release/flow/AUDIT-release-readiness-checkpoint.md).

## Condiciones para Avanzar

- El setup y despliegue del proyecto son reproducibles en una máquina limpia.
- No hay credenciales, tokens o accesos de desarrollo expuestos.
- El receptor tiene una hoja de ruta clara para continuar la operación.

## Resumen Final

1. Estructura y enlaces del Handoff Package.
2. Estado de verificación de calidad.
3. Riesgos técnicos y de soporte documentados.
4. Instrucciones de traspaso de propiedad intelectual y accesos.
5. Recomendación de sign-off del cliente.
