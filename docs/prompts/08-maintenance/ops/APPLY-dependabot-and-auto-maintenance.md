---
action: APPLY
label: APPLY-
phase: 08-maintenance
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

# [APPLY] - Dependabot and Repository Auto-Maintenance

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.


**Intención**: APPLY (Modificar el proyecto, salida mínima)

## Objetivo

Configurar e implementar la automatización del mantenimiento de dependencias y la postura de seguridad del repositorio mediante GitHub Dependabot y acciones automatizadas de GitHub.

## Cuándo Usarlo

- En la fase final de auditoría o durante el mantenimiento del repositorio.
- Al preparar un proyecto para producción o código abierto para asegurar que no acumule deuda técnica de seguridad obsoleta.

## Cuándo NO Usarlo

- En entornos sandbox de corto plazo o demos desechables.
- Cuando no se cuenta con una suite de tests unitarios robusta (las actualizaciones automáticas sin tests incrementan el riesgo de rotura).

## Rol de la IA

Actúas como un DevSecOps Specialist y Site Reliability Engineer.

## Requisitos mínimos obligatorios

1. **Configuración de Dependabot (`.github/dependabot.yml`)**:
   - Crear o actualizar el archivo `.github/dependabot.yml`.
   - Configurar escaneo para el ecosistema `npm` y `github-actions`.
   - Establecer frecuencia de revisión semanal (`weekly`) o diaria (`daily`) según criticidad.
   - Definir etiquetas claras para clasificar los PRs generados (ej. `dependencies`, `security`).

2. **Límites de Versiones y Grupos**:
   - Agrupar actualizaciones menores y de parche para reducir el spam de Pull Requests (`groups`).
   - Evitar actualizaciones automáticas de versiones mayores (`major`) sin revisión manual del desarrollador.

3. **Integración con CI/CD**:
   - Asegurar que cualquier Pull Request generado por Dependabot ejecute la suite de tests automáticos (`npm run test`, `npm run typecheck`, etc.) antes de ser elegible para merge.

## Más allá de estos criterios

Propón flujos de auto-merge (usando herramientas como `action-dependabot-auto-merge` o nativas de GitHub Actions) limitados estrictamente a dependencias `development` (devDependencies) y parches de seguridad con estado de CI en verde (`success`).

## Límites de Seguridad

- Nunca habilitar auto-merge para dependencias de producción en versiones mayores (`major`).
- No exponer credenciales de registries privados directamente; usar GitHub Actions Secrets.

## Checks Finales

- Sintaxis del archivo `.github/dependabot.yml` válida.
- Exclusión de directorios no deseados (ej. `node_modules`, `dist`).
- Las políticas de versionado son seguras para el proyecto.

## Formato de Entrega

El entregable debe ser minimalista. Produce únicamente:

```text
✅ Configuración de auto-mantenimiento aplicada. / [o] ⚠️ Aplicada con advertencias.

Configuración realizada:
- [Creación o parche de .github/dependabot.yml con ecosistemas definidos]
- [Flujo de GitHub Actions asociado a actualizaciones, si se configuró]

Acciones manuales adicionales:
- [Habilitar alertas de dependencias en los ajustes del repositorio de GitHub, si aplica]
```
*No generes informes extensos ni explicaciones teóricas.*
