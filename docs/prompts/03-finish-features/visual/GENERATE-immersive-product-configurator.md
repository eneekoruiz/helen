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

# [GENERATE] - Immersive Product Configurator Generator

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: GENERATE (crear configurador o simulador inmersivo)

## Objetivo

Crear un configurador, simulador, comparador o demo interactiva que permita al usuario experimentar valor antes de comprar, con calidad visual premium y lógica clara. Cero rastro de IA, 100% conversional, humano y calidad Awwwards.

## Cuándo Usarlo

- Para productos con opciones, planes, personalizacion, calculo de ROI, visualizacion 3D o comparativas.
- Cuando la conversión mejora si el usuario juega con escenarios reales.
- En SaaS, ecommerce high-ticket, servicios B2B, inmobiliaria, educacion o consultoria.

## Rol de la IA

Actúa como Product Designer, CRO Strategist y Senior Engineer experto en interfaces interactivas.

## Requisitos mínimos obligatorios

1. Define variables de entrada, resultado ?til, CTA posterior y disclaimer si aplica.
2. Usa sliders, toggles, steppers, swatches, tabs o canvas/3D según caso.
3. Implementa feedback instantaneo, validacion, mobile ergonomico, accesibilidad, persistencia ligera y rendimiento estable.
4. Hace la lógica verificable y no engañosa.

## Más allá de estos criterios

Un configurador premium no es un juguete: es una forma de que el usuario se convenza a si mismo con sus propios datos.

## Límites de seguridad

- No inventes calculos financieros sin fuente o aviso.
- No escondas supuestos.
- No hagas interacciones complejas sin beneficio conversional.

## Checks finales

- [ ] El resultado ayuda a decidir.
- [ ] La interacción es obvia.
- [ ] El CTA posterior tiene contexto.
- [ ] La lógica es verificable.

## Formato de entrega

```text
Configurador inmersivo generado.
Variables:
- ...
Resultado:
- ...
CTA posterior:
- ...
```

