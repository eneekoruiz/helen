# Audit of Animated and 3D Visuals: Performance, Safety, and Integration

**Intención**: AUDIT (No modificar código, buscar problemas)

Purpose: Audit animation smoothness, 3D/WebGL asset sizes, CPU/GPU usage, memory leaks, mobile limits, accessibility (reduced motion), and progressive enhancement to ensure high-fidelity visual elements can coexist safely in the workspace.

Use this prompt when the project includes animations, interactive canvas elements, 3D visual effects (Three.js, WebGL), CSS transitions, custom SVG animations, or high-fidelity UI transitions.

## Prompt

Act as a Senior Creative Technologist, WebGL Engineer, Motion Designer, and Frontend Performance Architect.

Review the project's interactive, 3D, and animated visual components.

## Requisitos mínimos obligatorios

Audit these areas at minimum:

1. **Rendimiento e Integridad Gráfica (FPS & Resource Overhead)**
   - **Tasa de Refresco**: Verificar que las animaciones mantengan 60 FPS estables (o 120 FPS en pantallas compatibles). Identificar caídas de frames (jank).
   - **Carga de CPU/GPU**: Analizar el uso del hilo principal (main thread). Evitar reflows/paints costosos en bucles de animación (por ejemplo, leer y escribir propiedades del DOM que fuercen layouts en `requestAnimationFrame`).
   - **Fugas de Memoria (Memory Leaks)**: Comprobar la eliminación correcta de recursos en WebGL (Three.js/PixiJS) al desmontar componentes (texturas, geometrías, materiales, event listeners, animation loops con `cancelAnimationFrame`).
   - **Manejo de Pérdida de Contexto**: Confirmar que los lienzos WebGL implementen el manejo seguro de pérdida de contexto (`webglcontextlost`) y permitan la restauración automática sin congelar la app.

2. **Existencia e Integración Segura (Progresividad y Fallbacks)**
   - **Mejora Progresiva (Progressive Enhancement)**: Comprobar que la aplicación y sus características principales sigan siendo 100% funcionales y legibles incluso si las animaciones o la capa 3D fallan, se desactivan o no cargan.
   - **Mapeo de Fallback Gracioso**: Diseñar e implementar fallbacks elegantes (por ejemplo, imágenes estáticas optimizadas, degradados CSS fluidos o capturas de pantalla de alta fidelidad) para navegadores sin soporte WebGL/GPU o con soporte deshabilitado.
   - **Carga Asíncrona de Assets**: Asegurar la carga diferida (lazy load) de librerías visuales pesadas (ej. `three`, `gsap`, `framer-motion`) y la compresión agresiva de modelos 3D (formatos `.glb`/.gltf comprimidos mediante Draco, Meshopt o texturas KTX2 KHR_texture_basisu).

3. **UX, Diseño de Movimiento y Accesibilidad**
   - **Reducción de Movimiento (`prefers-reduced-motion`)**: Garantizar que todas las transiciones y visualizaciones 3D escuchen la media query de accesibilidad de reducción de movimiento y se simplifiquen o detengan de inmediato.
   - **Restricción de Movimientos Intrusivos**: Evitar efectos visuales parpadeantes, giros bruscos o loops infinitos que puedan provocar mareos o cansancio visual sin una opción clara de pausa, atenuación o desactivación.
   - **Contraste y Legibilidad en Capas Animadas**: Asegurar que los textos, botones e indicadores clave situados encima o cerca de las animaciones/3D mantengan relaciones de contraste WCAG óptimas y no se vean distorsionados o recortados por efectos interactivos.

4. **Pulido Visual y Sincronización**
   - **Curvas de Easing e Integración**: Evalúar la coherencia de las animaciones con la física del mundo real o las directrices de marca (usar easings personalizados/cúbicos en lugar de transiciones lineales abruptas).
   - **Interacción Fluida**: Comprobar que los disparadores interactivos (hover, click, drag, scroll-jacking) tengan una respuesta instantánea y no interfieran con la fluidez nativa del scroll táctil del dispositivo.

## Más allá de estos criterios

Usa tu juicio creativo y técnico. Busca el equilibrio perfecto: la existencia de efectos visuales animados y 3D debe elevar sustancialmente el valor percibido del producto (premium/awards-level) sin penalizar la resiliencia técnica, la velocidad de carga ni la compatibilidad multidispositivo. El lema es "mejorar drásticamente la experiencia estética sin romper absolutamente nada de la funcionalidad base".

## Límites de seguridad

- No añadas librerías de animación complejas de forma innecesaria; prefiere siempre animaciones CSS nativas estructuradas, Canvas 2D ligeros o WebGL optimizado puro.
- No deshabilites el scroll nativo o los eventos de entrada del sistema táctil para acomodar gestos 3D personalizados sin un fallback claro.
- No bloquees el renderizado inicial de la página (First Contentful Paint) esperando que carguen los assets 3D o modelos de gran tamaño.

## Checks finales

- [ ] Soporte para `prefers-reduced-motion` verificado e implementado.
- [ ] Fallback en caso de WebGL desactivado o no soportado validado.
- [ ] Limpieza completa de recursos (unmount lifecycle / event listeners) confirmada.
- [ ] Librerías pesadas y assets 3D optimizados en tamaño y diferidos (lazy load).
- [ ] Contraste tipográfico sobre elementos animados validado.

## Formato de entrega

El reporte de auditoría debe estructurarse de la siguiente manera:

1. **Estado de Rendimiento Visual**: Detallar FPS estables y uso de recursos (CPU/GPU) estimado.
2. **Nivel de Integración y Fallbacks**: Describir cómo se comporta el sistema si falla la tecnología de animación o WebGL.
3. **Listado de Hallazgos** (clasificados por severidad):
   - **Críticos**: Fugas de memoria detectadas, bloqueos del hilo principal, ausencia de fallback que rompa la pantalla, interferencias en eventos básicos de UI.
   - **Importantes**: Caídas de FPS notables, assets 3D no optimizados o cargados de forma síncrona, falta de soporte para reducción de movimiento.
   - **Opcionales**: Pequeños desajustes de sincronización (easing), contraste mejorable sobre fondos dinámicos, micro-optimizaciones del loop de renderizado.
4. **Plan de Acción Seguro**: Qué mejoras visuales y de rendimiento se pueden aplicar de inmediato sin riesgo de regresión funcional.
