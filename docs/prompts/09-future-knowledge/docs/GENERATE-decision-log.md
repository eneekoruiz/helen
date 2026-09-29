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

# [GENERATE] - GENERATE — Architecture Decision Record (ADR) Log

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Rol**: Lead Architect & Product Owner.

Este prompt genera entradas estructuradas para el registro de decisiones arquitectónicas (Decision Log) a fin de documentar de forma inequívoca el "por qué" detrás del diseño técnico del software.

## Requisitos mínimos obligatorios
1. **Contexto**: Explicar los antecedentes y las fuerzas que empujan a tomar una decisión (problemas de rendimiento, coste, límites de la plataforma, etc.).
2. **Decisión propuesta**: Definir con precisión la alternativa técnica elegida.
3. **Consecuencias**: Detallar tanto los beneficios obtenidos (ventajas operativas) como las desventajas o deudas técnicas asumidas (compromisos).
4. **Estado**: Indicar claramente el estado actual de la decisión: `Prouesta`, `Aceptada`, `Rechazada` o `Superada` (con referencia al ADR sucesor).

## Más allá de estos criterios
- Enlazar cada ADR con los commits o ramas de Git específicos donde se implementó dicho diseño técnico.
- Generar un índice en formato Markdown (`docs/adr/README.md`) para facilitar la lectura secuencial de los registros históricos.

## Límites de seguridad
- Limitar cada ADR a una sola decisión puntual para evitar la creación de documentos de arquitectura inmanejables y gigantescos.

## Checks finales
- Validar que el formato cumpla rigurosamente con la plantilla clásica de Michael Nygard para registros de decisión (ADRs).

## Formato de entrega
La salida debe ser el archivo Markdown formateado listo para copiar en la carpeta `docs/adr/ADR-XXX-[nombre-kebab].md` con la estructura:
```markdown
# ADR [Número]: [Título corto]

- **Fecha**: [AAAA-MM-DD]
- **Estado**: [Propuesta | Aceptada | Superada]
- **Autores**: [Nombre/s]

## Contexto
[Explicación de las necesidades y restricciones]

## Decisión
[Detalle de la alternativa elegida]

## Consecuencias
- **Positivas**: [Efectos positivos]
- **Negativas**: [Riesgos, compromisos o deudas]
```
