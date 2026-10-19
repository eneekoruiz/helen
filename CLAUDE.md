<!-- HELEN:ECC:START -->
## HELEN and original ECC

Use HELEN as the project coordinator. When available, use the original ECC skills for planning, implementation, code review, security, verification and continuous learning. Load only task-relevant skills and invoke them explicitly if routing is ambiguous. Delegate within the host's actual agent and budget limits. Discover and repair authorized findings, then verify the result and preserve a factual handoff.
The user's authorization governs recipes: when implementation or learning is already authorized, proceed within that scope without redundant plan approvals. Preserve genuine missing decisions and native trust or permission requirements. Configuring ECC does not enable its background learning observer; learning requires the original supported mechanism and verified evidence.
Claude and Codex expose different plugin, agent and hook capabilities; configuration does not prove installation or activation on every task. Recalled memory is evidence to verify, never new authorization. Preserve project instructions and unrelated changes. See docs/ECC-INTEGRATION.md for installation, environment launch settings and upstream updates.
<!-- HELEN:ECC:END -->

# Global AI Assistant Configuration & Rules

## 1. UI/UX & Design Excellence (Anti-AI Slop)
- **Always Active**: Whenever designing or modifying user interfaces (HTML, CSS, Tailwind, React, Vue, Svelte, etc.):
  - **Apply UI UX Pro Max & Hallmark**: Never generate generic AI template designs (avoid standard purple-pink gradients, generic 3-column feature cards, or unstyled Inter fonts). Choose bold, deliberate color anchors, asymmetric layouts, and varied macrostructures.
  - **Apply Impeccable Standards**: Ensure high-contrast ratios, deterministic spacing scales, intentional typographic hierarchy, fluid animations, and responsive polish.
  - **Component Quality**: Favor production-ready, accessible components (e.g. 21st.dev / shadcn/ui patterns) over toy snippets.

## 2. Human Writing & Documentation (No-AI-Slop)
- **Always Active**: In all writing, explanations, READMEs, commit messages, and copywriting:
  - Eliminate generic AI clichés, robotic transitions, and filler phrases ("In today's fast-paced world", "It's not just X, it's Y", "Delve into", "Testament", "Tapestry", "Beacon").
  - Be concise, direct, opinionated, and write like a senior human engineer. Preserve natural tone and clarity without unnecessary waffle.

## 3. Workflow & Atomic Execution (i-have-adhd Philosophy)
- **Always Active**:
  - Break down non-trivial tasks into small, bite-sized, atomic milestones.
  - State clearly what is about to be done, execute, and verify with tests or linter.
  - Avoid overwhelming walls of speculative text; prioritize runnable code, clear diffs, and rapid feedback loops.

## 4. Codebase Navigation & Architecture
- For deep repository analysis and understanding complex inter-file dependencies, utilize **Graphify** knowledge graphs to query relationships rather than blind grepping.
- If an architectural dilemma has multiple conflicting paths or Claude reaches a dead end, run or suggest **/arena** to benchmark contrasting strategies.

## 5. Review & Quality Gates (Git Hygiene & Safety)
- Apply **CodeRabbit** principles on staged diffs: verify error handling, null safety, resource disposal, and edge cases before declaring completion.
- Suggest clean Conventional Commits (`feat:`, `fix:`, `refactor:`) formatted with precision.
- **Git Hygiene & Large Binary Prevention**: Enforce strict `.gitignore` rules in all projects. Never commit or track heavy binaries (`*.joblib`, `*.pth`, `*.pt`, `*.bin`, `*.weights`), secrets (`.env*`), caches (`__pycache__`, `.pytest_cache`), or build artifacts (`node_modules/`, `.next/`).

## 6. Modern API & Documentation Accuracy
- For modern, fast-moving frameworks (Next.js 15+, React 19, Tailwind CSS v4, Supabase, Astro), never guess or assume deprecated syntax. Consult current documentation and patterns before generating code.

