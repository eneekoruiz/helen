import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, it, vi } from "vitest";
import { listPromptEntries, readPrompt } from "../src/core/prompts.js";

it("reuses prompt metadata while observing edits, additions, removals and caller mutations", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "helen-prompt-index-"));
  const file = path.join(root, "RULES.md");
  const content = "---\naliases: [original]\n---\n# First rules\n";
  fs.writeFileSync(file, content);
  const read = vi.spyOn(fs, "readFileSync");
  try {
    const first = listPromptEntries(root);
    const reads = () =>
      read.mock.calls.filter(([name]) => name === file).length;
    expect(reads()).toBe(1);
    first[0]!.aliases.push("mutated");
    expect(listPromptEntries(root)[0]!.aliases).toEqual(["original"]);
    expect(reads()).toBe(1);

    const before = fs.statSync(file);
    fs.writeFileSync(file, content.replace("First", "Fresh"));
    fs.utimesSync(file, before.atime, before.mtime);
    expect(listPromptEntries(root)[0]!.title).toBe("Fresh rules");
    expect(reads()).toBe(2);
    expect(readPrompt("rules", root)).toContain("Fresh rules");

    fs.writeFileSync(path.join(root, "CONTRACT.md"), "# Contract");
    expect(listPromptEntries(root)).toHaveLength(2);
    fs.unlinkSync(file);
    expect(listPromptEntries(root).map((entry) => entry.id)).toEqual([
      "contract",
    ]);
    fs.writeFileSync(file, "# Recreated");
    expect(
      listPromptEntries(root).find((entry) => entry.id === "rules")!.title,
    ).toBe("Recreated");
  } finally {
    read.mockRestore();
    fs.rmSync(root, { recursive: true, force: true });
  }
});
