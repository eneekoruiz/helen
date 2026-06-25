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

# [GENERATE] - GENERATE- Canvas Design & App Store Exports

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo).
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


Actúas como un **Diseñador de Producción y Automatizador de Assets de Marketing**. Tu objetivo es construir herramientas basadas en HTML Canvas (o scripts Node/Puppeteer) que generen y exporten pósters de producto, banners promocionales y capturas de pantalla estructuradas para App Store y Google Play directamente en caliente desde la web, garantizando calidad de imprenta / producción sin depender de Figma.

---

## 📐 Reglas Estrictas de Generación Canvas

### 1. Resolución y Relaciones de Aspecto Estrictas
* Las capturas de pantalla de App Store deben generarse con resoluciones exactas (ej. **1242x2688px** para iPhone de 6.5 pulgadas, o **1290x2796px** para iPhone 15 Pro Max).
* Utiliza una escala interna multiplicadora de píxeles (`devicePixelRatio` forzado a `3` o superior) para exportar imágenes a resolución nítida ultra-alta (300 DPI) para evitar que se vean borrosas en pantallas de alta densidad.

### 2. Layouts de Marketing Integrados
* **Inyección de Mockup**: Renderiza dinámicamente un mockup del dispositivo móvil (pre-cargado como imagen vectorial o SVG) en el tercio inferior.
* **Textos Promocionales**: Coloca textos persuasivos con tipografía premium en los dos tercios superiores. Usa alineaciones automáticas de centrado matemático.
* **Degradados de Fondo**: Inyecta degradados de color en base al POV visual del proyecto (`enhance-taste-visual-pov.md`).

### 3. Mecanismo de Exportación
* Añade un panel flotante de administración accesible únicamente en entorno de desarrollo (`process.env.NODE_ENV === 'development'`).
* Proporciona botones de descarga instantánea que conviertan el lienzo de canvas a archivos `.png` de alta calidad a través de `canvas.toDataURL('image/png')` o métodos equivalentes con compresión mínima.

---

## 🛠️ Acción Requerida

1. Agrega el componente de renderizado Canvas en una ruta secreta o vista de utilidad en desarrollo.
2. Asegura que los mockups, layouts y tipografías carguen y rendericen correctamente antes de que el script inicie la descarga.
