# Biblioteca de Prompts de Proyecto

Esta biblioteca es un sistema de orquestación de calidad para agentes con acceso completo al repositorio.

No está pensada para producir agentes obedientes que recorren una lista y se detienen. Está pensada para activar criterio experto, descubrir puntos ciegos y convertir auditorías en decisiones accionables.

## Principio Fundamental

Cada prompt combina dos niveles:

1. **Requisitos mínimos obligatorios**
   Checks concretos que nunca deben olvidarse.

2. **Inteligencia adicional**
   Juicio propio de un perfil senior. La IA debe inspeccionar el proyecto completo, cuestionar el estado actual y detectar problemas u oportunidades que la lista no haya previsto.

La lista es un suelo, no un techo.

## Cómo Usar Esta Biblioteca

Si no sabes por dónde empezar, no elijas un prompt manualmente.

Empieza por:

1. [MASTER.md](MASTER.md)
2. [flows/](flows/README.md)
3. El flujo concreto que quieras ejecutar, por ejemplo [flows/full-polish.md](flows/full-polish.md).
4. Los prompts atómicos referenciados en [steps/](steps/).
5. Los checkpoints requeridos en [checkpoints/](checkpoints/README.md).

Si quieres que la IA decida el camino, usa:

1. [orchestration/00-prompt-router.md](orchestration/00-prompt-router.md)
2. Ejecuta la secuencia recomendada.
3. Consolida resultados con [orchestration/03-cross-audit-synthesis.md](orchestration/03-cross-audit-synthesis.md).
4. Convierte el plan en trabajo ejecutable con [orchestration/02-agent-brief-builder.md](orchestration/02-agent-brief-builder.md).

## Familias

- [MASTER.md](MASTER.md)
  Reglas maestras para ejecutar flujos con criterio, seguridad, checkpoints y trazabilidad.

- [flows/](flows/README.md)
  Flujos compuestos ejecutables: full polish, release candidate, client delivery, market analysis y más.

- [steps/](steps/)
  Prompts atómicos reutilizables por área.

- [checkpoints/](checkpoints/README.md)
  Gates entre fases: build/compile, test suite, lint/typecheck, visual/UX regression, security risk y release readiness.

- [orchestration/](orchestration/README.md)
  Router, sistema operativo de calidad, briefs de agente y síntesis de auditorías.

- [agent-quality/](agent-quality/README.md)
  Auditoría del propio sistema de prompts, flujos, seguridad, trazabilidad y repetibilidad.

- [discovery/](discovery/README.md)
  Puntos ciegos, metodología, producto, UX, arquitectura, operaciones y riesgo.

- [design/](design/README.md)
  Mejora general de diseño, UI premium y revisión Awwwards/Site of the Year.

- [strategy/](strategy/README.md)
  Benchmark competitivo, roadmap, ROI, coste-beneficio y priorización.

- [data/](data/README.md)
  Modelo de dominio, integridad de datos, invariantes, esquemas y drift.

- [integrations/](integrations/README.md)
  APIs, SDKs, webhooks, contratos, integraciones externas y compatibilidad.

- [product/](product/README.md)
  Onboarding, activación, estados vacíos, microcopy y sensación premium.

- [growth/](growth/README.md)
  Activación, retención, conversión, loops, SEO programático y métricas de crecimiento.

- [dx/](dx/README.md)
  Experiencia de desarrollador, onboarding técnico, scripts y automatización.

- [quality/](quality/README.md)
  QA adversarial, edge cases, stress tests, escalabilidad y coste.

- [operations/](operations/README.md)
  Backups, disaster recovery, migraciones, import/export, lock-in y continuidad.

- [privacy/](privacy/README.md)
  Privacidad, legal, compliance, consentimiento, retención y confianza.

- [observability/](observability/README.md)
  Logs, tracing, métricas, alertas, analytics e instrumentación.

- [delivery/](delivery/README.md)
  Handoff, soporte, release notes, changelog, demos y paquetes de entrega.

- [final/](final/README.md)
  Auditorías finales de código, i18n, documentación, GitHub, presentación pública y release.

- [workflows/](workflows/README.md)
  Secuencias reutilizables para launch, portfolio, SaaS, open source, handoff y auditoría total.

## Filosofía

La IA debe actuar con iniciativa controlada. Debe buscar:

- inconsistencias;
- oportunidades de simplificación;
- mejoras estéticas y de producto;
- problemas de UX;
- deuda técnica;
- componentes redundantes;
- riesgos arquitectónicos;
- riesgos operativos, de seguridad y de mantenimiento;
- detalles que hagan que el proyecto parezca menos premium, menos confiable o menos profesional;
- categorías completas que todavía no existen.

## Libertad Controlada

La IA puede proponer o aplicar mejoras adicionales cuando:

- aumentan calidad;
- simplifican código o proceso;
- mejoran experiencia de usuario;
- mejoran mantenibilidad;
- mejoran coherencia;
- reducen complejidad;
- aumentan sensación premium;
- reducen riesgo futuro.

Debe evitar:

- cambios arbitrarios;
- nuevas dependencias innecesarias;
- reescrituras grandes sin justificación;
- ruptura de comportamiento existente;
- cambios de stack sin motivos sólidos;
- refactors masivos de bajo valor;
- procesos ceremoniales que nadie mantendrá.

## Artefactos de Orquestación

- [registry.json](registry.json)
  Registro inicial de familias, fases y prompts para habilitar automatización futura.

- [workflows/README.md](workflows/README.md)
  Rutas de ejecución para distintos escenarios.

## Regla de Uso

Si un prompt solo devuelve lo que ya estaba en la lista, no ha hecho suficiente trabajo.

Un buen resultado debe separar:

- hallazgos obligatorios;
- oportunidades descubiertas por criterio propio;
- cambios que conviene aplicar ahora;
- cambios que conviene posponer;
- decisiones que requieren contexto humano.
