# Fase 6: Release (Publicación y Empaquetado)

**Objetivo de la fase**:
Congelar el código verificado y empaquetar la versión estable (Release Candidate). Generar la documentación de cambios (Changelogs, Release Notes, Demo scripts) y superar las puertas de calidad finales de integración para garantizar que la distribución del software es exitosa.

**Cuándo se utiliza**:
- Al concluir una iteración completa o sprint y prepararse para producción.
- Antes de etiquetar una versión de Git (tags) y publicar el paquete.
- Previo al despliegue en producción.

**Qué problemas resuelve**:
- Lanzamiento de versiones inestables o rotas.
- Mala comunicación de cambios y falta de guías de migración para los usuarios.
- Falta de un guión de demostración fiable del producto final.
- Ausencia de un criterio unificado de sign-off técnico para la entrega.

---

## Prompts Incluidos en esta Fase

| Prompt / Flow / Checkpoint | Intención | Propósito / Cuándo usarlo | Frecuencia |
|---|---|---|---|
| [release-checklist.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/06-release/release-checklist.md) | **PLAN/AUDIT** | Puerta de calidad global y veredicto final de release. | Alta |
| [release-notes-changelog-and-demo-package.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/06-release/release-notes-changelog-and-demo-package.md) | **GENERATE** | Generar changelogs, guías de migración y guión de demo. | Alta |
| [release-candidate-flow.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/06-release/release-candidate-flow.md) | **PLAN flow** | Flujo completo de comprobación final (builds, tests, i18n, SEO, seguridad). | Alta |
| [release-readiness-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/06-release/release-readiness-checkpoint.md) | **Checkpoint** | Validar que no quedan flecos técnicos abiertos antes del tag de release. | Alta |

---

## Checklist de Transición: ¿Ya estoy preparado para pasar a la siguiente fase?

Antes de pasar a la fase de **Client Handoff (07-client-handoff)**, asegúrate de responder afirmativamente a las siguientes preguntas:

- [ ] ¿El veredicto del `release-checklist` es un `PASS` rotundo?
- [ ] ¿El changelog y las notas de versión están actualizados y redactados con honestidad?
- [ ] ¿Se ha generado un guión de demo reproducible?
- [ ] ¿Se superó con éxito el `release-readiness-checkpoint` final?

**Siguiente Fase**:
Si la respuesta es **Sí** a todas las anteriores, estás listo para entrar en la fase **[07-client-handoff](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/07-client-handoff/README.md)**.
