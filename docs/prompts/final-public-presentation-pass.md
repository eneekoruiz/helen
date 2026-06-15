# Final Public Presentation Pass

Use this prompt when a project is functionally complete and needs a final pass before being shown publicly.

## Prompt

Review this project as a senior engineer preparing it for public presentation.

Goal: leave the project ready to show on GitHub, in a portfolio, or in a client-facing context without changing its functional scope or inventing capabilities.

Work with these rules:

- Do not add fake polish.
- Do not introduce over-engineering.
- Do not rewrite working logic unless a minimal fix is required for correctness.
- Do not make claims that cannot be verified from the repository.
- Prefer small, high-confidence improvements over broad refactors.

Validate and improve the project in this order:

1. README
- Make the README final, concise, and human.
- Remove generic AI-sounding phrasing, filler, and inflated claims.
- Explain what the project is, why it exists, how to run it, and what matters technically.
- Ensure setup, commands, environment requirements, and limitations are accurate.
- Check that all internal and external links work.

2. Public presentation assets
- Confirm the repository includes real screenshots when screenshots add value.
- Reject placeholder, mocked, or obviously outdated images.
- Confirm there is a proper OpenGraph or social preview image if the project benefits from being shared publicly.
- Make sure visual assets match the current product state.

3. GitHub presentation
- Review repository description and topics for clarity and relevance.
- Make sure the repo name, short description, and topics match the actual project.
- Check whether the project should be public, private, archived, or highlighted in a profile based on its current quality and maturity.

4. DeepWiki and supporting documentation
- Confirm DeepWiki exists if this project is meant to be documented publicly.
- Make sure DeepWiki and repository docs do not drift from the actual codebase.
- Keep documentation practical, specific, and easy to scan.

5. Trust and accuracy
- Remove any claim about performance, scale, security, accessibility, SEO, or production readiness that is not supported.
- Flag demo-only behavior clearly.
- Make sure roadmap ideas are separated from shipped functionality.

6. Verification
- Run or verify the standard quality gates that already exist in the repo: build, lint, tests, and type checks if available.
- Report failures precisely.
- Do not add new tooling unless there is a strong reason.

Output format:

- Start with the highest-value fixes.
- Then list presentation risks or missing assets.
- Then provide the minimum set of documentation or metadata changes required.
- End with a short go/no-go recommendation for public presentation.
