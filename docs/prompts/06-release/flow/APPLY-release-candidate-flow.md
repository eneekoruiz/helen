---
action: APPLY
label: APPLY-
phase: 06-release
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

# [APPLY] - Release Candidate Flow

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: PLAN (Diseñar estrategias y fases)

## Objetivo

Decidir si el proyecto puede convertirse en candidato de release y empaquetarse con garantías.

## Fase Ideal

Al finalizar la estabilización (Release).

## Prompts Incluidos

1. [fast-build-test-verification.md](../../04-before-production/qa/AUDIT-fast-build-test-verification.md)
2. [security-hardening.md](../../02-building/security/APPLY-security-hardening-flow.md)
3. [i18n-audit.md](../../05-final-audit/code/AUDIT-i18n-flow.md)
4. [final-seo-audit.md](../../04-before-production/compliance/AUDIT-final-seo.md)
5. [github-repository-audit.md](../../05-final-audit/presentation/AUDIT-github-repository-flow.md)
6. [release-notes-changelog-and-demo-package.md](../notes/GENERATE-release-notes-changelog-and-demo-package.md)

## Checkpoints Entre Pasos

- **Inicio**: Cargar [build-and-compile-checkpoint.md](../../02-building/checkpoint/AUDIT-build-and-compile-checkpoint.md).
- **Post-verificación**: Cargar [test-suite-checkpoint.md](../../02-building/checkpoint/AUDIT-test-suite-checkpoint.md).
- **Post-seguridad**: Cargar [security-risk-checkpoint.md](../../04-before-production/flow/AUDIT-security-risk-checkpoint.md).
- **Antes de documentar**: Cargar [lint-and-typecheck-checkpoint.md](../../02-building/checkpoint/AUDIT-lint-and-typecheck-checkpoint.md).
- **Final**: Cargar [release-readiness-checkpoint.md](AUDIT-release-readiness-checkpoint.md).

## Condiciones para Avanzar

- Compilación, linter y suite de tests pasan sin excepciones.
- No quedan abiertos secretos ni brechas de seguridad críticas.
- Toda la documentación y Quickstarts coinciden con el estado real del software.

## Cuándo Detenerse

- Si falla cualquier checkpoint o verificación crítica de la suite de tests.
- Si las directivas de indexabilidad o fallbacks de idioma están rotas.

## Resumen Final

1. Veredicto: `RC READY`, `RC WITH CAVEATS` o `NOT RC READY`.
2. Checks ejecutados.
3. Cambios realizados durante el flujo.
4. Bloqueadores restantes.
5. Borrador de Release Notes o pendientes.
