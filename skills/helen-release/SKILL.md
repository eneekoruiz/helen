---
name: helen-release
description: Master skill for release engineering, SEO technical compliance, version bumps, changelogs, privacy policies, and preparing clean handoffs to clients.
---

# Release Engineering & Client Handoff (Release Master Skill)

Decide if the project can be packaged as a release candidate (RC) or delivered to a client, with mathematical guarantees. This skill groups release candidate preparation, SEO/i18n compliance, and clean client handoff packaging.

## The Release Candidate Sequence

1. **Build & Compile**: Verify the project builds completely from a cold start.
2. **Deterministic Gates**: Run the linter, typechecker, and test suite. They must pass with zero exceptions. Never hide or cosmetically fix a type, build, or security error just to pass the gate.
3. **Security Hardening**: Verify no `.env`, credentials, API tokens, or development access are exposed in the repository or documentation.
4. **SEO & i18n Compliance**:
   - Check `title`, meta description, Open Graph, canonical URLs, `robots.txt`, sitemaps, single `h1`, and heading order.
   - Confirm there is no accidental `noindex` tag for production builds.
   - Ensure every visible string goes through the i18n layer, language fallbacks work, and `hreflang` tags are correct.
5. **Documentation & Handoff Preparation**:
   - Ensure setup and deployment instructions reproduce on a clean machine.
   - Clarify ownership: domains, hosting, databases, SaaS accounts, and where credentials live (name the vault, never the secret).
   - Generate release notes, changelogs, and a demo package.

## Privacy, Legal, and Compliance Limits

- Identify personal data flows (analytics, logs, uploads, support data, third-party processors).
- Review consent/cookie behavior, tracking, retention, and data minimization.
- **Do not invent legal text, certifications, or privacy policies.** Flag gaps, draft placeholders, and recommend review by legal counsel.
- Flag marketing claims such as "100% secure", "guaranteed", or "fully compliant" that need empirical evidence.

## Conditions to Advance

- Build, linter, and test suite pass with no exceptions.
- No open secrets or critical security gaps.
- Documentation and quickstarts match the real state of the software.
- A browser smoke test (or manual reasoning) confirms every main route works, including deep links and back/forward navigation.

## Final Summary Output Format

When executing a release or handoff sequence, provide a concise final summary:

1. **Verdict**: `RC READY`, `RC WITH CAVEATS`, or `NOT RC READY`.
2. **Quality Verification Status**: Checks executed (build, lint, test, security).
3. **Handoff Package & Links**: Where the release notes, changelog, and built assets are.
4. **Access & IP Transfer Instructions**: Documented ownership transfers (domains, SaaS, credential vaults).
5. **Remaining Blockers / Pending Items**: What must be resolved before the final sign-off.