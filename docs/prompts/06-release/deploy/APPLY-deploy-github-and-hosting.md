---
action: APPLY
label: APPLY-
phase: 06-release
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

# [APPLY] - Deploy with GitHub and Hosting

## Nivel 0 y Mente Abierta
- **Nivel 0**: se asume excelencia en código limpio, UI/UX, accesibilidad y rendimiento (skills `helen-clean-code`, `helen-premium-design`, `helen-a11y-perf`).
- **Mente Abierta**: propón mejoras y tecnologías más modernas cuando aporten valor verificable, pero aplica solo lo que entra en el alcance pedido y respeta los Límites de Seguridad de este prompt.

**Intención**: APPLY (Modificar el proyecto, salida mínima)

## Objetivo

Subir el código a GitHub y conectarlo a un hosting (Vercel, Cloudflare u otro) para que la página quede en línea de forma reproducible y sin filtrar secretos.

## Cuándo Usarlo

- Tras pasar el checkpoint de release readiness.
- Al publicar una web nueva o entregar un sitio a un cliente.

## Cuándo NO Usarlo

- Si build, tests o el checkpoint de seguridad fallan.

## Criterios Mínimos

- Comprueba que `.env` y credenciales no están versionados y que existe `.env.example` sin valores reales.
- Crea el repositorio como **privado** (`gh repo create <nombre> --private --source=. --push`); hazlo público solo si se decide a propósito.
- Conecta el repositorio al hosting desde su panel; las variables de entorno se configuran allí, nunca en el repositorio.
- Verifica el primer despliegue: la página carga, los enlaces y formularios funcionan, no hay `noindex` accidental y el dominio y HTTPS son correctos.
- Documenta cómo desplegar y hacer rollback (ver `helen-knowledge`).

## Más allá de estos criterios

Activa despliegues de previsualización por rama y protege la rama principal para que un push no publique sin pasar CI.

## Límites de Seguridad

- No hagas push forzado ni cambies visibilidad, dominios o DNS sin confirmación explícita.
- No imprimas tokens en el chat ni en archivos de reporte.

## Checks Finales

- Sin secretos en el historial.
- Despliegue verificado en la URL real.

## Formato de Entrega

```text
✅ Despliegue listo. / ⚠️ Completado con advertencias.

Cambios aplicados:
- [1-3 viñetas]

Acciones manuales necesarias:
- Ninguna. / [conectar el hosting, configurar variables, apuntar el dominio]
```
