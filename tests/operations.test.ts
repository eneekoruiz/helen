import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  runProjectOperation,
  runProjectOperationSync,
  listOperations,
  recoverOperation,
  writeAtomicFile,
  removeTrackedFile,
} from "../src/core/operations.js";
import { writeFileSafe, patchJson, appendOnce } from "../src/core/fs.js";
import { withPreview, getPlannedContent } from "../src/core/preview.js";
import { updateConfig } from "../src/core/config.js";

describe("Durable project operations", () => {
  let cwd: string;
  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), "helen-operation-"));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  it("uses the same lock for synchronous and asynchronous mutations", async () => {
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    const active = runProjectOperation(cwd, "async", async () => {
      await waiting;
    });
    try {
      expect(() =>
        runProjectOperationSync(cwd, "sync", () =>
          writeAtomicFile(path.join(cwd, "blocked.txt"), "blocked"),
        ),
      ).toThrow("needs recovery");
    } finally {
      release();
      await active;
    }
    expect(fs.existsSync(path.join(cwd, "blocked.txt"))).toBe(false);
    expect(
      runProjectOperationSync(cwd, "sync", () => {
        writeAtomicFile(path.join(cwd, "committed.txt"), "complete");
        return "done";
      }),
    ).toEqual({ value: "done", operation: undefined });
    expect(listOperations(cwd)).toEqual([]);
  });

  it("joins synchronous nested work and refuses an implicit different project scope", async () => {
    const other = fs.mkdtempSync(
      path.join(os.tmpdir(), "helen-other-operation-"),
    );
    try {
      await expect(
        runProjectOperation(cwd, "outer", async () => {
          runProjectOperationSync(cwd, "inner", () =>
            writeAtomicFile(path.join(cwd, "inside.txt"), "inside"),
          );
          runProjectOperationSync(other, "unrelated", () =>
            writeAtomicFile(path.join(other, "outside.txt"), "outside"),
          );
        }),
      ).rejects.toThrow("same project directory");
      expect(fs.existsSync(path.join(other, "outside.txt"))).toBe(false);
      const pending = listOperations(cwd);
      expect(pending).toHaveLength(1);
      expect(pending[0]!.files).toEqual(["inside.txt"]);
      recoverOperation(cwd, pending[0]!.id);
      expect(fs.existsSync(path.join(cwd, "inside.txt"))).toBe(false);
    } finally {
      fs.rmSync(other, { recursive: true, force: true });
    }
  });

  it("does not commit a failed nested operation when its caller catches the error", () => {
    expect(() =>
      runProjectOperationSync(cwd, "outer", () => {
        try {
          runProjectOperationSync(
            cwd,
            "inner",
            () => {
              writeAtomicFile(path.join(cwd, "partial.txt"), "partial");
              return false;
            },
            (value) => value,
          );
        } catch {
          /* The outer operation must still remain failed. */
        }
      }),
    ).toThrow("did not complete");
    const pending = listOperations(cwd)[0]!;
    recoverOperation(cwd, pending.id);
    expect(fs.existsSync(path.join(cwd, "partial.txt"))).toBe(false);
  });

  it("does not commit nested work when its exception was caught by its caller", async () => {
    await expect(
      runProjectOperation(cwd, "outer", async () => {
        try {
          await runProjectOperation(cwd, "inner", async () => {
            writeAtomicFile(path.join(cwd, "partial.txt"), "partial");
            throw new Error("nested interruption");
          });
        } catch {
          /* Keep the outer operation pending even when this error is caught. */
        }
      }),
    ).rejects.toThrow("nested interruption");
    recoverOperation(cwd, listOperations(cwd)[0]!.id);
    expect(fs.existsSync(path.join(cwd, "partial.txt"))).toBe(false);
  });

  it.each(["sync", "async"] as const)(
    "preserves recovery when a caught %s failure has an undefined rejection reason",
    async (mode) => {
      const file = path.join(cwd, "original.txt");
      fs.writeFileSync(file, "original");
      await expect(
        runProjectOperation(cwd, "outer", async () => {
          try {
            if (mode === "sync") {
              runProjectOperationSync(cwd, "inner", () => {
                writeAtomicFile(file, "partial");
                throw undefined;
              });
            } else {
              await runProjectOperation(cwd, "inner", async () => {
                writeAtomicFile(file, "partial");
                throw undefined;
              });
            }
          } catch {
            /* A rejection without an Error object must still prevent commit. */
          }
        }),
      ).rejects.toThrow("did not complete: undefined");
      expect(fs.readFileSync(file, "utf8")).toBe("partial");
      const pending = listOperations(cwd);
      expect(pending).toHaveLength(1);
      recoverOperation(cwd, pending[0]!.id);
      expect(fs.readFileSync(file, "utf8")).toBe("original");
      expect(listOperations(cwd)).toEqual([]);
    },
  );

  it("refuses asynchronous actions in the synchronous operation API", () => {
    expect(() =>
      runProjectOperationSync(cwd, "bad sync", async () => "done"),
    ).toThrow("must not return a Promise");
    expect(listOperations(cwd)).toEqual([]);
  });

  it.skipIf(process.platform !== "win32")(
    "recovers writes using different Windows casing as one file",
    () => {
      const original = path.join(cwd, "CASE.txt");
      fs.writeFileSync(original, "original");
      const failed = runProjectOperationSync(
        cwd,
        "case aliases",
        () => {
          writeAtomicFile(original, "first");
          writeAtomicFile(path.join(cwd, "case.TXT"), "second");
          return false;
        },
        (value) => value,
      );
      expect(failed.operation!.files).toHaveLength(1);
      recoverOperation(cwd, failed.operation!.id);
      expect(fs.readFileSync(original, "utf8")).toBe("original");
    },
  );

  it.skipIf(process.platform !== "win32")(
    "protects operation metadata from alternate Windows casing",
    () => {
      expect(() =>
        runProjectOperationSync(cwd, "metadata aliases", () => {
          writeAtomicFile(
            path.join(cwd, ".HELEN/OPERATIONS/metadata.txt"),
            "unsafe",
          );
        }),
      ).toThrow("journals cannot be mutated");
      expect(
        fs.existsSync(path.join(cwd, ".helen/operations/metadata.txt")),
      ).toBe(false);
    },
  );

  it("excludes a second recovery and new operations until the full restore has finished", () => {
    const first = path.join(cwd, "first.txt");
    const second = path.join(cwd, "second.txt");
    fs.writeFileSync(first, "first original");
    fs.writeFileSync(second, "second original");
    const failed = runProjectOperationSync(
      cwd,
      "partial",
      () => {
        writeAtomicFile(first, "first changed");
        writeAtomicFile(second, "second changed");
        return false;
      },
      (value) => value,
    );
    const originalRename = fs.renameSync;
    let inspected = false;
    vi.spyOn(fs, "renameSync").mockImplementation((source, destination) => {
      if (!inspected && path.resolve(String(destination)) === second) {
        inspected = true;
        expect(() => recoverOperation(cwd, failed.operation!.id)).toThrow(
          "still running",
        );
        expect(() =>
          runProjectOperationSync(cwd, "new", () =>
            writeAtomicFile(second, "new user edit"),
          ),
        ).toThrow("unfinished recovery");
      }
      originalRename(source, destination);
    });
    recoverOperation(cwd, failed.operation!.id);
    expect(inspected).toBe(true);
    expect(fs.readFileSync(first, "utf8")).toBe("first original");
    expect(fs.readFileSync(second, "utf8")).toBe("second original");
    runProjectOperationSync(cwd, "new", () =>
      writeAtomicFile(second, "new user edit"),
    );
    expect(fs.readFileSync(second, "utf8")).toBe("new user edit");
  });

  it("reclaims a terminated recovery without deleting its immutable lease", () => {
    const file = path.join(cwd, "file.txt");
    fs.writeFileSync(file, "original");
    const failed = runProjectOperationSync(
      cwd,
      "partial",
      () => {
        writeAtomicFile(file, "changed");
        return false;
      },
      (value) => value,
    );
    const child = spawnSync(process.execPath, ["-e", "process.exit(0)"], {
      windowsHide: true,
      timeout: 30_000,
    });
    expect(child.error).toBeUndefined();
    const lease = {
      version: 1,
      id: randomUUID(),
      operationId: failed.operation!.id,
      ownerPid: child.pid,
      status: "active",
    };
    const leaseFile = path.join(cwd, ".helen/operations/.recovery.lock");
    fs.writeFileSync(leaseFile, JSON.stringify(lease));
    recoverOperation(cwd, failed.operation!.id);
    expect(fs.readFileSync(file, "utf8")).toBe("original");
    expect(JSON.parse(fs.readFileSync(leaseFile, "utf8"))).toEqual(lease);
    const next = JSON.parse(
      fs.readFileSync(
        path.join(cwd, `.helen/operations/.recovery.${lease.id}.lock`),
        "utf8",
      ),
    );
    expect(next.status).toBe("released");
    runProjectOperationSync(cwd, "new", () =>
      writeAtomicFile(file, "new edit"),
    );
    expect(fs.readFileSync(file, "utf8")).toBe("new edit");
  });

  it("lets only one claimant acquire the successor of a crashed recovery lease", () => {
    const file = path.join(cwd, "file.txt");
    fs.writeFileSync(file, "original");
    const failed = runProjectOperationSync(
      cwd,
      "partial",
      () => {
        writeAtomicFile(file, "changed");
        return false;
      },
      (value) => value,
    );
    const child = spawnSync(process.execPath, ["-e", "process.exit(0)"], {
      windowsHide: true,
      timeout: 30_000,
    });
    expect(child.error).toBeUndefined();
    const stale = {
      version: 1,
      id: randomUUID(),
      operationId: failed.operation!.id,
      ownerPid: child.pid,
      status: "active",
    };
    fs.writeFileSync(
      path.join(cwd, ".helen/operations/.recovery.lock"),
      JSON.stringify(stale),
    );
    const competitor = { ...stale, id: randomUUID(), ownerPid: process.pid };
    const successor = path.join(
      cwd,
      `.helen/operations/.recovery.${stale.id}.lock`,
    );
    const originalLink = fs.linkSync;
    vi.spyOn(fs, "linkSync").mockImplementation((source, destination) => {
      if (path.resolve(String(destination)) === successor) {
        fs.writeFileSync(successor, JSON.stringify(competitor));
        throw Object.assign(new Error("Another recovery acquired the lease"), {
          code: "EEXIST",
        });
      }
      originalLink(source, destination);
    });
    expect(() => recoverOperation(cwd, failed.operation!.id)).toThrow(
      "still running",
    );
    vi.restoreAllMocks();
    expect(fs.readFileSync(file, "utf8")).toBe("changed");
    expect(JSON.parse(fs.readFileSync(successor, "utf8"))).toEqual(competitor);
    expect(listOperations(cwd)).toHaveLength(1);
    fs.writeFileSync(
      successor,
      JSON.stringify({ ...competitor, status: "released" }),
    );
    recoverOperation(cwd, failed.operation!.id);
    expect(fs.readFileSync(file, "utf8")).toBe("original");
  });

  it("reconciles a recovery terminated after journal cleanup before its lease was released", () => {
    const child = spawnSync(process.execPath, ["-e", "process.exit(0)"], {
      windowsHide: true,
      timeout: 30_000,
    });
    expect(child.error).toBeUndefined();
    const lease = {
      version: 1,
      id: randomUUID(),
      operationId: randomUUID(),
      ownerPid: child.pid,
      status: "active",
    };
    fs.mkdirSync(path.join(cwd, ".helen/operations"), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, ".helen/operations/.recovery.lock"),
      JSON.stringify(lease),
    );
    runProjectOperationSync(cwd, "new", () =>
      writeAtomicFile(path.join(cwd, "new.txt"), "safe"),
    );
    expect(fs.readFileSync(path.join(cwd, "new.txt"), "utf8")).toBe("safe");
    expect(listOperations(cwd)).toEqual([]);
  });

  it("keeps recovery available when a filesystem helper catches a failed write", () => {
    const originalRename = fs.renameSync;
    const file = path.join(cwd, "failed.txt");
    vi.spyOn(fs, "renameSync").mockImplementation((source, destination) => {
      if (path.resolve(String(destination)) === file)
        throw new Error("write failure");
      originalRename(source, destination);
    });
    expect(() =>
      runProjectOperationSync(cwd, "partial", () => {
        writeAtomicFile(path.join(cwd, "written.txt"), "partial");
        expect(writeFileSafe(file, "failed", { root: cwd })).toBe("skipped");
      }),
    ).toThrow("write failure");
    vi.restoreAllMocks();
    recoverOperation(cwd, listOperations(cwd)[0]!.id);
    expect(fs.existsSync(path.join(cwd, "written.txt"))).toBe(false);
    expect(fs.existsSync(file)).toBe(false);
  });

  it("allows a successful retry to resolve a transient atomic write failure", () => {
    const originalRename = fs.renameSync;
    const file = path.join(cwd, "retry.txt");
    let failed = false;
    vi.spyOn(fs, "renameSync").mockImplementation((source, destination) => {
      if (!failed && path.resolve(String(destination)) === file) {
        failed = true;
        throw new Error("transient write failure");
      }
      originalRename(source, destination);
    });
    runProjectOperationSync(cwd, "retry", () => {
      try {
        writeAtomicFile(file, "complete");
      } catch {
        writeAtomicFile(file, "complete");
      }
    });
    expect(fs.readFileSync(file, "utf8")).toBe("complete");
    expect(listOperations(cwd)).toEqual([]);
  });

  it("rejects a deferred mutation after its operation has committed", async () => {
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    let deferred!: Promise<void>;
    await runProjectOperation(cwd, "closed", async () => {
      deferred = (async () => {
        await waiting;
        writeAtomicFile(path.join(cwd, "late.txt"), "late");
      })();
    });
    release();
    await expect(deferred).rejects.toThrow("already finished");
    expect(fs.existsSync(path.join(cwd, "late.txt"))).toBe(false);
    expect(listOperations(cwd)).toEqual([]);
  });

  it("commits atomic writes without leaving snapshots or locks", async () => {
    const file = path.join(cwd, "file.txt");
    await runProjectOperation(cwd, "test", async () => {
      writeAtomicFile(file, "complete");
    });
    expect(fs.readFileSync(file, "utf8")).toBe("complete");
    expect(listOperations(cwd)).toEqual([]);
    expect(fs.readdirSync(path.join(cwd, ".helen/operations"))).toEqual([
      ".gitignore",
    ]);
  });

  it.each(["committed", "recovered"])(
    "reconciles a crash after %s was saved but before lock cleanup",
    async (status) => {
      const id = randomUUID();
      const directory = path.join(cwd, ".helen/operations");
      fs.mkdirSync(directory, { recursive: true });
      const journal = path.join(directory, `${id}.json`);
      fs.writeFileSync(
        journal,
        JSON.stringify({
          version: 1,
          id,
          kind: "test",
          status,
          startedAt: new Date().toISOString(),
          entries: [],
          temporaries: [],
        }),
      );
      fs.linkSync(journal, path.join(directory, ".lock"));
      expect(listOperations(cwd)).toEqual([]);
      expect(fs.existsSync(path.join(directory, ".lock"))).toBe(true);
      await runProjectOperation(cwd, "new", async () => {
        writeAtomicFile(path.join(cwd, "new.txt"), "safe");
      });
      expect(fs.readFileSync(path.join(cwd, "new.txt"), "utf8")).toBe("safe");
      expect(fs.existsSync(path.join(directory, ".lock"))).toBe(false);
    },
  );

  it("publishes completion only after releasing the owner lock, and keeps listings read-only", () => {
    const originalUnlink = fs.unlinkSync;
    let observedRelease = false;
    vi.spyOn(fs, "unlinkSync").mockImplementation((file) => {
      if (
        path.resolve(String(file)) ===
        path.join(cwd, ".helen", "operations", ".lock")
      ) {
        const owner = JSON.parse(fs.readFileSync(String(file), "utf8"));
        const journal = JSON.parse(
          fs.readFileSync(
            path.join(cwd, ".helen", "operations", `${owner.id}.json`),
            "utf8",
          ),
        );
        expect(journal.status).toBe("active");
        expect(listOperations(cwd)).toHaveLength(1);
        expect(fs.existsSync(String(file))).toBe(true);
        observedRelease = true;
      }
      originalUnlink(file);
    });
    runProjectOperationSync(cwd, "complete-with-safe-lock-order", () =>
      writeAtomicFile(path.join(cwd, "done.txt"), "finished"),
    );
    expect(observedRelease).toBe(true);
    expect(listOperations(cwd)).toEqual([]);
  });

  it("tolerates a completed journal disappearing after directory enumeration", () => {
    const failed = runProjectOperationSync(
      cwd,
      "complete-between-reads",
      () => {
        writeAtomicFile(path.join(cwd, "file.txt"), "data");
        return false;
      },
      (value) => value,
    );
    const file = path.join(
      cwd,
      ".helen",
      "operations",
      `${failed.operation!.id}.json`,
    );
    const originalRead = fs.readFileSync;
    vi.spyOn(fs, "readFileSync").mockImplementation(((
      target: fs.PathOrFileDescriptor,
      ...args: unknown[]
    ) => {
      if (typeof target === "string" && path.resolve(target) === file) {
        throw Object.assign(new Error("journal removed by completed writer"), {
          code: "ENOENT",
        });
      }
      return Reflect.apply(originalRead, fs, [target, ...args]);
    }) as typeof fs.readFileSync);
    expect(listOperations(cwd)).toEqual([]);
  });

  it("recovers repeated writes, deletions, created files and backup creation after failure", async () => {
    const file = path.join(cwd, "file.txt");
    const removed = path.join(cwd, "removed.txt");
    fs.writeFileSync(file, "original");
    fs.writeFileSync(removed, "keep");
    await expect(
      runProjectOperation(cwd, "test", async () => {
        writeFileSafe(file, "first", { force: true, root: cwd });
        writeFileSafe(file, "second", { force: true, root: cwd });
        writeAtomicFile(path.join(cwd, "new.txt"), "created");
        removeTrackedFile(removed);
        throw new Error("interrupted");
      }),
    ).rejects.toThrow("helen recover");
    const pending = listOperations(cwd)[0]!;
    expect(pending.files).toContain("file.txt.helen-backup");
    expect(JSON.stringify(pending)).not.toContain("original");
    recoverOperation(cwd, pending.id, true);
    expect(fs.readFileSync(file, "utf8")).toBe("second");
    recoverOperation(cwd, pending.id);
    expect(fs.readFileSync(file, "utf8")).toBe("original");
    expect(fs.readFileSync(removed, "utf8")).toBe("keep");
    expect(fs.existsSync(path.join(cwd, "new.txt"))).toBe(false);
    expect(fs.existsSync(`${file}.helen-backup`)).toBe(false);
    expect(listOperations(cwd)).toEqual([]);
  });

  it("blocks new mutations and preserves all files when later user edits conflict with recovery", async () => {
    const file = path.join(cwd, "file.txt");
    fs.writeFileSync(file, "original");
    const failed = await runProjectOperation(
      cwd,
      "test",
      async () => {
        writeAtomicFile(file, "planned");
        return false;
      },
      (value) => value,
    );
    await expect(
      runProjectOperation(cwd, "other", async () => {}),
    ).rejects.toThrow("needs recovery");
    fs.writeFileSync(file, "user edited later");
    expect(() => recoverOperation(cwd, failed.operation!.id)).toThrow(
      "Recovery conflict",
    );
    expect(fs.readFileSync(file, "utf8")).toBe("user edited later");
    fs.writeFileSync(file, "planned");
    recoverOperation(cwd, failed.operation!.id);
    expect(fs.readFileSync(file, "utf8")).toBe("original");
  });

  it("restores corrupt config recovery and preserves existing file permissions", async () => {
    const config = path.join(cwd, ".helenrc");
    fs.writeFileSync(config, "{corrupt", { mode: 0o600 });
    const failed = await runProjectOperation(
      cwd,
      "config",
      async () => {
        updateConfig(cwd, { projectName: "new" });
        return false;
      },
      (value) => value,
    );
    expect(fs.existsSync(path.join(cwd, ".helenrc.corrupt"))).toBe(true);
    if (process.platform !== "win32") {
      expect(fs.statSync(path.join(cwd, ".helenrc.corrupt")).mode & 0o777).toBe(
        0o600,
      );
    }
    recoverOperation(cwd, failed.operation!.id);
    expect(fs.readFileSync(config, "utf8")).toBe("{corrupt");
    expect(fs.existsSync(path.join(cwd, ".helenrc.corrupt"))).toBe(false);
  });

  it("does not let another asynchronous operation enter while an action is running", async () => {
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = runProjectOperation(cwd, "first", async () => {
      await waiting;
    });
    await expect(
      runProjectOperation(cwd, "second", async () => {
        writeAtomicFile(path.join(cwd, "bad.txt"), "bad");
      }),
    ).rejects.toThrow("needs recovery");
    release();
    await first;
    expect(fs.existsSync(path.join(cwd, "bad.txt"))).toBe(false);
    expect(listOperations(cwd)).toEqual([]);
  });

  it("rejects recovery paths escaping the project before changing any file", async () => {
    const file = path.join(cwd, "safe.txt");
    fs.writeFileSync(file, "original");
    const failed = await runProjectOperation(
      cwd,
      "test",
      async () => {
        writeAtomicFile(file, "changed");
        return false;
      },
      (value) => value,
    );
    const manifest = path.join(
      cwd,
      ".helen/operations",
      `${failed.operation!.id}.json`,
    );
    const journal = JSON.parse(fs.readFileSync(manifest, "utf8"));
    journal.entries.push({
      file: "../outside.txt",
      before: null,
      hashes: [null],
    });
    fs.writeFileSync(manifest, JSON.stringify(journal));
    expect(() => recoverOperation(cwd, failed.operation!.id)).toThrow(
      "Unsafe operation file",
    );
    expect(fs.readFileSync(file, "utf8")).toBe("changed");
  });

  it("refuses a corrupted original snapshot before restoring any file", () => {
    const first = path.join(cwd, "first.txt");
    const second = path.join(cwd, "second.txt");
    fs.writeFileSync(first, "first original");
    fs.writeFileSync(second, "second original");
    const failed = runProjectOperationSync(
      cwd,
      "partial",
      () => {
        writeAtomicFile(first, "first changed");
        writeAtomicFile(second, "second changed");
        return false;
      },
      (value) => value,
    );
    const journalFile = path.join(
      cwd,
      `.helen/operations/${failed.operation!.id}.json`,
    );
    const journal = JSON.parse(fs.readFileSync(journalFile, "utf8"));
    journal.entries[0].before =
      Buffer.from("corrupted snapshot").toString("base64");
    fs.writeFileSync(journalFile, JSON.stringify(journal));
    expect(() => recoverOperation(cwd, failed.operation!.id)).toThrow(
      "Invalid original snapshot",
    );
    expect(fs.readFileSync(first, "utf8")).toBe("first changed");
    expect(fs.readFileSync(second, "utf8")).toBe("second changed");
  });

  it("recovers a real terminated process and its leftover temporary files", () => {
    const file = path.join(cwd, "target.txt");
    fs.writeFileSync(file, "original");
    const script = path.join(cwd, "crash.mjs");
    const source = pathToFileURL(path.resolve("dist/core/operations.js")).href;
    fs.writeFileSync(
      script,
      `import fs from 'node:fs'; import path from 'node:path';
      import {runProjectOperation,writeAtomicFile,listOperations} from ${JSON.stringify(source)};
      await runProjectOperation(process.cwd(),'crash',async()=>{
        writeAtomicFile(path.resolve('target.txt'),'changed');
        const op=listOperations(process.cwd())[0];
        const journal=JSON.parse(fs.readFileSync(path.join('.helen/operations',op.id+'.json'),'utf8'));
        fs.writeFileSync(journal.temporaries[0],'partial'); process.exit(17);
      });`,
    );
    const child = spawnSync(process.execPath, [script], {
      cwd,
      encoding: "utf8",
      timeout: 30_000,
      windowsHide: true,
    });
    expect(child.error).toBeUndefined();
    expect(child.status, child.stderr).toBe(17);
    const pending = listOperations(cwd)[0]!;
    expect(pending.status).toBe("active");
    recoverOperation(cwd, pending.id);
    expect(fs.readFileSync(file, "utf8")).toBe("original");
    expect(fs.readdirSync(cwd).filter((name) => name.endsWith(".tmp"))).toEqual(
      [],
    );
    expect(listOperations(cwd)).toEqual([]);
  }, 45_000);

  it("recovers a process terminated during restoration and removes its recorded original-byte temporary", () => {
    const file = path.join(cwd, "target.txt");
    fs.writeFileSync(file, "original bytes");
    const failed = runProjectOperationSync(
      cwd,
      "partial",
      () => {
        writeAtomicFile(file, "changed bytes");
        return false;
      },
      (value) => value,
    );
    const script = path.join(cwd, "recovery-crash.mjs");
    const source = pathToFileURL(path.resolve("dist/core/operations.js")).href;
    fs.writeFileSync(
      script,
      `import fs from 'node:fs'; import path from 'node:path';
      import {recoverOperation} from ${JSON.stringify(source)};
      const rename=fs.renameSync;
      fs.renameSync=(temporary,target)=>{
        if(path.resolve(target)===path.resolve('target.txt')){
          fs.writeFileSync('restoration-path.txt',path.relative(process.cwd(),temporary));
          process.exit(19);
        }
        rename(temporary,target);
      };
      recoverOperation(process.cwd(),${JSON.stringify(failed.operation!.id)});`,
    );
    const child = spawnSync(process.execPath, [script], {
      cwd,
      encoding: "utf8",
      timeout: 30_000,
      windowsHide: true,
    });
    expect(child.error).toBeUndefined();
    expect(child.status, child.stderr).toBe(19);
    const temporary = fs.readFileSync(
      path.join(cwd, "restoration-path.txt"),
      "utf8",
    );
    expect(fs.readFileSync(path.join(cwd, temporary), "utf8")).toBe(
      "original bytes",
    );
    const journal = JSON.parse(
      fs.readFileSync(
        path.join(cwd, `.helen/operations/${failed.operation!.id}.json`),
        "utf8",
      ),
    );
    expect(journal.temporaries).toContain(temporary.replace(/\\/g, "/"));
    recoverOperation(cwd, failed.operation!.id);
    expect(fs.readFileSync(file, "utf8")).toBe("original bytes");
    expect(fs.existsSync(path.join(cwd, temporary))).toBe(false);
    expect(fs.readdirSync(cwd).filter((name) => name.endsWith(".tmp"))).toEqual(
      [],
    );
    expect(listOperations(cwd)).toEqual([]);
  }, 45_000);

  it("composes dry-run JSON patches and appends without writing files or journals", async () => {
    const pkg = path.join(cwd, "package.json");
    const text = path.join(cwd, "rules.txt");
    fs.writeFileSync(pkg, '{"name":"fixture"}');
    const preview = await withPreview(async () => {
      patchJson(
        pkg,
        { dependencies: { first: "1" } },
        { dryRun: true, root: cwd },
      );
      patchJson(
        pkg,
        { dependencies: { second: "2" } },
        { dryRun: true, root: cwd },
      );
      appendOnce(text, "first", "first", { dryRun: true, root: cwd });
      appendOnce(text, "second", "second", { dryRun: true, root: cwd });
      expect(JSON.parse(getPlannedContent(pkg)!)).toEqual({
        name: "fixture",
        dependencies: { first: "1", second: "2" },
      });
    });
    expect(preview.changes).toHaveLength(2);
    expect(getPlannedContent(text)).toBeUndefined();
    expect(fs.readFileSync(pkg, "utf8")).toBe('{"name":"fixture"}');
    expect(fs.existsSync(text)).toBe(false);
    expect(fs.existsSync(path.join(cwd, ".helen"))).toBe(false);
  });
});
