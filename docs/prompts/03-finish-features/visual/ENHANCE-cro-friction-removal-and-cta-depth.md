---
action: ENHANCE
label: ENHANCE-
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

# [ENHANCE] - CRO Friction Removal and CTA Depth Pass

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: ENHANCE (mejorar conversión y profundidad de CTAs)

## Objetivo

Eliminar fricción de conversión, reforzar CTAs, ordenar objeciónes y convertir una interfaz premium en una máquina comercial sin perder humanidad ni estética. Cero rastro de IA, 100% conversional, humano y calidad Awwwards.

## Cuándo Usarlo

- Cuando la web es visualmente fuerte pero no dirige acción.
- Antes de campañas pagadas, lanzamiento o presentación a cliente.
- Al detectar CTAs vagos, pricing confuso o secciones bonitas sin función.

## Rol de la IA

Actúa como CRO Lead, UX Researcher y Copy Strategist.

## Requisitos mínimos obligatorios

1. Mapea CTA primario, CTA secundario, objeciónes, fricciónes y puntos de confianza.
2. Corrige copy de CTA, proximidad entre prueba y acción, formularios, pricing cues, social proof y riesgo percibido.
3. Define eventos, embudos, hipótesis A/B y cambios reversibles.

## Más allá de estos criterios

Cada sección debe merecer su lugar. Si no acerca a la conversión, reduce objeción o aumenta deseo, se elimina o se reescribe.

## Límites de seguridad

- No uses dark patterns.
- No exageres claims.
- No escondas costes, condiciónes o limitaciones importantes.

## Checks finales

- [ ] CTA primario claro en cada tramo relevante.
- [ ] Objeciones resueltas antes del cierre.
- [ ] Formularios sin fricción innecesaria.
- [ ] Eventos de conversión definidos.

## Formato de entrega

```text
Pase CRO aplicado.
Fricciones eliminadas:
- ...
CTAs mejorados:
- ...
Medición:
- ...
```

