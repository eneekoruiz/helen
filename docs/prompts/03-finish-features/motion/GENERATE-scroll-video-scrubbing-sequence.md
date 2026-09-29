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

# [GENERATE] - Scroll Video Scrubbing Sequence Generator

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: GENERATE (crear secuencia de video/frame scrubbing ligada al scroll)

## Objetivo

Crear secuencias narrativas vinculadas al scroll usando GSAP ScrollTrigger, Lenis, canvas frame sequences, video scrubbing o técnicas superiores, con control exacto de start frame, end frame, rendimiento y fallback. Cero rastro de IA, 100% conversional, humano y calidad Awwwards.

## Cuándo Usarlo

- Para explicar transformaciones, procesos, producto, arquitectura, before/after o storytelling de marca.
- Cuando el scroll debe revelar informacion compleja de forma memorable.
- Si existen frames, video o renders que justifican una coreografia.

## Rol de la IA

Actúa como Motion Director y Frontend Engineer experto en scroll choreography, encoding, canvas rendering y UX.

## Requisitos mínimos obligatorios

1. Decide canvas image sequence, video `currentTime`, GSAP ScrollTrigger timeline o Lenis cuando aporte valor.
2. Define start frame, end frame, beats, texto asociado, CTAs y aprendizaje por tramo.
3. Implementa preload progresivo, poster inicial, fallback mobile, reduced motion y dimensiones estables.
4. Mide peso total, tiempo hasta primer frame, FPS percibido, CLS y LCP.

## Más allá de estos criterios

La secuencia debe parecer una pieza de dirección, no un truco. El movimiento tiene que comprimir explicacion y aumentar deseo.

## Límites de seguridad

- No dependas de cientos de frames pesados above-the-fold sin estrategia.
- No bloquees scroll nativo.
- No escondas contenido esencial dentro de una animación no accesible.

## Checks finales

- [ ] Hay narrativa por beats.
- [ ] El primer frame aparece rápido.
- [ ] Reduced motion mantiene el mensaje.
- [ ] El scroll conserva control del usuario.

## Formato de entrega

```text
Secuencia scroll/video generada.
Técnica:
- ...
Beats:
- ...
Fallback:
- ...
Acciones manuales necesarias:
- ...
```

