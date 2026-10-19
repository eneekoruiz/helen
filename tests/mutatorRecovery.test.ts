import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  readConfig,
  setConfigValue,
  updateConfig,
} from "../src/core/config.js";
import { generateModuleDocs } from "../src/core/docs.js";
import {
  runProjectOperationSync,
  writeAtomicFile,
} from "../src/core/operations.js";

describe("remaining project mutators respect recovery boundaries", () => {
  let cwd: string;
  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), "helen-mutator-recovery-"));
  });
  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  const interrupt = () => {
    expect(() =>
      runProjectOperationSync(cwd, "interrupted-test", () => {
        writeAtomicFile(path.join(cwd, "partial.txt"), "partial");
        throw new Error("interrupted");
      }),
    ).toThrow(/recover/);
  };

  it("does not update configuration or generate documentation across an unfinished operation", async () => {
    updateConfig(cwd, { projectName: "keep-this" });
    const before = fs.readFileSync(path.join(cwd, ".helenrc"), "utf8");
    interrupt();
    expect(() => setConfigValue(cwd, "projectName", "overwrite")).toThrow(
      /recover/,
    );
    await expect(generateModuleDocs(cwd)).rejects.toThrow(/recover/);
    expect(fs.readFileSync(path.join(cwd, ".helenrc"), "utf8")).toBe(before);
    expect(fs.existsSync(path.join(cwd, "docs"))).toBe(false);
  });

  it("preserves corrupt configuration when an earlier operation needs recovery", () => {
    fs.writeFileSync(path.join(cwd, ".helenrc"), "{corrupt-but-keep");
    interrupt();
    expect(readConfig(cwd)).toBeNull();
    expect(fs.readFileSync(path.join(cwd, ".helenrc"), "utf8")).toBe(
      "{corrupt-but-keep",
    );
    expect(fs.existsSync(path.join(cwd, ".helenrc.corrupt"))).toBe(false);
  });

  it("refuses a documentation junction outside the project", async () => {
    const outside = fs.mkdtempSync(
      path.join(os.tmpdir(), "helen-docs-outside-"),
    );
    try {
      fs.symlinkSync(
        outside,
        path.join(cwd, "docs"),
        process.platform === "win32" ? "junction" : "dir",
      );
      await expect(generateModuleDocs(cwd)).rejects.toThrow(
        /inside the project/,
      );
      expect(fs.readdirSync(outside)).toEqual([]);
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });
});
