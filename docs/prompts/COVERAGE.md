# Canonical Prompt Coverage Map

This file explains what exists, what each area is for, and where not to create duplicate prompts.

## Rule

If a new request fits one of these canonical intentions, improve the existing prompt or flow instead of adding another one.

## Canonical Intentions mapped to Project Moments

| Momento / Fase | Intención Canónica | Archivo Correspondiente |
|---|---|---|
| **01-start-project** | Escaneo inicial de riesgos del proyecto | `01-start-project/initial-project-risk-scan.md` |
| | Auditoría de metodología y puntos ciegos | `01-start-project/methodology-and-blind-spots-audit.md` |
| | Auditoría de arquitectura, operaciones y riesgos | `01-start-project/architecture-operations-and-risk-audit.md` |
| | Auditoría de onboarding del desarrollador | `01-start-project/developer-onboarding-audit.md` |
| | Análisis competitivo y benchmarking | `01-start-project/competitive-benchmark.md` |
| | Priorización del roadmap y ROI | `01-start-project/roadmap-roi-prioritization.md` |
| | Flujo completo de análisis de mercado | `01-start-project/market-analysis-flow.md` |
| **02-building** | Pase de simplificación y código limpio | `02-building/safe-clean-code-simplification-pass.md` |
| | Flujo de hardening y seguridad básica | `02-building/security-hardening-flow.md` |
| | Flujo de conversión a CMS editable | `02-building/cms-editable-content-conversion-flow.md` |
| | Auditoría del modelo de contenido y flujo editorial | `02-building/content-model-and-editorial-workflow-audit.md` |
| | Auditoría del modelo de datos e integridad del dominio | `02-building/data-model-and-domain-integrity-audit.md` |
| | Auditoría de integración de APIs y contratos | `02-building/api-integration-and-contract-audit.md` |
| | Auditoría de scripts y automatizaciones | `02-building/automation-and-scripts-audit.md` |
| | Flujo de pase de código limpio | `02-building/clean-code-pass-flow.md` |
| | Flujo de auditoría de arquitectura y código limpio | `02-building/clean-code-architecture-audit-flow.md` |
| | Checkpoint de compilación y build | `02-building/build-and-compile-checkpoint.md` |
| | Checkpoint de linter y chequeo de tipos | `02-building/lint-and-typecheck-checkpoint.md` |
| | Checkpoint de suite de tests unitarios | `02-building/test-suite-checkpoint.md` |
| **03-finish-features**| Auditoría de UX de producto y calidad premium | `03-finish-features/product-ux-and-premium-quality-audit.md` |
| | Auditoría de onboarding y activación de usuario | `03-finish-features/onboarding-activation-audit.md` |
| | Pase de estados vacíos, errores y microcopy | `03-finish-features/empty-states-errors-and-microcopy.md` |
| | Pase de detalles y pulido premium | `03-finish-features/premium-detail-pass.md` |
| | Auditoría de diseño visual y excelencia para premios | `03-finish-features/product-design-and-awards-visual-excellence-audit.md` |
| | Auditoría de experiencia de usuario primaria | `03-finish-features/primary-user-experience-audit.md` |
| | Pase de pulido visual premium | `03-finish-features/premium-visual-polish-pass.md` |
| | Pase de diseño responsive | `03-finish-features/responsive-pass.md` |
| | Pase de accesibilidad básica | `03-finish-features/basic-accessibility-pass.md` |
| | Pase de rendimiento básico | `03-finish-features/basic-performance-pass.md` |
| | Flujo de pase visual y UX | `03-finish-features/ux-visual-pass-flow.md` |
| | Flujo de revisión de diseño estilo Awwwards/SOTY | `03-finish-features/awwwards-soty-design-review-flow.md` |
| | Flujo completo de pulido guiado | `03-finish-features/full-polish-flow.md` |
| | Checkpoint de regresión visual y de UX | `03-finish-features/visual-ux-regression-checkpoint.md` |
| **04-before-production** | QA adversarial y casos de borde | `04-before-production/adversarial-qa-and-edge-cases.md` |
| | Auditoría de stress, escala y costos | `04-before-production/stress-scale-and-cost-audit.md` |
| | Auditoría de privacidad, legal y compliance | `04-before-production/privacy-legal-and-compliance-audit.md` |
| | Auditoría e instrumentación de observabilidad | `04-before-production/observability-instrumentation-audit.md` |
| | Auditoría de métricas y analíticas de producto | `04-before-production/product-analytics-and-metrics-audit.md` |
| | Verificación rápida de build y tests | `04-before-production/fast-build-test-verification.md` |
| | Auditoría final de SEO | `04-before-production/final-seo-audit.md` |
| | Flujo de prefinal hardening | `04-before-production/prefinal-hardening-flow.md` |
| | Checkpoint de riesgos de seguridad | `04-before-production/security-risk-checkpoint.md` |
| **05-final-audit** | Auditoría de calidad de código final | `05-final-audit/code-quality-audit.md` |
| | Flujo de auditoría y pulido de internacionalización (i18n) | `05-final-audit/i18n-audit-flow.md` |
| | Auditoría de documentación técnica | `05-final-audit/documentation-audit.md` |
| | Flujo de auditoría y pulido de repositorio GitHub | `05-final-audit/github-repository-audit-flow.md` |
| | Pase de presentación pública del proyecto | `05-final-audit/public-presentation-pass.md` |
| | Runbook de despliegue y operaciones | `05-final-audit/runbook.md` |
| **06-release** | Checklist detallada de release | `06-release/release-checklist.md` |
| | Generación de changelog, release notes y demo package | `06-release/release-notes-changelog-and-demo-package.md` |
| | Flujo de candidato a release (Release Candidate) | `06-release/release-candidate-flow.md` |
| | Checkpoint de preparación de release | `06-release/release-readiness-checkpoint.md` |
| **07-client-handoff**| Preparación de handoff a cliente y soporte | `07-client-handoff/client-handoff-and-support-readiness.md` |
| | Auditoría de textos, tono de marca e claims | `07-client-handoff/content-copy-brand-and-claims-audit.md` |
| | Auditoría de enlaces, formularios y CTAs | `07-client-handoff/links-forms-ctas-and-conversion-paths-audit.md` |
| | Auditoría de rendimiento y alt text en imágenes/videos | `07-client-handoff/media-assets-alt-text-and-performance-audit.md` |
| | Auditoría de smoke tests de navegador y demo lista | `07-client-handoff/browser-smoke-test-and-demo-readiness-audit.md` |
| | Flujo de entrega de sitio de cliente (last mile) | `07-client-handoff/last-mile-client-site-delivery-flow.md` |
| | Flujo completo de entrega a cliente | `07-client-handoff/client-delivery-flow.md` |
| **08-maintenance** | Auditoría de ciclo de vida de datos y backups | `08-maintenance/data-lifecycle-backup-and-recovery.md` |
| | Auditoría de migraciones, importación/exportación y lock-in | `08-maintenance/migrations-import-export-lock-in.md` |
| | Auditoría de modelos de crecimiento | `08-maintenance/growth-model-audit.md` |
| | Auditoría de SEO programático y contenido | `08-maintenance/programmatic-seo-and-content-audit.md` |
| | Diseño de Quality Operating System | `08-maintenance/quality-operating-system-design.md` |
| | Generador de briefs para agentes de desarrollo | `08-maintenance/agent-brief-builder.md` |
| | Síntesis y análisis cruzado de auditorías | `08-maintenance/cross-audit-synthesis.md` |
| | Flujo de mantenimiento y auditoría de la librería de prompts | `08-maintenance/prompt-library-maintenance-flow.md` |

