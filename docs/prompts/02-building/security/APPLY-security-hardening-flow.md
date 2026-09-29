---
action: APPLY
label: APPLY-
phase: 02-building
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

# [APPLY] - Security Hardening Flow

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: APPLY (Modificar el proyecto, salida mínima)

## Objetivo

Revisar y mitigar riesgos de seguridad antes de exposición pública, entrega o release.

## Fase Ideal

Durante el desarrollo (Building) y antes de estabilización.

## Criterios de Auditoría y Mitigación

1. **Secretos y Configuración**:
   - Buscar credenciales, tokens, contraseñas hardcoded y variables de entorno expuestas.
2. **Entrada de Datos e Inyecciones**:
   - Revisar validación de entradas, path traversal, inyecciones de comandos, consultas, etc.
3. **Dependencias**:
   - Ejecutar auditoría rápida de vulnerabilidades en dependencias (`npm audit` si aplica).
4. **Permisos y Operaciones Destructivas**:
   - Revisar llamadas a filesystem, subprocesos y privilegios innecesarios.

## Checkpoints Requeridos

- **Inicio**: Cargar [security-risk-checkpoint.md](../../04-before-production/flow/AUDIT-security-risk-checkpoint.md)
- **Fixes**: Aplicar mitigaciones automáticas directamente en el código de forma segura.
- **Validación**: Ejecutar [lint-and-typecheck-checkpoint.md](../checkpoint/AUDIT-lint-and-typecheck-checkpoint.md) y confirmar que la compilación continúa siendo correcta.

## Límites de Seguridad

No imprimas secretos en los logs del chat ni en archivos de reporte. No realices cambios estructurales de arquitectura de red o auth sin confirmación explícita.

## Formato de Entrega

El entregable debe ser minimalista. Produce únicamente:

```text
✅ Mitigaciones aplicadas. / [o] ⚠️ Mitigaciones aplicadas con advertencias.

Cambios aplicados:
- [Breve lista de 1-3 viñetas con las correcciones aplicadas]

Acciones manuales necesarias:
- Ninguna. / [o detallar variables a configurar, comando npm audit fix, etc.]
```
*No generes informes extensos ni explicaciones teóricas.*
