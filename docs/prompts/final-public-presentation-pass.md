# Final Public Presentation Pass

Use this prompt when a project is functionally complete and is about to be shown publicly.

## Prompt

Review this project as a strict senior engineer preparing it for public presentation.

Goal: decide whether this project is genuinely ready to be shown on GitHub, in a portfolio, on LinkedIn, or to clients without changing its functional scope, inventing capabilities, or hiding weaknesses.

Audit posture:

- Be hard to satisfy.
- Assume the project is not ready until the repository proves otherwise.
- Reject vague quality signals, cosmetic polish, and unverifiable claims.
- Prefer a smaller truthful project over a larger misleading one.
- Do not suggest broad rewrites unless a blocking credibility problem requires it.

Non-negotiable rules:

- Do not make any claim that cannot be verified from the repo, the product, or reproducible checks.
- Do not present roadmap items, prototypes, placeholders, or aspirational architecture as shipped value.
- Do not tolerate AI-sounding README language, generic filler, fake confidence, or inflated adjectives.
- Do not let the project pass if core links, setup steps, screenshots, or repo metadata are stale.
- If the project is not good enough for public presentation, say so clearly.

Review in this order:

1. Product truthfulness
- Determine what the project actually is today, not what it wants to be.
- Separate working functionality from partial functionality, demo-only flows, stubs, mock data, and unfinished UX.
- Identify anything that would mislead a recruiter, client, maintainer, or reviewer.
- Flag every mismatch between the actual product and the way it is described.

2. README quality
- Make the README concise, direct, and human.
- Check that the first paragraph explains the product in plain technical English.
- Confirm the README answers: what it does, who it is for, current scope, how to run it, required environment, major tradeoffs, and known limitations if they matter.
- Remove inflated wording, empty statements, and generic selling language.
- Verify setup steps from a clean perspective: commands, environment variables, prerequisites, and expected outputs.
- Check that all links work and point to real, current resources.
- Ensure section order reflects how a real reader evaluates the project.

3. Public presentation assets
- Confirm screenshots are real, current, readable, and representative of the actual product.
- Reject placeholder images, old UI captures, duplicated screenshots, and mocked states that are not achievable.
- Check that image filenames, placement, and alt text are maintainable.
- Confirm an OpenGraph or social preview image exists if public sharing is a real use case.
- Verify that the social preview reflects the actual product name and look.

4. GitHub presentation
- Review repository name, description, topics, website URL, and pinned status.
- Ensure the short description is specific and accurate.
- Remove topics that are trendy but not truly relevant.
- Decide whether the repo should be public, private, archived, or simply left unpromoted.
- If the project is weak, unfinished, outdated, redundant, or misleading, recommend not showcasing it.

5. DeepWiki and supporting docs
- Confirm DeepWiki exists if this repo is meant to be presented seriously.
- Verify that DeepWiki matches the current repository and is not a stale mirror of an earlier state.
- Check whether additional docs are useful or merely document noise.
- Remove or flag documentation that increases apparent completeness without improving understanding.

6. Verification and proof
- Run or verify the repo's real quality gates: build, lint, tests, type checks, preview, or other existing validation commands.
- Demand evidence for each major claim, especially around accessibility, performance, security, production readiness, scale, SEO, and reliability.
- If a claim cannot be demonstrated, downgrade or remove it.
- Confirm links, badges, commands, screenshots, and docs all refer to the current state of the project.

7. Final showcase judgment
- Decide whether the project is:
  - ready to present publicly now,
  - usable only with explicit caveats,
  - not ready for public presentation.
- Be conservative. If the project would create distrust in a serious review, fail it.

Automatic fail conditions:

- README setup is inaccurate or incomplete.
- Screenshots are fake, stale, missing when clearly needed, or materially misleading.
- Repo description or topics overstate the project.
- Claimed features are absent, partial, or not reproducible.
- The repo includes obvious secrets, broken links, placeholder copy, or contradictory documentation.
- The build or other core verification step fails without a documented reason.
- The project is being positioned as stronger, more complete, or more production-ready than it really is.

Output format:

- Start with blocking issues that make the project unfit for public presentation.
- Then list credibility risks and weaker but still important presentation gaps.
- Then provide the minimum set of changes required to make the project presentable.
- End with a verdict of `PASS`, `PASS WITH CAVEATS`, or `FAIL`.
- Include one sentence explaining whether you would personally be comfortable attaching this repo to a professional profile today.
