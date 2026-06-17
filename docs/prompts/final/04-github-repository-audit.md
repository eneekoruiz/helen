# Final GitHub Repository Audit

Deep audit only. Use this prompt when the repository itself needs to be credible, legible, discoverable, and worth sharing as a public artifact.

Purpose: decide whether the repo presentation increases trust or quietly damages it.

Expected output:

- repository-level trust problems;
- metadata and presentation fixes;
- additional credibility opportunities;
- a hard `PASS`, `PASS WITH CAVEATS`, or `FAIL`.

## Prompt

Review this repository as a strict senior engineer, open-source maintainer, product-minded founder, and GitHub presentation reviewer.

Goal: determine whether the repository is understandable, trustworthy, maintainable, and publicly credible without turning it into documentation theater.

Audit posture:

- Assume the repository is not presentation-ready until the content proves otherwise.
- Inspect README, metadata, docs, scripts, CI, license, assets, examples, generated files, issue/PR support files, and public links.
- Treat stale metadata, fake completeness, weak trust signals, and presentation debt as real product problems.
- Prefer a smaller honest repository over a more impressive-looking dishonest one.

## Requisitos mínimos obligatorios

Audit these areas at minimum:

1. README
- Confirm the README is current, readable, specific, and technically honest.
- Check setup steps, scripts, environment requirements, outputs, limitations, and first-screen clarity.
- Remove fluff, vague value statements, generic AI-sounding copy, and repeated content.

2. Repository metadata
- Review repo name, description, topics, homepage, social preview, pinned status, visibility, and archive suitability.
- Ensure the About box is intentional: short description, useful URL, relevant topics, and social preview when public sharing matters.
- Remove broad or fashionable topics that do not help discovery.

3. DeepWiki and supporting docs
- Confirm DeepWiki or external docs exist only if they improve understanding.
- Verify supporting docs are current, human, and consistent with code.
- Flag docs added only to simulate completeness.

4. Visual presentation
- Check screenshots, diagrams, terminal captures, README images, social preview assets, and Open Graph assets where relevant.
- Reject stale UI captures, placeholder art, fake states, generic title cards, unreadable thumbnails, or visuals that imply polish the product does not have.
- Prefer one clear visual over multiple weak ones.

5. Trust and hygiene
- Confirm license choice is intentional and present.
- Check `.env.example`, sample config, ignored files, tracked files, generated artifacts, private paths, secrets, broken badges, and personal notes.
- Verify the repository feels clean enough for a serious reviewer.

6. Automation and maintenance burden
- Review GitHub Actions, Dependabot, issue templates, PR templates, CODEOWNERS, releases, changelog, and similar automation only if present or clearly needed.
- Flag automation that is broken, noisy, ceremonial, or more ambitious than the maintenance capacity.

7. Public credibility
- Decide whether the repo improves or hurts the owner's public profile.
- Consider whether a recruiter, client, maintainer, or peer would trust the repo after ten minutes.

8. Discoverability
- Review topics, description, keywords, homepage, demo URL, docs URL, release URL, and repository naming for real discovery value.
- Compare topic choice with likely search behavior and related repositories if internet access is available.

## Más allá de estos criterios

Act like a senior maintainer and portfolio reviewer with taste.

Look for subtle credibility leaks: over-polished README with weak substance, under-presented strong work, noisy badge walls, inconsistent naming, stale screenshots, unclear next click, weak repository description, confusing asset placement, support files that imply a maintenance model that does not exist, or public claims that feel inflated.

You may recommend changing narrative, deleting support files, reorganizing assets, improving screenshots, adjusting topics, adding a small diagram, or making the project private/archive-only if that is the honest choice.

Do not add ceremony. Public polish must make the real project easier to understand and trust.

## Useful references

- GitHub social preview docs: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview
- GitHub topics docs: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics
- Open Graph protocol: https://ogp.me/
- GitHub topics directory: https://github.com/topics

## Automatic fail conditions

- README is misleading, stale, or incomplete in core setup areas.
- Repository metadata overstates the project.
- Secrets, broken links, fake screenshots, placeholder docs, or private artifacts are present.
- Support files exist only for appearance and are not maintained.
- The repo would reduce trust if attached to a professional profile.
- Visuals, About box, topics, or social preview are weak enough to make a good project look forgettable.

## Output format

1. Start with blocking repository-level problems.
2. Then list trust and maintenance risks.
3. Then list "Más allá de estos criterios" opportunities.
4. Provide the minimum repo changes required before public sharing.
5. End with `PASS`, `PASS WITH CAVEATS`, or `FAIL`.
6. Include one sentence on whether you would personally star, share, or showcase this repo in its current state.
