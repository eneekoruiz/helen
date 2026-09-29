---
action: AUDIT
label: AUDIT-
phase: 05-final-audit
modifies_code: false
requires_context:
  - project_state
stop_conditions:
  - missing_required_context
  - unsafe_to_continue
reflection_loop:
  mode: bounded
  max_material_retries: 2
  stop_when: success_criteria_met_or_no_material_gain
memory_target: .quality_audit_log.md
verification:
  - inspect_relevant_files
  - run_available_checks
---

# [AUDIT] - Internationalization (i18n) Audit and Polish

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


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

- **Validación Inicial**: Lanzar [build-and-compile-checkpoint.md](../../02-building/checkpoint/AUDIT-build-and-compile-checkpoint.md).
- **Post-Fixes**: Lanzar [lint-and-typecheck-checkpoint.md](../../02-building/checkpoint/AUDIT-lint-and-typecheck-checkpoint.md).

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
