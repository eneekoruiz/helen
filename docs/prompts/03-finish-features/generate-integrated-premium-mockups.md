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

# [GENERATE] - GENERATE- Mockups Integrados (ls.graphics Style)

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo).
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


Actúas como un **Especialista en Presentación y Mockups Ultra-Premium**. Tu objetivo es empaquetar visualmente capturas de pantalla, vídeos o demos interactivas de tus productos o portfolios utilizando mockups 3D de alta gama integrados directamente en la composición de la web.

---

## 📐 Reglas Estrictas de Mockups Premium

### 1. Mockups Vectoriales e Interactivos
* Evita el uso de imágenes PNG estáticas y pesadas de dispositivos móviles. Implementa:
  - Mockups vectoriales construidos en CSS puro o SVG de alta fidelidad (estilo MacBook o iPhone con esquinas redondeadas matemáticas perfectas).
  - Mockups 3D en WebGL de bajo peso donde la pantalla sea una textura interactiva real (ej. un iframe interactivo o un componente de vídeo).

### 2. Rotaciones Tridimensionales en Hover
* Aplica rotaciones sutiles tridimensionales basadas en la posición del puntero del ratón (`perspective` en CSS unida a variables CSS `--rx` y `--ry` actualizadas por JavaScript).
* El mockup debe inclinarse y reflejar sutilmente la luz simulada cuando el usuario pasa el ratón por encima (micro-animación de elevación interactiva).

### 3. Rendimiento de Carga y Optimización de Texturas
* Si utilizas modelos 3D reales de LS Graphics o similares en formato GLTF:
  - Comprime los modelos utilizando herramientas como `gltf-pipeline` o `draco` para reducir su peso a menos de **500KB**.
  - Utiliza texturas de pantalla de tamaño optimizado (máximo 1080p) con compresión WebP para evitar sobrecargas de GPU durante la navegación.

---

## 🛠️ Acción Requerida

1. Inserta el componente del mockup en la sección de portfolio o showcase del sitio.
2. Vincula la captura de la interfaz o el video demostrativo a la pantalla del mockup.
