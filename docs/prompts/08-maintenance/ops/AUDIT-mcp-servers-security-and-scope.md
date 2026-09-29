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

# [AUDIT] - MCP Servers Security and Scope

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.

**Intención**: AUDIT (analizar sin modificar archivos)

## Objetivo

Decidir qué servidores MCP conectar a un agente y con qué permisos, antes de conectarlos. Un servidor MCP da a la IA herramientas reales (navegador, repositorios, despliegues, base de datos) con tu cuenta y tus tokens: es más sensible que una skill.

## Cuándo Usarlo

- Antes de añadir cualquier servidor MCP (`helen skills external <id>`, categoría `mcp`).
- Al revisar la configuración MCP existente de un proyecto o de un agente.

## Requisitos mínimos obligatorios

1. **Origen**: usa solo el endpoint o paquete oficial documentado por el proveedor (por ejemplo la URL oficial, no una copia). Desconfía de instalaciones de "un clic" desde marketplaces de terceros y comprueba el dominio.
2. **Necesidad**: lista qué tarea concreta resuelve. Si una skill o un CLI basta, no conectes el servidor (menos permisos y menos tokens).
3. **Mínimo privilegio**: permisos y scopes mínimos; tokens específicos por proyecto; modo solo lectura siempre que solo necesites mirar; limitar a un proyecto o repositorio concreto y a las herramientas necesarias.
4. **Entorno**: conecta bases de datos y hosting de **desarrollo**, no de producción. No compartas credenciales entre entornos.
5. **Secretos**: tokens y claves en variables de entorno o en el gestor del agente, nunca en el repositorio ni en el chat. Comprueba que los archivos de configuración con secretos están en `.gitignore`.
6. **Prompt injection**: cualquier contenido que la herramienta lea (páginas web, logs, issues) puede contener instrucciones maliciosas. Mantén confirmación humana para acciones que escriben, borran, despliegan o gastan dinero.
7. **Privacidad y telemetría**: qué datos salen del equipo, si hay estadísticas de uso y cómo desactivarlas; no abras páginas con sesiones sensibles mientras el servidor de navegador esté conectado.
8. **Alcance de instalación**: configuración por proyecto mejor que global si solo lo necesita un proyecto.
9. **Limpieza**: retira los servidores que ya no uses y revoca sus tokens.

## Más allá de estos criterios

Define una lista corta de servidores aprobados por proyecto (nombre, versión, permisos, responsable) y guárdala en `.quality_audit_log.md` o en el `AGENTS.md`.

## Límites de Seguridad

- No conectes ni instales nada durante la auditoría.
- No reveles tokens; indica dónde se guardan.
- No recomiendes permisos de escritura sobre producción sin confirmación explícita del responsable.

## Checks Finales

- [ ] Endpoint u origen oficial verificado.
- [ ] Permisos mínimos y solo lectura donde sea posible.
- [ ] Entorno de desarrollo y secretos fuera del repositorio.
- [ ] Confirmación humana para acciones de escritura.

## Formato de entrega

```markdown
## Críticos
- ...
## Importantes
- ...
## Opcionales
- ...
```
