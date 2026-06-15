# Final Documentation Audit

Use this prompt when a project is nearly complete and its documentation needs a strict final audit.

Use after:

- the main product flow works,
- the core code paths are mostly stable,
- the project already has meaningful docs that could drift from reality.

Skip if:

- the project is tiny and only needs a small README,
- there is no real documentation surface beyond a basic setup note.

## Prompt

Review this repository as a strict senior engineer performing a final documentation audit.

Goal: determine whether the documentation is truthful, current, usable, and good enough for handoff, reuse, or public inspection without pretending the project is more mature than it is.

Audit posture:

- Be suspicious of polished docs that the code does not support.
- Treat stale setup steps and misleading examples as real defects.
- Prefer fewer accurate docs over many noisy docs.
- Fail the audit if the documentation makes the project look easier, safer, or more complete than it really is.

Audit these areas:

1. README truthfulness
- Check whether the README matches the current product, commands, setup, and limitations.
- Verify that quick start steps are still correct from a clean perspective.
- Remove claims, sections, or examples that no longer match the repository.

2. Setup and environment guidance
- Review prerequisites, install steps, environment variables, config files, secrets guidance, and first-run expectations.
- Flag any setup instruction that assumes hidden local knowledge.
- Check whether `.env.example`, sample configs, or setup docs are complete if the project depends on them.

3. Operational and maintenance clarity
- Review docs for build, test, deploy, release, rollback, troubleshooting, and known limitations if those flows matter for the project.
- Flag missing handoff knowledge that a future maintainer would need.
- Check whether docs explain failure recovery where the product can break in non-obvious ways.

4. Internal consistency
- Compare README, docs pages, comments, scripts, and config naming.
- Flag contradictions, duplicated instructions, outdated screenshots, dead links, stale architecture notes, and copy-paste drift.
- Check whether terminology is consistent across the repository.

5. Example quality
- Review code snippets, CLI examples, sample responses, screenshots, and diagrams.
- Ensure examples are realistic, current, and aligned with the actual code.
- Reject examples that are fictional, stale, or too idealized to help.

6. Scope honesty
- Make sure roadmap ideas, optional modules, experimental features, and unsupported scenarios are clearly separated from stable behavior.
- Flag documentation that quietly upgrades experimental work into implied production readiness.

7. Documentation usefulness
- Check whether each document earns its place.
- Flag pages that exist only for volume, optics, or generic completeness.
- Prefer concise docs that answer real questions over broad documentation sprawl.

Automatic fail conditions:

- Core setup docs are wrong or incomplete.
- README claims are stronger than the product reality.
- Examples or screenshots are stale or misleading.
- Environment or configuration guidance omits required steps.
- Documentation contradicts scripts, code, or current project structure.
- The docs make handoff harder because they are noisy, generic, or unreliable.

Output format:

- Start with blocking documentation defects.
- Then list important drift or trust problems.
- Then provide the smallest set of doc changes required before release or handoff.
- End with `PASS`, `PASS WITH CAVEATS`, or `FAIL`.
- Include one sentence on whether a new maintainer could onboard from the docs without private context.
