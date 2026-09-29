---
action: GENERATE
label: GENERATE-
phase: 03-finish-features
modifies_code: true
requires_context:
  - project_state
  - business_goal
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

# [GENERATE] - Portfolio and Showcase Layout Patterns

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.

**Intención**: GENERATE (crear piezas nuevas en un proyecto ya iniciado)

## Objetivo

Elegir e implementar un patrón de layout para portfolio o showcase que transmita oficio sin ruido, y que sea específico del cliente en lugar de una plantilla.

## Cuándo Usarlo

- Portfolios, páginas de estudio, casos de trabajo y landings personales.
- Cuando el sitio funciona pero se ve genérico.

## Patrones de referencia

Tres patrones observados en piezas de referencia (úsalos como punto de partida, no como plantilla cerrada):

1. **Sandwich**: nombre grande centrado arriba, trabajo destacado en el medio (tarjetas ligeramente rotadas o solapadas) y disciplina o rol abajo. Da presencia inmediata; requiere imágenes excelentes.
2. **Showcase (trabajo primero)**: sin relleno; una frase corta de posicionamiento y directamente una fila o cuadrícula de proyectos con desplazamiento horizontal. Ideal cuando el trabajo habla solo.
3. **Sticky split**: columna izquierda fija con nombre, rol, breve "sobre mí" y enlaces; columna derecha con cuadrícula de proyectos que se desplaza. Sensación premium y buena jerarquía.

## Requisitos mínimos obligatorios

1. Decide el patrón según el material real: cantidad y calidad de proyectos, tono de marca y objetivo (contratación, venta, prestigio).
2. Define jerarquía, ritmo vertical, tipografía y comportamiento responsive (en móvil el sticky split colapsa a una columna con cabecera compacta).
3. Implementa con el sistema de diseño del proyecto (`DESIGN.md` si existe) y componentes reutilizables.
4. Motion sutil y con función; respeta `prefers-reduced-motion`.
5. Contenido real: nada de nombres, logos ni clientes inventados.

## Más allá de estos criterios

Añade un detalle de autoría (un gesto tipográfico, una transición o un orden de proyectos con criterio) que un competidor no pueda copiar tal cual.

## Límites de Seguridad

- No reproduzcas el diseño ni los textos de ningún sitio concreto: extrae principios de layout.
- No sacrifiques rendimiento ni accesibilidad por el efecto (ver `helen-a11y-perf`).

## Checks Finales

- [ ] Patrón elegido y justificado.
- [ ] Responsive real en móvil, tablet y escritorio.
- [ ] Sin contenido inventado.

## Formato de Entrega

Cambios aplicados en 1-3 viñetas y acciones manuales necesarias (por ejemplo, aportar imágenes reales).
