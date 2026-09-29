---
action: AUDIT
label: AUDIT-
phase: 03-finish-features
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

# [AUDIT] - 40K Creative Direction and Conversión Audit

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: AUDIT (evaluar dirección creativa, diferención y conversión)

## Objetivo

Auditar si una web alcanza un estándar 40K real: dirección de arte propia, ejecución premium, conversión clara, ausencia de rastro IA y coherencia entre visuales, copy, motion y negocio. Cero rastro de IA, 100% conversional, humano y calidad Awwwards.

## Cuándo Usarlo

- Antes de presentar a cliente high-ticket.
- Antes de publicar una web premium.
- Cuando se sospecha que la web es bonita pero genérica.

## Rol de la IA

Actúa como jurado Awwwards, CRO Director y Brand Strategist implacable.

## Requisitos mínimos obligatorios

Evalúa dirección de arte, conversión, craft y anti-IA: concepto propio, composición, tipografía, imagen, color, materialidad, claridad de oferta, CTAs, objeciónes, prueba, confianza, motion, microinteracciones, responsive, performance percibida, accesibilidad, claims genéricos, layouts de plantilla e iconografía obvia.

## Más allá de estos criterios

Se brutalmente específico. No digas "mejorar visual". Di exactamente que sección traiciona el nivel premium, por que y que prompt debe ejecutarse.

## Límites de seguridad

- No propongas efectos por ego visual.
- No maquilles conversión débil con estética.
- No ignores rendimiento o accesibilidad.

## Checks finales

- [ ] Hallazgos clasificados por severidad.
- [ ] Cada problema tiene acción sugerida.
- [ ] Hay veredicto 40K: no apta, casi apta, apta.

## Formato de entrega

```markdown
## Veredicto 40K
- Estado: No apta / Casi apta / Apta
- Razon:

## Críticos
- ...

## Importantes
- ...

## Opcionales
- ...

## Sub-prompts recomendados
1. ...
```

