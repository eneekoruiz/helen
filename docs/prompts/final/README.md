# Prompts Finales de Proyecto

Esta carpeta contiene prompts de cierre. Sirven cuando el proyecto ya funciona razonablemente y necesitas decidir si se puede estabilizar, publicar, archivar, presentar o entregar.

Estos prompts no son checklists pasivas. Cada uno define requisitos mínimos, pero también exige juicio experto y búsqueda activa de problemas no previstos.

## Secuencia

1. [01-code-quality-audit.md](01-code-quality-audit.md)
2. [02-i18n-audit.md](02-i18n-audit.md) si el proyecto es multilingüe o lo afirma
3. [03-documentation-audit.md](03-documentation-audit.md)
4. [04-github-repository-audit.md](04-github-repository-audit.md)
5. [05-public-presentation-pass.md](05-public-presentation-pass.md) si el proyecto será público
6. [06-release-checklist.md](06-release-checklist.md)

## Ruta Mínima Seria

Si el proyecto es pequeño:

1. [01-code-quality-audit.md](01-code-quality-audit.md)
2. [03-documentation-audit.md](03-documentation-audit.md)
3. [06-release-checklist.md](06-release-checklist.md)

## Ruta Profunda Recomendada

Antes de cerrar un proyecto importante, ejecuta también los prompts de [../discovery/](../discovery/README.md). Esos prompts buscan categorías enteras que pueden faltar: producto, UX, arquitectura, seguridad, operación, estrategia, crecimiento y deuda organizativa.

## Mapa de Prompts

- [01-code-quality-audit.md](01-code-quality-audit.md)
  Decide si el código es técnicamente seguro para estabilizar.

- [02-i18n-audit.md](02-i18n-audit.md)
  Verifica si el soporte multilingüe es real, coherente y honesto.

- [03-documentation-audit.md](03-documentation-audit.md)
  Comprueba si README, setup, ejemplos y docs dicen la verdad.

- [04-github-repository-audit.md](04-github-repository-audit.md)
  Evalúa si el repositorio es creíble, descubrible y presentable.

- [05-public-presentation-pass.md](05-public-presentation-pass.md)
  Decide si el proyecto merece exposición pública.

- [06-release-checklist.md](06-release-checklist.md)
  Puerta final después de que las auditorías profundas ya estén resueltas.

## Reglas Operativas

- No empieces por presentación si código y docs todavía mienten.
- Si una auditoría profunda falla, no uses prompts posteriores como sustituto.
- `PASS WITH CAVEATS` significa que todavía hay riesgo explícito.
- La IA debe inspeccionar el repositorio completo cuando el entorno se lo permita.
- La IA debe distinguir entre mínimo obligatorio, criterio experto adicional y gusto personal.

## Orden de Corrección

Si fallan varias capas, corrige en este orden:

1. verdad técnica;
2. seguridad y datos;
3. experiencia de usuario;
4. documentación;
5. operación y mantenimiento;
6. presentación pública;
7. polish premium.

## Runbook

Para usar esta carpeta como proceso, consulta [RUNBOOK.md](RUNBOOK.md).
