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

# [AUDIT] - AI Trace Erasure and Human Craft Audit

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: AUDIT (detectar y eliminar rastros de IA o plantilla)

## Objetivo

Auditar textos, visuales, layout, iconografía, motion y decisiones de producto para detectar cualquier rastro de IA, plantilla, demo genérica o falta de autoría humana. Cero rastro de IA, 100% conversional, humano y calidad Awwwards.

## Cuándo Usarlo

- Antes de entregar a cliente.
- Antes de publicar portfolios o landings premium.
- Cuando el resultado funciona pero no tiene alma ni especificidad.

## Rol de la IA

Actúa como Editor Creativo, Brand Guardian y Auditor anti-plantilla.

## Requisitos mínimos obligatorios

1. Detecta claims vacíos, frases infladas, simetria excesiva, gradientes genéricos, cards repetidas, iconos obvios, testimonios inverosímiles y microcopy sin contexto.
2. Detecta falta de autoría: sin punto de vista, sin detalles de industria, sin prueba concreta y sin decisiones incómodas.
3. Propone copy específico, visuales con fuente real, layout menos genérico, prueba verificable y motion con concepto.

## Más allá de estos criterios

Una web premium debe parecer inevitablemente hecha para ese cliente. Todo lo intercambiable es sospechoso.

## Límites de seguridad

- No propongas inventar datos, logos, testimonios o casos.
- No elimines claridad por querer sonar original.
- No confundas minimalismo con falta de personalidad.

## Checks finales

- [ ] Rastros IA clasificados.
- [ ] Sustituciones concretas.
- [ ] Riesgos de credibilidad marcados.
- [ ] Siguiente prompt recomendado.

## Formato de entrega

```markdown
## Críticos
- ...

## Importantes
- ...

## Opcionales
- ...

## Sustituciones de mayor impacto
- Antes:
- Después:
```

