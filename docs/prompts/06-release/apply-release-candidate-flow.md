# Release Candidate Flow

**Intención**: PLAN (Diseñar estrategias y fases)

## Objetivo

Decidir si el proyecto puede convertirse en candidato de release y empaquetarse con garantías.

## Fase Ideal

Al finalizar la estabilización (Release).

## Prompts Incluidos

1. [fast-build-test-verification.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/04-before-production/fast-build-test-verification.md)
2. [security-hardening.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/security-hardening.md)
3. [i18n-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/05-final-audit/i18n-audit.md)
4. [final-seo-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/04-before-production/final-seo-audit.md)
5. [github-repository-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/05-final-audit/github-repository-audit.md)
6. [release-notes-changelog-and-demo-package.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/06-release/release-notes-changelog-and-demo-package.md)

## Checkpoints Entre Pasos

- **Inicio**: Cargar [build-and-compile-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/build-and-compile-checkpoint.md).
- **Post-verificación**: Cargar [test-suite-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/test-suite-checkpoint.md).
- **Post-seguridad**: Cargar [security-risk-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/04-before-production/security-risk-checkpoint.md).
- **Antes de documentar**: Cargar [lint-and-typecheck-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/lint-and-typecheck-checkpoint.md).
- **Final**: Cargar [release-readiness-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/06-release/release-readiness-checkpoint.md).

## Condiciones para Avanzar

- Compilación, linter y suite de tests pasan sin excepciones.
- No quedan abiertos secretos ni brechas de seguridad críticas.
- Toda la documentación y Quickstarts coinciden con el estado real del software.

## Cuándo Detenerse

- Si falla cualquier checkpoint o verificación crítica de la suite de tests.
- Si las directivas de indexabilidad o fallbacks de idioma están rotas.

## Resumen Final

1. Veredicto: `RC READY`, `RC WITH CAVEATS` o `NOT RC READY`.
2. Checks ejecutados.
3. Cambios realizados durante el flujo.
4. Bloqueadores restantes.
5. Borrador de Release Notes o pendientes.
