# Runbook de Cierre Final

Usa este runbook cuando quieras que la biblioteca funcione como un proceso de decisión, no como una carpeta de textos.

## Paso 0: Descubrir Puntos Ciegos

Antes del cierre de un proyecto importante, ejecuta:

1. [../discovery/01-methodology-and-blind-spots-audit.md](../discovery/01-methodology-and-blind-spots-audit.md)
2. [../discovery/02-product-ux-and-premium-quality-audit.md](../discovery/02-product-ux-and-premium-quality-audit.md)
3. [../discovery/03-architecture-operations-and-risk-audit.md](../discovery/03-architecture-operations-and-risk-audit.md)

Objetivo:

- descubrir categorías que faltan;
- detectar deuda invisible;
- cuestionar estructura, producto, UX, arquitectura, operación y estrategia;
- evitar que el cierre solo valide lo que ya sabíamos mirar.

Este paso puede omitirse en proyectos pequeños, pero no debería omitirse en proyectos que se van a publicar, entregar o usar como portfolio.

## Paso 1: Establecer Verdad Técnica

Ejecuta:

1. [01-code-quality-audit.md](01-code-quality-audit.md)
2. [02-i18n-audit.md](02-i18n-audit.md) si aplica

Objetivo:

- encontrar defectos reales;
- exponer falsa confianza;
- comprobar que el producto no se sostiene solo en el camino feliz.

No avances a presentación si esta capa falla.

## Paso 2: Hacer Honesto el Repositorio

Ejecuta:

1. [03-documentation-audit.md](03-documentation-audit.md)
2. [04-github-repository-audit.md](04-github-repository-audit.md)

Objetivo:

- alinear README, docs, scripts y realidad del código;
- limpiar metadata y soporte público;
- eliminar deuda de presentación que erosiona confianza.

## Paso 3: Decidir Si Merece Exposición

Ejecuta:

1. [05-public-presentation-pass.md](05-public-presentation-pass.md)

Objetivo:

- decidir si el proyecto merece mostrarse públicamente;
- revisar capturas, social preview, Open Graph, narrativa, posicionamiento y señales de calidad.

Este paso es opcional solo si el proyecto seguirá privado.

## Paso 4: Cerrar

Ejecuta:

1. [06-release-checklist.md](06-release-checklist.md)

Objetivo:

- confirmar que los hallazgos anteriores se resolvieron;
- bloquear cierres prematuros;
- emitir una decisión compacta.

## Decision Rules

- Si `01` falla, el proyecto no es técnicamente cerrable.
- Si `03` falla, el repositorio no es confiable.
- Si `04` falla, el repo no debería usarse como artefacto público.
- Si `05` falla, puede ser útil internamente pero no debería promocionarse.
- Si `06` falla, no marques el proyecto como terminado.

## Patrón de Uso

1. Ejecuta un prompt.
2. Corrige hallazgos.
3. Reejecuta el mismo prompt.
4. Avanza solo cuando la capa anterior sea honesta.

## Anti Patrones

No:

- ejecutar la checklist final primero;
- pulir screenshots antes de corregir docs falsas;
- mejorar metadata de GitHub mientras los flujos principales fallan;
- tratar los prompts como formularios;
- aceptar una respuesta que no haya inspeccionado el repositorio completo;
- confundir iniciativa con refactor arbitrario.
