# Canonical Prompt Coverage Map

This file explains what exists, what each area is for, and where not to create duplicate prompts.

## Rule

If a new request fits one of these canonical intentions, improve the existing prompt or flow instead of adding another one.

## Canonical Intentions mapped to Project Moments

| Momento / Fase | Intención Canónica | Archivo Correspondiente |
|---|---|---|
| **01-start-project** | Escaneo inicial de riesgos del proyecto | `01-start-project/audit-initial-project-risk-scan.md` |
| | Auditoría de metodología y puntos ciegos | `01-start-project/audit-methodology-and-blind-spots.md` |
| | Auditoría de arquitectura, operaciones y riesgos | `01-start-project/audit-architecture-operations-and-risk.md` |
| | Auditoría de onboarding del desarrollador | `01-start-project/audit-developer-onboarding.md` |
| | Análisis competitivo y benchmarking | `01-start-project/research-competitive-benchmark.md` |
| | Priorización del roadmap y ROI | `01-start-project/plan-roadmap-roi-prioritization.md` |
| | Estrategia de ciclo de vida tecnológico | `01-start-project/plan-technology-lifecycle-strategy.md` |
| | Flujo completo de análisis de mercado | `01-start-project/research-market-analysis-flow.md` |
| **02-building** | Pase de simplificación y código limpio | `02-building/apply-safe-clean-code-simplification-pass.md` |
| | Flujo de hardening y seguridad básica | `02-building/apply-security-hardening-flow.md` |
| | Flujo de conversión a CMS editable | `02-building/apply-cms-editable-content-conversion-flow.md` |
| | Auditoría del modelo de contenido y flujo editorial | `02-building/audit-content-model-and-editorial-workflow.md` |
| | Auditoría del modelo de datos e integridad del dominio | `02-building/audit-data-model-and-domain-integrity.md` |
| | Auditoría de integración de APIs y contratos | `02-building/audit-api-integration-and-contract.md` |
| | Auditoría de scripts y automatizaciones | `02-building/audit-automation-and-scripts.md` |
| | Flujo de pase de código limpio | `02-building/apply-clean-code-pass-flow.md` |
| | Flujo de auditoría de arquitectura y código limpio | `02-building/audit-clean-code-architecture-flow.md` |
| | Checkpoint de compilación y build | `02-building/audit-build-and-compile-checkpoint.md` |
| | Checkpoint de linter y chequeo de tipos | `02-building/audit-lint-and-typecheck-checkpoint.md` |
| | Checkpoint de suite de tests unitarios | `02-building/audit-test-suite-checkpoint.md` |
| **03-finish-features**| Auditoría de UX de producto y calidad premium | `03-finish-features/audit-product-ux-and-premium-quality.md` |
| | Auditoría de onboarding y activación de usuario | `03-finish-features/audit-onboarding-activation.md` |
| | Pase de estados vacíos, errores y microcopy | `03-finish-features/apply-empty-states-errors-and-microcopy.md` |
| | Pase de detalles y pulido premium | `03-finish-features/apply-premium-detail-pass.md` |
| | Auditoría de diseño visual y excelencia para premios | `03-finish-features/audit-product-design-and-awards-visual-excellence.md` |
| | Auditoría de visuales animados y 3D, rendimiento e integración | `03-finish-features/audit-animated-and-3d-visuals-performance-safety-and-integration.md` |
| | Auditoría de experiencia de usuario primaria | `03-finish-features/audit-primary-user-experience.md` |
| | Pase de pulido visual premium | `03-finish-features/apply-premium-visual-polish-pass.md` |
| | Pase de conversión cinemática y visuales 3D | `03-finish-features/apply-cinematic-and-3d-visual-conversion.md` |
| | Pase de diseño responsive | `03-finish-features/apply-responsive-pass.md` |
| | Pase de accesibilidad básica | `03-finish-features/apply-basic-accessibility-pass.md` |
| | Pase de rendimiento básico | `03-finish-features/apply-basic-performance-pass.md` |
| | Flujo de pase visual y UX | `03-finish-features/apply-ux-visual-pass-flow.md` |
| | Flujo de revisión de diseño estilo Awwwards/SOTY | `03-finish-features/audit-awwwards-soty-design-review-flow.md` |
| | Flujo completo de pulido guiado | `03-finish-features/apply-full-polish-flow.md` |
| | Checkpoint de regresión visual y de UX | `03-finish-features/audit-visual-ux-regression-checkpoint.md` |
| **04-before-production** | QA adversarial y casos de borde | `04-before-production/audit-adversarial-qa-and-edge-cases.md` |
| | Auditoría de stress, escala y costos | `04-before-production/audit-stress-scale-and-cost.md` |
| | Auditoría de privacidad, legal y compliance | `04-before-production/audit-privacy-legal-and-compliance.md` |
| | Auditoría e instrumentación de observabilidad | `04-before-production/audit-observability-instrumentation.md` |
| | Auditoría de métricas y analíticas de producto | `04-before-production/audit-product-analytics-and-metrics.md` |
| | Verificación rápida de build y tests | `04-before-production/audit-fast-build-test-verification.md` |
| | Auditoría final de SEO | `04-before-production/audit-final-seo.md` |
| | Flujo de prefinal hardening | `04-before-production/apply-prefinal-hardening-flow.md` |
| | Checkpoint de riesgos de seguridad | `04-before-production/audit-security-risk-checkpoint.md` |
| **05-final-audit** | Auditoría de calidad de código final | `05-final-audit/audit-code-quality.md` |
| | Flujo de auditoría y pulido de internacionalización (i18n) | `05-final-audit/audit-i18n-flow.md` |
| | Auditoría de documentación técnica | `05-final-audit/audit-documentation.md` |
| | Flujo de auditoría y pulido de repositorio GitHub | `05-final-audit/audit-github-repository-flow.md` |
| | Pase de presentación pública del proyecto | `05-final-audit/apply-public-presentation-pass.md` |
| | Runbook de despliegue y operaciones | `05-final-audit/generate-runbook.md` |
| **06-release** | Checklist detallada de release | `06-release/plan-release-checklist.md` |
| | Generación de changelog, release notes y demo package | `06-release/generate-release-notes-changelog-and-demo-package.md` |
| | Flujo de candidato a release (Release Candidate) | `06-release/apply-release-candidate-flow.md` |
| | Checkpoint de preparación de release | `06-release/audit-release-readiness-checkpoint.md` |
| | Automatización de releases y changelogs | `06-release/apply-automated-release-and-changelog-workflows.md` |
| **07-client-handoff**| Preparación de handoff a cliente y soporte | `07-client-handoff/audit-client-handoff-and-support-readiness.md` |
| | Auditoría de textos, tono de marca e claims | `07-client-handoff/audit-content-copy-brand-and-claims.md` |
| | Auditoría de enlaces, formularios y CTAs | `07-client-handoff/audit-links-forms-ctas-and-conversion-paths.md` |
| | Auditoría de rendimiento y alt text en imágenes/videos | `07-client-handoff/audit-media-assets-alt-text-and-performance.md` |
| | Auditoría de smoke tests de navegador y demo lista | `07-client-handoff/audit-browser-smoke-test-and-demo-readiness.md` |
| | Flujo de entrega de sitio de cliente (last mile) | `07-client-handoff/apply-last-mile-client-site-delivery-flow.md` |
| | Flujo completo de entrega a cliente | `07-client-handoff/apply-client-delivery-flow.md` |
| **08-maintenance** | Auditoría de ciclo de vida de datos y backups | `08-maintenance/audit-data-lifecycle-backup-and-recovery.md` |
| | Auditoría de migraciones, importación/exportación y lock-in | `08-maintenance/audit-migrations-import-export-lock-in.md` |
| | Auditoría de modelos de crecimiento | `08-maintenance/audit-growth-model.md` |
| | Auditoría de SEO programático y contenido | `08-maintenance/audit-programmatic-seo-and-content.md` |
| | Diseño de Quality Operating System | `08-maintenance/plan-quality-operating-system-design.md` |
| | Generador de briefs para agentes de desarrollo | `08-maintenance/generate-agent-brief-builder.md` |
| | Síntesis y análisis cruzado de auditorías | `08-maintenance/audit-cross-audit-synthesis.md` |
| | Revisión anual de presencia profesional, portfolio y marca personal | `08-maintenance/audit-yearly-professional-presence-review.md` |
| | Flujo de mantenimiento y auditoría de la librería de prompts | `08-maintenance/apply-prompt-library-maintenance-flow.md` |
| | Configuración de Dependabot y automantenimiento | `08-maintenance/apply-dependabot-and-auto-maintenance.md` |
| | Auditoría de gobernanza y compliance del repositorio | `08-maintenance/audit-repository-governance-and-compliance.md` |
| | Mantenimiento de showcase y portfolio | `08-maintenance/apply-portfolio-showcase-maintenance.md` |
| | Mantenimiento de marca personal del desarrollador | `08-maintenance/apply-personal-branding-and-developer-credibility.md` |
| | Auditoría de UX, enrutamiento, plataformas y offline | `08-maintenance/audit-password-manager-ux-routing-and-offline.md` |
| **09-future-knowledge**| Auditoría de onboarding para desarrolladores futuros | `09-future-knowledge/audit-future-developer-onboarding.md` |
| | Auditoría de capacidad de recuperación y backups | `09-future-knowledge/audit-self-recovery.md` |
| | Auditoría de redundancia de equipo y Factor Autobús | `09-future-knowledge/audit-bus-factor.md` |
| | Análisis de brechas de documentación y arquitectura | `09-future-knowledge/audit-knowledge-gap.md` |
| | Auditoría de código legacy y resistencia a actualizaciones | `09-future-knowledge/audit-legacy-resistance.md` |
| | Auditoría de propiedad de dominios y cuentas a largo plazo | `09-future-knowledge/audit-long-term-ownership-review.md` |
| | Bitácora de decisiones arquitectónicas (ADRs) | `09-future-knowledge/generate-decision-log.md` |
| | Configuración de contexto y reglas para asistentes IA | `09-future-knowledge/generate-ai-context.md` |
| | Ejecución de archivado y preservación de conocimiento | `09-future-knowledge/apply-automated-knowledge-preservation.md` |

