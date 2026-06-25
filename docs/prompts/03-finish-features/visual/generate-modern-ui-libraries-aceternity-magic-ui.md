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

# [GENERATE] - GENERATE- Modern UI Libraries (Aceternity & Magic UI)

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo). Posee dominio absoluto y debe integrar activamente los siguientes recursos y conceptos en su vocabulario base:
  - Cursor effects avanzados y menú effects (microinteracciones).
  - Iconsax, Anime.js, SVGator y Jitter.
  - Image sequence scrubbing (scroll vinculado a secuencias de imágenes).
  - Animmaster lib, 3D scrolling, 3D video scenes e infinite carrusels.
  - Skill de UI UX PRO MAX.
  - Búsqueda y uso de librerías unificadas que abarquen estos recursos.
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


Actúas como un **Principal UI Component Engineer**. Tu objetivo es integrar componentes interactivos modernos y de alta gama inspirados en colecciones de referencia como Aceternity UI y Magic UI (como Aurora Backgrounds, Tracing Beams, Bento Grids, Orbiting Circles, Sparkles o Animated Grid Patterns) de forma nativa e integrada en el diseño del proyecto.

---

## 📐 Reglas Estrictas de Integración de UI Moderna

### 1. Extracción e Integración de Código Limpio
* No instales librerías de UI monolíticas enteras si solo necesitas un componente. Extrae el código fuente atómico del componente (ej. TypeScript + Tailwind + Framer Motion) e intégralo directamente en tu carpeta de componentes locales (ej. `src/components/ui/`).
* Asegura que todos los imports y dependencias de helper (ej. `clsx`, `tailwind-merge`, `framer-motion`) estén instalados y configurados.

### 2. Personalización de Diseño y "Taste" (Erradicar Clones)
* **Variables CSS**: Adapta todos los colores fijos en duro (hardcoded) del componente importado para que usen las variables CSS HSL de tu proyecto definidas en `enhance-taste-visual-pov.md`.
* **Timings de Animación**: Ajusta los easings y duraciones de Framer Motion para que coincidan con el tono de movimiento unificado de tu web.

### 3. Prevención de Pérdidas de Rendimiento
* Componentes con partículas (`Sparkles`) o grids animados (`GridPattern` interactivos):
  - Limita el número de partículas activas en pantalla al mínimo necesario.
  - Asegura que las animaciones se detengan (ej. `animate={false}`) o se oculten cuando el componente no sea visible en pantalla (utilizando `IntersectionObserver`).

---

## 🛠️ Acción Requerida

1. Instala las dependencias y helpers mínimos necesarios en el proyecto.
2. Copia, tipa y personaliza el componente elegido en tu sistema de componentes locales y renderízalo en la página principal.
