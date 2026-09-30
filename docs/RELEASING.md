# Release & Publishing Guide

HELEN uses **Release Please** for automated changelog generation and version tagging from Conventional Commits, combined with **npm Trusted Publishing (OIDC)** and GitHub Actions for cryptographic provenance.

---

## 1. Automated Workflow Overview

1. When pull requests with Conventional Commits (`feat:`, `fix:`, `chore:`, etc.) are merged into `main`, the **Release Please** workflow automatically opens or updates a "Release PR".
2. When the maintainer merges the Release PR into `main`, Release Please tags the repository (e.g. `v2.1.0`) and creates a GitHub Release.
3. Pushing the `v*` tag triggers `.github/workflows/publish.yml`, which runs all quality gates (`typecheck`, `lint`, `test`, `build`, `helen lint`, `npm pack --dry-run`) and publishes `helen-cli` to npm with `--provenance`.

---

## 2. Manual Setup Steps (Owner Only)

These steps require administrative credentials on npmjs.com and GitHub and must be executed by the repository owner (`eneekoruiz`).

### A. npm Account & Package Reservation
1. Log in to [npmjs.com](https://www.npmjs.com).
2. If `helen-cli` has not been published yet:
   - Run the initial manual publish once from a local machine:
     ```bash
     npm login
     npm publish --access public
     ```
   - Verify that you are listed as the package owner.

### B. Configure npm Trusted Publishing (Recommended - OIDC)
1. On [npmjs.com](https://www.npmjs.com), navigate to:
   `https://www.npmjs.com/package/helen-cli/access`
2. Under **Publishing Access** → **Trusted Publishers**, click **Add trusted publisher**.
3. Select **GitHub Actions**:
   - **Repository Owner**: `eneekoruiz`
   - **Repository Name**: `helen`
   - **Workflow filename**: `publish.yml`
   - **Environment name**: (leave blank or `production` if using GitHub environments)
4. Save the configuration. This enables tokenless publishing with verifiable provenance.

### C. (Alternative) Classic Token Fallback
If not using OIDC trusted publishing:
1. In npm, generate a **Granular Access Token** or **Automation Token** with read and write permissions for `helen-cli`.
2. In GitHub (`eneekoruiz/helen`), go to **Settings** → **Secrets and variables** → **Actions**.
3. Create a repository secret named `NPM_TOKEN` with the token value.

### D. GitHub Actions Permissions
1. In the GitHub repository settings (`eneekoruiz/helen`), navigate to:
   **Settings** → **Actions** → **General** → **Workflow permissions**.
2. Select:
   - **Read and write permissions**.
   - Check the box: **Allow GitHub Actions to create and approve pull requests** (required for `release-please` to open Release PRs).
3. Click **Save**.

---

## 3. Local Verification Before Release

Verify the package contents and binary behavior before publishing:

```bash
# 1. Run all gates
npm run typecheck
npm run lint
npm test
npm run build
node dist/cli.js lint

# 2. Audit package contents
npm pack --dry-run

# 3. Test local tarball install in a temporary directory
npm pack
# Generates helen-cli-2.1.0.tgz
cd $(mktemp -d)
npm init -y
npm install /path/to/helen-cli-2.1.0.tgz
npx helen --help
npx helen-cli --help
```
