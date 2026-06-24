# Cinematic and 3D Visual Conversion Pass

**Intención**: APPLY (Modificar el proyecto, salida mínima)

## Objetivo

Convertir componentes e interfaces de UI estáticas existentes en experiencias visuales dinámicas, interactivas, animadas o en 3D (cinemáticas), logrando un acabado premium de altísima calidad (nivel $100k+) sin comprometer la velocidad ni la lógica funcional del sistema.

## Cuándo Usarlo

- Al finalizar la maquetación y validación funcional de un componente o página.
- Cuando se requiera elevar el impacto estético de la web para su lanzamiento, portfolio, demos o presentación de marca premium.
- Para implementar scroll coreografiado, transiciones fluidas de página, partículas canvas, o capas 3D interactivas.

## Cuándo NO Usarlo

- Si la lógica o los flujos de datos principales de la página aún tienen errores o están incompletos.
- Para sobrecargar la web con animaciones pesadas e innecesarias que dañen la accesibilidad o la claridad del contenido.

## Criterios Mínimos

1. **Conversión Estético-Cinemática**:
   - Identificar áreas clave de impacto visual (ej. secciones Hero, fondos interactivos, transiciones de tarjetas, loaders de página o botones interactivos).
   - Sustituir elementos planos por soluciones visuales enriquecidas: degradados animados suaves en CSS, microinteracciones reactivas al cursor, físicas de partículas en Canvas 2D/3D o micro-animaciones SVG coordinadas.

2. **Seguridad y Preservación Lógica**:
   - La nueva capa visual interactiva NO debe interrumpir ni tapar los elementos de interacción nativos (como inputs, formularios, botones o enlaces semánticos).
   - Todos los handlers de eventos (`onClick`, `onChange`, `onSubmit`) y las llamadas de API deben seguir operando exactamente igual detrás de las animaciones.
   - Utilizar CSS `pointer-events: none` de manera estratégica en capas ornamentales de fondo (WebGL/Canvas) para evitar que bloqueen los clics en la interfaz funcional.

3. **Carga y Rendimiento**:
   - Las animaciones pesadas o de renderizado continuo (loops de canvas o WebGL) deben inicializarse de forma perezosa (lazy/deferred) o tras el First Contentful Paint.
   - Garantizar el uso exclusivo de propiedades animables aceleradas por hardware en CSS (`transform`, `opacity`) para evitar provocar reflows de página.

4. **Accesibilidad**:
   - Implementar media queries de `prefers-reduced-motion` para desactivar de inmediato o simplificar drásticamente las transiciones dinámicas y 3D en favor de un diseño estático elegante.

## Más allá de estos criterios

Busca que el movimiento cuente una historia coherente con la marca. Evita el "ruido visual" gratuito; cada transición debe sentirse justificada, fluida (usando easings cúbicos y físicos personalizados) y premium. La meta es crear una experiencia inmersiva que se perciba increíblemente trabajada y sofisticada, manteniendo la web ligera y resistente ante fallos.

## Límites de Seguridad

- No cambies el SEO semántico ni alteres la estructura HTML básica que afecte a la indexación del contenido.
- No añadas librerías de animación complejas de forma innecesaria si se puede resolver con transiciones de CSS optimizadas o Canvas nativo ligero.
- No rompas el flujo de navegación nativo (scroll de página) ni implementes scroll-jacking agresivo que irrite al usuario.

## Formato de Entrega

El entregable debe ser minimalista. Produce únicamente:

```text
✅ Conversión cinemática y 3D aplicada. / [o] ⚠️ Completado con advertencias.

Componentes mejorados:
- [Breve lista de componentes enriquecidos]

Librerías/Técnicas utilizadas:
- [ej. Canvas nativo, Three.js, CSS transforms GPU, GSAP diferido]

Acciones manuales necesarias:
- Ninguna. / [o detallar acciones]
```
*No generes informes extensos ni explicaciones teóricas de la animación aplicada.*
