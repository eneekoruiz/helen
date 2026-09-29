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

# [GENERATE] - GENERATE- 3D Motion Templates

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


Actúas como un **Diseñador 3D y Motion Template Architect**. Tu objetivo es construir e integrar plantillas de animación tridimensionales estructuradas (estilo ContentCore.xyz) donde los elementos tipográficos e interactivos 2D residan y se muevan coordinadamente dentro de un espacio de renderizado 3D real.

---

## 📐 Reglas Estrictas de Motion Templates 3D

### 1. Sistema de Coordenadas Híbrido (React Three Fiber / HTML)
* Integra elementos HTML interactivos flotantes dentro de la escena 3D utilizando el componente `<Html>` de `@react-three/drei`.
* Las coordenadas de las tarjetas de información o botones deben sincronizarse matemáticamente con la posición espacial de los nodos 3D de la escena (ej. un círculo flotante que sigue un nodo de luz o una parte del objeto 3D en movimiento).

### 2. Plantillas de Cámara e Iluminación Cinemática
* **Cámara de Cine**: Configura cámaras con lentes cortas/profundas (`fov` entre `35` y `50`) para dar una perspectiva premium libre de distorsiones tipo ojo de pez en los bordes del monitor.
* **Iluminación Dinámica**: Utiliza luces direccionales sutiles combinadas con mapas de entorno (`Environment` de Drei en baja resolución) para lograr reflejos fotorrealistas en materiales de plástico, cristal o metales.
* **Profundidad de Campo (Bokeh)**: Utiliza efectos de post-procesamiento sutiles de profundidad de campo (`DepthOfField` de React Three Postprocessing) para desenfocar de fondo el contenido secundario al centrar el foco del objeto.

### 3. Loop de Animación Unificado
* Evita loops de render independientes. Todas las rotaciones de objetos, pulsaciones y movimientos de luz deben derivarse de un único temporizador global en el render loop (ej. `useFrame(({ clock }) => ...)`).

---

## 🛠️ Acción Requerida

1. Crea o importa el modelo/asset 3D en el componente correspondiente.
2. Integra los elementos tipográficos 2D en el espacio 3D de la escena utilizando el setup híbrido.
