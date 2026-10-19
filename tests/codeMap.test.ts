import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCodeMap,
  buildTaskContext,
  checkCodeMapFreshness,
  formatTaskContext,
} from "../src/core/codeMap.js";

describe("task-specific repository maps", () => {
  let root: string;
  let outside: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "helen-code-map-"));
    outside = fs.mkdtempSync(path.join(os.tmpdir(), "helen-code-map-outside-"));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  });
  function write(relative: string, value: string | Buffer): void {
    const absolute = path.join(root, relative);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, value);
  }
  function graph(): void {
    write(
      "src/contracts.ts",
      "export interface Order { id: string }\nexport type Status = 'pending' | 'done';",
    );
    write("src/storage/index.ts", "export function saveOrder() {}\n");
    write(
      "src/orders.ts",
      "import type { Order } from './contracts.js';\nimport { saveOrder } from './storage';\nexport function createOrder(order: Order) { saveOrder(); return order; }\napp.post('/orders', createOrder);\n",
    );
    write(
      "src/router.ts",
      "import { createOrder } from './orders';\nexport const POST = createOrder;",
    );
    write("src/unrelated.ts", "export const unrelated = 1;");
  }

  it("finds literal relationships and their consumers without treating comments/strings as imports", async () => {
    graph();
    write(
      "src/wrappers.ts",
      "export { createOrder } from './orders';\nconst storage = require('./storage');\nconst later = import('./contracts');\n// import './unrelated';\nconst text = \"import './unrelated'\";\nconst pattern = /import 'unrelated'/;\nconst arrow = () => /import 'unrelated'/;\nconst template = `import './unrelated'`;\n",
    );
    const map = await buildCodeMap(root);
    const orders = map.files.find((file) => file.path === "src/orders.ts")!;
    expect(orders.dependencies).toEqual([
      "src/contracts.ts",
      "src/storage/index.ts",
    ]);
    expect(orders.dependents).toEqual(["src/router.ts", "src/wrappers.ts"]);
    expect(orders.symbols).toContainEqual({
      name: "createOrder",
      kind: "function",
      line: 3,
      exported: true,
    });
    expect(orders.routes).toContainEqual({
      method: "POST",
      route: "/orders",
      line: 4,
      kind: "call",
    });
    expect(
      map.files
        .find((file) => file.path === "src/contracts.ts")
        ?.contracts.map((item) => item.name),
    ).toEqual(["Order", "Status"]);
    expect(
      map.files.find((file) => file.path === "src/router.ts")?.routes,
    ).toContainEqual({ method: "POST", line: 2, kind: "handler" });
    expect(
      map.files
        .find((file) => file.path === "src/wrappers.ts")
        ?.imports.map((item) => item.kind),
    ).toEqual(["export", "require", "dynamic-import"]);
    expect(
      map.files.find((file) => file.path === "src/unrelated.ts")?.dependents,
    ).toEqual([]);
    expect(map.complete).toBe(true);
  });

  it("resolves JSONC paths/baseUrl, exact aliases and TS source behind .js imports", async () => {
    graph();
    write(
      "tsconfig.json",
      '{ // comments supported\n "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["src/*"], "@/orders": ["src/contracts.ts"], }, }, }',
    );
    write(
      "src/aliases.ts",
      "import { Order } from '@/contracts';\nimport './orders.js';\nimport '@/orders';\nimport React from 'react';",
    );
    const map = await buildCodeMap(root);
    const imports = map.files.find(
      (file) => file.path === "src/aliases.ts",
    )!.imports;
    expect(
      imports.map((item) => [
        item.specifier,
        item.resolvedPath,
        item.resolution,
      ]),
    ).toEqual([
      ["@/contracts", "src/contracts.ts", "local"],
      ["./orders.js", "src/orders.ts", "local"],
      ["@/orders", "src/contracts.ts", "local"],
      ["react", undefined, "external"],
    ]);
  });

  it("rejects escaping imports and alias targets and reports unsupported config inheritance", async () => {
    write(
      "tsconfig.json",
      JSON.stringify({
        extends: "../../outside.json",
        compilerOptions: { paths: { "@outside/*": ["../outside/*"] } },
      }),
    );
    write(
      "entry.ts",
      "import '../../outside';\nimport '@outside/secret';\nimport 'C:/private';\nimport './missing';",
    );
    const map = await buildCodeMap(root);
    expect(
      map.files
        .find((file) => file.path === "entry.ts")
        ?.imports.map((item) => item.resolution),
    ).toEqual(["unsafe", "unsafe", "unsafe", "unresolved"]);
    expect(map.notices.some((item) => item.code === "unsupported-config")).toBe(
      true,
    );
    expect(map.complete).toBe(false);
  });

  it("selects a seed plus dependencies and consumers with reasons and excludes unrelated files", async () => {
    graph();
    const context = await buildTaskContext(root, {
      paths: ["src/orders.ts"],
      depth: 1,
    });
    expect(context.files.map((file) => file.path)).toEqual([
      "src/orders.ts",
      "src/contracts.ts",
      "src/router.ts",
      "src/storage/index.ts",
    ]);
    expect(
      context.files.find((file) => file.path === "src/contracts.ts")?.reasons,
    ).toContain("Dependency of src/orders.ts");
    expect(
      context.files.find((file) => file.path === "src/router.ts")?.reasons,
    ).toContain("Consumer of src/orders.ts");
    expect(context.files.every((file) => file.source === undefined)).toBe(true);
    expect(context.mode).toBe("references");
    expect(formatTaskContext(context)).not.toContain(
      "saveOrder(); return order",
    );
    expect(context.text).toContain("untrusted");
  });

  it("finds route/contract keywords and explicit paths mentioned by the task", async () => {
    graph();
    const keyword = await buildTaskContext(root, {
      keywords: ["Status"],
      depth: 0,
    });
    expect(keyword.files.map((file) => file.path)).toEqual([
      "src/contracts.ts",
    ]);
    const task = await buildTaskContext(root, {
      task: "Change src/orders.ts",
      depth: 0,
    });
    expect(
      task.files.find((file) => file.path === "src/orders.ts")?.reasons,
    ).toContain("Explicit path: src/orders.ts");
    expect(task.files.map((file) => file.path)).toEqual(["src/orders.ts"]);
    const route = await buildTaskContext(root, {
      keywords: ["/orders"],
      depth: 0,
    });
    expect(route.files.map((file) => file.path)).toContain("src/orders.ts");
  });

  it("keeps unsupported languages as references without inventing an import graph", async () => {
    write("billing.py", "from private import something\ndef pay(): pass");
    write("private.py", "pass");
    const map = await buildCodeMap(root);
    const billing = map.files.find((file) => file.path === "billing.py")!;
    expect(billing.analysis).toBe("reference-only");
    expect(billing.symbols).toEqual([]);
    expect(billing.dependencies).toEqual([]);
    expect(
      (await buildTaskContext(root, { paths: ["billing.py"] })).files.map(
        (file) => file.path,
      ),
    ).toEqual(["billing.py"]);
  });

  it("excludes sensitive paths, embedded credentials, generated output and instruction files", async () => {
    write("safe.ts", "export const safe = 1;");
    write(".env.production", "TOKEN=EXCLUDED_ENV_MARKER");
    write("credentials.json", '{"value":"EXCLUDED_CREDENTIAL_MARKER"}');
    write("ordinary.ts", 'const api_key = "EXCLUDED_EMBEDDED_KEY_MARKER";');
    write(
      "connection.ts",
      'const url = "https://person:EXCLUDED_PASSWORD_MARKER@example.test";',
    );
    write("dist/generated.ts", "EXCLUDED_BUILD_MARKER");
    write("node_modules/pkg/source.ts", "EXCLUDED_DEPENDENCY_MARKER");
    write(".git/config.json", "EXCLUDED_GIT_MARKER");
    write("AGENTS.md", "EXCLUDED_INSTRUCTIONS_MARKER");
    const map = await buildCodeMap(root);
    expect(map.files.map((file) => file.path)).toEqual(["safe.ts"]);
    expect(map.notices.some((item) => item.code === "secret-content")).toBe(
      true,
    );
    const context = await buildTaskContext(root, {
      paths: ["safe.ts", "ordinary.ts", ".env.production"],
      includeSource: true,
    });
    expect(JSON.stringify(context)).not.toMatch(/EXCLUDED_/);
    expect(context.notices.some((item) => item.code === "unsafe-seed")).toBe(
      true,
    );
  });

  it("does not follow directory junctions and rejects unsafe seeds/root links", async () => {
    fs.writeFileSync(
      path.join(outside, "private.ts"),
      "EXCLUDED_OUTSIDE_MARKER",
    );
    fs.symlinkSync(
      outside,
      path.join(root, "linked"),
      process.platform === "win32" ? "junction" : "dir",
    );
    write("safe.ts", "export const safe = 1;");
    const context = await buildTaskContext(root, {
      paths: [
        "../private.ts",
        "linked/private.ts",
        path.join(outside, "private.ts"),
      ],
      includeSource: true,
    });
    expect(context.files).toEqual([]);
    expect(context.notices.some((item) => item.code === "symlink")).toBe(true);
    expect(JSON.stringify(context)).not.toContain("EXCLUDED_OUTSIDE_MARKER");
    await expect(buildCodeMap(path.join(root, "linked"))).rejects.toThrow(
      /root/,
    );
  });

  it("includes source only when explicitly authorized and bounds JSON-escaped text and token estimates", async () => {
    write(
      "entry.ts",
      `export const message = '${"\\n".repeat(2000)}';\n${"// ordinary comment\n".repeat(1000)}`,
    );
    const references = await buildTaskContext(root, { paths: ["entry.ts"] });
    expect(references.files[0].source).toBeUndefined();
    const source = await buildTaskContext(root, {
      paths: ["entry.ts"],
      includeSource: true,
      maxSourceCharacters: 150,
      maxCharacters: 1500,
      maxTokens: 300,
    });
    expect(source.files[0].source?.length).toBeLessThanOrEqual(150);
    expect(source.files[0].sourceTruncated).toBe(true);
    expect(source.characters).toBe(source.text.length);
    expect(source.characters).toBeLessThanOrEqual(1200);
    expect(source.estimatedTokens).toBe(Math.ceil(source.characters / 4));
    expect(source.estimatedTokens).toBeLessThanOrEqual(300);
  });

  it("reports file/text budgets, scan limits and missing seeds without claiming full verification", async () => {
    graph();
    const context = await buildTaskContext(root, {
      paths: ["src"],
      maxFiles: 1,
      maxCharacters: 512,
      maxTokens: 128,
    });
    expect(context.files.length).toBeLessThanOrEqual(1);
    expect(context.text.length).toBeLessThanOrEqual(512);
    expect(context.omittedFiles).toBeGreaterThan(0);
    expect(context.notices.some((item) => item.code === "context-budget")).toBe(
      true,
    );
    const partial = await buildCodeMap(root, { maxFiles: 1 });
    expect(partial.complete).toBe(false);
    expect(partial.notices.some((item) => item.code === "file-budget")).toBe(
      true,
    );
    const empty = await buildTaskContext(root, { paths: ["missing.ts"] });
    expect(empty.notices.map((item) => item.code)).toContain("missing-seed");
    expect(empty.notices.map((item) => item.code)).toContain("no-seeds");
  });

  it("reports malformed configs, corrupted encoding, binary data, oversize and lexical truncation", async () => {
    write("tsconfig.json", "{broken");
    write("corrupted.ts", Buffer.from([0xc3, 0x28]));
    write("binary.ts", Buffer.from([65, 0, 66]));
    write("too-big.ts", "a".repeat(1500));
    write("unterminated.ts", "export const x = 1; /* unclosed");
    const map = await buildCodeMap(root, { maxFileBytes: 1000 });
    expect(map.complete).toBe(false);
    expect(map.notices.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "invalid-config",
        "invalid-encoding",
        "binary",
        "oversize",
        "lexical-partial",
      ]),
    );
    expect(map.files.some((file) => file.path === "corrupted.ts")).toBe(false);
    write("many-tokens.ts", "export const v = 1;\n".repeat(20));
    const bounded = await buildCodeMap(root, { maxParseTokens: 16 });
    expect(
      bounded.notices.some((item) => item.code === "lexical-partial"),
    ).toBe(true);
  });

  it("reports read failures explicitly instead of returning a verified partial map", async () => {
    write("entry.ts", "export const entry = 1;");
    vi.spyOn(fs, "readSync").mockImplementation(() => {
      throw Object.assign(new Error("read failure"), { code: "EIO" });
    });
    const map = await buildCodeMap(root);
    expect(map.files).toEqual([]);
    expect(map.complete).toBe(false);
    expect(map.notices).toContainEqual({
      code: "unreadable:EIO",
      message: "File excluded after safe read; content unavailable.",
      path: "entry.ts",
    });
  });

  it("does not include source that becomes sensitive after mapping", async () => {
    write("entry.ts", "export const entry = 1;");
    const originalOpen = fs.openSync;
    let opens = 0;
    vi.spyOn(fs, "openSync").mockImplementation(
      (...args: Parameters<typeof fs.openSync>) => {
        if (String(args[0]) === path.join(root, "entry.ts") && ++opens === 2) {
          write(
            "entry.ts",
            'const password = "NEW_PRIVATE_CREDENTIAL_MARKER";',
          );
        }
        return originalOpen(...args);
      },
    );
    const context = await buildTaskContext(root, {
      paths: ["entry.ts"],
      includeSource: true,
    });
    expect(context.files[0].source).toBeUndefined();
    expect(context.complete).toBe(false);
    expect(
      context.notices.some((item) => item.code === "source-unavailable"),
    ).toBe(true);
    expect(JSON.stringify(context)).not.toContain(
      "NEW_PRIVATE_CREDENTIAL_MARKER",
    );
  });

  it("reports entry/byte bounds and avoids false imports in unsupported template interpolation", async () => {
    write(
      "entry.ts",
      "import './real';\nconst example = `outer ${`import './fake'`} tail`;\nimport './fake';",
    );
    write("real.ts", "export const real = 1;");
    write("fake.ts", "export const fake = 1;");
    const map = await buildCodeMap(root);
    expect(
      map.files.find((file) => file.path === "entry.ts")?.dependencies,
    ).toEqual(["real.ts"]);
    expect(map.notices.some((item) => item.code === "lexical-partial")).toBe(
      true,
    );
    const entries = await buildCodeMap(root, { maxEntries: 1 });
    expect(entries.complete).toBe(false);
    expect(entries.notices.some((item) => item.code === "entry-budget")).toBe(
      true,
    );
    const bytes = await buildCodeMap(root, { maxTotalBytes: 64 });
    expect(bytes.complete).toBe(false);
    expect(bytes.scannedBytes).toBeLessThanOrEqual(64);
    expect(bytes.notices.some((item) => item.code === "byte-budget")).toBe(
      true,
    );
  });

  it("fingerprints graph inputs deterministically and detects content/alias/addition/deletion changes", async () => {
    graph();
    const before = await buildCodeMap(root);
    expect((await buildCodeMap(root)).fingerprint).toBe(before.fingerprint);
    expect((await checkCodeMapFreshness(root, before)).stale).toBe(false);
    write("dist/output.ts", "generated output changed");
    write(".env", "TOKEN=private");
    expect((await checkCodeMapFreshness(root, before)).stale).toBe(false);
    write("src/contracts.ts", "export interface Order { id: number }");
    expect((await checkCodeMapFreshness(root, before)).stale).toBe(true);
    const changed = await buildCodeMap(root);
    write("tsconfig.json", '{"compilerOptions":{"paths":{"@/*":["src/*"]}}}');
    expect((await checkCodeMapFreshness(root, changed)).stale).toBe(true);
    const aliased = await buildCodeMap(root);
    write("new.ts", "export const added = true;");
    expect((await checkCodeMapFreshness(root, aliased)).stale).toBe(true);
    const added = await buildCodeMap(root);
    fs.unlinkSync(path.join(root, "new.ts"));
    expect((await checkCodeMapFreshness(root, added)).stale).toBe(true);
  });

  it("does not turn truncated long literals or identifiers into misleading relationships", async () => {
    write(
      "entry.ts",
      `import '${"x".repeat(600)}';\nexport const ${"a".repeat(150)} = 1;`,
    );
    const map = await buildCodeMap(root);
    const entry = map.files.find((file) => file.path === "entry.ts")!;
    expect(entry.imports).toEqual([]);
    expect(entry.symbols).toEqual([]);
    expect(map.complete).toBe(false);
    expect(map.notices.some((item) => item.code === "lexical-partial")).toBe(
      true,
    );
  });

  it("keeps imports before JSX but never treats JSX text as import statements", async () => {
    write(
      "view.tsx",
      "import './model';\nexport const View = () => <main>import './fake'</main>;",
    );
    write("model.ts", "export const model = 1;");
    write("fake.ts", "export const fake = 1;");
    const map = await buildCodeMap(root);
    expect(
      map.files.find((file) => file.path === "view.tsx")?.dependencies,
    ).toEqual(["model.ts"]);
    expect(map.notices.some((item) => item.code === "lexical-partial")).toBe(
      true,
    );
    expect(map.complete).toBe(false);
  });

  it("never executes project scripts or changes project files", async () => {
    write("package.json", '{"scripts":{"test":"create-danger-marker"}}');
    write("entry.ts", "export const entry = 1;");
    const names = fs.readdirSync(root);
    const original = fs.readFileSync(path.join(root, "package.json"), "utf8");
    await buildTaskContext(root, { paths: ["entry.ts"], includeSource: true });
    expect(fs.readdirSync(root)).toEqual(names);
    expect(fs.readFileSync(path.join(root, "package.json"), "utf8")).toBe(
      original,
    );
  });

  it("rejects invalid/unbounded options at runtime", async () => {
    await expect(
      buildCodeMap(root, { maxFiles: Number.POSITIVE_INFINITY }),
    ).rejects.toThrow(/maxFiles/);
    await expect(buildTaskContext(root, { maxTokens: 0 })).rejects.toThrow(
      /maxTokens/,
    );
    await expect(
      buildTaskContext(root, { task: "a".repeat(4097) }),
    ).rejects.toThrow(/task/);
    await expect(
      buildTaskContext(root, { includeSource: "yes" as unknown as boolean }),
    ).rejects.toThrow(/includeSource/);
  });
});
