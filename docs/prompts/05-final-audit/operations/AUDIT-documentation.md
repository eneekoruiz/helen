---
action: AUDIT
phase: 05-final-audit
summary: Decide whether docs are truthful, current and useful: README, setup, operations, consistency, examples and scope honesty.
modifies_code: false
---

# Documentation Audit

## Goal

Decide whether the documentation tells the truth, helps real users and maintainers, and avoids pretending the project is more mature than it is. Fewer accurate docs beat many noisy ones.

## Use when

- Documentation influences onboarding, handoff, public trust, reuse or release confidence.

## Requirements

Inspect README, docs, comments, examples, scripts, config, screenshots, generated docs and repository metadata.

1. **README truthfulness:** matches current product, commands, setup, outputs, limits and supported scenarios; quick start works from a clean machine.
2. **Setup:** prerequisites, install steps, environment variables, `.env.example`, secrets guidance, first-run expectations, troubleshooting; nothing assumes hidden local knowledge.
3. **Operations:** build, test, deploy, release, rollback, known limits, upgrade paths where they matter.
4. **Consistency:** README vs docs vs comments vs scripts vs names; contradictions, duplicates, stale screenshots, dead links, drifted diagrams.
5. **Examples:** realistic, current and reproducible.
6. **Scope honesty:** stable behavior separated from roadmap, experiments, mocks and unsupported scenarios.
7. **Usefulness:** every document earns its place.

**Automatic FAIL:** wrong or incomplete core setup; README claims stronger than reality; stale or misleading examples; missing required configuration guidance; docs contradicting code; docs so noisy they make handoff harder.

## Beyond the checklist

Missing mental models, unclear audience, weak information architecture, naming drift. You may recommend deleting, merging or restructuring docs, adding a diagram or documenting explicit limits.

## Limits

- Audit only: do not modify files. No documentation theater.

## Output

1. Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort.
2. The smallest set of doc changes required before release or handoff.
3. Verdict: `PASS`, `PASS WITH CAVEATS` or `FAIL`, and whether a new maintainer could onboard from the docs alone.
