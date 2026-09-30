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