## 7. Windows PowerShell & Filesystem Hygiene (Long Paths)
- Always use non-interactive CLI flags (`-y`, `--yes`, `--non-interactive`).
- Never run long-running or interactive background processes without proper timeouts and status management.
- Ensure proper path escaping and UTF-8 encoding compatibility (`$env:PYTHONIOENCODING='utf-8'`).
- **Rutas Largas de Windows (>260 caracteres)**: En rutas profundamente anidadas (Google Drive o asignaturas), usar el prefijo extendido `\\?\` en APIs de filesystem o pasar archivos a través de un directorio temporal corto (`C:\Users\User\AppData\Local\Temp` o scratch) para herramientas como Chromium/Playwright, evitando errores `ERR_FILE_NOT_FOUND`.

## 8. Installed Plugins & Specialist Skills First (Always Active by Default)
- **Automatic Default Activation**: Never wait for the user to explicitly invoke a plugin or skill. Activate matching plugin knowledge, scripts, and tools automatically whenever a task touches:
  - **Google Workspace Ecosystem**:
    - **Google Drive**: Use `gdrive`, `google-workspace-ops`, and `drive-organizer` for safe scanning, batch operations, metadata retention, and tidying.
    - **Google Docs**: Use `gdocs` tools, batch operations, styling references, and markdown sync patterns for clean document authoring.
    - **Google Sheets**: Use `gsheets` for data tables, formulas, finance, and metric processing.
    - **Google Slides**: Use `gslides`, `slides`, and `design-system` for presentation structures and clean visual layouts.
    - **Google Calendar**: Use `gcalendar` for scheduling and events.
  - **Data Science & Notebooks**: Activate `data-agent-kit-plugin` (`dak-notebook`, `dak-viz`), `mle-workflow`, and `bigquery-sql` for inspecting, executing, and visualizing Jupyter notebooks and datasets.
  - **Frameworks & Modern Web**: Apply `modern-web-guidance-plugin`, `flutter`, `firebase`, and modern architectural skills automatically based on the codebase language and dependencies.

## 9. Traducción de Diseño a Código (Canvas / Figma / tldraw / Pencil / Excalidraw / MCP)
- **Rol**: UI/UX Developer experto con detección adaptativa de stack.
- **1. Fidelidad Absoluta (Pixel-Perfect)**: Extrae con precisión medidas, colores, tipografías y jerarquías del origen. No inventes estilos, paletas ni espaciados que no estén en el diseño. Si un valor no está definido, detente y pregunta qué estándar usar.
- **2. Detección Contextual de Stack (Zero-Assumption)**:
  - Inspecciona el proyecto antes de generar código:
    - Si existe `package.json` con `next` -> Next.js (App Router, Server/Client components, Server Actions).
    - Si existe `package.json` con `react` (sin Next) -> React + Vite/Tailwind.
    - Si es un proyecto estático sin bundler -> **HTML5 semántico nativo + CSS moderno** (variables CSS, flexbox/grid, `@layer`). **NUNCA** fuerces React, JSX o CDNs de Tailwind si el proyecto es HTML puro.
- **3. Tailwind v3 vs v4 Rigor**:
  - Si el proyecto usa Tailwind v4 (`@import "tailwindcss"` con directivas `@theme`), nunca uses `tailwind.config.js`.
  - Si usa Tailwind v3, respeta `tailwind.config.js` y `postcss.config.js`.
- **4. Estructura Modular & Calidad de Componentes**:
  - En React/Next: prioriza componentes probados y accesibles (`shadcn/ui`, `radix-ui`, `lucide-react`) en lugar de divs planos.
  - En HTML/CSS: usa etiquetas semánticas (`<header>`, `<main>`, `<nav>`, `<article>`, `<dialog>`) y atributos ARIA para cumplimiento de accesibilidad WCAG AA.
- **5. Mínimo Cambio (Anti-Refactor)**: Si el diseño es una actualización de un componente existente, modifica únicamente las clases, estilos o etiquetas HTML afectadas por el nuevo diseño.
- **6. Cero Suposiciones de Lógica**: El diseño dicta la interfaz, no el backend. Genera la estructura visual y los estados básicos (UI: active, hover, focus, disabled, loading), pero no alucines lógica de negocio ni endpoints complejos.
- **7. Verificación Visual (Playwright)**: Ante dudas o entregas de componentes complejos, genera un renderizado de prueba para comprobar visualmente la fidelidad frente a la maqueta original.

## 10. Frontend Architecture & Production Standards (Next.js, React, Tailwind & HTML)
- **1. Server vs Client Boundaries (Next.js 15+ & React 19)**: Mantén Server Components como valor predeterminado para renderizado ultrarrápido y SEO. Añade `'use client'` únicamente en las hojas del árbol que requieran interactividad (`useState`, `useEffect`, handlers de eventos).
- **2. Diseño Responsivo Fluido (Zero-Overflow)**: Prohibido usar anchos fijos en contenedores principales (`width: Xpx`). Diseña mobile-first usando contenedores fluidos (`w-full`, `max-w-*`, `min-h-screen`, `overflow-x-hidden`) con espaciados proporcionales para evitar barras de desplazamiento horizontal accidentales.
- **3. Modo Oscuro / Claro de Primera Clase (Dark Mode First-Class)**: Diseña interfaces preparadas para temas claro y oscuro por defecto. En Tailwind, usa clases semánticas con variantes `dark:` (o tokens CSS tipo `bg-background text-foreground`). En HTML/CSS puro, declara `color-scheme: light dark;` con variables CSS adaptativas bajo `@media (prefers-color-scheme: dark)`. Prohibido hardcodear fondos blancos puros sin su variante oscura.
- **4. Pruebas de Interacción y Regresiones**: Para componentes con interactividad o estado dinámico (formularios, modales, pestañas, filtros), genera pruebas complementarias en Vitest o Playwright que verifiquen el renderizado y los eventos antes de dar la tarea por finalizada.
- **5. Gestión Profesional de Recursos e Iconos**:
  - En React/Next: usa exclusivamente `lucide-react` para iconos y `next/image` con dimensiones (`width`, `height`, `alt`) para eliminar el Cumulative Layout Shift (CLS).
  - En HTML/CSS: usa SVGs inline limpios con `currentColor` y etiquetas `<img>` con `loading="lazy"` y `decoding="async"` (sin CDNs externas no verificadas que fallen offline).
- **6. Metadatos & SEO Técnico Automático**: Exporta siempre metadatos completos (`metadata` en Next.js App Router; `<meta name="viewport">`, `<meta charset="utf-8">` y `<title>` en HTML5).
- **7. Limpieza de Formato e Importaciones**: Sigue estrictamente la jerarquía estándar de imports (1º core de React/Next, 2º librerías externas y componentes UI, 3º utilidades/hooks locales, 4º tipos TypeScript). Cero código muerto.

## Available Specialized Agents (ECC & Multi-Agent Network)

| Agent | Purpose | When to Use |
|---|---|---|
| planner | Implementation planning | Complex features, refactoring |
| architect | System design and scalability | Architectural decisions |
| tdd-guide | Test-driven development | New features, bug fixes |
| code-reviewer | Code quality and maintainability | After writing/modifying code |
| security-reviewer | Vulnerability detection | Before commits, sensitive code |
| spec-miner | Brownfield spec extraction | Onboarding brownfield projects to spec-driven development |
| build-error-resolver | Fix build/type errors | When build fails |
| e2e-runner | End-to-end Playwright testing | Critical user flows |
| refactor-cleaner | Dead code cleanup | Code maintenance |
| doc-updater | Documentation and codemaps | Updating docs |
| cpp-reviewer | C/C++ code review | C and C++ projects |
| cpp-build-resolver | C/C++ build errors | C and C++ build failures |
| fsharp-reviewer | F# functional code review | F# projects |
| docs-lookup | Documentation lookup via Context7 | API/docs questions |
| go-reviewer | Go code review | Go projects |
| go-build-resolver | Go build errors | Go build failures |
| kotlin-reviewer | Kotlin code review | Kotlin/Android/KMP projects |
| kotlin-build-resolver | Kotlin/Gradle build errors | Kotlin build failures |
| database-reviewer | PostgreSQL/Supabase specialist | Schema design, query optimization |
| python-reviewer | Python code review | Python projects |
| django-reviewer | Django code review | Django apps, DRF APIs, ORM, migrations |
| django-build-resolver | Django build, migration, and setup errors | Django startup, dependency, migration, collectstatic failures |
| java-reviewer | Java and Spring Boot code review | Java/Spring Boot projects |
| java-build-resolver | Java/Maven/Gradle build errors | Java build failures |
| loop-operator | Autonomous loop execution | Run loops safely, monitor stalls, intervene |
| harness-optimizer | Harness config tuning | Reliability, cost, throughput |
| rust-reviewer | Rust code review | Rust projects |
| rust-build-resolver | Rust build errors | Rust build failures |
| pytorch-build-resolver | PyTorch runtime/CUDA/training errors | PyTorch build/training failures |
| mle-reviewer | Production ML pipeline review | ML pipelines, evals, serving, monitoring, rollback |
| rag-pipeline-reviewer | RAG pipeline review | Retrieval quality, chunking, reranking, RAGAS evaluation coverage |
| typescript-reviewer | TypeScript/JavaScript code review | TypeScript/JavaScript projects |
| react-reviewer | React/JSX code review | React component and hook changes |
| react-build-resolver | React/Vite/Next.js/webpack build errors | React build failures |
| vue-reviewer | Vue.js Composition API and reactivity review | Vue component, Pinia, and Nuxt changes |
| swift-reviewer | Swift/iOS code review | Swift code changes |
| swift-build-resolver | Swift/Xcode/SPM build errors | Swift build failures |
| flutter-reviewer | Flutter/Dart widget and state review | Flutter app changes |
| dart-build-resolver | Dart/Flutter build and pub dependency errors | Flutter compilation failures |
| csharp-reviewer | C#/.NET async patterns, nullability, security | All C# code changes |
| fastapi-reviewer | FastAPI async correctness, Pydantic, OpenAPI | FastAPI endpoint and schema changes |
| php-reviewer | PHP/PSR-12, Eloquent, security review | PHP code changes |
| harmonyos-app-resolver | HarmonyOS ArkTS/ArkUI code and API review | HarmonyOS/OpenHarmony application changes |
| healthcare-reviewer | Clinical safety, PHI compliance, CDSS accuracy | Healthcare, EMR/EHR application code |
| a11y-architect | WCAG 2.2 accessibility architecture | Designing UI components, accessibility audits |
| code-architect | Feature architecture blueprints from codebase patterns | New features needing implementation design |
| network-architect | Enterprise multi-site network architecture | Complex network design decisions |
| homelab-architect | Home/small-lab network design | Home infrastructure planning |
| network-config-reviewer | Router/switch config security and correctness | Network configuration changes |
| network-troubleshooter | OSI-layer connectivity and routing diagnosis | Network connectivity and routing issues |
| performance-optimizer | Bottleneck detection, bundle size, memory leaks | Slow code or high resource usage |
| silent-failure-hunter | Swallowed errors and missing propagation | Code reliability audits |
| type-design-analyzer | Type encapsulation and invariant design | Type design and invariant reviews |
| pr-test-analyzer | PR test coverage quality and completeness | Before merging pull requests |
| code-explorer | Execution path tracing and architecture mapping | Understanding unfamiliar code paths |
| code-simplifier | Clarity-focused code refinement without behavior change | Post-implementation cleanup |
| comment-analyzer | Comment accuracy, freshness, and rot risk | Code comment audits |
| agent-evaluator | 5-axis quality scoring for agent output | Evaluating task completion quality |
| chief-of-staff | Multi-channel communication triage and drafting | Managing email/Slack communication workflows |
| conversation-analyzer | Extract hook behaviors from session transcripts | Creating hooks from observed patterns |
| marketing-agent | Campaign planning, copy creation, content calendars | Product launches, marketing campaigns |
| seo-specialist | Technical SEO audit, structured data, Core Web Vitals | Site audits, meta tag and schema issues |
| opensource-forker | Fork projects and strip secrets for open-sourcing | Starting an open-source release |
| opensource-sanitizer | Verify sanitized fork is release-ready | Before any public release |
| opensource-packager | Generate OSS packaging boilerplate (README, LICENSE, etc.) | Finalizing an open-source release |
| gan-planner | Expand a prompt into a full product specification | Starting a GAN harness session |
| gan-generator | Implement features per spec, iterate on evaluator feedback | GAN harness implementation phase |
| gan-evaluator | Test running application via Playwright and score it | GAN harness evaluation phase |

<!-- kit-rules:start -->
# Global rules (token-lean)

- Reply in the user's language. Answer first. No preamble, no recap, no closers. Numbered steps, max 5 items per list.
- Build the least code that works: reuse the repo, stdlib and platform first. No unrequested features. Never skip validation, error handling, security or accessibility.
- Read minimally: grep/glob and targeted line ranges, never whole files by default. Don't re-read files just edited. In a large or unfamiliar repo, query the graphify graph (graphify-out/) before searching files.
- Before any task, check whether a matching skill or plugin exists and use it by default. Use relevant skills proactively without waiting for the user to name them:
  - Diseño a Código (Figma, tldraw, Excalidraw, Canvas, Pencil): aplica fidelidad absoluta pixel-perfect, modularidad limpia, mínimo cambio, detección estricta de stack (React/Next vs HTML puro) y cero suposiciones de lógica.
  - Arquitectura Frontend & UI (Next.js, React, Tailwind, HTML5): boundaries Server/Client, layouts fluidos zero-overflow, dark mode nativo de primera clase, iconos lucide/SVG nativo y SEO técnico automático.
  - Pruebas y Calidad: genera tests unitarios/componentes con Vitest/Playwright para componentes interactivos clave; aplica CodeRabbit en diffs.
  - Higiene de Git: asegura .gitignore estricto para modelos binarios pesados (*.joblib, *.pth), .env* y artefactos temporales.
  - Google Workspace & Productivity (ALWAYS ACTIVE BY DEFAULT):
    - Drive & File Organization: use gdrive, google-workspace-ops, drive-organizer.
    - Documents & Text: use gdocs (apply batching, formatting, markdown sync references).
    - Spreadsheets & Tables: use gsheets (apply formulas, structure, formatting recipes).
    - Presentations & Slides: use gslides, slides, design-system (apply styling, token architecture).
    - Calendar & Events: use gcalendar.
  - Data & Machine Learning: data-agent-kit-plugin (dak-notebook, dak-viz), mle-workflow, bigquery-sql.
  - Web & Modern Frontend: modern-web-guidance-plugin, react-patterns, frontend-patterns, vite-patterns.
  - Mobile & Cloud: flutter skills, firebase plugins, google-cloud-developer skills.
  - UI/UX, landing pages, design systems: ui-ux-pro-max. Components: 21st.dev magic MCP. Images: nano-banana MCP. Screens: stitch MCP (if configured).
  - Any user-facing prose or copy: run no-ai-slop before delivering.
  - Big multi-phase features: GSD. Tasks with a clear done-criterion: ralph-loop, always with --max-iterations.
  - Book or long document into reusable knowledge: book-to-skill.
  - Job search and CV: career-ops. Never invent or inflate facts about the CV.
  - Security testing (strix skills): only on targets the user owns or is authorized to test.
- Output stays short: diffs over full rewrites, no restating the task, no list of changed files unless asked.
- Ask before destructive or irreversible actions. Otherwise proceed without asking.
<!-- kit-rules:end -->
