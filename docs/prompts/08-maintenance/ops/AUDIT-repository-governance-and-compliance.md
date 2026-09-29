---
action: AUDIT
label: AUDIT-
phase: 08-maintenance
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

# [AUDIT] - AUDIT — Repository Governance & Compliance

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Rol**: Security Lead & Governance Architect.

Este prompt audita las reglas de gobernanza del repositorio, permisos de ramas, políticas de contribución y cumplimiento de estándares organizacionales.

## Requisitos mínimos obligatorios
1. **Reglas de Rama Principal (Branch Protection Rules)**: Verificar que la rama `main` o `master` cuenta con reglas estrictas que prohíban la inserción directa de commits (push directo) sin Pull Request previo o aprobación de tests.
2. **Políticas de Pull Request (PR)**: Validar la obligatoriedad de que cada Pull Request sea revisado por al menos un par técnico y pase satisfactoriamente el build y suite de pruebas de CI.
3. **Licenciamiento e Higiene**: Comprobar que los archivos `LICENSE`, `CODE_OF_CONDUCT.md` y `CONTRIBUTING.md` estén presentes y actualizados con las directrices correctas.
4. **Cumplimiento Legal y Dependencias**: Verificar que no se utilicen dependencias con licencias altamente restrictivas (como GPLv3 no autorizadas en productos SaaS comerciales cerrados).

## Más allá de estos criterios
- Evalúar si las configuraciones de seguridad automatizadas de GitHub (CodeQL, Dependabot alert, secret scanning) están activas.
- Auditar los permisos del equipo para asegurar el principio de mínimo privilegio (Least Privilege).

## Límites de seguridad
- No modificar directamente las reglas de la plataforma de hosting (GitHub/GitLab) durante la ejecución de la auditoría; limitarse a señalar vulnerabilidades.

## Checks finales
- El veredicto técnico debe estructurarse obligatoriamente bajo los niveles de severidad: **Críticos**, **Importantes**, **Opcionales**.

## Formato de entrega
El informe de auditoría final se estructurará con:
- **Resumen Ejecutivo**: Nota global de cumplimiento (ej. Cumple, Cumple con reservas, No cumple).
- **Vulnerabilidades de Gobernanza Detectadas**: Detalle numerado con nivel de riesgo y recomendación de mitigación.
