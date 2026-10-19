# Task-specific repository context

HELEN can build a read-only repository map and select evidence for a particular task. It identifies seeds from repository-relative file/directory paths and task keywords, then follows both local dependencies and their consumers for a bounded number of hops. Each selected file records why it was selected. A missing or excluded seed produces a notice; HELEN does not substitute the entire repository when nothing matches.

The runtime uses its own bounded tokenizer and Node built-ins. It does not import TypeScript, install dependencies, execute package scripts, follow repository instructions, or edit the target project. This works from a production installation without developer dependencies.

```ts
import {
  buildCodeMap,
  buildTaskContext,
  checkCodeMapFreshness,
  formatTaskContext,
} from "helen-cli";

const context = await buildTaskContext(projectRoot, {
  task: "Update order creation",
  paths: ["src/orders.ts"],
  keywords: ["Order"],
  depth: 1,
  maxFiles: 12,
  maxCharacters: 24_000,
  maxTokens: 6_000,
});
const promptEvidence = formatTaskContext(context);
```

The public module is `dist/core/codeMap.js`; the package entry point also exports these functions. `buildCodeMap(root, options?)` returns file hashes, import hints, local dependencies, consumers, named declarations, interface/type/enum contract hints, route hints, limits and notices. `buildTaskContext(root, request?, mapOptions?)` returns a deterministic prompt snapshot, selected files and reasons, the map fingerprint, notices and budget accounting. `formatTaskContext(context)` returns the stored snapshot. `checkCodeMapFreshness(root, map)` re-scans using the original limits and returns `stale`, the current fingerprint, scan completeness and notices.

## Evidence and precision

JS/TS support includes literal static imports, re-exports with `from`, `require("literal")` and `import("literal")`. Relative resolution covers JS/TS extensions and directory `index` files, including a `.js` import pointing to available TS source. The root `tsconfig.json`, or `jsconfig.json` when no tsconfig is present, supports local `baseUrl` and exact/single-wildcard `paths` aliases, JSONC comments and trailing commas. Paths resolving outside the root are rejected. Config inheritance and project references are reported as unsupported and are never followed.

Declarations, interface/type/enum contracts, HTTP method calls with literal paths, exported method handlers and conventional `app`/`pages` route files are lexical hints. They are not compiler-verified definitions, authoritative HTTP endpoints or a proof that a symbol is reachable. The map does not interpret computed imports, template interpolation, escaped import literals, package export maps, framework configuration or TypeScript's full resolution/type system. Other supported text files, including Python, Go, Rust, SQL and GraphQL, remain path references with no invented semantic graph. Keywords match paths and extracted symbol/route hints rather than arbitrary source bodies.

`complete` means the eligible scan finished within its limits and supported analysis did not produce a partial-analysis notice. It does not mean the repository has been semantically verified. Malformed configs, unreadable files, invalid UTF-8, oversize files, scan limits and truncated lexical analysis produce explicit notices and a partial map. Analysis stops at unsupported template interpolation and JSX/generic-expression syntax to avoid inventing relationships from text. JS/TS syntax and regex classification are approximate; the mapper is not a full parser. Intentional privacy exclusions and binary exclusions are also reported. Local imports can remain unresolved; their resolution status is present on the map rather than being guessed.

## Privacy and trust

The default mode contains references and extracted hints, without source bodies. Only an explicit `includeSource: true` authorizes source inclusion. Source is re-read safely, checked against its mapped content hash, checked for credential patterns and bounded by `maxSourceCharacters` per file and the total prompt budget. A changed, unreadable or newly sensitive file contributes a notice and no source. Included source is rendered as a JSON string and marked as untrusted data; it must never be treated as agent instructions.

Sensitive filenames and directories, `.env` variants, credential files, private keys, common embedded credentials, connection URLs containing passwords, `node_modules`, version-control metadata, generated/build output, private HELEN state and symlinks/junctions are excluded. `AGENTS.md` and `CLAUDE.md` are not copied into this evidence map. The mapper rejects traversal, absolute external seed paths and unsafe names, checks path components and real directory boundaries, and bounds reads through file descriptors. It never follows a link to retrieve a source or alias configuration.

Credential detection is deliberately conservative and heuristic. It cannot determine whether arbitrary source text, a domain-specific value, an unknown token format or a route/symbol name is confidential. Explicit source authorization is therefore required even after the filters pass. Callers should keep reference mode when source disclosure is unnecessary.

## Bounds and freshness

Default scan bounds are 2,000 eligible files, 256 KiB per file, 16 MiB of read input, 20,000 directory entries and 50,000 lexical tokens per JS/TS file. Default context bounds are 12 files, 24,000 characters, 6,000 estimated tokens, one graph hop and 4,000 optional source characters per file. Hard ceilings constrain caller-provided limits. Notices and extracted hint lists are also bounded.

The token estimate is `ceil(renderedCharacters / 4)`. It is a budgeting approximation, not a provider tokenizer or a guarantee about a model's actual tokens. The rendered snapshot respects both the character limit and four times the requested estimated-token limit. File counts, omitted selections and undisplayed notice counts are explicit. Structured map/context metadata is bounded separately; `maxCharacters` and `maxTokens` describe the rendered prompt snapshot, not JSON serialization overhead.

The fingerprint includes scan limits, eligible relative paths and content hashes, alias/config input and scan outcomes. Adding, removing or changing mapped source/config makes a saved map stale. Changes inside intentionally excluded generated output do not. A partial fingerprint does not prove freshness of unscanned files; inspect the returned completeness and notices. No map cache is written automatically.
