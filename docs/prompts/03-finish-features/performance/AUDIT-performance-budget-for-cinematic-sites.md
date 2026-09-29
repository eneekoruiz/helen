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

# [AUDIT] - Performance Budget for Cinematic Sites Audit

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: AUDIT (evaluar presupuesto de rendimiento en webs cinematicas)

## Objetivo

Auditar si una experiencia premium con 3D, video, shaders, motion o mockups respeta presupuestos de rendimiento sin destruir conversión, SEO ni accesibilidad. Cero rastro de IA, 100% conversional, humano y calidad Awwwards.

## Cuándo Usarlo

- Antes o despues de integrar WebGPU, Three.js, video scrubbing o assets pesados.
- Antes de produccion.
- Cuando la web se siente espectacular pero lenta.

## Rol de la IA

Actúa como Performance Architect especializado en sitios cinematicos.

## Requisitos mínimos obligatorios

1. Mide LCP, CLS, INP, JS total, peso imagen/video/modelos y FPS percibido.
2. Inspecciona lazy loading, preloads, posters, DPR, canvas visibility pause, reduced motion y asset compression.
3. Clasifica riesgos críticos, importantes y opcionales.
4. Recomienda degradacion elegante antes que eliminar encanto visual con dogma.

## Más allá de estos criterios

No mates el encanto visual por dogma. Recorta lo invisible, degrada con elegancia y protege lo que vende.

## Límites de seguridad

- No recomiendes eliminar efectos sin evaluar su función.
- No uses metricas aisladas sin contexto de negocio.
- No aceptes cargas pesadas sin fallback.

## Checks finales

- [ ] Presupuesto claro.
- [ ] Problemas por severidad.
- [ ] Recomendaciones accionables.
- [ ] Fallbacks verificados.

## Formato de entrega

```markdown
## Críticos
- ...

## Importantes
- ...

## Opcionales
- ...

## Presupuesto Recomendado
- JS:
- Imagen/video:
- 3D:
- Motion:
```