## Known Merge Decisions

- **Análisis de mercado**: Fusiona escaneo competitivo y benchmark en `research-competitive-benchmark.md` en Fase 1.
- **Seguridad**: Fusiona endurecimiento y su flujo en `apply-security-hardening-flow.md` en Fase 2.
- **Conversión a CMS**: Combina conversión de contenido estático y su flujo en `apply-cms-editable-content-conversion-flow.md` en Fase 2.
- **Empty States y Errores**: Fusiona cargadores, errores, estados vacíos y microcopy en un único prompt `apply-empty-states-errors-and-microcopy.md` en Fase 3.
- **Internacionalización**: Fusiona auditorías de i18n y su flujo en `audit-i18n-flow.md` en Fase 5.
- **GitHub Presentación**: Combina la auditoría de repositorio y el pulido de presentación en `audit-github-repository-flow.md` en Fase 5.
- **Release Notes**: Une las notas de release, changelog y demo package en `generate-release-notes-changelog-and-demo-package.md` en Fase 6.
- **Soporte y Handoff**: Combina el readiness de entrega y preparación de soporte en `audit-client-handoff-and-support-readiness.md` en Fase 7.
- **Auditoría de Prompts**: Fusiona la auditoría de calidad de prompts e integridad en `apply-prompt-library-maintenance-flow.md` en Fase 8.

