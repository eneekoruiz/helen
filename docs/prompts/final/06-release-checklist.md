# Final Release Checklist

Final gate only. This checklist is intentionally compact, but it is not a substitute for the deeper audits in this folder.

Purpose: confirm that all earlier audit layers are resolved before the project is marked finished.

Use this checklist as a hard release gate at the very end of a project.

Use after:

- the deep audits are already done,
- the fixes from those audits are already applied,
- you need a final compact closeout decision.

Skip if:

- major audit findings are still unresolved,
- the project is not yet at release or archive stage.

Expected output:

- a compact closeout decision,
- a clear stop signal if the project should not be marked finished yet.

## Checklist

- The project works locally from a reasonably clean setup, not just the original developer machine.
- The primary build passes.
- Lint, tests, and type checks pass if the repository includes them.
- The main user flow has been exercised manually after the last meaningful change.
- The README matches the real project, real commands, real setup, and real limitations.
- DeepWiki is added if it adds real value, or intentionally skipped.
- Screenshots are real, current, and worth keeping.
- An OpenGraph or social preview image exists if the project is meant to be shared publicly.
- The GitHub "About" section is complete: description, relevant URL, topics, and social preview.
- If the project has a live website, its page-level Open Graph tags are present and match the actual product.
- GitHub description, topics, and public metadata are specific and accurate.
- `.env.example` or equivalent setup guidance exists if configuration is required.
- No secrets, tokens, private URLs, machine-specific paths, or accidental personal artifacts are committed.
- No feature, performance, security, accessibility, or production-ready claim remains unless it can be demonstrated.
- Demo-only behavior, mocks, seeded content, and known limitations are clearly labeled where necessary.
- The repository is clean enough that publishing it improves trust instead of damaging it.
- The project is genuinely good enough for portfolio, client, or LinkedIn exposure if that is the intended use.

## Release gate

If any core verification fails, any claim is misleading, or the public presentation creates more confidence than the product deserves, do not mark the project as finished.
