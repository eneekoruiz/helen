---
action: AUDIT
label: AUDIT-
phase: 05-final-audit
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

# [AUDIT] - Automated Code Review Setup

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.

**Intención**: AUDIT (analizar sin modificar archivos)

## Objetivo

Evaluar si conviene añadir revisión de código automatizada (por ejemplo CodeRabbit, o la revisión integrada del agente) y cómo hacerlo sin filtrar código ni depender ciegamente de ella.

## Cuándo Usarlo

- Antes de abrir el repositorio a colaboradores.
- Cuando los PR se aprueban sin revisión real.

## Requisitos mínimos obligatorios

1. Describe qué revisión existe hoy (humana, CI, linters, agente) y qué huecos deja.
2. Si se considera una herramienta externa: qué código sale del repositorio, dónde se procesa, límites del plan gratuito y coste de uso intensivo, y política de retención.
3. Instalación: muchas herramientas ofrecen `curl … | sh`; descarga el script, léelo y fíjalo antes de ejecutarlo. Prefiere Homebrew, paquetes con versión o extensiones oficiales.
4. Define qué hallazgos bloquean (seguridad, correctitud) y cuáles son opcionales, para que la revisión automática no genere ruido.
5. La revisión automática complementa, no sustituye, la revisión humana ni los tests.

## Más allá de estos criterios

Usa la revisión automática como paso previo al commit (sobre cambios sin subir) para detectar alucinaciones y olores de código antes del PR.

## Límites de Seguridad

- No envíes repositorios privados de clientes a un servicio sin permiso del cliente.
- No conviertas un hallazgo automático en cambio aplicado sin verificarlo.

## Checks Finales

- [ ] Riesgos de privacidad evaluados.
- [ ] Instalación revisada (script leído y versión fijada).
- [ ] Política de qué bloquea y qué no.

## Formato de entrega

```markdown
## Críticos
- ...
## Importantes
- ...
## Opcionales
- ...
```
