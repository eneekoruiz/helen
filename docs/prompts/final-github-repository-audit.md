# Final GitHub Repository Audit

Use this prompt when the code is done and the repository itself needs a final presentation and trust pass.

## Prompt

Review this repository as a senior engineer preparing it for a clean and credible GitHub presentation.

Goal: make the repository understandable, verifiable, and worth sharing without bloating it.

Rules:

- Optimize for clarity, trust, and maintenance.
- Do not add badges, workflows, or files that do not provide real value.
- Do not leave placeholders, fake screenshots, or unverifiable claims.

Review these areas:

1. README
- Ensure the README explains the project clearly and in plain technical English.
- Confirm setup, commands, configuration, and current scope are correct.
- Remove generic filler and inflated wording.

2. DeepWiki and docs
- Check whether DeepWiki exists when it adds real value.
- Make sure repository docs are human, current, and easy to verify from the code.
- Remove stale documentation or mark it clearly.

3. Visual presentation
- Confirm screenshots are current and real.
- Check whether an OpenGraph or social preview image should be included for sharing.
- Make sure public-facing visuals match the actual product.

4. Repository metadata
- Review repository description, topics, pinned status, visibility, and archive readiness.
- Ensure metadata helps the right audience understand the project quickly.

5. Trust signals
- Confirm license choice is intentional.
- Check whether `.env.example` exists when environment variables are required.
- Verify no secrets, tokens, private URLs, or local machine artifacts are committed.

6. Automation and maintenance
- Review GitHub Actions, Dependabot, and similar automation only if they add clear value.
- Remove or avoid automation that is noisy, unmaintained, or irrelevant for the project size.

Output format:

- List the top repository presentation problems first.
- Then list trust or maintenance risks.
- Then provide the minimum repo-level changes required before sharing it publicly.
- End with a short verdict: ready, almost ready, or not ready.
