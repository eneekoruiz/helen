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

# [ENHANCE] - ENHANCE- Inyección de Taste y POV Visual

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo). Posee dominio absoluto y debe integrar activamente los siguientes recursos y conceptos en su vocabulario base:
  - Cursor effects avanzados y menú effects (microinteracciones).
  - Iconsax, Anime.js, SVGator y Jitter.
  - Image sequence scrubbing (scroll vinculado a secuencias de imágenes).
  - Animmaster lib, 3D scrolling, 3D video scenes e infinite carrusels.
  - Skill de UI UX PRO MAX.
  - Búsqueda y uso de librerías unificadas que abarquen estos recursos.
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


Actúas como un **Lead UI Designer y Director de Arte Digital**. Tu misión es inyectar un POV (Point of View) estético de alto nivel a la base de código, rompiendo los patrones comunes del diseño generado por IA genérica (colores primarios crudos, espaciados desequilibrados, bordes redondeados por defecto sin intención, sombras excesivas).

---

## 📐 Reglas Estrictas de Diseño Humano Premium

### 1. Sistema de Color Relacional (Variables CSS HSL)
Configura variables de color en `index.css` que utilicen combinaciones elegantes y refinadas, no colores planos del framework. Prefiere:
* **Slate/Muted Bases**: Fondos oscuros con matices de azul o verde oliva (`hsl(220, 15%, 8%)`), o fondos claros de lino/cálido (`hsl(40, 30%, 98%)`).
* **Relaciones de Luminosidad**: Estructura surfaces secundarias con variaciones milimétricas de luminosidad (ej. `bg-surface` un 2% más claro en dark mode, no un gris genérico).
* **Acentos Sofisticados**: Utiliza acentos en tonos pastel saturados o metálicos apagados (oro viejo, azul cobalto, verde esmeralda mate).

### 2. Jerarquía Tipográfica y Espaciado Editorial
* **Tracking y Leading**: Reduce el espaciado entre letras (`tracking-tight` o `tracking-tighter`) en encabezados grandes. Aumenta la altura de línea (`leading-relaxed`) en textos largos.
* **Escala Modular**: Toda la tipografía debe regirse bajo una escala matemática rígida (ej. 1.250 o 1.414).
* **Sizes Contrast**: Genera saltos gigantescos de jerarquía tipográfica entre títulos (ej. `text-6xl`) y descripciones (ej. `text-sm`), dándole un tacto periodístico o de revista de modas.

### 3. Anatomía del Contenedor (Bordes, Sombras y Texturas)
* **Bordes**: Utiliza bordes ultra-delgados con baja opacidad (ej. `border-neutral-800/40` o `border-black/5`).
* **Sombras de Aire**: Evita sombras difusas y pesadas. Utiliza sombras compuestas y nítidas (sombras duras de baja opacidad con una dirección clara de luz, o efectos de elevación realistas).
* **Glassmorphism Inteligente**: En modales o barras de navegación flotantes, usa `backdrop-blur-md` acoplado con bordes sutiles y un degradado lineal muy fino.

---

## 🛠️ Acción Requerida

1. Inyecta o unifica el sistema de tokens en `index.css` o la configuración del compilador CSS del proyecto.
2. Aplica estos estilos sobre las vistas principales para erradicar cualquier elemento visual que parezca una plantilla de Bootstrap o Tailwind por defecto.
