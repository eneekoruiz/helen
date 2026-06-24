# Clean Code and Architecture Audit Flow

**Intención**: AUDIT (No modificar código, buscar problemas) / APPLY (Modificaciones si son seguras, salida mínima)

## Objetivo

Ejecutar una revisión exigente de clean code, mantenibilidad y límites arquitectónicos con estándares de Staff Engineer, aplicando refactorizaciones locales y seguras de forma automatizada.

## Fase Ideal

Durante el desarrollo (Building) o antes de la estabilización.

## Criterios de Evalúación y Aplicación

1. **Staff-Level Architecture Audit (AUDIT)**:
   - **Límites y Capas**: Revisar responsabilidades de módulos, dependencia entre capas, estado compartido y extensibilidad.
   - **Acoplamiento**: Identificar acoplamiento oculto, convenciones mágicas y abstracciones prematuras o innecesarias.
   - **Simplificación**: Buscar redundancias de código, modularizaciones débiles y puntos potenciales de fallo.
2. **Safe Clean Code Pass (APPLY)**:
   - Reducir complejidad local, dead code, errores silenciosos y nombres engañosos.
   - Conservar estrictamente el comportamiento funcional existente.

## Checkpoints Requeridos

- **Inicio**: Cargar [build-and-compile-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/checkpoint/audit-build-and-compile-checkpoint.md).
- **Post-refactor**: Cargar [lint-and-typecheck-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/checkpoint/audit-lint-and-typecheck-checkpoint.md).
- **Final**: Cargar [test-suite-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/checkpoint/audit-test-suite-checkpoint.md).

## Límites de Seguridad

No realices reestructuraciones globales de directorios ni cambies firmas de APIs públicas sin confirmación explícita. Separa propuestas de refactorización complejas de los parches inmediatos.

## Formato de Entrega

Si se aplican cambios de código (APPLY):
```text
✅ Clean code y mejoras aplicadas. / [o] ⚠️ Completado con advertencias.

Cambios aplicados:
- [Breve lista de 1-3 viñetas con simplificaciones y refactors locales aplicados]

Acciones manuales necesarias:
- Ninguna. / [o especificar acciones]
```

Si sólo se ejecuta una auditoría de arquitectura (AUDIT):
1. Mapa general de límites de arquitectura.
2. Riesgos de acoplamiento identificados (priorizados por Críticos, Importantes, Opcionales).
3. Propuestas de refactorización recomendadas (complejas).
4. Veredicto de mantenibilidad: `DOMAIN CLEAR`, `ARCHITECTURAL DRIFT RISK`, or `HIGH RISK`.
