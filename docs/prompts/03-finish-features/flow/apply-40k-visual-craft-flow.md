---
action: ENHANCE
label: ENHANCE-
phase: 03-finish-features
modifies_code: true
requires_context:
  - project_state
  - business_goal
stop_conditions:
  - missing_required_context
  - unsafe_to_continue
---
# Flow- Orquestador de Ejecución Visual 40K

**Intención**: APPLY (Modificar el proyecto aplicando la secuencia ultra-premium)

## Objetivo
Secuenciar y coordinar de forma autónoma la implementación y el pulido fino de interfaces del estándar Awwwards/SOTY (€100k+), garantizando interactividad avanzada, rendimiento de fotogramas (FPS) impecable y cero rastro de IA en los acabados.

## Prompts Incluidos en el Flujo
1. **[enhance-taste-visual-pov.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/visual/enhance-taste-visual-pov.md)**: Configura las variables tipográficas y la paleta de colores curada de base.
2. **[generate-premium-web-artifacts.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/visual/generate-premium-web-artifacts.md)**: Construye o refactoriza los bloques interactivos base en React/Tailwind.
3. **[enhance-motion-polish-and-transitions.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/motion/enhance-motion-polish-and-transitions.md)**: Inserta transiciones premium en componentes interactivos (dropdowns, modales, reveals).
4. **[enhance-scroll-linked-sequences.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/motion/enhance-scroll-linked-sequences.md)**: Integra animaciones y scrubbing fluido dependiente del scroll.
5. **[enhance-native-view-transitions.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/motion/enhance-native-view-transitions.md)**: Añade transiciones entre páginas fluidas mediante la API View Transitions.
6. **[enhance-dynamic-typography-pretext.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/graphics/enhance-dynamic-typography-pretext.md)**: Aplica pretexting matemático y layouts estilo revista sobre la marcha.
7. **[generate-webgpu-shaders.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/graphics/generate-webgpu-shaders.md)**: Añade lienzos líquidos y shaders interactivos WebGPU/WebGL de alto rendimiento.
8. **[generate-3d-motion-templates.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/3d/generate-3d-motion-templates.md)** & **[generate-integrated-premium-mockups.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/generate-integrated-premium-mockups.md)**: Integra mockups interactivos y layouts 3D.
9. **[generate-modern-ui-libraries-aceternity-magic-ui.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/visual/generate-modern-ui-libraries-aceternity-magic-ui.md)**: Enriquece las vistas con componentes interactivos modernos.
10. **[audit-animation-performance-and-fps.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/performance/audit-animation-performance-and-fps.md)**: Audita rendimiento y estabilidad a 60/120 FPS.

## Checkpoints de Seguridad
- **Checkpoint de Compilación**: [audit-build-and-compile-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/checkpoint/audit-build-and-compile-checkpoint.md)
- **Checkpoint de Calidad Visual**: [audit-visual-ux-regression-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/flow/audit-visual-ux-regression-checkpoint.md)

## Cuándo Detenerse
- Si se rompe el responsive a un nivel crítico de difícil solución.
- Si las animaciones provocan caídas por debajo de 50 FPS estables.
- Si hay errores de renderizado de WebGPU no soportados por el hardware actual.

## Formato de Reporte de Salida
Minimalista. Al finalizar el flujo, muestra:
```text
🚀 ¡Ultra-Premium Crafting Completado!
- [x] Variables tipográficas y paleta POV inyectada.
- [x] Artefactos interactivos React/Tailwind y efectos de librerías modernas añadidos.
- [x] Secuencias de Scroll & Motion aplicadas.
- [x] Auditoría de rendimiento aprobada (FPS estables, cero Layout Shift).

Siguientes Pasos de Endurecimiento:
- Ejecutar /prompts show audit-animation-performance-and-fps para depuración específica si fuese necesario.
```
