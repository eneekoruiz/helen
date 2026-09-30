---
action: APPLY
phase: 06-release
summary: Set up GitHub Actions for tagged releases, verified builds, SemVer and PR-based changelog drafts, with least-privilege tokens.
modifies_code: true
---

# Automated Release and Changelog Workflows

## Goal

Automate releases so versions, artifacts and changelogs are consistent: tagged releases, verified builds, semantic versioning and changelog drafts from pull requests.

## Use when

- Preparing releases for open-source or commercial projects that need a consistent version history.

## Skip when

- Early discovery or prototyping, or the repository does not use pull requests with descriptive titles.

## Requirements

1. **Release workflow** (`.github/workflows/release.yml`) triggered by version tags (`v*`): runs tests, typecheck and the production build before attaching artifacts to the GitHub release.
2. **Release drafts:** configuration that groups pull requests by label (`feat` to Features, `fix` to Bug Fixes, `chore` to Maintenance) and a workflow that updates a draft release on every merge to main.
3. **SemVer:** `MAJOR.MINOR.PATCH`, with breaking changes called out.
4. Correct main branch mapping and labels that match the configuration.

## Beyond the checklist

Publish to registries (npm, container registries) when a draft is published, with provenance or signed commits where supported.

## Limits

- Never hardcode tokens: use `GITHUB_TOKEN` or repository secrets (`secrets.NPM_TOKEN`).
- Least privilege (`permissions: contents: write` only where needed); valid YAML.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
