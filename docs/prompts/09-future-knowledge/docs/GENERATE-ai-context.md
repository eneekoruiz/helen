---
action: GENERATE
label: GENERATE-
phase: 09-future-knowledge
modifies_code: true
requires_context:
  - project_state
stop_conditions:
  - missing_required_context
  - unsafe_to_continue
reflection_loop:
  mode: bounded
  max_material_retries: 2
  stop_when: success_criteria_met_or_no_material_gain
memory_target: .quality_audit_log.md
verification:
  - inspect_relevant_files
  - run_available_checks
---

# [GENERATE] - GENERATE — AI Context & Assistant Rules

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Rol**: AI Workflow Architect & DX Specialist.

Este prompt se encarga de recopilar el estado técnico actual, convenciones del repositorio y flujos del proyecto para generar archivos de contexto para asistentes de IA (`.cursorrules`, `.claudeprompt` o `.geminiprompt`).

## Requisitos mínimos obligatorios
1. **Reglas de Codificación**: Declarar las tecnologías del stack (React, Vite, TS, etc.) y las directrices obligatorias de estilo (ej. usar importaciones ESM, tipados estrictos).
2. **Estructura del Proyecto**: Proporcionar un mapa representativo de las carpetas clave para que la IA entienda el diseño.
3. **Flujo de Trabajo del Repositorio**: Explicar la existencia de la biblioteca de prompts de HELEN y cómo debe utilizar el prompt MASTER en su flujo de trabajo habitual.
4. **Límites Operacionales**: Explicar a la IA qué no debe hacer de forma autónoma (ej. actualizar dependencias mayores de forma destructiva o ignorar checkpoints de tests).

## Más allá de estos criterios
- Incluir patrones específicos de diseño que use el proyecto frecuentemente (ej. Clean Code, inyección de dependencias simples).
- Estructurar el archivo para que consuma el menor número de tokens posible sin perder información crítica del sistema.

## Límites de seguridad
- No incluir secretos de API, credenciales ni información confidencial en el archivo de reglas expuesto en el repositorio de Git.

## Checks finales
- Verificar que el archivo generado sea compatible con los formatos admitidos por Cursor (`.cursorrules`) u otros asistentes IDE equivalentes.

## Formato de entrega
La salida debe ser el contenido Markdown crudo del archivo de reglas listo para guardarse en la raíz del proyecto.
