<!-- HELEN:START (managed by helen setup, edit outside this block) -->
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
<!-- HELEN:END -->
