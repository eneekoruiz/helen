# Final Closeout Runbook

Use this runbook when you want the prompt collection to behave like a process rather than a pile of files.

## Step 1: Establish truth

Run:

1. [01-code-quality-audit.md](01-code-quality-audit.md)
2. [02-i18n-audit.md](02-i18n-audit.md) if applicable

Purpose:

- find hard engineering defects,
- expose false confidence,
- stop the closeout flow early if the product is still unstable.

Do not continue to presentation work if this stage fails.

## Step 2: Make the repository honest

Run:

1. [03-documentation-audit.md](03-documentation-audit.md)
2. [04-github-repository-audit.md](04-github-repository-audit.md)

Purpose:

- make README and docs truthful,
- clean up repository metadata,
- remove presentation debt that damages trust.

Do not continue to public showcase work if the repository still misrepresents the project.

## Step 3: Decide whether it deserves exposure

Run:

1. [05-public-presentation-pass.md](05-public-presentation-pass.md)

Purpose:

- decide whether the project is genuinely worth showing publicly,
- verify screenshots, social preview, Open Graph, and external presentation quality.

This step is optional only if the project will remain private.

## Step 4: Close the project

Run:

1. [06-release-checklist.md](06-release-checklist.md)

Purpose:

- perform the final release or archive gate,
- confirm that all earlier findings were actually resolved.

## Decision Rules

- If `01` fails, the project is not technically closeable.
- If `03` fails, the repository is not trustworthy yet.
- If `04` fails, the repo should not be used as a public reference.
- If `05` fails, the project may still be useful internally but should not be showcased.
- If `06` fails, do not mark the project as finished.

## Recommended Usage Pattern

- Run one prompt.
- Resolve findings.
- Re-run the same prompt.
- Only move forward once the previous layer is honest.

## Anti-Patterns

Do not:

- run the final checklist first,
- polish screenshots before fixing misleading docs,
- improve GitHub metadata while the code still fails basic verification,
- keep adding prompts instead of using the existing ones properly.
