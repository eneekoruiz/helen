# Fase 2: Building (Construcción y Desarrollo)

**Objetivo de la fase**:
Escribir código limpio, modular, robusto y seguro mientras se implementan las funcionalidades del proyecto. Asegurar la consistencia del modelo de datos, la integridad de los límites arquitectónicos y los contratos de API a nivel local.

**Cuándo se utiliza**:
- Durante el ciclo de desarrollo activo de nuevas funcionalidades.
- Al refactorizar o simplificar código para mejorar su maintainability.
- Al integrar nuevas APIs, módulos, o esquemas de base de datos.

**Qué problemas resuelve**:
- Código fragmentado, sobreacoplado o con duplicación excesiva.
- Introducción involuntaria de secretos o malas prácticas de seguridad en el código nuevo.
- Schema drift, APIs inconsistentes o dependencias mal gestionadas.
- Lentitud en el ciclo de feedback de desarrollo.

---

## Prompts Incluidos en esta Fase

| Prompt / Flow / Checkpoint | Intención | Propósito / Cuándo usarlo | Frecuencia |
|---|---|---|---|
| [safe-clean-code-simplification-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/safe-clean-code-simplification-pass.md) | **APPLY** | Simplificación y refactorización local segura (clean code). | Alta (Antes de cada commit importante) |
| [security-hardening.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/security-hardening.md) | **APPLY flow** | Mitigar riesgos de secretos, inyecciones, dependencias inseguras y malas prácticas. | Media |
| [cms-editable-content-conversion.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/cms-editable-content-conversion.md) | **APPLY flow** | Flujo para mover textos e imágenes estáticas a campos editables del CMS. | Baja (Sólo si aplica CMS) |
| [content-model-and-editorial-workflow-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/content-model-and-editorial-workflow-audit.md) | **AUDIT** | Revisar la estructura y el flujo editorial del CMS. | Baja |
| [data-model-and-domain-integrity-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/data-model-and-domain-integrity-audit.md) | **AUDIT** | Auditar invariantes del dominio, validaciones y modelos de datos. | Media |
| [api-integration-and-contract-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/api-integration-and-contract-audit.md) | **AUDIT** | Validar contratos de API, compatibilidad con SDKs y webhooks. | Media |
| [automation-and-scripts-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/automation-and-scripts-audit.md) | **AUDIT** | Inspeccionar scripts locales, herramientas del desarrollador y automatización. | Baja |
| [clean-code-pass-flow.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/clean-code-pass-flow.md) | **APPLY flow** | Ejecución compuesta para mejorar código y validar que siga compilando. | Media |
| [clean-code-architecture-audit-flow.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/clean-code-architecture-audit-flow.md) | **AUDIT/APPLY flow** | Revisión profunda de clean code cruzada con arquitectura técnica general. | Media |
| [build-and-compile-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/build-and-compile-checkpoint.md) | **Checkpoint** | Puerta de calidad para validar que el código compila localmente. | Alta |
| [lint-and-typecheck-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/lint-and-typecheck-checkpoint.md) | **Checkpoint** | Validar que no hay errores de tipado o de linter. | Alta |
| [test-suite-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/test-suite-checkpoint.md) | **Checkpoint** | Puerta de verificación de la suite de tests locales. | Alta |

---

## Checklist de Transición: ¿Ya estoy preparado para pasar a la siguiente fase?

Antes de pasar a la fase de **Finish Features (03-finish-features)**, asegúrate de responder afirmativamente a las siguientes preguntas:

- [ ] ¿Están implementadas todas las funcionalidades clave previstas para la iteración?
- [ ] ¿El proyecto compila sin errores (`build-and-compile-checkpoint` superado)?
- [ ] ¿Se han ejecutado y corregido los errores de lint y tipado (`lint-and-typecheck-checkpoint` superado)?
- [ ] ¿Se han simplificado las dependencias y duplicidades detectadas durante la construcción?

**Siguiente Fase**:
Si la respuesta es **Sí** a todas las anteriores, estás listo para entrar en la fase **[03-finish-features](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/README.md)**.
