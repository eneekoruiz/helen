# CMS Editable Content Conversion Flow

## Objetivo

Convertir una página o sitio para que todos los textos relevantes usen `EditableField` y todas las imágenes de contenido usen `EditableImage`, preservando diseño, SEO, accesibilidad y entrega.

## Fase Ideal

Antes de entrega a cliente, antes de handoff o cuando el proyecto pasa de maqueta estática a CMS editable.

## Prompts Incluidos

1. `../cms/01-static-content-to-editable-cms-fields.md`
2. `../cms/02-content-model-and-editorial-workflow-audit.md`
3. `../steps/visual/premium-visual-polish-pass.md`
4. `../steps/accessibility/basic-accessibility-pass.md`
5. `../steps/testing/fast-build-test-verification.md`

## Orden Exacto

1. Inventariar contenido editable.
2. Convertir textos a `EditableField`.
3. Convertir imágenes a `EditableImage`.
4. Revisar modelo editorial y nombres de campos.
5. Revisar visual polish para detectar wrappers o controles que rompan layout.
6. Revisar accesibilidad, alt text y headings.
7. Ejecutar verificación rápida.

## Checkpoints Entre Pasos

- Después de inventario: confirmar qué contenido queda estático y por qué.
- Después de conversión: `../checkpoints/build-and-compile-checkpoint.md`.
- Después de visual/accessibility: `../checkpoints/visual-ux-regression-checkpoint.md`.
- Final: `../checkpoints/test-suite-checkpoint.md` si existen tests.

## Condiciones para Avanzar

- Los campos editables tienen IDs únicos y estables.
- El diseño se mantiene visualmente equivalente.
- No se rompen headings, alt text, metadata ni responsive.
- El editor puede gestionar texto largo, texto vacío, imagen ausente e imagen reemplazada.

## Cuándo Detenerse

- No existe abstracción editable y crearla cambiaría arquitectura.
- Los wrappers editables rompen layout o hidratación.
- Hay contenido que requiere decisión de negocio/editorial.
- La conversión afectaría SEO, accesibilidad o legal sin una alternativa segura.

## Qué Hacer si Falla Algo

1. Corregir primero IDs duplicados, layout roto o build fallido.
2. Si falta infraestructura CMS, proponer diseño antes de implementar.
3. Si hay duda sobre si algo debe ser editable, dejarlo estático y documentarlo como decisión pendiente.

## Resumen Final

1. Campos de texto convertidos.
2. Imágenes convertidas.
3. Contenido dejado estático.
4. Riesgos editoriales.
5. Checks ejecutados.
6. Estado de entrega: `CMS READY`, `CMS READY WITH CAVEATS`, o `NOT READY`.
