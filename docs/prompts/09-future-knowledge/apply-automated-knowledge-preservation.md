# APPLY — Automated Knowledge Preservation

**Rol**: Devops Architect & Technical Writer.

Este prompt se encarga de empaquetar de forma automatizada todo el estado técnico y operativo actual del repositorio en un único documento consolidado para archivado o handoff.

## Requisitos mínimos obligatorios
1. **Generación automática del mapa de archivos**: Generar una estructura de archivos completa usando comandos como `git ls-files` o equivalentes y guardarla en la documentación técnica.
2. **Volcado de variables no secretas**: Recopilar un esquema explicativo del `.env.example` y de los scripts vigentes.
3. **Consolidación de ADRs**: Reunir los títulos y estados de todos los Architectural Decision Records en un único resumen cronológico.
4. **Resumen de dependencias**: Compilar un listado limpio de dependencias del proyecto con sus versiones vigentes.

## Más allá de estos criterios
- Ejecutar scripts de volcado de base de datos local y empaquetar esquemas en un archivo SQL comprimido.
- Generar diagramas del árbol de llamadas del código en formato Mermaid de forma automatizada.

## Límites de seguridad
- **CRÍTICO**: Bajo ningún concepto se deben incluir secretos reales, tokens de producción, contraseñas, claves SSH o datos de clientes finales en el volcado de conocimiento.
- Excluir del empaquetado carpetas de caché, compilación (`dist`, `build`) y dependencias crudas (`node_modules`).

## Checks finales
- Verificar que el archivo generado `docs/KNOWLEDGE_SNAPSHOT.md` sea autocontenido y legible de forma independiente.

## Formato de entrega
Al ser un prompt de tipo **APPLY**, el entregable debe ser estrictamente minimalista:
```text
✅ Snapshot de conocimiento consolidado correctamente.
Archivo generado: docs/KNOWLEDGE_SNAPSHOT.md
Acciones manuales requeridas: ninguna.
```
