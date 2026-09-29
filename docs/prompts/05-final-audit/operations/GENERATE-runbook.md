---
action: GENERATE
label: GENERATE-
phase: 05-final-audit
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

# [GENERATE] - Runbook de Cierre Final

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: PLAN (Diseñar estrategias y fases) / REPORT (Generar conocimiento)

Usa este runbook para guiar el proceso de decisión de cierre técnico del repositorio.

## Paso 0: Descubrir Puntos Ciegos y Riesgos de Base

Antes de congelar código para auditoría final en proyectos importantes, ejecuta:

1. [methodology-and-blind-spots-audit.md](../../01-start-project/audit/AUDIT-methodology-and-blind-spots.md)
2. [product-ux-and-premium-quality-audit.md](../../03-finish-features/ux/AUDIT-product-ux-and-premium-quality.md)
3. [architecture-operations-and-risk-audit.md](../../01-start-project/audit/AUDIT-architecture-operations-and-risk.md)

Objetivo:
- Descubrir categorías de calidad ausentes.
- Detectar deuda técnica invisible.
- Evitar que la auditoría final valide únicamente lo que ya sabíamos mirar de antemano.

## Paso 1: Establecer la Verdad Técnica

Ejecuta:

1. [code-quality-audit.md](../code/AUDIT-code-quality.md)
2. [i18n-audit.md](../code/AUDIT-i18n-flow.md) (si aplica soporte multilingüe)

Objetivo:
- Encontrar defectos reales de lógica, tipado y fallbacks.
- Confirmar que el happy-path no enmáscara bugs de borde.

*No avances a presentación pública si esta etapa devuelve un veredicto de `FAIL`.*

## Paso 2: Validar la Honradez del Repositorio

Ejecuta:

1. [documentation-audit.md](AUDIT-documentation.md)
2. [github-repository-audit.md](../presentation/AUDIT-github-repository-flow.md)

Objetivo:
- Alinear README, ejemplos de código, variables de entorno y realidad del software.
- Limpiar metadatos de GitHub, temas de descubrimiento y licencias.

## Paso 3: Decidir la Exposición Pública

Ejecuta:

1. [public-presentation-pass.md](../presentation/APPLY-public-presentation-pass.md)

Objetivo:
- Juzgar si la presentación externa (screenshots, Open Graph, About) es veraz y atractiva.
- Decidir si se promocionará el repositorio en LinkedIn, portfolios o foros públicos.

## Paso 4: Cierre y Checklist de Release

Ejecuta:

1. [release-checklist.md](../../06-release/planning/PLAN-release-checklist.md)

Objetivo:
- Validar que los bloqueadores críticos detectados en pasos anteriores estén resueltos.
- Emitir el veredicto final para empaquetado de release.

---

## Reglas de Decisión (Gates)

- Si `code-quality-audit` falla, el proyecto no es técnicamente apto para cerrar.
- Si `documentation-audit` falla, el proyecto carece de reproducibilidad técnica.
- Si `github-repository-audit` falla, el repositorio público dañará la reputación profesional del autor.
- Si `public-presentation-pass` falla, el proyecto puede usarse privadamente pero no debe compartirse.
