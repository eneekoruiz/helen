# Security Policy

HELEN takes security and developer trust seriously. This document outlines our vulnerability disclosure policy and supported releases.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | :white_check_mark: |
| 1.x     | :x:                |
| < 1.0   | :x:                |

We recommend that all users upgrade to the latest stable release of `helen-cli` (`npm install -g helen-cli` or via `npx helen-cli`).

## Reporting a Vulnerability

If you discover a security vulnerability or potential leak within HELEN:

1. **Do not open a public GitHub issue.**
2. Send an email to the repository maintainer: `eruiz084@ikasle.ehu.eus` or use [GitHub Private Vulnerability Reporting](https://github.com/eneekoruiz/helen/security/advisories/new).
3. Include detailed steps to reproduce the issue, proof of concept, and the version tested.

### What to Expect

- **Acknowledgment**: You will receive an acknowledgment within 48 hours.
- **Triage & Fix**: We will triage the report, determine its severity, and provide a patch in a security release.
- **Credit**: We will credit your contribution in the release notes if you wish.

## Security Architecture in HELEN

- **Zero Telemetry**: HELEN does not collect or transmit analytics, prompts, or project code to external servers.
- **Secret Scanning Pre-Commit Hook**: Automated checks block accidental commits containing `.env` files, API keys, and credential formats.
- **Deterministic Tool Catalog**: Third-party tools are audited and pinned. HELEN never auto-installs unvetted external scripts.

## Dependency review — 2026-11-05

The unused direct `glob` dependency was removed. With the reviewed lockfile, `npm audit --omit=dev` reports no known production dependency vulnerabilities.

The full audit still reports nine moderate affected package entries from one underlying [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249) in the ESLint/TypeScript-ESLint development chain. These are not nine independent vulnerabilities. The reported amplification requires `optimizationLevel >= 2`; the inspected consumers use the default matching level, and this repository does not request level 2. This finding does not establish safety for arbitrary external configurations or untrusted patterns.

No forced override or downgrade is applied. Current upstream consumers still request minimatch 10, while [minimatch 11 removes APIs and changes matching semantics](https://github.com/isaacs/minimatch/blob/v11.0.2/changelog.md). Keep the supported lint stack and adopt a compatible upstream fix when available. Run tooling with reviewed configuration; do not introduce attacker-controlled patterns or higher optimization levels as a workaround.
