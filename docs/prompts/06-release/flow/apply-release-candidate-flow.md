# [APPLY] - Release Candidate Flow

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo).
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


**Intención**: PLAN (Diseñar estrategias y fases)

## Objetivo

Decidir si el proyecto puede convertirse en candidato de release y empaquetarse con garantías.

## Fase Ideal

Al finalizar la estabilización (Release).

## Prompts Incluidos

1. [fast-build-test-verification.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/04-before-production/qa/audit-fast-build-test-verification.md)
2. [security-hardening.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/security/apply-security-hardening-flow.md)
3. [i18n-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/05-final-audit/code/audit-i18n-flow.md)
4. [final-seo-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/04-before-production/compliance/audit-final-seo.md)
5. [github-repository-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/05-final-audit/presentation/audit-github-repository-flow.md)
6. [release-notes-changelog-and-demo-package.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/06-release/notes/generate-release-notes-changelog-and-demo-package.md)

## Checkpoints Entre Pasos

- **Inicio**: Cargar [build-and-compile-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/checkpoint/audit-build-and-compile-checkpoint.md).
- **Post-verificación**: Cargar [test-suite-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/checkpoint/audit-test-suite-checkpoint.md).
- **Post-seguridad**: Cargar [security-risk-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/04-before-production/flow/audit-security-risk-checkpoint.md).
- **Antes de documentar**: Cargar [lint-and-typecheck-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/checkpoint/audit-lint-and-typecheck-checkpoint.md).
- **Final**: Cargar [release-readiness-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/06-release/flow/audit-release-readiness-checkpoint.md).

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
