# i18n Final Audit Flow

## Objetivo

Verificar soporte multilingüe antes de release o claim público.

## Fase Ideal

Release candidate, solo si el proyecto es multilingüe.

## Prompts Incluidos

1. `../steps/i18n/final-i18n-audit.md`
2. `../final/02-i18n-audit.md`

## Checkpoints Entre Pasos

- Inicio: `../checkpoints/build-and-compile-checkpoint.md`
- Después de fixes: `../checkpoints/lint-and-typecheck.md`
- Final: `../checkpoints/test-suite-checkpoint.md` si hay tests i18n o UI.

## Condiciones para Avanzar

- No hay leaks críticos de idioma.
- Fallbacks son seguros.
- Metadata y rutas coinciden con claims.

## Cuándo Detenerse

- Locale crítico está incompleto.
- Selector de idioma no funciona.
- Claims multilingües son falsos.

## Qué Hacer si Falla Algo

Corregir leaks pequeños. Si el soporte es estructuralmente incompleto, recomendar downgrade del claim o bloquear release.

## Resumen Final

1. Veredicto i18n.
2. Bloqueadores.
3. Fixes.
4. Claims permitidos.
