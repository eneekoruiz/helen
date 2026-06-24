# Fase 5: Final Audit (Auditoría Final y Credibilidad)

**Objetivo de la fase**:
Ejecutar auditorías profundas y rigurosas de la calidad del código, internacionalización (i18n), completitud de la documentación, higiene del repositorio público y presentación para asegurar que el proyecto es veraz, mantenible, seguro de compartir y profesional en todos sus aspectos.

**Cuándo se utiliza**:
- Cuando el desarrollo y endurecimiento (Building y Hardening) están totalmente completados.
- Previo a la congelación de código para empaquetado y release.
- Antes de promocionar o publicar el repositorio ante clientes, recruiters o el público general.

**Qué problemas resuelve**:
- Código técnicamente inestable o con alta deuda técnica oculta.
- Traducciones a medias, claves de traducción crudas en UI o fallos de fallback.
- Documentación obsoleta, engañosa o que no coincide con la realidad del código.
- Repositorios públicos desordenados, sin licencia o con placeholders visuales.

---

## Diferencia Operativa de Etiquetas

- **AUDIT**: única etiqueta principal de esta fase; revisa con severidad y no modifica archivos.
- **GENERATE**: solo aplica a documentación o runbooks si falta un artefacto final.
- **ENHANCE/APPLY**: no debe ejecutarse desde auditoría final salvo que una auditoría derive explícitamente una tarea separada.
- **INIT**: no corresponde a cierre; si hace falta INIT aquí, el proyecto no estaba listo para auditoría.

## Prompts Incluidos en esta Fase

| Prompt / Flow / Runbook | Intención | Propósito / Cuándo usarlo | Frecuencia |
|---|---|---|---|
| [audit-visual-quality-40k.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/05-final-audit/audit-visual-quality-40k.md) | **AUDIT** | Revisión técnico-visual final de aspecto 40K: luces, cámaras, shaders, motion, composición y conversión. | Alta (Si hay UI premium/3D) |
| [code-quality-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/05-final-audit/code-quality-audit.md) | **AUDIT** | Evalúación rigurosa de mantenibilidad, deuda técnica, bugs y tests. | Alta |
| [i18n-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/05-final-audit/i18n-audit.md) | **AUDIT/APPLY flow** | Auditar y corregir el soporte multilingüe, fallbacks y metadatos SEO. | Media |
| [documentation-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/05-final-audit/documentation-audit.md) | **AUDIT** | Validar la veracidad de quick-starts, guías de entorno y ejemplos. | Alta |
| [github-repository-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/05-final-audit/github-repository-audit.md) | **AUDIT/APPLY flow** | Auditar y pulir la legibilidad y presentación de GitHub (About, topics, tags). | Alta |
| [public-presentation-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/05-final-audit/public-presentation-pass.md) | **AUDIT** | Juzgar si el proyecto merece exposición pública y si OG/Social preview es sólida. | Alta |
| [runbook.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/05-final-audit/runbook.md) | **REPORT/PLAN** | Guía de orden y reglas de decisión para cerrar la auditoría final. | Alta |

---

## Checklist de Transición: ¿Ya estoy preparado para pasar a la siguiente fase?

Antes de pasar a la fase de **Release (06-release)**, asegúrate de responder afirmativamente a las siguientes preguntas:

- [ ] ¿El veredicto de calidad del código es `PASS` o `PASS WITH CAVEATS`?
- [ ] ¿Los metadatos, el README y la documentación son honestos y corresponden al código actual?
- [ ] ¿El repositorio de GitHub está limpio de credenciales, notas personales y placeholders?
- [ ] ¿Se ha completado la secuencia de pasos detallada en el `runbook.md` con éxito?

**Siguiente Fase**:
Si la respuesta es **Sí** a todas las anteriores, estás listo para entrar en la fase **[06-release](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/06-release/README.md)**.
