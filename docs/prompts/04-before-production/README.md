# Fase 4: Before Production (Preparación para Producción)

**Objetivo de la fase**:
Descubrir fallos más allá del "happy path" a través de QA adversarial y casos de borde. Validar la resiliencia del sistema ante problemas de escala y costes, asegurar el cumplimiento de privacidad/legalidad (GDPR), e instrumentar adecuadamente la observabilidad y analíticas del producto.

**Cuándo se utiliza**:
- Después de pulir la interfaz y la UX de las funcionalidades.
- Antes de congelar código para la release candidate.
- Previo a despliegues en entornos de staging o producción.

**Qué problemas resuelve**:
- Bugs raros o complejos (condiciónes de carrera, fallos parciales, cancelaciones) que rompen la experiencia.
- Consumos desmedidos de base de datos, API cuotas o recursos de infraestructura.
- Sanciones legales o pérdida de confianza del usuario por mala gestión de datos personales.
- "Ceguera" en producción por falta de logs o métricas de uso reales.

---

## Prompts Incluidos en esta Fase

| Prompt / Flow / Checkpoint | Intención | Propósito / Cuándo usarlo | Frecuencia |
|---|---|---|---|
| [adversarial-qa-and-edge-cases.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/04-before-production/adversarial-qa-and-edge-cases.md) | **AUDIT** | Atacar el producto con malformaciones, condiciónes de carrera y fallos parciales. | Alta |
| [stress-scale-and-cost-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/04-before-production/stress-scale-and-cost-audit.md) | **AUDIT** | Auditar cuellos de botella y estimaciones de costes bajo crecimiento. | Media |
| [privacy-legal-and-compliance-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/04-before-production/privacy-legal-and-compliance-audit.md) | **AUDIT** | Evalúar la privacidad (GDPR), licencias de código y obligaciones legales. | Media |
| [observability-instrumentation-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/04-before-production/observability-instrumentation-audit.md) | **APPLY/AUDIT** | Revisar o instrumentar trazas de logs, métricas y gestión de errores. | Alta |
| [product-analytics-and-metrics-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/04-before-production/product-analytics-and-metrics-audit.md) | **AUDIT** | Validar la captura de eventos de activación, retención y conversión. | Media |
| [fast-build-test-verification.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/04-before-production/fast-build-test-verification.md) | **AUDIT** | Auditoría rápida de compilación y suite de tests para descartar roturas. | Alta |
| [final-seo-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/04-before-production/final-seo-audit.md) | **AUDIT** | Revisar meta tags, sitemaps, indexabilidad y optimización para buscadores. | Media |
| [prefinal-hardening-flow.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/04-before-production/prefinal-hardening-flow.md) | **APPLY flow** | Flujo ejecutable para endurecer seguridad, QA adversarial y compilar limpio. | Media |
| [security-risk-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/04-before-production/security-risk-checkpoint.md) | **Checkpoint** | Puerta de calidad para vetar riesgos graves de seguridad antes del despliegue. | Alta |

---

## Checklist de Transición: ¿Ya estoy preparado para pasar a la siguiente fase?

Antes de pasar a la fase de **Final Audit (05-final-audit)**, asegúrate de responder afirmativamente a las siguientes preguntas:

- [ ] ¿Se han documentado y solucionado los bugs críticos del QA adversarial?
- [ ] ¿Los logs y la gestión de errores en producción están configurados correctamente?
- [ ] ¿El inventario de datos y la política de cookies/privacidad cumplen con el estándar honesto?
- [ ] ¿Se superó con éxito el `security-risk-checkpoint` sin fallos críticos bloqueantes?

**Siguiente Fase**:
Si la respuesta es **Sí** a todas las anteriores, estás listo para entrar en la fase **[05-final-audit](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/05-final-audit/README.md)**.
