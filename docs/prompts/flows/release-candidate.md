# Release Candidate Flow

## Objetivo

Decidir si el proyecto puede convertirse en candidato de release.

## Fase Ideal

Final del proyecto, después de prefinal hardening.

## Prompts Incluidos

1. `../steps/testing/fast-verification.md`
2. `../steps/security/security-hardening.md`
3. `../steps/i18n/final-i18n-audit.md`
4. `../steps/seo/final-seo-audit.md`
5. `../steps/github/repo-polish.md`
6. `../steps/release/release-notes-and-checklist.md`

## Checkpoints Entre Pasos

- Inicio: `../checkpoints/build-and-compile-checkpoint.md`
- Después de verificación: `../checkpoints/test-suite-checkpoint.md`
- Después de security: `../checkpoints/security-risk-checkpoint.md`
- Antes de release notes: `../checkpoints/lint-and-typecheck.md`
- Final: `../checkpoints/release-readiness-checkpoint.md`

## Condiciones para Avanzar

- Build, lint/typecheck y tests pasan si existen.
- No hay secretos ni riesgos críticos.
- Docs y README no mienten.
- Claims públicos son demostrables.

## Cuándo Detenerse

- Cualquier core check falla.
- La release necesita decisión de producto/owner.
- El repo sobrepromete.
- SEO/i18n/seguridad tienen bloqueadores.

## Qué Hacer si Falla Algo

1. Corrige el bloqueo si es pequeño y seguro.
2. Repite el checkpoint.
3. Si no puede corregirse, marca `FAIL` y entrega plan mínimo.

## Resumen Final

1. Veredicto: `RC READY`, `RC WITH CAVEATS` o `NOT RC READY`.
2. Checks ejecutados.
3. Cambios realizados.
4. Bloqueadores restantes.
5. Release notes o pendientes.
