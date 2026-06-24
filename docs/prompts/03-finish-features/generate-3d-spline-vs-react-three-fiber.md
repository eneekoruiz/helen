---
action: GENERATE
label: GENERATE-
phase: 03-finish-features
modifies_code: true
requires_context:
  - project_state
stop_conditions:
  - missing_required_context
---

# GENERATE- 3D Custom (Spline vs React Three Fiber)

Actúas como un **Arquitecto de Experiencias 3D Web**. Tu objetivo es tomar la decisión arquitectónica correcta e implementar la integración 3D adecuada (Spline para rapidez de prototipado e interactividad out-of-the-box vs React Three Fiber/Drei/Three.js para arquitecturas complejas de sombreado y control absoluto de memoria).

---

## 🧭 Criterios de Decisión Arquitectónica

Debes evaluar y justificar la arquitectura elegida mediante la siguiente matriz:

| Característica | Elegir Spline (`@splinetool/react-spline`) | Elegir React Three Fiber (`three` + `@react-three/fiber`) |
|---|---|---|
| **Velocidad de Entrega** | Alta. Diseño y animación pre-configurada en editor visual. | Media/Baja. Requiere estructuración por código de luces y mallas. |
| **Peso del Bundle** | Pesado (requiere cargar el runtime de exportación de Spline). | Optimizado (Tree-shaking a nivel de mallas y dependencias de Three.js). |
| **Complejidad Shader** | Limitado a materiales integrados en la nube de Spline. | Totalmente programable (uniforms dinámicos, custom shaders, WebGPU). |
| **Acceso a Nodos** | Limitado (mediante nombres de objetos en Spline API). | Total (referencias directas, refs en React, hooks de física). |

---

## 📐 Reglas Estrictas de Implementación

### 1. Si eliges Spline
* **Carga Perezosa (Lazy Loading)**: Carga el runtime de Spline de forma perezosa (`React.lazy` o `dynamic` import) para no inflar el tamaño inicial del archivo bundle cargado por el navegador.
* **Fallbacks de Carga**: Muestra un spinner o una captura vectorial estática 2D de alta calidad del modelo mientras carga el archivo binario de Spline.
* **Control de Eventos**: Limita el número de eventos del cursor enviados al canvas de Spline para evitar caídas en el hilo de UI.

### 2. Si eliges React Three Fiber
* **Uso de Drei Helpers**: Utiliza loaders optimizados (`useGLTF`) y componentes de conveniencia para la cámara, luces y controles (`OrbitControls`, `Environment`).
* **Instanciación y Reutilización**: Utiliza mallas instanciadas (`instances`) si repites el mismo objeto 3D en la escena para optimizar llamadas de dibujado (draw calls).

---

## 🛠️ Acción Requerida

1. Presenta un veredicto de diseño justificando qué opción se adapta mejor al proyecto.
2. Genera e implementa el código del setup 3D elegido, incluyendo el fallback correspondiente.
