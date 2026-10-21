import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  checkDocs,
  checkVersions,
  collectFacts,
  syncDocs,
  type FactName,
} from "../src/core/docsFacts.js";
import { PACKAGE_ROOT } from "../src/core/version.js";

const facts: Record<FactName, string> = {
  version: "1.2.3",
  skills: "12",
  prompts: "98",
  library: "105",
  catalog: "41",
  goals: "23",
  modules: "14",
  mcpTools: "9",
  evalCases: "124",
};

describe("documentation drift control", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "helen-docs-"));
    fs.mkdirSync(path.join(tmp, "docs"), { recursive: true });
    fs.mkdirSync(path.join(tmp, "src"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "src", "real.ts"), "");
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it("accepts markers that match the repository", () => {
    fs.writeFileSync(
      path.join(tmp, "README.md"),
      "We ship <!--fact:skills-->12<!--/fact--> skills.\n",
    );
    expect(checkDocs(tmp, facts)).toEqual([]);
  });

  it("flags stale and unknown markers with their line", () => {
    fs.writeFileSync(
      path.join(tmp, "README.md"),
      "ok\nWe ship <!--fact:skills-->15<!--/fact--> skills and <!--fact:nope-->1<!--/fact-->.\n",
    );
    const issues = checkDocs(tmp, facts);
    expect(issues.map((i) => [i.line, i.kind])).toEqual([
      [2, "fact"],
      [2, "fact"],
    ]);
    expect(issues[0]!.message).toContain('"15"');
    expect(issues[1]!.message).toContain("Unknown fact");
  });

  it("flags references to repository files that do not exist, but not placeholders, fences or install targets", () => {
    fs.writeFileSync(
      path.join(tmp, "README.md"),
      [
        "See `src/real.ts` and `src/missing.ts` and `.github/workflows/ghost.yml`.",
        "Placeholders `docs/<phase>/x.md`, globs `src/*.ts`, install targets `.claude/skills` are ignored.",
        "```",
        "`src/in-a-fence.ts`",
        "```",
      ].join("\n"),
    );
    const messages = checkDocs(tmp, facts).map((i) => i.message);
    expect(messages).toEqual([
      "`src/missing.ts` does not exist in the repository",
      "`.github/workflows/ghost.yml` does not exist in the repository",
    ]);
  });

  it("flags broken relative links but not URLs or anchors", () => {
    fs.writeFileSync(
      path.join(tmp, "docs", "GUIA.md"),
      "[ok](../src/real.ts) [bad](GONE.md) [web](https://example.com) [anchor](#top)\n",
    );
    expect(checkDocs(tmp, facts).map((i) => i.message)).toEqual([
      "Broken link: GONE.md",
    ]);
  });

  it("only holds the newest CHANGELOG sections to the repository", () => {
    fs.writeFileSync(
      path.join(tmp, "CHANGELOG.md"),
      [
        "# Changelog",
        "## Unreleased",
        "Adds `src/real.ts`.",
        "## 2.0.0",
        "x",
        "## 1.9.0",
        "y",
        "## 1.0.0",
        "Removed `src/long-gone.ts`.",
      ].join("\n"),
    );
    expect(checkDocs(tmp, facts)).toEqual([]);
    fs.writeFileSync(
      path.join(tmp, "CHANGELOG.md"),
      "# Changelog\n## Unreleased\nAdds `src/ghost.ts`.\n",
    );
    expect(checkDocs(tmp, facts).map((i) => i.kind)).toEqual(["reference"]);
  });

  it("syncs stale markers in place", () => {
    fs.writeFileSync(
      path.join(tmp, "README.md"),
      "A <!--fact:skills-->1<!--/fact--> B <!--fact:catalog-->2<!--/fact-->\n",
    );
    expect(syncDocs(tmp, facts)).toEqual(["README.md"]);
    expect(fs.readFileSync(path.join(tmp, "README.md"), "utf8")).toBe(
      "A <!--fact:skills-->12<!--/fact--> B <!--fact:catalog-->41<!--/fact-->\n",
    );
    expect(syncDocs(tmp, facts)).toEqual([]);
  });

  it("requires every versioned file to agree with package.json", () => {
    fs.writeFileSync(
      path.join(tmp, ".release-please-manifest.json"),
      JSON.stringify({ ".": "1.2.2" }),
    );
    fs.mkdirSync(path.join(tmp, ".claude-plugin"));
    fs.writeFileSync(
      path.join(tmp, ".claude-plugin", "plugin.json"),
      JSON.stringify({ version: "1.2.3" }),
    );
    expect(checkVersions(tmp, "1.2.3").map((i) => i.file)).toEqual([
      ".release-please-manifest.json",
    ]);
  });

  it("keeps this repository consistent with what its documents claim", () => {
    const issues = checkDocs(PACKAGE_ROOT, collectFacts(PACKAGE_ROOT));
    expect(issues.map((i) => `${i.file}:${i.line} ${i.message}`)).toEqual([]);
  });
});
