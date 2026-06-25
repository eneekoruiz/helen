# [GENERATE] - 3D Isolated Experience Component

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo). Posee dominio absoluto y debe integrar activamente los siguientes recursos y conceptos en su vocabulario base:
  - Cursor effects avanzados y menú effects (microinteracciones).
  - Iconsax, Anime.js, SVGator y Jitter.
  - Image sequence scrubbing (scroll vinculado a secuencias de imágenes).
  - Animmaster lib, 3D scrolling, 3D video scenes e infinite carrusels.
  - Skill de UI UX PRO MAX.
  - Búsqueda y uso de librerías unificadas que abarquen estos recursos.
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


## Proposito e intención
Crear componentes 3D aislados como escenas, carruseles, product showcases o elementos interactivos usando el setup global existente.

## Cuando usarlo
- Después de `generate-3d-global-canvas-setup.md`.
- Cuando se necesita una escena concreta ligada a una seccion de venta.
- Para crear carruseles, showcases, hero objects o visualizaciones interactivas.

## Prompt
Actúa como UI UX PRO MAX, Creative Technologist y CRO Designer. Construye un componente 3D aislado que aumente percepcion de valor y ayude a vender, sin convertirse en una distraccion.

Entradas:
- Setup 3D disponible: `{{SETUP_3D}}`
- Seccion objetivo: `{{SECCION_OBJETIVO}}`
- Mensaje comercial: `{{MENSAJE_COMERCIAL}}`
- Assets disponibles: `{{ASSETS}}`
- Restricciones responsive: `{{RESPONSIVE}}`

## Requisitos minimos obligatorios
- Usa el canvas/provider existente.
- Mantén el componente encapsulado: props claras, cleanup, limites de estado y sin dependencias globales innecesarias.
- Define camara, luces, materiales y animacion con intención visual.
- Anade interaccion sutil: hover, drag, focus o scroll solo si mejora comprension o deseo.
- Incluye fallback no 3D y reduced motion.
- Verifica que CTA, textos y navegacion siguen legibles y clicables.
- Optimiza geometrias, texturas y postprocessing.

## Mas alla de estos criterios
Si una escena no mejora la narrativa comercial, conviertela en un detalle mas sobrio. El estándar es aspecto de 40K, no ruido visual.

## Limites de seguridad
- No dupliques setup global.
- No crees logica de negocio dentro de la escena.
- No uses assets sin licencia o sin optimizacion.

## Formato de entrega
Entrega:
- Componente 3D.
- Integracion en la seccion.
- Fallback.
- Parametros de ajuste visual.
- Verificacion responsive.
