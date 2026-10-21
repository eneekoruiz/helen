<!-- HELEN:START (managed by helen setup, edit outside this block) -->
# HELEN Quality & Autonomous Execution Rules
HELEN execution contract:
- Preserve intent, exclusions and authorization. Audit-only stays read-only. Reuse context; ask only for essential unknowns.
- Define observable acceptance, baseline and verification before edits. Verify domain outcomes, compatibility and reproducible CI commands; report unavailable checks and residual risks.
- Inspect → act → verify → run one focused discovery pass for high-impact edge cases, security or correctness within authorized scope. Once criteria pass, synthesize results and report optional further recommendations rather than looping indefinitely. Change failing hypotheses; respect cancellation and resource limits.
- Choose the cheapest available capable model when selectable; escalate only on evidenced failure or capability limits. Keep the current agent when a handoff costs more; do not pretend to switch unavailable models.
- Use one agent unless specialist expertise or smaller independent contexts justify delegation overhead; when justified, assign exclusive ownership, integrate and verify. Reuse evidence, batch reads, avoid polling and duplicate output. Write concise English instructions; answer in the user's language. Measure tokens/cost; never claim fixed savings or perfection.
- Maintain runtime-validated types; never weaken checks or bypass git hooks.

## Workflow & Atomic Execution (i-have-adhd Philosophy)
- Break down non-trivial tasks into small, bite-sized, atomic milestones.
- State clearly what is about to be done, execute, and verify with tests or linter.
- Avoid overwhelming walls of speculative text; prioritize runnable code, clear diffs, and rapid feedback loops.

## Codebase Navigation & Architecture
- For deep repository analysis and understanding complex inter-file dependencies, utilize Graphify knowledge graphs to query relationships rather than blind grepping.
- If an architectural dilemma has multiple conflicting paths or reaches a dead end, benchmark contrasting strategies.

## Review & Quality Gates (Git Hygiene & Safety)
- Apply CodeRabbit principles on staged diffs: verify error handling, null safety, resource disposal, and edge cases before declaring completion.
- Suggest clean Conventional Commits (feat:, fix:, refactor:) formatted with precision.
- Git Hygiene & Large Binary Prevention: Enforce strict .gitignore rules in all projects. Never commit or track heavy binaries (*.joblib, *.pth, *.pt, *.bin, *.weights), secrets (.env*), caches (__pycache__, .pytest_cache), or build artifacts (node_modules/, .next/).

## Modern API & Documentation Accuracy
- For modern, fast-moving frameworks (Next.js 15+, React 19, Tailwind CSS v4, Supabase, Astro), never guess or assume deprecated syntax. Consult current documentation and patterns before generating code.

## Windows PowerShell & Filesystem Hygiene (Long Paths)
- Always use non-interactive CLI flags (-y, --yes, --non-interactive).
- Never run long-running or interactive background processes without proper timeouts and status management.
- Ensure proper path escaping and UTF-8 encoding compatibility ($env:PYTHONIOENCODING='utf-8').
- Rutas Largas de Windows (>260 caracteres): En rutas profundamente anidadas (Google Drive o asignaturas), usar el prefijo extendido \\?\ en APIs de filesystem o pasar archivos a través de un directorio temporal corto (C:\Users\User\AppData\Local\Temp o scratch) para herramientas como Chromium/Playwright, evitando errores ERR_FILE_NOT_FOUND.
<!-- HELEN:END -->
