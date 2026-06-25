# [AUDIT] - Internationalization (i18n) Audit and Polish

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo).
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


**Intención**: AUDIT (No modificar código, buscar problemas) / APPLY (Modificaciones si son seguras, salida mínima)

## Objetivo

Verificar que el soporte multilingüe del proyecto sea real, coherente, accesible, mantenible y honesto antes del release.

## Fase Ideal

Auditoría final, cuando el proyecto afirma soportar múltiples idiomas.

## Criterios de Evalúación y Polish

1. **Textos Hardcoded**:
   - Encontrar cadenas de texto de usuario fuera del sistema de traducción en vistas, modales, toasts, cargadores, errores y metadata.
2. **Integridad de Traducciones**:
   - Identificar claves faltantes, fallbacks incorrectos (exposición de claves crudas), o mezcla de idiomas en una misma vista.
3. **Formatos Locales**:
   - Validar fechas, monedas, números, plurales y zonas horarias de acuerdo al idioma activo.
4. **Accesibilidad del Selector**:
   - Comprobar accesibilidad por teclado y lectura de screen readers al cambiar de idioma.

## Checkpoints Requeridos

- **Validación Inicial**: Lanzar [build-and-compile-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/checkpoint/audit-build-and-compile-checkpoint.md).
- **Post-Fixes**: Lanzar [lint-and-typecheck-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/checkpoint/audit-lint-and-typecheck-checkpoint.md).

## Condiciones de Fallo Automático

- Flujos críticos de usuario que contienen mezcla de idiomas.
- Claves crudas (`missing.key`) visibles en producción.
- El selector de idioma no funciona o rompe el estado del usuario.
- El repositorio publicita soporte multilingüe pero tiene una traducción de fase incompleta.

## Formato de Entrega

Si se aplican micro-mejoras de i18n (APPLY):
```text
✅ Soporte i18n pulido con éxito. / [o] ⚠️ Completado con advertencias.

Cambios aplicados:
- [Breve lista de 1-3 viñetas con los textos traducidos o fallbacks aplicados]

Acciones manuales necesarias:
- Ninguna. / [o especificar acciones]
```

Si se ejecuta una auditoría de i18n (AUDIT):
1. Locale support status.
2. Blocking translation issues (classified by severity: Críticos, Importantes, Opcionales).
3. Fallback behavior review.
4. Recommended improvements.
5. Verdict: `PASS`, `PASS WITH CAVEATS`, or `FAIL`.
6. Marketing confirmation statement.