## Adding New Prompts

Antes de añadir un nuevo prompt:
1. Comprueba este mapa de cobertura.
2. Consulta [TAXONOMY.md](TAXONOMY.md).
3. Prefiere siempre mejorar un prompt existente en la fase correspondiente en lugar de añadir uno nuevo.

## Ultra Premium 40K Expansion

La capa 40K se concentra en Fase 3 porque su objetivo es elevar experiencias funcionales a direccion creativa, conversion, motion, 3D y craft premium. El punto de entrada es `[INIT] Director Creativo (Orquestador 40K).md`.

| Intencion Canonica | Archivo Correspondiente |
|---|---|
| Orquestador de direccion creativa 40K | `[INIT] Director Creativo (Orquestador 40K).md` |
| Generacion de shaders WebGPU/WebGL premium | `03-finish-features/generate-webgpu-shader-experience.md` |
| Sistema de assets 3D y motion templates | `03-finish-features/generate-motion-template-asset-system.md` |
| Sistema de mockups high-end integrados | `03-finish-features/generate-premium-mockup-layout-system.md` |
| Secuencias scroll/video scrubbing | `03-finish-features/generate-scroll-video-scrubbing-sequence.md` |
| Transiciones nativas de estado, tema y pagina | `03-finish-features/generate-view-transition-state-system.md` |
| Integracion 3D rapida con Spline | `03-finish-features/generate-spline-rapid-interactive-embed.md` |
| Arquitectura 3D custom con React Three Fiber/Drei | `03-finish-features/generate-3d-react-fiber-premium-architecture.md` |
| Integracion de librerías premium de componentes | `03-finish-features/generate-premium-component-library-integration.md` |
| Hero premium orientado a conversion | `03-finish-features/generate-conversion-led-hero-system.md` |
| Direccion editorial premium | `03-finish-features/generate-editorial-art-direction-system.md` |
| Configuradores o simuladores inmersivos | `03-finish-features/generate-immersive-product-configurator.md` |
| Landing personalizada por segmento o intención | `03-finish-features/generate-ai-personalized-landing-flow.md` |
| Pulido cinematico de cargas y transiciones | `03-finish-features/enhance-cinematic-loading-and-page-transition-polish.md` |
| Pase CRO y profundidad de CTAs | `03-finish-features/enhance-cro-friction-removal-and-cta-depth.md` |
| Microinteracciones y detalle sensorial | `03-finish-features/enhance-microinteraction-sensory-detail-pass.md` |
| Auditoria de direccion creativa y conversion 40K | `03-finish-features/audit-40k-creative-direction-and-conversion.md` |
| Auditoria de presupuesto de rendimiento cinematico | `03-finish-features/audit-performance-budget-for-cinematic-sites.md` |
| Auditoria anti-rastro IA y craft humano | `03-finish-features/audit-ai-trace-erasure-and-human-craft.md` |
| Orquestador de Ejecución Visual Ultra-Premium 40K | `03-finish-features/apply-40k-visual-craft-flow.md` |
| Auditoría ergonómica, targets táctiles y errores | `03-finish-features/audit-ux-strategist-core.md` |
| Inyección de POV visual y tokens HSL con taste | `03-finish-features/enhance-taste-visual-pov.md` |
| Generador de bloques interactivos React/Tailwind | `03-finish-features/generate-premium-web-artifacts.md` |
| Transiciones premium de dropdowns y modales | `03-finish-features/enhance-motion-polish-and-transitions.md` |
| Animaciones de timeline y scrubbing en scroll | `03-finish-features/enhance-scroll-linked-sequences.md` |
| Transiciones entre páginas con View Transitions API | `03-finish-features/enhance-native-view-transitions.md` |
| Pretexting matemático y layouts estilo revista | `03-finish-features/enhance-dynamic-typography-pretext.md` |
| Lienzos líquidos y shaders interactivos WebGPU | `03-finish-features/generate-webgpu-shaders.md` |
| Automatizador de banners y capturas de marketing | `03-finish-features/generate-app-store-canvas-exports.md` |
| Plantillas de composición y motion en 3D | `03-finish-features/generate-3d-motion-templates.md` |
| Integración de mockups de dispositivos vectoriales/3D | `03-finish-features/generate-integrated-premium-mockups.md` |
| Matriz y configuración Spline vs React Three Fiber | `03-finish-features/generate-3d-spline-vs-react-three-fiber.md` |
| Integración de componentes Aceternity/Magic UI | `03-finish-features/generate-modern-ui-libraries-aceternity-magic-ui.md` |
| Auditoría estricta de FPS y Layout Shifts (CLS) | `03-finish-features/audit-animation-performance-and-fps.md` |
| Diseño de micro-feedback de audio e inmersión | `03-finish-features/enhance-ui-audio-micro-feedback.md` |
| Sub-orquestador CLI Creative Director 40K | `01-start-project/init-director-creativo-orquestador-40k.md` |

