# Final GitHub Repository Audit

Use this prompt when the code is mostly done and the repository itself needs a strict final audit before being shared publicly.

Use after:

- the repository structure is mostly settled,
- the README already exists,
- you want the repo itself to be credible before sharing it.

Skip if:

- the project is still private and not close to being reviewed by anyone else,
- the code is still changing too fast for repository polish to be meaningful.

## Prompt

Review this repository as a strict senior engineer preparing it for a credible GitHub presentation.

Goal: determine whether the repository is understandable, trustworthy, and worth sharing publicly without turning it into documentation theater.

Audit posture:

- Be conservative.
- Assume the repository is not presentation-ready until the content proves otherwise.
- Treat stale metadata, fake completeness, and weak trust signals as real product problems.
- Prefer a smaller honest repository over a more impressive-looking dishonest one.

Non-negotiable rules:

- Do not accept placeholder sections, boilerplate filler, or generic AI-sounding documentation.
- Do not add badges, workflows, or support files unless they provide clear ongoing value.
- Do not let a project pass if the repository presentation oversells the code.
- Do not confuse "busy repo" with "good repo".

Review these areas:

1. README
- Confirm the README is current, readable, specific, and technically honest.
- Check whether setup steps, scripts, environment requirements, outputs, and limitations are accurate.
- Remove fluff, vague value statements, and repeated content.
- Ensure the first screenful explains the project fast.

2. Repository metadata
- Review repo name, description, topics, homepage, social preview, pinned status, visibility, and archive suitability.
- Remove broad or fashionable topics that do not help discovery.
- Ensure the description is precise enough that a serious reviewer knows what the repo is for in seconds.
- Treat the "About" section as mandatory presentation real estate:
  - short description,
  - homepage or live demo URL,
  - topics,
  - social preview image.
- Check whether the homepage points to a real, maintained, public destination.
- If the repo is worth showcasing, verify that the pinned-repo decision on the GitHub profile is intentional.

3. DeepWiki and supporting docs
- Confirm DeepWiki exists only if it improves understanding.
- Verify docs are current, human, and consistent with the codebase.
- Flag stale docs, duplicated docs, contradictory docs, and docs added only to simulate completeness.

4. Visual presentation
- Check screenshots for relevance, freshness, readability, and honesty.
- Confirm any OpenGraph or social preview asset exists only if public sharing matters and that it matches the real project.
- Reject outdated UI captures, placeholder art, or visuals that imply polish the product does not have.
- Review whether the README should open with:
  - a product screenshot,
  - a minimal hero image,
  - or no image at all.
- Prefer one clear visual over multiple weak ones.
- Check that image files are organized and named intentionally.
- If the project has a live site, verify both:
  - GitHub repository social preview,
  - site-level Open Graph metadata.
- If a social preview image exists, check that it reads well at thumbnail size and still looks credible in dark and light surfaces.

5. Trust and operational hygiene
- Confirm license choice is intentional and present.
- Check whether `.env.example`, sample config, or setup guidance exists when configuration is required.
- Verify no secrets, machine-specific paths, generated junk, personal notes, private links, or broken badges are committed.
- Check whether ignored files and tracked files reflect a clean maintenance posture.

6. Automation and maintenance burden
- Review GitHub Actions, Dependabot, issue templates, PR templates, CODEOWNERS, and similar automation only if they add durable value.
- Flag automation that is broken, noisy, unnecessary, or more ambitious than the actual maintenance capacity of the project.
- Prefer fewer reliable workflows over more ceremonial ones.

7. Public credibility
- Decide whether the repo improves or hurts the owner's public profile.
- Consider whether a recruiter, client, or maintainer would trust the repo after ten minutes of inspection.
- Fail the audit if the repo looks more serious than its actual substance.

8. README attractiveness without gimmicks
- Check whether the README has a strong first screenful on GitHub.
- Verify that the order of information helps a stranger decide quickly:
  - what it is,
  - why it matters,
  - how to run it,
  - what to click next.
- Review whether badges add signal or just noise.
- Prefer one concise features block over long sales copy.
- Check whether the README is visually scannable on mobile and desktop.
- If screenshots are present, ensure captions explain why each one matters.

9. Discoverability and external appeal
- Review whether topics are chosen for actual discovery rather than self-description.
- Compare the chosen topics with related repositories and GitHub topic pages.
- Ensure topic names are lowercase, concise, and not overused filler.
- Check whether the repository should include a homepage URL, demo URL, docs URL, or release URL in a more deliberate way.
- If the project is portfolio-facing, verify that the repository could survive being opened cold by someone with no context.

10. Optional trust extras that only matter when justified
- Consider whether the repo would benefit from any of these, but only if they are real and maintained:
  - releases,
  - release notes,
  - a changelog,
  - a screenshots folder,
  - a demo link,
  - a docs landing page,
  - a license,
  - `.env.example`,
  - a small architecture diagram,
  - contribution guidance.
- Reject any of the above if they would be stale quickly or create fake maturity.

Practical GitHub presentation expectations:

- A strong repo usually has:
  - a precise one-line description,
  - a focused set of topics,
  - a clean README opening,
  - one meaningful social preview image,
  - one obvious next click for the visitor.
- If the project has UI, expect real screenshots.
- If the project has no UI, expect a clear diagram, terminal capture, or title-card style preview image instead of random artwork.
- Prefer storing showcase assets in a predictable place such as `docs/images/` or `public/og/`.
- Avoid oversized badge walls, placeholder roadmap sections, and decorative clutter that pushes substance below the fold.

Useful resources to apply during this audit:

- GitHub social preview docs: [Customizing your repository's social media preview](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview)
- GitHub topics docs: [Classifying your repository with topics](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics)
- Open Graph protocol for live sites: [ogp.me](https://ogp.me/)
- Topic research: [github.com/topics](https://github.com/topics)

Automatic fail conditions:

- README is misleading, stale, or incomplete in core setup areas.
- Repository metadata overstates the project.
- There are obvious secrets, broken links, fake screenshots, or placeholder docs.
- The repo claims professionalism but still contains careless hygiene problems.
- Support files exist only for appearance and are not maintained.
- The repo would reduce trust if attached to a professional profile.
- The social preview, README visuals, or About box are missing or weak enough to make a good project look forgettable.
- The repo is technically fine but visually disorganized in a way that makes it look less mature than it is.

Output format:

- Start with blocking repository-level problems.
- Then list trust and maintenance risks.
- Then provide the minimum repo changes required before public sharing.
- End with `PASS`, `PASS WITH CAVEATS`, or `FAIL`.
- Include one sentence on whether you would personally star, share, or showcase this repo in its current state.
