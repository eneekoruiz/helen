# HELEN Prompt System

Esta carpeta contiene la biblioteca de prompts de HELEN.

No es solo una colección de prompts sueltos. Es un sistema para que una IA integrada en un editor pueda auditar, mejorar, pulir, endurecer y preparar un proyecto siguiendo fases, criterios, checkpoints y reglas de seguridad.

## Cómo Usarlo

Si quieres ejecutar un flujo completo, dile a la IA:

```text
Lee docs/prompts/MASTER.md.
Luego lee docs/prompts/flows/full-polish.md.
Ejecuta el flujo paso a paso, leyendo cada prompt atómico y checkpoint referenciado.
No avances si un checkpoint bloqueante falla.
```

Si no sabes qué flujo usar:

```bash
helen prompts
helen prompts list --kind flow
helen prompts list --kind prompt
helen prompts path full-polish
helen prompts show coverage
```

## Archivos Principales

- [MASTER.md](MASTER.md)
  Reglas maestras para agentes: cómo leer flujos, cuándo avanzar, cuándo parar, cuándo corregir y cuándo pedir confirmación.

- [TAXONOMY.md](TAXONOMY.md)
  Reglas para evitar prompts duplicados, decidir si algo debe ser prompt, step, checkpoint o flow, y nombrarlo bien.

- [COVERAGE.md](COVERAGE.md)
  Mapa canónico de intenciones. Antes de crear un prompt nuevo, revisa aquí si ya existe una entrada oficial.

- [registry.json](registry.json)
  Registro machine-readable de familias, flujos y guías para que el CLI pueda descubrirlos.

## Qué Hay Dentro

### Flows

[flows/](flows/README.md) contiene flujos compuestos. Son instrucciones ejecutables por un agente.

Usa flows cuando quieras que la IA trabaje de principio a fin:

- `full-polish`: mejora general antes del endurecimiento final.
- `prefinal-hardening`: endurecimiento previo a release.
- `release-candidate`: validación final para candidato de release.
- `client-delivery`: preparación para entrega a cliente/equipo.
- `market-analysis`: benchmark, posicionamiento y roadmap.
- `ux-visual-pass`: UX, visual, responsive y accesibilidad básica.
- `clean-code-architecture-audit`: clean code + arquitectura con estándar Staff.
- `awwwards-soty-design-review`: diseño visual, interacción y craft tipo Awwwards/SOTY.
- `cms-editable-content-conversion`: convertir textos en `EditableField` e imágenes en `EditableImage`.
- `security-hardening`: mitigación de riesgos de seguridad.
- `github-repo-polish`: presentación profesional del repositorio.
- `i18n-final-audit`: auditoría final de internacionalización.

### Steps

[steps/](steps/) contiene prompts atómicos y reutilizables.

Usa steps cuando quieras ejecutar una tarea concreta dentro de un flujo:

- `audit/initial-project-risk-scan`
- `ux/primary-user-experience-audit`
- `ux/loading-error-empty-states`
- `visual/premium-visual-polish-pass`
- `visual/responsive-pass`
- `clean-code/safe-clean-code-simplification-pass`
- `architecture/staff-architecture-audit`
- `testing/fast-build-test-verification`
- `accessibility/basic-accessibility-pass`
- `performance/basic-performance-pass`
- `security/security-hardening`
- `seo/final-seo-audit`
- `i18n/final-i18n-audit`
- `github/github-repository-presentation-polish`
- `release/release-notes-and-checklist`
- `market/competitive-scan`
- `delivery/client-delivery-readiness`

### Checkpoints

[checkpoints/](checkpoints/README.md) contiene puertas entre fases.

Un checkpoint no es una auditoría larga; decide si se puede avanzar.

- `build-and-compile-checkpoint`
- `test-suite-checkpoint`
- `lint-and-typecheck`
- `visual-ux-regression-checkpoint`
- `security-risk-checkpoint`
- `release-readiness-checkpoint`

### Prompt Families

Estas carpetas contienen auditorías expertas por dominio:

- [agent-quality/](agent-quality/README.md): calidad del propio sistema de prompts y agentes.
- [cms/](cms/README.md): conversión de contenido estático a CMS editable y workflow editorial.
- [data/](data/README.md): modelo de dominio, integridad de datos, invariantes y drift.
- [delivery/](delivery/README.md): handoff, soporte, release notes y demo package.
- [design/](design/README.md): diseño general, UI premium y Awwwards/SOTY en un prompt canónico.
- [discovery/](discovery/README.md): puntos ciegos, metodología y riesgos no previstos.
- [dx/](dx/README.md): experiencia de desarrollador, scripts y onboarding técnico.
- [final/](final/README.md): auditorías finales de código, docs, i18n, GitHub, presentación y release.
- [growth/](growth/README.md): activación, retención, conversión y SEO programático.
- [integrations/](integrations/README.md): APIs, contratos, webhooks, SDKs e integraciones.
- [observability/](observability/README.md): logs, métricas, tracing, alertas y analytics.
- [operations/](operations/README.md): backups, recovery, migraciones, import/export y lock-in.
- [orchestration/](orchestration/README.md): router, briefs para agentes y síntesis de auditorías.
- [privacy/](privacy/README.md): privacidad, legal, compliance, consentimiento y retención.
- [product/](product/README.md): onboarding, microcopy, estados vacíos y sensación premium.
- [quality/](quality/README.md): QA adversarial, edge cases, stress, escala y coste.
- [strategy/](strategy/README.md): benchmark competitivo, roadmap, ROI y priorización.

