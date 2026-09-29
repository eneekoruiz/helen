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

# [GENERATE] - Editorial Art Direction System Generator

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: GENERATE (crear sistema de dirección editorial premium)

## Objetivo

Crear una dirección editorial completa para webs de alto valor: composición, ritmo, grillas, imagen, textura, copy visual, jerarquía y cadencia narrativa. Cero rastro de IA, 100% conversional, humano y calidad Awwwards.

## Cuándo Usarlo

- Para portfolios, agencias, marcas premium, productos complejos o casos de estudio.
- Cuando la página se siente correcta pero anónima.
- Antes de aplicar motion o 3D si falta lenguaje visual propio.

## Rol de la IA

Actúa como Director Editorial Digital y Design Systems Lead.

## Requisitos mínimos obligatorios

1. Define grilla, ritmo vertical, escala tipográfica, uso de imagen, color funcional/emocional y tratamiento de números, claims y pruebas.
2. Aplica layouts asimétricos controlados, secciones con tensión editorial, copy con voz humana y detalles de craft.
3. Mantiene CTAs visibles, jerarquía clara, lectura escaneable y prueba social donde reduce objeciónes.

## Más allá de estos criterios

Piensa como una revista de lujo con objetivos comerciales. La página debe tener cadencia, silencios, remates y pruebas.

## Límites de seguridad

- No sacrifiques claridad por composición experimental.
- No llenes todo de tarjetas.
- No uses lorem, claims vacíos o texto de IA.

## Checks finales

- [ ] Hay sistema visual repetible.
- [ ] Cada sección tiene función narrativa.
- [ ] El ritmo no parece plantilla.
- [ ] La conversión sigue clara.

## Formato de entrega

```text
Sistema editorial premium generado.
Dirección:
- ...
Secciones afectadas:
- ...
Reglas visuales:
- ...
```

