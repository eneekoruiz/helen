# Orquestación de Prompts

Esta carpeta convierte la biblioteca en un sistema operativo de calidad para agentes integrados en editores.

Objetivo: dejar de copiar prompts uno por uno y empezar a elegir, encadenar, sintetizar y repetir auditorías con criterio.

## Prompts

1. [00-prompt-router.md](00-prompt-router.md)
   Decide qué prompts ejecutar según el estado real del repositorio.

2. [01-quality-operating-system.md](01-quality-operating-system.md)
   Diseña un plan completo de revisión por fases, owners, evidencias y puertas de decisión.

3. [02-agent-brief-builder.md](02-agent-brief-builder.md)
   Genera briefs de trabajo para agentes, con contexto, límites, entregables y criterios de parada.

4. [03-cross-audit-synthesis.md](03-cross-audit-synthesis.md)
   Consolida hallazgos de múltiples prompts, elimina duplicados y produce un plan priorizado.

## Uso

Empieza aquí cuando no sepas qué prompt usar.

Flujo recomendado:

1. Ejecuta `00-prompt-router`.
2. Ejecuta los prompts recomendados.
3. Ejecuta `03-cross-audit-synthesis`.
4. Convierte el resultado en tareas o en un brief con `02-agent-brief-builder`.
