# PLAN — Technology Lifecycle Strategy

**Rol**: Staff Architect & Technical Strategist.

Este prompt ayuda a trazar la estrategia tecnológica y el ciclo de vida de los componentes, frameworks y librerías Core seleccionados al inicio de un proyecto.

## Requisitos mínimos obligatorios
1. **Mapeo de Tecnologías Core**: Identificar las librerías base (ej. React, Vite, Tailwind, TypeScript) y documentar sus ciclos de soporte oficial (LTS, fecha estimada de fin de vida).
2. **Criterios de Deprecación**: Definir bajo qué condiciones una librería debe ser reemplazada (falta de mantenimiento por >12 meses, fallos de seguridad críticos no resueltos, desfase tecnológico).
3. **Estrategia de Actualizaciones Mayores**: Diseñar un plan de actualizaciones para saltos de versión mayor (major releases) de forma programada y segura (ej. React 18 a React 19).
4. **Evaluación de Alternativas**: Mantener un registro breve de tecnologías alternativas evaluadas y descartadas en la fase inicial del proyecto.

## Más allá de estos criterios
- Alinear el roadmap tecnológico con los ciclos de lanzamiento de dependencias críticas de terceros para evitar bloqueos del sistema.
- Definir un presupuesto de tiempo técnico semestral para actualización preventiva de librerías.

## Límites de seguridad
- No forzar la adopción de tecnologías sangrientamente nuevas (bleeding edge) sin justificación de negocio o si carecen de soporte corporativo sólido.

## Checks finales
- El plan resultante debe presentarse en un formato de checklist ejecutable ordenada cronológicamente.

## Formato de entrega
La salida de este prompt de tipo **PLAN** debe ser una checklist clara y procesable:
- **Estrategia de Ciclo de Vida**: Resumen tabular de tecnologías Core y soporte.
- **Plan de Actualización Preventivo**: Lista de tareas ordenadas por prioridad de riesgo de obsolescencia.
