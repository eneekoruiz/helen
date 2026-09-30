# GitHub Actions Workflow Templates

This directory contains pre-configured production workflows for HELEN:

- **`publish.yml`**: Automates npm trusted publishing with provenance via GitHub Actions OIDC on release tags (`v*`).
- **`release-please.yml`**: Automates semantic versioning, changelog generation, and GitHub Releases using Conventional Commits and Google's Release Please action.

### Activation

To activate these workflows on GitHub:

1. Copy the files into `.github/workflows/`:
   ```bash
   cp templates/workflows/publish.yml .github/workflows/
   cp templates/workflows/release-please.yml .github/workflows/
   ```
2. Commit and push from an environment with GitHub `workflow` OAuth scope (or directly via the GitHub Web UI).
3. Follow the owner checklist in [`docs/RELEASING.md`](../../docs/RELEASING.md) to complete npm and GitHub configuration.
