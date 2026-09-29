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

# [AUDIT] - AUDIT — Knowledge Gap Analysis

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Rol**: Technical Writer & Knowledge Management Specialist.

Este prompt tiene como fin escanear la base de código y la documentación interna para localizar "brechas de conocimiento" o supuestos no verbalizados que puedan paralizar desarrollos futuros.

## Requisitos mínimos obligatorios
1. **Comentarios de Código obsoletos u oscuros**: Localizar partes complejas del código sin documentación adjunta o con comentarios obsoletos tipo TODO/FIXME acumulados hace meses.
2. **Documentación Externa vs Realidad**: Validar si las guías del proyecto (como wikis o archivos README locales) reflejan con veracidad las APIs, esquemas de bases de datos y flujos del sistema actuales.
3. **Flujos de Terceros**: Inspeccionar si la integración con APIs externas (ej. Stripe, Auth0, HubSpot) está documentada o si requiere investigar el código para deducir qué datos viajan.

## Más allá de estos criterios
- Evalúar si las APIs locales cuentan con tipado completo o Swagger/OpenAPI dinámico.
- Recomendar la eliminación sistemática de código muerto que confunda a futuros lectores sobre el flujo real.

## Límites de seguridad
- No intentar adivinar comportamientos; reportar las brechas como vacíos a resolver en lugar de escribir suposiciones incorrectas.
- No duplicar documentación existente: sugerir enlaces canónicos.

## Checks finales
- El reporte final debe proveer un mapa claro de los puntos ciegos de documentación detectados.

## Formato de entrega
El informe debe seguir la estructura:
- **Resumen de Brechas**: Puntuación cualitativa de la veracidad y completitud de la documentación.
- **Zonas Grises Críticas**: Áreas de código sin documentación donde un desarrollador tardaría días en descifrar la lógica.
- **Recomendaciones de Preservación**: Siguientes pasos prioritarios para subsanar los vacíos.
