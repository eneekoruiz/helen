# Final Public Presentation Pass

Use this prompt when a project is functionally complete and is about to be shown publicly.

Use after:

- the product already works,
- the repository has survived the deeper technical and documentation audits,
- you are deciding whether to present it outside your own machine.

Skip if:

- the project is intentionally private,
- the code and docs are still unstable enough that public presentation is premature.

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
- If the project has a live site, verify that the site itself also exposes proper Open Graph metadata, not just the GitHub repository preview.
- Check whether a short demo GIF or video preview would help or merely add noise. Prefer static screenshots unless motion explains something important.
- Ensure screenshots tell a coherent story: landing view, primary workflow, and one detail view if relevant.
- Reject decorative visuals that look polished but teach nothing about the product.

4. GitHub presentation
- Review repository name, description, topics, website URL, and pinned status.
- Ensure the short description is specific and accurate.
- Remove topics that are trendy but not truly relevant.
- Decide whether the repo should be public, private, archived, or simply left unpromoted.
- If the project is weak, unfinished, outdated, redundant, or misleading, recommend not showcasing it.
- Review the repository "About" box as a product card:
  - description,
  - website or live demo URL,
  - topics,
  - social preview image.
- Check whether the live demo URL, docs URL, and repo URL form a clean triangle: each one should reinforce the others and none should feel stale or abandoned.
- If the project has releases, check whether release titles and notes make the project look maintained rather than chaotic.

5. DeepWiki and supporting docs
- Confirm DeepWiki exists if this repo is meant to be presented seriously.
- Verify that DeepWiki matches the current repository and is not a stale mirror of an earlier state.
- Check whether additional docs are useful or merely document noise.
- Remove or flag documentation that increases apparent completeness without improving understanding.

6. README presentation quality
- Review the README as a marketing surface without allowing marketing lies.
- Check whether the first screenful is visually clean and immediately informative.
- Decide whether the README should include:
  - a hero image or product screenshot,
  - a concise feature list,
  - a quick start block,
  - a demo link,
  - a short architecture or stack note,
  - a limitations section,
  - a screenshot gallery,
  - a release or status note.
- Reject README decoration that weakens trust: excessive badges, giant emoji walls, stock phrases, vague claims, or huge comparison tables with no evidence.
- Prefer one strong screenshot over a cluttered image dump.
- Check whether image widths, ordering, captions, and spacing make the README pleasant to scan on GitHub desktop and mobile.

7. Visual branding and shareability
- Decide whether the project needs a simple visual kit for public presentation:
  - repository social preview image,
  - website Open Graph image,
  - favicon or app icon consistency,
  - README hero image,
  - screenshot folder naming convention.
- If visual assets are needed, require them to be consistent in title, color direction, and product naming.
- Ensure the visual identity makes the project easier to remember, not merely more decorative.
- Reject gradients, mock devices, or abstract artwork that disguise a weak product.
- If the project has no UI, ensure the social preview still communicates what it is through a clean title card or diagram.

8. Verification and proof
- Run or verify the repo's real quality gates: build, lint, tests, type checks, preview, or other existing validation commands.
- Demand evidence for each major claim, especially around accessibility, performance, security, production readiness, scale, SEO, and reliability.
- If a claim cannot be demonstrated, downgrade or remove it.
- Confirm links, badges, commands, screenshots, and docs all refer to the current state of the project.

9. Final showcase judgment
- Decide whether the project is:
  - ready to present publicly now,
  - usable only with explicit caveats,
  - not ready for public presentation.
- Be conservative. If the project would create distrust in a serious review, fail it.

Practical asset expectations:

- Prefer a stable screenshot directory such as `docs/images/` or `public/og/` instead of scattering assets randomly.
- Prefer descriptive filenames such as `home-dashboard.png`, `editor-flow.png`, or `social-preview-1280x640.png`.
- Prefer a single repository social preview image designed for quick recognition over a generic screenshot.
- If the project has a web app, expect a distinct page-level Open Graph implementation and not only a GitHub preview image.
- If the project is portfolio-facing, expect at least:
  - one strong cover image,
  - two to four real screenshots,
  - one accurate short description,
  - one clean live/demo link if available.

Open Graph and social preview expectations:

- For a website or web app, verify the Open Graph basics:
  - `og:title`
  - `og:type`
  - `og:image`
  - `og:url`
- Strongly prefer these as well:
  - `og:description`
  - `og:site_name`
  - `og:locale`
  - `og:image:alt`
- If the product is multilingual, check `og:locale:alternate` where appropriate.
- Confirm the Open Graph image is readable at small sizes and still recognizable when cropped by social platforms.
- Confirm the GitHub repository social preview image is uploaded in repository settings and not merely stored in the repo.
- Prefer a solid background if transparency introduces risk across light and dark social surfaces.

Useful resources to apply during this pass:

- GitHub social preview docs: [Customizing your repository's social media preview](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview)
- GitHub topics docs: [Classifying your repository with topics](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics)
- Open Graph protocol: [ogp.me](https://ogp.me/)
- GitHub topics directory for discovery research: [github.com/topics](https://github.com/topics)

Automatic fail conditions:

- README setup is inaccurate or incomplete.
- Screenshots are fake, stale, missing when clearly needed, or materially misleading.
- Repo description or topics overstate the project.
- Claimed features are absent, partial, or not reproducible.
- The repo includes obvious secrets, broken links, placeholder copy, or contradictory documentation.
- The build or other core verification step fails without a documented reason.
- The project is being positioned as stronger, more complete, or more production-ready than it really is.
- The public-facing visual assets are generic, misleading, unreadable, or obviously assembled without product judgment.
- The project could be shared publicly, but the presentation still makes it look weaker, sloppier, or less credible than it should.

Output format:

- Start with blocking issues that make the project unfit for public presentation.
- Then list credibility risks and weaker but still important presentation gaps.
- Then provide the minimum set of changes required to make the project presentable.
- End with a verdict of `PASS`, `PASS WITH CAVEATS`, or `FAIL`.
- Include one sentence explaining whether you would personally be comfortable attaching this repo to a professional profile today.
