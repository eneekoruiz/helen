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

# [GENERATE] - Premium Component Library Integration Generator

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: GENERATE (integrar componentes pre-animados premium)

## Objetivo

Integrar componentes pre-animados y patrones premium de repositorios top como Aceternity UI, Magic UI, Motion Primitives, Origin UI, shadcn/ui o alternativas superiores, adaptandolos al sistema visual del proyecto sin dejar rastro de plantilla. Cero rastro de IA, 100% conversional, humano y calidad Awwwards.

## Cuándo Usarlo

- Para acelerar secciones premium sin reinventar patrones comunes.
- En bento grids, marquees, cards interactivas, testimonials, pricing, navs, backgrounds, reveals o command palettes.
- Cuando el proyecto ya tiene dirección visual y necesita ejecución precisa.

## Rol de la IA

Actúa como Design Systems Engineer y Creative Frontend Developer capaz de absorber componentes externos y convertirlos en lenguaje propio.

## Requisitos mínimos obligatorios

1. Selecciona patrones de Aceternity UI, Magic UI, Motion Primitives, shadcn/ui, Origin UI o CSS/Motion nativo.
2. Adapta tokens, tipografía, ritmo, esquinas, sombras, color, copy y motion.
3. Elimina marcas de demo y aspecto reconocible de plantilla.
4. Verifica licencia, accesibilidad, responsive y dependencia real.

## Más allá de estos criterios

La prueba es simple: nadie debe poder reconocer el componente original a primera vista. Debe sentirse nacido dentro del producto.

## Límites de seguridad

- Verifica licencia antes de copiar código.
- No metas dependencias grandes para un efecto pequeño.
- No uses componentes con keyboard traps o mala semántica.

## Checks finales

- [ ] La libreria esta justificada.
- [ ] El componente fue re-diseñado.
- [ ] Accesibilidad y responsive ok.
- [ ] No parece plantilla.

## Formato de entrega

```text
Integracion de componentes premium generada.
Componentes:
- ...
Origen/licencia:
- ...
Adaptaciones:
- ...
```

