# Fase 8: Maintenance (Soporte y Mantenimiento)

**Objetivo de la fase**:
Garantizar la salud operativa y la evolución sostenible del proyecto a largo plazo. Auditar el ciclo de vida de los datos, probar simulacros de recuperación (backups), analizar la dependencia de proveedores (lock-in) y mantener la propia biblioteca de prompts simplificada, coherente y libre de duplicación.

**Cuándo se utiliza**:
- Tras el lanzamiento a producción y entrega del proyecto.
- Durante tareas periódicas de soporte, análisis de crecimiento o incidentes.
- Al realizar tareas de limpieza y refactorización del propio sistema de prompts de HELEN.

**Qué problemas resuelve**:
- Pérdida de datos por copias de seguridad corruptas o no probadas en restauración.
- Altos costos de salida o rediseño completo por dependencia cautiva de un proveedor (vendor lock-in).
- Desorden, crecimiento descontrolado y duplicados en el repositorio de prompts.
- Falta de un flujo formal para la toma de decisiones estratégicas.

---

## Prompts Incluidos en esta Fase

| Prompt / Flow / Checkpoint | Intención | Propósito / Cuándo usarlo | Frecuencia |
|---|---|---|---|
| [data-lifecycle-backup-and-recovery.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/08-maintenance/data-lifecycle-backup-and-recovery.md) | **AUDIT/REPORT** | Identificar datos persistentes y ensayar planes de restauración. | Media |
| [migrations-import-export-lock-in.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/08-maintenance/migrations-import-export-lock-in.md) | **AUDIT/REPORT** | Evaluar la portabilidad de datos y mitigar dependencias cautivas. | Media |
| [growth-model-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/08-maintenance/growth-model-audit.md) | **REPORT** | Auditar la retención y activación de usuarios para experimentos. | Media |
| [programmatic-seo-and-content-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/08-maintenance/programmatic-seo-and-content-audit.md) | **AUDIT** | Encontrar oportunidades de SEO programático y páginas útiles. | Baja |
| [quality-operating-system-design.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/08-maintenance/quality-operating-system-design.md) | **PLAN** | Diseñar la metodología completa de calidad técnica del proyecto. | Baja (Una vez por ciclo mayor) |
| [agent-brief-builder.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/08-maintenance/agent-brief-builder.md) | **GENERATE** | Crear briefs de ejecución hiper-detallados y seguros para IAs. | Alta (Para cada nueva feature) |
| [cross-audit-synthesis.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/08-maintenance/cross-audit-synthesis.md) | **PLAN** | Consolidar hallazgos de múltiples prompts en un solo plan secuenciado. | Alta (Tras auditorías cruzadas) |
| [prompt-library-maintenance-flow.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/08-maintenance/prompt-library-maintenance-flow.md) | **APPLY flow** | Limpiar, actualizar referencias y resolver registry de la biblioteca. | Media |

---

## Checklist de Calidad en Mantenimiento:

- [ ] ¿Se ha realizado un simulacro de restauración de datos a partir de un backup real?
- [ ] ¿Los esquemas de exportación de datos de usuario son accesibles e independientes de vendor?
- [ ] ¿Se han consolidado o eliminado prompts redundantes y la registry resuelve correctamente?
