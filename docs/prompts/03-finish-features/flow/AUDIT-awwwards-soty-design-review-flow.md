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

# [AUDIT] - Awwwards and Site of the Year Design Review Flow

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: AUDIT (No modificar código, buscar problemas) / APPLY (Modificaciones si son seguras, salida mínima)

## Objetivo

Revisar y elevar la experiencia de una interfaz web con estándares de excelencia visual, interacción y originalidad propios de Awwwards o Site of the Year (SOTY).

## Fase Ideal

Al finalizar las funcionalidades principales en proyectos con alto enfoque visual (showcases, portfolios, landings, marketing de producto).

## Prompts Incluidos

1. [product-design-and-awards-visual-excellence-audit.md](../visual/AUDIT-product-design-and-awards-visual-excellence.md)
2. [premium-visual-polish-pass.md](../visual/APPLY-premium-visual-polish-pass.md)
3. [responsive-pass.md](../visual/APPLY-responsive-pass.md)
4. [basic-accessibility-pass.md](../performance/APPLY-basic-accessibility-pass.md)
5. [basic-performance-pass.md](../performance/APPLY-basic-performance-pass.md)

## Checkpoints Entre Pasos

- **Design Audit**: Decidir si el nivel de ambición objetivo es `Premium` o `Awards-level`.
- **Durante el flujo**: Cargar [visual-ux-regression-checkpoint.md](AUDIT-visual-ux-regression-checkpoint.md).
- **Final**: Balancear efectos visuales y transiciones frente a warnings de rendimiento o accesibilidad antes de realizar envíos públicos.

## Condiciones para Avanzar

- El flujo principal funciona con fluidez.
- La dirección creativa no perjudica la usabilidad ni la velocidad de carga básica de la web.

## Formato de Entrega

Si se aplican micro-mejoras visuales (APPLY):
```text
✅ Mejoras de diseño y craft aplicadas. / [o] ⚠️ Completado con advertencias.

Cambios aplicados:
- [Breve lista de 1-3 viñetas con ajustes de diseño/interacción aplicados]

Acciones manuales necesarias:
- Ninguna. / [o especificar acciones]
```

Si se genera informe estético (AUDIT):
1. Veredicto del nivel estético y puntuación simulada (Awwwards).
2. Problemas estéticos/craft críticos (priorizados por Críticos, Importantes, Opcionales).
3. Propuesta de motion, transiciones y concepto creativo.
4. Riesgos de rendimiento o accesibilidad detectados.
