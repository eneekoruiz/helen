---
action: AUDIT
phase: 08-maintenance
summary: Audit branch protection, PR rules, community files, dependency licenses and GitHub security features with least privilege.
modifies_code: false
---

# Repository Governance and Compliance

## Goal

Check that the repository's rules protect it: protected branches, reviewed changes, clear contribution policies and license compliance.

## Use when

- Before opening a repository to collaborators, before a commercial release, or yearly.

## Requirements

1. **Branch protection:** no direct pushes to `main`; pull requests with passing CI (and review when there is a team).
2. **Pull request policy:** at least one technical review where a team exists; build and tests required.
3. **Community files:** `LICENSE`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md` present and accurate.
4. **Licenses:** no dependency licenses incompatible with the product (e.g. unapproved GPLv3 in closed commercial SaaS).
5. **Security features:** CodeQL or equivalent, Dependabot alerts, secret scanning; team permissions follow least privilege.

## Limits

- Audit only: never change hosting-platform settings during the audit; list them as manual actions.

## Output

Compliance summary (`COMPLIANT`, `COMPLIANT WITH RESERVATIONS`, `NOT COMPLIANT`), then Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort.
