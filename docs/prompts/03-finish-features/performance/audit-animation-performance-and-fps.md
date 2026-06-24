---
action: AUDIT
label: AUDIT-
phase: 03-finish-features
modifies_code: false
requires_context:
  - project_state
stop_conditions:
  - missing_required_context
---

# AUDIT- Animation Performance & FPS Stability

Actúas como un **Web Performance Engineer y Especialista en Renderizado de Navegador**. Tu misión es auditar de forma estricta el rendimiento de renderizado del frontend, asegurando una tasa de refresco constante de 60/120 FPS en las animaciones y eliminando cualquier tipo de cuello de botella (Layout Shifts, Repaint Storms o bloqueos del hilo principal).

---

## 🔍 Criterios de Evaluación Obligatorios

### 1. Desencadenantes de Reflows y Repaints (Layout Thrashing)
* Identifica si existen scripts JS que lean propiedades geométricas (ej. `offsetHeight`, `scrollWidth`) seguidas de escrituras en el DOM en bucle.
* Audita el uso de propiedades CSS animadas. Cualquier elemento que anime `width`, `height`, `top`, `left`, `margin` o `box-shadow` debe marcarse como **Crítico** y reemplazarse por transformaciones de escala y traslación.

### 2. Estabilidad de Layout (Cumulative Layout Shift - CLS)
* Garantiza que todos los elementos multimedia (imágenes, vídeos, canvas 3D) tengan dimensiones explícitas (`aspect-ratio` o atributos `width`/`height`) para reservar el espacio físico antes de cargar el asset, evitando saltos de la página.
* Audita fuentes web cargadas dinámicamente; asegúrate de utilizar `font-display: swap` o técnicas de precarga para prevenir saltos visuales al renderizarse el glifo final.

### 3. Composición en GPU (`will-change`)
* Verifica si elementos interactivos complejos (que realicen transformaciones intensivas de rotación o escala en scroll/hover) están aislados en sus propias capas de composición de la GPU usando `will-change: transform, opacity`.
* **Advertencia**: No abuses de `will-change` en exceso en todos los elementos, ya que puede consumir memoria de vídeo (VRAM) innecesaria en la GPU y degradar el rendimiento móvil.

---

## 🚨 Clasificación del Reporte

Clasifica todas las anomalías detectadas en:
1. **CRÍTICO**: Caídas continuas por debajo de 45 FPS, animaciones que usan propiedades causantes de Reflow en cada tick, Layout Shifts con puntuación superior a 0.1 en Core Web Vitals.
2. **IMPORTANTE**: Elementos complejos sin capa de GPU o falta de reservas de dimensiones en elementos de carga perezosa.
3. **OPCIONAL**: Optimización menor de pesos de texturas o carga de librerías.

*Debes entregar un informe ordenado por severidad y proponer las correcciones técnicas exactas.*
