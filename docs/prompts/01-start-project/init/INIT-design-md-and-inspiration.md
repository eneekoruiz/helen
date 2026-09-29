---
action: INIT
label: INIT-
phase: 01-start-project
modifies_code: true
requires_context:
  - business_goal
  - project_scope
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

# [INIT] - Design MD and Inspiration

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.

**Intención**: INIT (definir la base visual antes de escribir código)

## Objetivo

Reunir inspiración real y capturar la identidad visual del proyecto en un `DESIGN.md` que cualquier agente pueda leer, de modo que la UI salga coherente desde la primera línea.

## Cuándo Usarlo

- Al iniciar un proyecto visual (landing, producto, portfolio).
- Al rediseñar un sitio existente sin sistema de diseño documentado.

## Cuándo NO Usarlo

- Si el cliente ya entrega un sistema de diseño cerrado: úsalo tal cual.

## Requisitos mínimos obligatorios

1. **Inspiración**: reúne 5-8 referencias reales (Dribbble, Awwwards, Behance, Pinterest u otras) y anota qué se toma de cada una (estructura, tipografía, ritmo, motion). Registra la URL de cada una. No inventes referencias.
2. **DESIGN.md**: crea `DESIGN.md` en la raíz con tokens (color, tipografía, espaciado, radios, sombras, motion) y una sección de razonamiento (por qué esas decisiones sirven al negocio y al público).
3. **Validación**: si hay Node disponible, ejecuta `npx @google/design.md lint DESIGN.md` y corrige errores (referencias rotas, contraste, orden de secciones).
4. **Colecciones de ejemplo**: puedes consultar `awesome-design-md` (getdesign.md) para ver cómo se estructuran DESIGN.md de marcas conocidas (`helen skills external awesome-design-md`).
5. Indica en el propio archivo qué es decisión propia y qué es referencia.

## Más allá de estos criterios

Define 3 principios de diseño no negociables y 3 cosas que la marca nunca hará. Un sistema con límites claros evita el aspecto genérico.

## Límites de Seguridad

- No clones la identidad de otra marca para un cliente: inspírate en principios, no copies logotipos, paleta exacta ni composición.
- Respeta las licencias de las fuentes y de los assets.
- No inventes métricas ni datos del negocio.

## Checks Finales

- [ ] Referencias con URL y motivo.
- [ ] `DESIGN.md` creado y validado (o motivo por el que no se pudo).
- [ ] Principios y anti-principios definidos.

## Formato de Entrega

Lista breve de referencias, ruta del `DESIGN.md`, resultado del lint y siguiente prompt recomendado (`generate-portfolio-layout-patterns` o `apply-premium-site-stack-flow`).
