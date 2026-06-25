# [APPLY] - Prefinal Hardening Flow

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo).
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


**Intención**: APPLY (Modificar el proyecto, salida mínima)

## Objetivo

Endurecer la seguridad, robustez y calidad técnica del proyecto antes de empaquetar y marcar el código como release candidate.

## Fase Ideal

Al finalizar la construcción y pulido visual (Before Production).

## Prompts Incluidos

1. [fast-build-test-verification.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/04-before-production/qa/audit-fast-build-test-verification.md)
2. [safe-clean-code-simplification-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/clean-code/apply-safe-clean-code-simplification-pass.md)
3. [security-hardening.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/security/apply-security-hardening-flow.md)
4. [basic-performance-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/performance/apply-basic-performance-pass.md)
5. [basic-accessibility-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/performance/apply-basic-accessibility-pass.md)
6. [empty-states-errors-and-microcopy.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/ux/apply-empty-states-errors-and-microcopy.md)

## Checkpoints Entre Pasos

- **Inicio**: Cargar [build-and-compile-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/checkpoint/audit-build-and-compile-checkpoint.md).
- **Post-refactor**: Cargar [lint-and-typecheck-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/checkpoint/audit-lint-and-typecheck-checkpoint.md).
- **Post-seguridad**: Cargar [security-risk-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/04-before-production/flow/audit-security-risk-checkpoint.md).
- **Final**: Cargar [test-suite-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/checkpoint/audit-test-suite-checkpoint.md).

## Condiciones para Avanzar

- La compilación e inicialización del entorno son exitosas.
- No quedan abiertos riesgos de seguridad críticos.

## Formato de Entrega

El entregable debe ser minimalista. Produce únicamente:

```text
✅ Prefinal hardening completado con éxito. / [o] ⚠️ Completado con advertencias.

Mejoras aplicadas:
- [Breve lista de 1-3 viñetas con los parches de seguridad/robustez aplicados]

Acciones manuales necesarias:
- Ninguna. / [o especificar acciones]
```
*No generes informes extensos ni explicaciones teóricas.*
