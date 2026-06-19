# Fase 09 — Long-Term Project Survival & Future Knowledge

Esta fase se centra en la supervivencia del proyecto a largo plazo, la transferencia fluida del conocimiento, y la mitigación de riesgos operativos cuando cambia el equipo humano o cuando agentes de IA asumen el control en el futuro.

## 🎯 Objetivos de la Fase
- Garantizar que el proyecto pueda ser recuperado y comprendido por desarrolladores del futuro con mínima fricción.
- Reducir el factor de dependencia personal ("Bus Factor") a través de registros explícitos de decisiones y contexto.
- Prevenir la acumulación silenciosa de deuda técnica o desactualización del modelo operativo del proyecto.

## 🧭 Prompts Incluidos

### AUDIT
- **[audit-future-developer-onboarding.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/09-future-knowledge/audit-future-developer-onboarding.md)**: Audita la legibilidad y accesibilidad del workspace para nuevos programadores.
- **[audit-self-recovery.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/09-future-knowledge/audit-self-recovery.md)**: Establece el protocolo para recuperar el entorno local o el sistema ante corrupción crítica.
- **[audit-bus-factor.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/09-future-knowledge/audit-bus-factor.md)**: Evalúa el nivel de centralización del conocimiento técnico clave y los accesos.
- **[audit-knowledge-gap.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/09-future-knowledge/audit-knowledge-gap.md)**: Identifica supuestos implícitos no documentados en la arquitectura.
- **[audit-legacy-resistance.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/09-future-knowledge/audit-legacy-resistance.md)**: Audita áreas propensas a rot de código o alta fricción de actualización.
- **[audit-long-term-ownership-review.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/09-future-knowledge/audit-long-term-ownership-review.md)**: Revisa dependencias de dominios, suscripciones, claves y APIs.

### GENERATE
- **[generate-decision-log.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/09-future-knowledge/generate-decision-log.md)**: Genera registros estructurados de decisiones de arquitectura (ADRs).
- **[generate-ai-context.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/09-future-knowledge/generate-ai-context.md)**: Crea plantillas de configuración de contexto nativas para agentes de IA (como `.claudeprompt`, `.cursorrules`).

### APPLY
- **[apply-automated-knowledge-preservation.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/09-future-knowledge/apply-automated-knowledge-preservation.md)**: Automatiza la compilación del estado de conocimiento del repositorio en un único archivo portátil.

## 🏁 Criterios de Transición y Cierre
Para considerar esta fase completada y garantizar la continuidad operacional:
1. El "Bus Factor" debe estar documentado y mitigado con accesos alternativos o redundancia de claves.
2. Cada decisión de diseño importante debe contar con su correspondiente ADR en la bitácora.
3. El script de preservación automatizada de conocimiento debe ejecutarse regularmente o antes de handoffs.
