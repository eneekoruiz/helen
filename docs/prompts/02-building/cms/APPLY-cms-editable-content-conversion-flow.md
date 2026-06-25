# [APPLY] - CMS Editable Content Conversion Flow

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo).
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


**Intención**: APPLY (Modificar el proyecto, salida mínima)

## Objetivo

Convertir una página o sitio web estático para que todos los textos, enlaces e imágenes relevantes utilicen componentes de edición inline del **Visual CMS**, integrándose con la ruta `/admin` y el sistema de internacionalización (i18n) si existe.

## Fase Ideal

Durante el desarrollo (Building) o antes del handoff, cuando el proyecto pasa de maqueta estática a CMS editable.

## Criterios de Conversión

1. **Ruta Protegida y Contexto**:
   - Asegurar que la aplicación esté envuelta con `<CMSProvider>` (de `CMSContext`) y que renderice `<CMSToolbar />` en el layout principal.
   - La edición visual se activa automáticamente al navegar a la ruta `/admin`.

2. **Edición Inline**:
   - Reemplazar textos estáticos hardcoded con `<EditableText contentKey="clave" />`.
   - Reemplazar imágenes estáticas con `<EditableImage contentKey="clave" />`.
   - Reemplazar enlaces estáticos con `<EditableLink textKey="claveTexto" urlKey="claveUrl" />`.

3. **Adaptabilidad del Contexto (i18n y Modelo de Datos)**:
   - **Escenario A (Con i18n detectado)**:
     - El componente `<CMSToolbar>` debe presentar el selector de idioma.
     - Clasificar y mapear los campos distinguiendo entre:
       - **Campos Traducibles** (títulos, párrafos, descripciones; se actualizan solo para el idioma activo).
       - **Campos Universales** (teléfonos, correos, enlaces externos, imágenes estructurales; se sincronizan automáticamente en todos los idiomas).
   - **Escenario B (Sin i18n detectado)**:
     - Estructurar el JSON de `content.json` con claves modulares y limpias, asegurando una transición trivial a multilingüe en el futuro.

4. **Preservar SEO y Accesibilidad**:
   - Mantener la jerarquía de encabezados (`h1` a `h6`), etiquetas alt accesibles y evitar layout shifts en modo de edición.

## Checkpoints Requeridos

- **Compilación**: Lanzar [build-and-compile-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/checkpoint/audit-build-and-compile-checkpoint.md).
- **Linter/Tipados**: Lanzar [lint-and-typecheck-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/checkpoint/audit-lint-and-typecheck-checkpoint.md).
- **Regresión**: Verificar visualmente que los bordes dashed temporales de edición no rompan el responsive ni el layout.

## Formato de Entrega

El entregable debe ser minimalista. Produce únicamente:

```text
✅ Conversión de Visual CMS aplicada con éxito. / [o] ⚠️ Conversión aplicada con advertencias.

Cambios aplicados:
- [Breve lista de 1-3 viñetas con componentes/vistas convertidos a EditableText/EditableImage/EditableLink]

Acciones manuales necesarias:
- Ninguna. / [o especificar acciones adicionales]
```
*No generes informes extensos ni explicaciones teóricas.*
