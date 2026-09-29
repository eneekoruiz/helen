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

# [AUDIT] - Third-Party Skills Supply Chain Review

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.

**Intención**: AUDIT (analizar sin modificar archivos)

## Objetivo

Revisar cualquier skill, plugin, extensión o script de terceros antes de instalarlo, porque se ejecuta con tus permisos y sus instrucciones guían al agente.

## Cuándo Usarlo

- Antes de `helen skills external <id>` o de cualquier instalación desde el catálogo.
- Al actualizar una skill ya instalada.

## Requisitos mínimos obligatorios

1. **Origen**: confirma el repositorio oficial (propietario, enlaces cruzados, canal de instalación documentado). Cuidado con forks, copias y repositorios con el mismo nombre.
2. **Estado**: si está archivado, descontinuado o sin mantenimiento, no lo recomiendes.
3. **Licencia** compatible con el uso previsto.
4. **Contenido**: lee SKILL.md y todo script incluido (`scripts/`, instaladores, hooks). Busca red, acceso a ficheros fuera del proyecto, lectura de credenciales y ejecución remota.
5. **Instalación**: sin `curl | sh` a ciegas; versión fijada; no mezclar varios métodos de instalación para lo mismo.
6. **Alcance**: instala solo la skill necesaria, no colecciones enteras.
7. **Solapes**: elige una sola skill principal por función (por ejemplo, un solo skill de diseño).
8. **Servidores MCP**: no se instalan con este prompt: usa `audit-mcp-servers-security-and-scope` (permisos, tokens, solo lectura, entorno).

## Más allá de estos criterios

Registra en `.quality_audit_log.md` qué se instaló, de dónde, en qué versión y quién lo aprobó.

## Límites de Seguridad

- No instales ni ejecutes nada durante la auditoría.
- No reveles credenciales encontradas; indica dónde están.

## Checks Finales

- [ ] Origen y estado verificados.
- [ ] Scripts leídos.
- [ ] Decisión: instalar / no instalar / instalar con restricciones.

## Formato de entrega

```markdown
## Críticos
- ...
## Importantes
- ...
## Opcionales
- ...
```
