# Releasing HELEN

Releases are automated from Conventional Commits. `.github/workflows/release.yml` does three things:

1. On every push to `main`, **release-please** opens or updates a *Release PR* that bumps `package.json`, `.release-please-manifest.json` and `.claude-plugin/plugin.json`, and prepends the changelog.
2. Merging the Release PR creates the tag and the GitHub release.
3. The `publish` job in the same workflow reruns every gate (`typecheck`, `lint`, `test`, `build`, `helen lint`, `scripts/check-pack.mjs`, `npm audit`) and publishes `helen-cli` to npm with provenance.

The commit-msg hook enforces the Conventional Commits format locally (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`…). Use `feat!:` or a `BREAKING CHANGE:` footer for major bumps.

## One-time setup (only the repository owner can do this)

HELEN cannot do these steps for you: they need your npm and GitHub accounts.

1. **First publish.** npm only lets you configure trusted publishing for a package that already exists, so publish the first version by hand from your machine:
   ```bash
   npm ci && npm run build && node scripts/check-pack.mjs
   npm login
   npm publish --access public
   ```
2. **Trusted publishing.** On npmjs.com open `helen-cli` → *Settings* → *Trusted Publisher* → *GitHub Actions* and enter owner `eneekoruiz`, repository `helen`, workflow filename `release.yml`, environment `npm`. From then on the workflow publishes without any token.
3. **GitHub settings.** *Settings → Actions → General → Workflow permissions*: read and write, and tick *Allow GitHub Actions to create and approve pull requests* (release-please needs it).
4. **Environment `npm`.** *Settings → Environments → New environment* named `npm`. Add yourself as a required reviewer if you want a manual approval before every publish.
5. **Optional: CI on the Release PR.** Pull requests opened with the default token do not trigger workflows. Create a fine-grained personal access token (contents and pull requests: read/write) and store it as the secret `RELEASE_PLEASE_TOKEN`; the workflow uses it automatically.
6. **Branch protection on `main`.** Require pull requests and the checks `Quality Gates`, `CLI Sandbox Integration Smoke Test` and `Docker image`. Without required checks GitHub merges as soon as a PR is mergeable, whatever CI says.

## Fallback: classic token

If you prefer a token over trusted publishing, add a granular npm token as the secret `NPM_TOKEN` and set `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` on the publish step of `release.yml`.

## Republishing

If the publish job failed after the tag exists, run the *Release* workflow manually (*Actions → Release → Run workflow*) and enter the tag, for example `v2.2.0`.

## Check a build locally

```bash
npm run typecheck && npm run lint && npm test && npm run build
node dist/cli.js lint
node scripts/check-pack.mjs        # what would be published: required files present, nothing private
npm run docs:check                 # documentation numbers and file references match the repository
npm pack                           # then, in an empty directory:
npm init -y && npm install /path/to/helen-cli-<version>.tgz && npx helen --version
```
