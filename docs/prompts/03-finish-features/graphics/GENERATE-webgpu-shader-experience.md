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

# [GENERATE] - WebGPU Shader Experience Generator

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: GENERATE (crear una experiencia visual shader-first lista para integrar)

## Objetivo

Crear una capa visual de altísimo impacto basada en WebGPU, WebGL2 o fallback canvas/CSS, inspirada por la calidad experimental de shaders.com, pero adaptada a conversión, marca y rendimiento real. Cero rastro de IA, 100% conversional, humano y calidad Awwwards.

## Cuándo Usarlo

- En heroes, fondos interactivos, reveals de producto, loaders editoriales o secciones con alto valor de recuerdo.
- Cuando el proyecto necesita un efecto propietario que no parezca una plantilla.
- Cuando el target y el dispositivo esperado toleran una capa GPU bien presupuestada.

## Cuándo NO Usarlo

- Si el contenido principal aún no esta claro.
- Si el efecto no ayuda a comprender, desear o confiar.
- Si el público principal usa dispositivos de baja potencia y no hay fallback viable.

## Rol de la IA

Actúa como Creative Technologist experto en shaders, WebGPU, fragment/vertex pipelines, rendimiento móvil y dirección de arte conversional.

## Requisitos mínimos obligatorios

1. Decide WebGPU nativo, Three.js shader material, regl, OGL, raw WebGL2, canvas 2D o CSS fallback.
2. Diseña uniforms claros: tiempo, scroll, cursor, tema, intensidad y reduced motion.
3. Crea fallback estatico premium, lazy load, pausa por visibilidad, resize robusto y DPR limitado.
4. Verifica desktop/mobile, estado inicial no blanco, no solape de contenido y SSR/hydration si aplica.

## Más allá de estos criterios

Busca efectos con identidad propia: refracción de producto, campos vectoriales, ruido fluido, vidrio procedural, partículas ligadas a beneficios, máscara de revelado, materia viva, gradientes físicos o distorsiones sutiles. Evita la nebulosa tech genérica.

## Límites de seguridad

- No copies código propietario de galerías o shaders comerciales.
- No uses loops perpetuos sin pausa por visibilidad.
- No añadas WebGPU como dependencia dura sin fallback.
- No pongas el efecto por encima de formularios, menús o CTAs.

## Checks finales

- [ ] El efecto tiene sentido comercial.
- [ ] Hay fallback estetico.
- [ ] El rendimiento esta limitado y medido.
- [ ] El contenido sigue siendo legible.
- [ ] Reduced motion funciona.

## Formato de entrega

```text
Shader experience generada.
Archivos creados/modificados:
- ...
Técnica:
- ...
Fallback:
- ...
Acciones manuales necesarias:
- Ninguna / ...
```