## Known Merge Decisions

- **Análisis de mercado**: Fusiona escaneo competitivo y benchmark en `competitive-benchmark.md` en Fase 1.
- **Seguridad**: Fusiona endurecimiento y su flujo en `security-hardening-flow.md` en Fase 2.
- **Conversión a CMS**: Combina conversión de contenido estático y su flujo en `cms-editable-content-conversion-flow.md` en Fase 2.
- **Empty States y Errores**: Fusiona cargadores, errores, estados vacíos y microcopy en un único prompt `empty-states-errors-and-microcopy.md` en Fase 3.
- **Internacionalización**: Fusiona auditorías de i18n y su flujo en `i18n-audit-flow.md` en Fase 5.
- **GitHub Presentación**: Combina la auditoría de repositorio y el pulido de presentación en `github-repository-audit-flow.md` en Fase 5.
- **Release Notes**: Une las notas de release, changelog y demo package en `release-notes-changelog-and-demo-package.md` en Fase 6.
- **Soporte y Handoff**: Combina el readiness de entrega y preparación de soporte en `client-handoff-and-support-readiness.md` en Fase 7.
- **Auditoría de Prompts**: Fusiona la auditoría de calidad de prompts e integridad en `prompt-library-maintenance-flow.md` en Fase 8.

## Adding New Prompts

Antes de añadir un nuevo prompt:
1. Comprueba este mapa de cobertura.
2. Consulta [TAXONOMY.md](TAXONOMY.md).
3. Prefiere siempre mejorar un prompt existente en la fase correspondiente en lugar de añadir uno nuevo.
