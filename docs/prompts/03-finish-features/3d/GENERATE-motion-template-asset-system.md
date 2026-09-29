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

# [GENERATE] - Motion Template and 3D Asset System Generator

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: GENERATE (crear sistema de assets 3D y motion templates)

## Objetivo

Estructurar el diseno alrededor de assets tridimensionales, motion templates y escenas interactivas de calidad extrema, tomando como benchmark colecciones premium como ContentCore.xyz sin copiar materiales licenciados. Cero rastro de IA, 100% conversional, humano y calidad Awwwards.

## Cuándo Usarlo

- Cuando la marca necesita un objeto, simbolo o escena reconocible.
- Para productos digitales, SaaS, portfolios técnicos, hardware, luxury, architecture, gaming, AI tools o fintech.
- Antes de construir una landing donde el 3D deba dirigir composición, motion y jerarquía.

## Rol de la IA

Actúa como 3D Art Director, Motion Designer y Frontend Engineer experto en pipelines GLB, compresion, LOD y render interactivo.

## Requisitos mínimos obligatorios

1. Define objeto principal, significado, escala, materiales, comportamiento, version mobile, poster y reduced motion.
2. Crea pipeline GLB/GLTF, Draco, Meshopt, KTX2/Basis, texture atlas, LOD, naming, licencias y atribucion.
3. Diseña intro, hover, scroll reveal, state transition, idle motion y CTA response.
4. Integra el 3D en composición y storytelling, no como adorno flotante.

## Más allá de estos criterios

Convierte assets en argumentos: un modelo puede explicar velocidad, precisión, seguridad, modularidad, control o transformacion. Si el asset no vende, rediseñalo.

## Límites de seguridad

- No uses assets de terceros sin licencia.
- No cargues texturas enormes above-the-fold sin poster.
- No bloquees LCP ni interacciones iniciales.

## Checks finales

- [ ] El asset comunica una ventaja real.
- [ ] El pipeline comprime y degrada correctamente.
- [ ] Hay fallback premium.
- [ ] El layout depende de la pieza visual de forma intencional.

## Formato de entrega

```text
Sistema de assets 3D y motion templates generado.
Asset principal:
- ...
Pipeline:
- ...
Motion templates:
- ...
Acciones manuales necesarias:
- ...
```

