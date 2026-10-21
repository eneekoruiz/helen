# Installed-package verification

Run `npm run verify:package` before a release. It builds HELEN and then runs
`node scripts/verify-package.mjs` against an actual npm tarball installed outside
the checkout. The standalone script expects `dist/` to have already been built.

Use `node scripts/verify-package.mjs --offline` to require npm's existing cache.
The default prefers cached dependencies and allows missing public dependencies
to download from the npm registry. An incomplete cache makes the offline command
fail; it never substitutes checkout dependencies or reports a skipped install
as a pass.

The verifier creates an owned temporary project, packs with lifecycle scripts
disabled, and installs the `.tgz` with its normal dependencies and installation
scripts disabled. It checks the tarball integrity, archive file inventory and installed files,
including CLI entry points, prompt and skill assets, the background worker and
runtime modules. Private `.helen` state, authentication files, secret environment
files and HELEN backups are rejected from the package inventory.

All CLI and MCP checks run from outside the checkout with an isolated home,
empty npm configuration, no API keys and an empty executable search path. They
exercise help/version, phase detection, plan briefs, library lint, TED aliases, cache-ready prompt exports,
installed resource paths, skills and flows, project setup, ownership-preserving
uninstall, project initialization, interrupted-operation recovery and MCP stdio
inventory/resource calls. MCP input schemas must define valid item schemas for arrays.
Work listing, readiness, knowledge search and creative-kit
reads are checked without creating project state. A small source fixture checks
task context references and private-file exclusion, and capability discovery must
report the unavailable providers with zero model calls and project writes.
Additional MCP tools are accepted; only the required
read-only calls are invoked.

The installed production worker is invoked with invalid arguments to verify its
imports and early validation. A separate worker with an injected fake runtime
uses the installed production launcher and jobs modules to prove it survives
its parent process, saves completion and exits. No provider CLI or model is
invoked. This check does not prove live subscription authentication, model output,
generated application builds or the hosted operating-system matrix.

Each run records its manifest, command output, check outcomes and fake-worker
evidence in a unique ignored `.helen/audit-results/package-verification-*`
directory. Failed observations remain available there. Cleanup checks the exact
temporary parent, directory type and ownership token before removing anything.
If a fake worker is still alive or ownership cannot be verified, its temporary
directory is preserved and verification fails. Local and global Git hook settings
are compared before and after the run.

CI runs this installed-package gate separately on Linux and Windows. Evidence is
uploaded on success and failure. These local and CI checks validate the package
that was built in that run; release publication remains a separate operation.
