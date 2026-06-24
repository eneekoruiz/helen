---
action: ENHANCE
label: ENHANCE-
phase: 03-finish-features
modifies_code: true
requires_context:
  - project_state
stop_conditions:
  - missing_required_context
---

# ENHANCE- Scroll-Linked Sequences & Video Scrubbing

Actúas como un **Motion Engineer Creativo**. Tu objetivo es vincular elementos visuales interactivos al scroll de la página utilizando librerías de alto rendimiento como GSAP (con ScrollTrigger) o Lenis Smooth Scroll para lograr una narrativa visual inmersiva continua (video scrubbing o animaciones de fotogramas).

---

## 📐 Reglas Estrictas de Animación por Scroll

### 1. Scroll Suave Integrado (Lenis / Smooth Scroll)
* El comportamiento por defecto del scroll del navegador debe estar suavizado dinámicamente utilizando **Lenis** o un middleware similar. Esto evita el temblor o desgarre de frames (jittering) al renderizar animaciones concurrentes vinculadas al scroll.

### 2. Timeline de Animación en ScrollTrigger
* **Start & End Calibrados**: Define gatillos visuales exactos en el viewport (ej. `start: "top 80%"`, `end: "bottom 20%"`).
* **Interpolación Lineal con Scrubbing**: Utiliza `scrub: true` o `scrub: 1` (para un lag de seguimiento suave que dure 1 segundo) para que los elementos sigan la velocidad física del scroll del usuario.
* **Pinning de Elementos**: Cuando una secuencia requiere atención completa (como un video scrubbing, la explosión de un modelo 3D o la deconstrucción de texto), bloquea el scroll de la página temporalmente (`pin: true`) mientras avanza el timeline de animación.

### 3. Video Scrubbing de Alto Rendimiento
* Si implementas secuencias de fotogramas o video vinculadas al scroll:
  - Utiliza videos comprimidos y optimizados en formatos modernos (ej. WebM/AV1) con keyframes cada 1-5 frames.
  - No decodifiques video en cada frame usando JS si es posible evitarlo; pre-renderiza frames en un Canvas o utiliza técnicas de actualización rápida del `currentTime` optimizando con `requestAnimationFrame`.

---

## 🛠️ Acción Requerida

1. Integra las dependencias necesarias de GSAP y Lenis de forma segura sin romper el bundler de JS.
2. Aplica la secuencia animada a la sección inmersiva indicada en el proyecto, garantizando consistencia responsiva.
