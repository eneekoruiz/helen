# Project Prompts

This folder contains reusable project prompts grouped by purpose and by moment of use.

Right now, this collection is intentionally biased toward final-stage audits and closeout work. The goal is not to generate more prompts than necessary. The goal is to make it obvious which prompt to use, when to use it, and what decision it should help you make.

## Current Scope

These prompts are for the end of a project, not the beginning.

Use them when:

- the product mostly works,
- the scope is already defined,
- you want a hard final pass,
- you need to decide whether the project is truly ready to ship, show, archive, or keep private.

Do not use them as brainstorming prompts.

## Recommended Order

Run them in this order unless a project is very small:

1. [Final code quality audit](final-code-quality-audit.md)
2. [Final i18n audit](final-i18n-audit.md) if the project is multilingual
3. [Final documentation audit](final-documentation-audit.md) if the repo has non-trivial docs
4. [Final GitHub repository audit](final-github-repository-audit.md)
5. [Final public presentation pass](final-public-presentation-pass.md) if the project may be shown publicly
6. [Final release checklist](final-release-checklist.md)

## Prompt Map

### Technical final audits

- [Final code quality audit](final-code-quality-audit.md)
  Use when: you want a hard technical review before calling the code stable.
  Output: bugs, structural risks, config gaps, test gaps, and a pass or fail decision.

- [Final i18n audit](final-i18n-audit.md)
  Use when: the project supports more than one language or claims multilingual support.
  Output: translation gaps, locale bugs, accessibility problems, and a release judgment.

- [Final documentation audit](final-documentation-audit.md)
  Use when: the project has README, setup docs, architecture notes, or internal docs that could drift from reality.
  Output: stale docs, misleading setup steps, missing handoff details, and a documentation pass or fail.

### Presentation and repository audits

- [Final GitHub repository audit](final-github-repository-audit.md)
  Use when: the code is mostly done and you want the repository itself to look credible, clean, and discoverable.
  Output: repo metadata issues, README problems, visual presentation gaps, and public-profile risks.

- [Final public presentation pass](final-public-presentation-pass.md)
  Use when: the repo may be shared in a portfolio, on LinkedIn, with clients, or as a public reference project.
  Output: final public-facing blockers, screenshots and Open Graph gaps, and a showcase decision.

### Final gate

- [Final release checklist](final-release-checklist.md)
  Use when: you have already done the deeper audits and need a compact release gate.
  Output: a short yes or no decision before calling the project finished.

## How To Use This Folder

- Start with the deepest audit that matches the risk.
- Do not run presentation prompts before the code and docs are honest enough to survive scrutiny.
- Treat `PASS WITH CAVEATS` as a warning, not a success badge.
- If more than one prompt fails, fix the technical truth first, then the docs, then the presentation.

## Rule Of Thumb

- If the question is "is the code actually solid?", start with the code audit.
- If the question is "does the repo tell the truth?", use the documentation or GitHub audit.
- If the question is "would I attach this to my professional profile today?", use the public presentation pass.
- If the question is "can I close this project now?", finish with the release checklist.
