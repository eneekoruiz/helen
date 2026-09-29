---
action: AUDIT
label: AUDIT-
phase: 09-future-knowledge
modifies_code: false
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

# [AUDIT] - AUDIT — Future Developer Onboarding

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Rol**: Staff Engineer & Developer Experience (DX) Specialist.

Este prompt audita la calidad, legibilidad y completitud del flujo de onboarding para nuevos desarrolladores que se incorporen al proyecto en el futuro.

## Requisitos mínimos obligatorios
1. **Instalación local**: Verificar si el `README.md` principal detalla con precisión los prerrequisitos (Node.js, npm, dependencias externas) y si el comando de instalación estándar funciona a la primera sin errores.
2. **Configuración de Variables de Entorno**: Comprobar que existe un `.env.example` completo y documentado con la función de cada variable y cómo obtener las credenciales necesarias.
3. **Puntos de entrada y arquitectura**: Revisar si existe una descripción concisa de la estructura de carpetas y dónde encontrar la lógica principal de la aplicación.
4. **Comandos de desarrollo**: Validar que los scripts principales (`dev`, `build`, `test`, `lint`) estén documentados y operativos.

## Más allá de estos criterios
- Evalúar si el tiempo de onboarding de "cero a primer test verde" es inferior a 15 minutos.
- Recomendar guías rápidas o diagramas de flujo de datos si la lógica es compleja.
- Identificar dependencias "ocultas" que requieran accesos especiales a infraestructuras de red privadas o SaaS externos no declarados.

## Límites de seguridad
- No almacenar bajo ninguna circunstancia credenciales reales, tokens o contraseñas en los archivos de documentación o en el reporte de onboarding.
- Mantener las recomendaciones enfocadas en simplicidad: priorizar corregir scripts en `package.json` antes de añadir páginas extensas de wiki.

## Checks finales
- Verificar que el reporte clasifique los hallazgos en: **Críticos** (impiden arrancar el proyecto), **Importantes** (generan confusión o retrasos) y **Opcionales** (mejoras de DX).

## Formato de entrega
El reporte final debe estar estructurado bajo las siguientes secciones:
- **Resumen Ejecutivo**: Nota global de preparación para el onboarding (de 1 a 10).
- **Hallazgos Críticos**: Lista numerada de impedimentos graves para la puesta en marcha.
- **Hallazgos Importantes / Opcionales**: Sugerencias claras de refactorización de scripts u organización de documentación.
