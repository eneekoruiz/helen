---
action: AUDIT
label: AUDIT-
phase: 04-before-production
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

# [AUDIT] - Final SEO Audit

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: AUDIT (No modificar código, buscar problemas)

## Objetivo

Verificar SEO básico, metadatos y configuraciones de indexabilidad antes de la publicación o release.

## Cuándo Usarlo

- En la fase de preparación de releases para proyectos web públicos.
- Antes de compartir landing pages, documentación pública o portfolios.

## Cuándo NO Usarlo

- Si el posicionamiento SEO está explícitamente fuera de alcance del proyecto.
- Si no hay superficie de contenido indexable en buscadores.

## Criterios Mínimos

- Revisa `title`, `meta description`, Open Graph (OG), URLs canónicas, directivas `robots.txt`, sitemaps, estructura de headings (`h1`), indexabilidad y prevención de contenido duplicado.
- Comprueba que los metadatos e indexaciones coincidan estrictamente con el producto real.

## Más allá de estos criterios

Busca oportunidades de discoverability orgánica: páginas comparativas, optimización de palabras clave en la documentación, sitemaps limpios y snippets atractivos para compartir.

## Límites de Seguridad

No añadas claims de SEO, keywords de spam o textos de marketing engañosos que el producto no sostenga con evidencia.

## Checks Finales

- Metadatos esenciales presentes en todas las páginas clave.
- Claims SEO verificables con el contenido.
- Sin directivas `noindex` accidentales en producción.

## Formato de Entrega

1. Bloqueadores y problemas SEO críticos (clasificados por severidad: Críticos, Importantes, Opcionales).
2. Propuestas de optimización (meta tags, headings).
3. Oportunidades orgánicas.
4. Warnings y advertencias.
