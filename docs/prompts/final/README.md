# Final Project Prompts

This folder contains the end-of-project prompt set.

Use this collection when the project mostly works and you need a serious closeout process before you call it done, ship it, archive it, or attach it to your public profile.

## What This Folder Is For

These prompts are for:

- hard technical audits,
- final documentation truth checks,
- GitHub and presentation readiness,
- final closeout decisions.

These prompts are not for:

- project ideation,
- early architecture planning,
- feature brainstorming,
- cosmetic polishing before the fundamentals are sound.

## Sequence

Run the prompts in this order:

1. [01-code-quality-audit.md](01-code-quality-audit.md)
2. [02-i18n-audit.md](02-i18n-audit.md) if the project is multilingual
3. [03-documentation-audit.md](03-documentation-audit.md) if the repo has meaningful docs
4. [04-github-repository-audit.md](04-github-repository-audit.md)
5. [05-public-presentation-pass.md](05-public-presentation-pass.md) if the project may be shown publicly
6. [06-release-checklist.md](06-release-checklist.md)

## Minimum Useful Path

If the project is small, the minimum serious path is:

1. [01-code-quality-audit.md](01-code-quality-audit.md)
2. [03-documentation-audit.md](03-documentation-audit.md)
3. [06-release-checklist.md](06-release-checklist.md)

## Prompt Map

- [01-code-quality-audit.md](01-code-quality-audit.md)
  Purpose: decide whether the code is technically safe enough to leave alone.
  Use when: feature work is largely done and you want a hard engineering judgment.

- [02-i18n-audit.md](02-i18n-audit.md)
  Purpose: verify that multilingual support is real, coherent, and releasable.
  Use when: the repo supports more than one locale or claims that it does.

- [03-documentation-audit.md](03-documentation-audit.md)
  Purpose: verify that README, setup, examples, and supporting docs tell the truth.
  Use when: documentation could drift from code or from real setup steps.

- [04-github-repository-audit.md](04-github-repository-audit.md)
  Purpose: verify that the repository itself is credible, discoverable, and professionally presented.
  Use when: you are about to share the repo or rely on it as a public artifact.

- [05-public-presentation-pass.md](05-public-presentation-pass.md)
  Purpose: decide whether the project is genuinely good enough to show publicly.
  Use when: the repo may appear in a portfolio, LinkedIn post, client demo, or showcase list.

- [06-release-checklist.md](06-release-checklist.md)
  Purpose: act as the final gate after deeper audits are already done.
  Use when: you want a compact yes or no decision before closing the project.

## Operating Rules

- Never start with presentation if the code and docs are still lying.
- If a deeper audit fails, do not treat later prompts as a substitute.
- `PASS WITH CAVEATS` means the project is not clean yet.
- If more than one prompt fails, fix in this order:
  1. code truth,
  2. documentation truth,
  3. repository presentation,
  4. public showcase polish.

## Runbook

For the practical closeout flow, use [RUNBOOK.md](RUNBOOK.md).
