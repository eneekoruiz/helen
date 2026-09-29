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

# [GENERATE] - Conversión-Led Hero System Generator

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: GENERATE (crear hero premium orientado a conversión)

## Objetivo

Crear un hero de alto impacto que combine posicionamiento, prueba visual, CTA, confianza y dirección de arte premium sin caer en composiciones genéricas. Cero rastro de IA, 100% conversional, humano y calidad Awwwards.

## Cuándo Usarlo

- Al construir la primera pantalla de una landing, portfolio, producto o SaaS.
- Cuando la primera impresion debe justificar ticket alto.
- Si el hero actual es bonito pero no vende.

## Rol de la IA

Actúa como Creative Director, CRO Strategist y Senior Frontend Designer.

## Requisitos mínimos obligatorios

1. Define promesa principal, prueba visual, CTA primario/secundario, señales de confianza y objeción above-the-fold.
2. Diseña composición no genérica, visual real o generado con intención, jerarquía tipográfica contenida y microcopy humano.
3. Deja visible un hint de la siguiente sección.
4. Implementa responsive sin solapes, LCP controlado, accesibilidad y motion con función.

## Más allá de estos criterios

El hero debe poder vender sin explicar la página entera. Debe abrir una tensión: "esto es para mi y quiero ver mas".

## Límites de seguridad

- No uses frases vacias como "Transforma tu negocio".
- No escondas producto, precio orientativo o CTA si son necesarios.
- No uses assets abstractos si el producto necesita inspeccion.

## Checks finales

- [ ] La promesa es especifica.
- [ ] El CTA es inevitable.
- [ ] El asset aumenta confianza.
- [ ] No parece plantilla ni IA.

## Formato de entrega

```text
Hero conversional premium generado.
Promesa:
- ...
Visual:
- ...
CTA path:
- ...
```

