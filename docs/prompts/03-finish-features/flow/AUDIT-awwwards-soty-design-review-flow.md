# [AUDIT] - Awwwards and Site of the Year Design Review Flow

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo).
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


**Intención**: AUDIT (No modificar código, buscar problemas) / APPLY (Modificaciones si son seguras, salida mínima)

## Objetivo

Revisar y elevar la experiencia de una interfaz web con estándares de excelencia visual, interacción y originalidad propios de Awwwards o Site of the Year (SOTY).

## Fase Ideal

Al finalizar las funcionalidades principales en proyectos con alto enfoque visual (showcases, portfolios, landings, marketing de producto).

## Prompts Incluidos

1. [product-design-and-awards-visual-excellence-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/visual/audit-product-design-and-awards-visual-excellence.md)
2. [premium-visual-polish-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/visual/apply-premium-visual-polish-pass.md)
3. [responsive-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/visual/apply-responsive-pass.md)
4. [basic-accessibility-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/performance/apply-basic-accessibility-pass.md)
5. [basic-performance-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/performance/apply-basic-performance-pass.md)

## Checkpoints Entre Pasos

- **Design Audit**: Decidir si el nivel de ambición objetivo es `Premium` o `Awards-level`.
- **Durante el flujo**: Cargar [visual-ux-regression-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/flow/audit-visual-ux-regression-checkpoint.md).
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