## Qué Usar Según la Fase

### 1. No sé por dónde empezar

Usa:

```text
orchestration/00-prompt-router.md
```

O pide:

```text
Lee docs/prompts/orchestration/00-prompt-router.md y dime qué flujo ejecutar para este repo.
```

### 2. Quiero descubrir puntos ciegos

Usa:

```text
discovery/01-methodology-and-blind-spots-audit.md
discovery/02-product-ux-and-premium-quality-audit.md
discovery/03-architecture-operations-and-risk-audit.md
```

### 3. Quiero mejora general del proyecto

Usa:

```text
flows/full-polish.md
```

Este flujo cubre auditoría rápida, UX, visual, responsive, estados, clean code, performance, accesibilidad y verificación rápida.

### 4. Quiero clean code y arquitectura exigente

Usa:

```text
flows/clean-code-architecture-audit.md
```

Este flujo combina:

- riesgo inicial;
- arquitectura Staff-level;
- simplificación segura de código;
- verificación build/test.

### 5. Quiero diseño general, premium o Awwwards/SOTY

Usa el prompt canónico:

```text
design/01-product-design-and-awards-visual-excellence-audit.md
```

O el flujo completo:

```text
flows/awwwards-soty-design-review.md
```

No hay prompts separados para “diseño general” y “Awwwards” porque inspeccionan la misma superficie. El prompt usa niveles de ambición: `Product-solid`, `Premium`, `Awards-level`.

### 6. Quiero preparar un release

Usa en orden:

```text
flows/prefinal-hardening.md
flows/release-candidate.md
```

No empieces con `release-candidate` si el proyecto aún no compila o si el flujo principal está roto.

### 7. Quiero convertir una web a CMS editable

Usa:

```text
flows/cms-editable-content-conversion.md
```

Este flujo revisa todos los textos e imágenes de contenido y guía la conversión a `EditableField` y `EditableImage` sin romper diseño, SEO, accesibilidad ni entrega.

### 8. Quiero entregar a cliente o equipo

Usa:

```text
flows/client-delivery.md
```

Este flujo revisa reproducibilidad, docs, seguridad, repo polish, release notes y handoff.

### 9. Quiero preparar GitHub o portfolio

Usa:

```text
flows/github-repo-polish.md
final/05-public-presentation-pass.md
```

### 10. Quiero analizar mercado y roadmap

Usa:

```text
flows/market-analysis.md
strategy/01-competitive-benchmark.md
strategy/02-roadmap-roi-prioritization.md
```

### 11. Quiero revisar privacidad, datos o contratos

Usa:

```text
privacy/01-privacy-legal-and-compliance-audit.md
data/01-data-model-and-domain-integrity-audit.md
integrations/01-api-integration-and-contract-audit.md
```

## Orden Recomendado Para un Repo Importante

1. `orchestration/00-prompt-router.md`
2. `discovery/01-methodology-and-blind-spots-audit.md`
3. `flows/full-polish.md`
4. `flows/clean-code-architecture-audit.md`
5. `flows/ux-visual-pass.md` si hay UI.
6. `flows/cms-editable-content-conversion.md` si hay entrega editable/CMS.
7. `privacy`, `data`, `integrations`, `operations` según aplique.
8. `flows/prefinal-hardening.md`
9. `flows/release-candidate.md`
10. `flows/client-delivery.md` si hay entrega externa.

## Reglas de Seguridad

- No ejecutar flujos finales si el proyecto no compila.
- No maquillar presentación si el producto o README mienten.
- No hacer refactors grandes sin evidencia clara.
- No introducir dependencias por comodidad.
- No ocultar fallos de tests, build, lint o typecheck.
- No continuar si un checkpoint bloqueante falla.
- No crear prompts nuevos si una intención ya está cubierta en [COVERAGE.md](COVERAGE.md).

## Cómo Acceder Desde HELEN

```bash
helen prompts
helen prompts list --kind flow
helen prompts list --kind step
helen prompts list --kind checkpoint
helen prompts list --kind prompt
helen prompts list --kind guide
helen prompts show coverage
helen prompts show taxonomy
helen prompts flow full-polish
helen prompts path release-candidate
```

## Criterio Final

La biblioteca debe ser pequeña en intención y amplia en cobertura.

No se añaden prompts para aparentar profundidad. Se añaden solo cuando cubren una intención distinta, con evidencia distinta, stop conditions distintas o un riesgo que normalmente se descubre demasiado tarde.
