# Final Documentation Audit

Deep audit only. Use this prompt when project documentation could influence onboarding, handoff, public trust, reuse, or release confidence.

Purpose: decide whether the documentation is truthful, current, usable, and valuable enough to keep.

Expected output:

- documentation defects that damage trust;
- minimal doc fixes before release or handoff;
- additional documentation-system opportunities;
- a hard `PASS`, `PASS WITH CAVEATS`, or `FAIL`.

## Prompt

Review this repository as a strict senior engineer, technical writer, product-minded maintainer, and onboarding reviewer.

Goal: determine whether the documentation tells the truth, helps real users, supports maintainers, and avoids pretending the project is more mature than it is.

Audit posture:

- Be suspicious of polished docs that the code does not support.
- Inspect README, docs, comments, examples, scripts, config, screenshots, generated docs, and repository metadata.
- Prefer fewer accurate docs over many noisy docs.
- Treat stale setup steps and misleading examples as real defects.

## Requisitos mínimos obligatorios

Audit these areas at minimum:

1. README truthfulness
- Check whether the README matches the current product, commands, setup, outputs, limitations, and supported scenarios.
- Verify quick start from a clean perspective.
- Remove claims, sections, examples, and badges that no longer match reality.

2. Setup and environment guidance
- Review prerequisites, install steps, environment variables, config files, secrets guidance, first-run expectations, and troubleshooting.
- Flag any setup instruction that assumes hidden local knowledge.
- Check whether `.env.example` or equivalent guidance exists when config is required.

3. Operational and maintenance clarity
- Review docs for build, test, deploy, release, rollback, troubleshooting, known limitations, upgrade paths, and maintenance if those flows matter.
- Flag missing handoff knowledge a future maintainer would need.

4. Internal consistency
- Compare README, docs pages, comments, scripts, config naming, examples, and CLI/API names.
- Flag contradictions, duplicated instructions, outdated screenshots, dead links, stale diagrams, and copy-paste drift.

5. Example quality
- Review code snippets, CLI examples, sample responses, screenshots, diagrams, and templates.
- Ensure examples are realistic, current, reproducible, and aligned with the actual code.

6. Scope honesty
- Separate stable behavior from roadmap ideas, optional modules, experiments, mock data, demo flows, and unsupported scenarios.
- Flag documentation that implies production readiness without evidence.

7. Documentation usefulness
- Check whether each document earns its place.
- Flag pages that exist only for volume, optics, or generic completeness.

## Más allá de estos criterios

Act like a senior technical writer and principal maintainer.

Look for missing mental models, weak onboarding sequence, unclear audience, poor information architecture, naming drift, over-documentation, under-documentation, outdated public positioning, and places where documentation could reduce support burden.

You may recommend deleting docs, merging docs, restructuring docs, adding diagrams, improving examples, sharpening copy, or documenting explicit limitations.

Do not create documentation theater. Every doc must help a real reader make a decision or complete a task.

## Automatic fail conditions

- Core setup docs are wrong or incomplete.
- README claims are stronger than product reality.
- Examples or screenshots are stale or misleading.
- Required configuration guidance is missing.
- Docs contradict scripts, code, or current project structure.
- The docs make handoff harder because they are noisy, generic, or unreliable.

## Output format

1. Start with blocking documentation defects.
2. Then list important drift or trust problems.
3. Then list "Más allá de estos criterios" opportunities.
4. Provide the smallest set of doc changes required before release or handoff.
5. End with `PASS`, `PASS WITH CAVEATS`, or `FAIL`.
6. Include one sentence on whether a new maintainer could onboard from the docs without private context.
