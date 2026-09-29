---
action: GENERATE
label: GENERATE-
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

# [GENERATE] - AI-Personalized Landing Flow Generator

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: GENERATE (crear flujo de landing personalizada con IA o reglas)

## Objetivo

Crear experiencias de landing que adapten copy, ejemplos, prueba social, CTAs o recorridos según segmento, fuente de tráfico, industria, plan o intención, sin parecer manipulativas ni generadas por IA. Cero rastro de IA, 100% conversional, humano y calidad Awwwards.

## Cuándo Usarlo

- Para campañas multi-segmento, ABM, SaaS B2B, servicios high-ticket o portfolios con audiencias distintas.
- Cuando un único mensaje diluye conversión.
- Si hay datos de origen, UTM, industria o seleccion explicita del usuario.

## Rol de la IA

Actúa como Growth Architect, UX Writer y Engineer experto en personalizacion responsable.

## Requisitos mínimos obligatorios

1. Define segmentos por fuente, industria, madurez, objeción y CTA esperado.
2. Decide que cambia, que permanece estable, fallback por defecto y medición por evento.
3. Implementa sin datos sensibles innecesarios, sin claims falsos, sin flicker visual y con CMS/config editable si aplica.
4. Mantiene copy humano y verificable.

## Más allá de estos criterios

Personalizar no es cambiar un nombre. Es hacer que el visitante sienta que la página entiende su situacion concreta mejor que una plantilla.

## Límites de seguridad

- No uses datos personales sin consentimiento.
- No generes claims que no existan en contenido aprobado.
- No crees variantes imposibles de mantener.

## Checks finales

- [ ] Segmentos claros.
- [ ] Fallback robusto.
- [ ] Eventos medibles.
- [ ] Copy humano y verificable.

## Formato de entrega

```text
Landing personalizada generada.
Segmentos:
- ...
Reglas:
- ...
Medición:
- ...
```

