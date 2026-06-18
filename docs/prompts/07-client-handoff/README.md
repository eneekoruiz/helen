# Fase 7: Client Handoff (Entrega a Cliente y Last-Mile)

**Objetivo de la fase**:
Garantizar una transferencia de código limpia, autónoma y sin fricciones hacia el cliente, equipo receptor o futuro mantenedor. Auditar todos los elementos visibles de conversión (enlaces, formularios, microcopy de marca) en un análisis de "última milla" antes de la entrega final.

**Cuándo se utiliza**:
- Al final de hitos de entrega contractual, despliegues finales de producción o migración de repositorios.
- Antes de realizar demostraciones en vivo o grabaciones de producto para clientes.

**Qué problemas resuelve**:
- Dependencia indefinida del autor original por "conocimiento tribal" o documentación privada.
- Formularios rotos, CTAs que apuntan a `#`, o páginas de agradecimiento sin configurar.
- Assets de imagen y vídeo lentos o mal recortados en producción.
- Incomprensión del receptor sobre cómo operar, configurar variables de entorno o desplegar el proyecto.

---

## Prompts Incluidos en esta Fase

| Prompt / Flow | Intención | Propósito / Cuándo usarlo | Frecuencia |
|---|---|---|---|
| [client-handoff-and-support-readiness.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/07-client-handoff/client-handoff-and-support-readiness.md) | **REPORT/PLAN** | Auditar y empaquetar guías de despliegue, FAQ de soporte y propiedad. | Alta |
| [content-copy-brand-and-claims-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/07-client-handoff/content-copy-brand-and-claims-audit.md) | **AUDIT** | Revisión editorial de copys, coherencia de marca y claims veraces. | Alta |
| [links-forms-ctas-and-conversion-paths-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/07-client-handoff/links-forms-ctas-and-conversion-paths-audit.md) | **AUDIT** | Comprobar que todos los botones, formularios y links de conversión funcionan. | Alta |
| [media-assets-alt-text-and-performance-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/07-client-handoff/media-assets-alt-text-and-performance-audit.md) | **AUDIT** | Optimizar recortado de imágenes, logos y rendimiento de assets finales. | Media |
| [browser-smoke-test-and-demo-readiness-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/07-client-handoff/browser-smoke-test-and-demo-readiness-audit.md) | **AUDIT** | Prueba de humo en navegador para asegurar reloads estables y cero errores de consola. | Alta |
| [last-mile-client-site-delivery-flow.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/07-client-handoff/last-mile-client-site-delivery-flow.md) | **AUDIT flow** | Flujo integral de revisión visual y técnica visible antes de mostrar a cliente. | Alta |
| [client-delivery-flow.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/07-client-handoff/client-delivery-flow.md) | **PLAN/REPORT flow** | Flujo compuesto centrado en la operabilidad y transferencia limpia del repo. | Alta |

---

## Checklist de Transición: ¿Ya estoy preparado para completar el handoff?

Antes de dar el proyecto por **Entregado (Fase 7 completada)**, asegúrate de responder afirmativamente a las siguientes preguntas:

- [ ] ¿El receptor tiene acceso a todas las guías de setup y variables de entorno (`.env.example` completo)?
- [ ] ¿Se han eliminado todas las claves privadas, credenciales locales e historiales de debug del entregable?
- [ ] ¿Los formularios de contacto y botones de checkout se han probado en un entorno simulado de producción?
- [ ] ¿El paquete de soporte técnico y el acuerdo de nivel de servicio (si aplica) están definidos?

**Siguiente Fase**:
Una vez completada la entrega, el proyecto pasa a la fase de **[08-maintenance](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/08-maintenance/README.md)**.
