# [GENERATE] - Runbook de Cierre Final

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo).
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


**Intención**: PLAN (Diseñar estrategias y fases) / REPORT (Generar conocimiento)

Usa este runbook para guiar el proceso de decisión de cierre técnico del repositorio.

## Paso 0: Descubrir Puntos Ciegos y Riesgos de Base

Antes de congelar código para auditoría final en proyectos importantes, ejecuta:

1. [methodology-and-blind-spots-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/01-start-project/audit/audit-methodology-and-blind-spots.md)
2. [product-ux-and-premium-quality-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/ux/audit-product-ux-and-premium-quality.md)
3. [architecture-operations-and-risk-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/01-start-project/audit/audit-architecture-operations-and-risk.md)

Objetivo:
- Descubrir categorías de calidad ausentes.
- Detectar deuda técnica invisible.
- Evitar que la auditoría final valide únicamente lo que ya sabíamos mirar de antemano.

## Paso 1: Establecer la Verdad Técnica

Ejecuta:

1. [code-quality-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/05-final-audit/code/audit-code-quality.md)
2. [i18n-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/05-final-audit/code/audit-i18n-flow.md) (si aplica soporte multilingüe)

Objetivo:
- Encontrar defectos reales de lógica, tipado y fallbacks.
- Confirmar que el happy-path no enmáscara bugs de borde.

*No avances a presentación pública si esta etapa devuelve un veredicto de `FAIL`.*

## Paso 2: Validar la Honradez del Repositorio

Ejecuta:

1. [documentation-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/05-final-audit/operations/audit-documentation.md)
2. [github-repository-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/05-final-audit/presentation/audit-github-repository-flow.md)

Objetivo:
- Alinear README, ejemplos de código, variables de entorno y realidad del software.
- Limpiar metadatos de GitHub, temas de descubrimiento y licencias.

## Paso 3: Decidir la Exposición Pública

Ejecuta:

1. [public-presentation-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/05-final-audit/presentation/apply-public-presentation-pass.md)

Objetivo:
- Juzgar si la presentación externa (screenshots, Open Graph, About) es veraz y atractiva.
- Decidir si se promocionará el repositorio en LinkedIn, portfolios o foros públicos.

## Paso 4: Cierre y Checklist de Release

Ejecuta:

1. [release-checklist.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/06-release/planning/plan-release-checklist.md)

Objetivo:
- Validar que los bloqueadores críticos detectados en pasos anteriores estén resueltos.
- Emitir el veredicto final para empaquetado de release.

---

## Reglas de Decisión (Gates)

- Si `code-quality-audit` falla, el proyecto no es técnicamente apto para cerrar.
- Si `documentation-audit` falla, el proyecto carece de reproducibilidad técnica.
- Si `github-repository-audit` falla, el repositorio público dañará la reputación profesional del autor.
- Si `public-presentation-pass` falla, el proyecto puede usarse privadamente pero no debe compartirse.
