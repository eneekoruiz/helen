# Final GitHub Repository Audit

Use this prompt when the code is mostly done and the repository itself needs a strict final audit before being shared publicly.

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

3. DeepWiki and supporting docs
- Confirm DeepWiki exists only if it improves understanding.
- Verify docs are current, human, and consistent with the codebase.
- Flag stale docs, duplicated docs, contradictory docs, and docs added only to simulate completeness.

4. Visual presentation
- Check screenshots for relevance, freshness, readability, and honesty.
- Confirm any OpenGraph or social preview asset exists only if public sharing matters and that it matches the real project.
- Reject outdated UI captures, placeholder art, or visuals that imply polish the product does not have.

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

Automatic fail conditions:

- README is misleading, stale, or incomplete in core setup areas.
- Repository metadata overstates the project.
- There are obvious secrets, broken links, fake screenshots, or placeholder docs.
- The repo claims professionalism but still contains careless hygiene problems.
- Support files exist only for appearance and are not maintained.
- The repo would reduce trust if attached to a professional profile.

Output format:

- Start with blocking repository-level problems.
- Then list trust and maintenance risks.
- Then provide the minimum repo changes required before public sharing.
- End with `PASS`, `PASS WITH CAVEATS`, or `FAIL`.
- Include one sentence on whether you would personally star, share, or showcase this repo in its current state.
