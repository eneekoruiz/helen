---
action: APPLY
phase: 06-release
summary: Push the code to a private GitHub repository and connect a host (Vercel, Cloudflare...) with safe environment variables and a verified deploy.
modifies_code: true
---

# Deploy with GitHub and Hosting

## Goal

Put the site online reproducibly: code on GitHub, a connected host, and a verified first deploy, without leaking secrets.

## Use when

- After the release readiness checkpoint, when publishing a new site or delivering one to a client.

## Skip when

- Build, tests or the security checkpoint fail.

## Requirements

1. `.env` files and credentials are not versioned; `.env.example` exists without real values; no secrets in git history.
2. Create the repository **private** (`gh repo create <name> --private --source=. --push`); make it public only on purpose.
3. Connect the repository to the host from its dashboard (or its official MCP, `helen skills external vercel-mcp`); environment variables live in the host, never in the repository.
4. Verify the first deploy at the real URL: pages load, links and forms work, no accidental `noindex`, correct domain and HTTPS.
5. Document how to deploy and roll back (`generate-operations-runbook`).

## Beyond the checklist

Preview deploys per branch and a protected main branch so nothing publishes without passing CI.

## Limits

- No force pushes and no changes to visibility, domains or DNS without explicit confirmation.
- Never print tokens in chat or reports.

## Output

```text
Done. / Done with warnings.

Changes applied:
- 1-3 bullets with the exact changes

Manual actions:
- None. / what the user must do (e.g. set a variable, provide real images)
```
