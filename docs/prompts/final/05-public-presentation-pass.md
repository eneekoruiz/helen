# Final Public Presentation Pass

Deep audit only. Use this prompt when a project may appear in public: GitHub, portfolio, LinkedIn, client demo, hiring process, launch page, or showcase list.

Purpose: decide whether the project deserves public exposure and whether its external presentation matches reality.

Expected output:

- public-facing blockers;
- visual and showcase gaps;
- additional product-presentation opportunities;
- a hard `PASS`, `PASS WITH CAVEATS`, or `FAIL`.

## Prompt

Review this project as a strict senior engineer, Product Designer, Product Manager, founder, brand reviewer, and technical credibility auditor.

Goal: decide whether this project is genuinely ready to be shown publicly without inventing capabilities, hiding weaknesses, or relying on cosmetic polish.

Audit posture:

- Be hard to satisfy.
- Inspect the repository, docs, product surface, screenshots, metadata, live site if available, scripts, claims, and reproducible checks.
- Reject vague quality signals, generic filler, fake confidence, and unverifiable claims.
- Prefer a smaller truthful project over a larger misleading one.

## Requisitos mínimos obligatorios

Audit these areas at minimum:

1. Product truthfulness
- Determine what the project actually is today.
- Separate working functionality from partial functionality, demo-only flows, stubs, mock data, unfinished UX, and roadmap ideas.
- Flag every mismatch between actual product and public description.

2. README quality
- Check that the first paragraph explains the project quickly and honestly.
- Confirm the README answers: what it does, who it is for, current scope, how to run it, required environment, major tradeoffs, and known limitations.
- Remove inflated wording, empty statements, stale links, and generic selling language.

3. Public presentation assets
- Confirm screenshots are real, current, readable, representative, and useful.
- Reject placeholder images, old UI captures, duplicated screenshots, mocked impossible states, and decorative visuals that teach nothing.
- Check image filenames, location, alt text, sizing, and maintainability.

4. GitHub presentation
- Review repository name, description, topics, website URL, social preview, pinned status, visibility, and archive/public suitability.
- Verify the live demo URL, docs URL, and repo URL reinforce one another.
- Check releases and notes if they exist.

5. Live site and Open Graph
- If the project has a live website, verify basic Open Graph: `og:title`, `og:type`, `og:image`, `og:url`.
- Strongly prefer `og:description`, `og:site_name`, `og:locale`, and `og:image:alt`.
- Confirm social images read well at small sizes and across light/dark surfaces.

6. Verification and proof
- Run or verify real quality gates: build, lint, tests, type checks, preview, accessibility, performance, security, SEO, or other claims where relevant.
- Remove or downgrade any claim that cannot be demonstrated.

7. Public credibility
- Decide whether a recruiter, client, maintainer, peer, or future collaborator would trust the project after opening it cold.
- Recommend not showcasing it if the presentation creates more risk than upside.

## Más allá de estos criterios

Act like a founder with technical taste and a design eye.

Look for the details that make a project feel premium or amateur: weak first impression, generic naming, inconsistent tone, awkward screenshots, poor hierarchy, missing next step, unconvincing demo, inflated claims, visual clutter, rough empty states, unclear audience, or a product that is technically fine but not memorable.

You may recommend sharper positioning, better screenshot sequence, stronger cover image, simpler README structure, removal of weak claims, a small demo script, better metadata, or postponing public exposure.

Do not disguise a weak product with decoration. Public presentation must reveal quality, not compensate for missing substance.

## Useful references

- GitHub social preview docs: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview
- GitHub topics docs: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics
- Open Graph protocol: https://ogp.me/
- GitHub topics directory: https://github.com/topics

## Automatic fail conditions

- README setup is inaccurate or incomplete.
- Screenshots are fake, stale, missing when clearly needed, or materially misleading.
- Repo description, topics, visuals, or metadata overstate the project.
- Claimed features are absent, partial, or not reproducible.
- Secrets, broken links, placeholder copy, or contradictory documentation are present.
- Core verification fails without a documented reason.
- The project is being positioned as stronger, more complete, or more production-ready than it is.
- Public-facing assets are generic, misleading, unreadable, or careless.

## Output format

1. Start with blockers that make the project unfit for public presentation.
2. Then list credibility risks and presentation gaps.
3. Then list "Más allá de estos criterios" opportunities.
4. Provide the minimum changes required to make the project presentable.
5. End with `PASS`, `PASS WITH CAVEATS`, or `FAIL`.
6. Include one sentence explaining whether you would personally attach this project to a professional profile today.
