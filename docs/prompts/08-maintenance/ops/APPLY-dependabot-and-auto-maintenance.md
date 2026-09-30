---
action: APPLY
phase: 08-maintenance
summary: Configure Dependabot and CI so dependency updates arrive grouped, tested and safe, with auto-merge limited to low-risk updates.
modifies_code: true
---

# Dependabot and Auto-Maintenance

## Goal

Keep dependencies and the security posture current automatically, without breaking the project.

## Use when

- Preparing a project for production or open source, or during maintenance.

## Skip when

- Short-lived sandboxes or throwaway demos, or no meaningful test suite (automatic updates without tests raise breakage risk).

## Requirements

1. `.github/dependabot.yml` for `npm` (or the project ecosystem) and `github-actions`, weekly (daily if critical), with labels (`dependencies`, `security`).
2. Group minor and patch updates to reduce noise; major versions always need manual review.
3. Every Dependabot pull request runs the full CI (tests, typecheck, build) before it can merge.

## Beyond the checklist

Auto-merge only for development dependencies and security patches with green CI.

## Limits

- Never auto-merge production major versions; private registry credentials only in GitHub secrets; valid YAML.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
