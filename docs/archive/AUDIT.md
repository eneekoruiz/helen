# HELEN CLI — Hardening & Audit Protocol

This document outlines the security and stability standards implemented in HELEN to ensure a "Gold Master" production state.

## 🛡️ Security Shields

### 1. Path Safety Validation
All file writing operations (`writeFileSafe`) pass through a path isolation check. 
- **Rule**: The absolute path of the target file must start with `process.cwd()`.
- **Mitigation**: Prevents malicious or accidental writing to system directories (e.g., `/etc/`, `C:\Windows\`) or parent directories.

### 2. Prototype Pollution Prevention
The `deepMerge` utility used to patch JSON files (like `package.json` or `.helenrc`) is hardened.
- **Rule**: Explicitly filters out `__proto__`, `constructor`, and `prototype` keys.
- **Mitigation**: Prevents attackers from injecting malicious object properties that could lead to remote code execution or application crashes.

### 3. Template Sandboxing
The Handlebars engine is wrapped in a validation layer.
- **Rule**: Compilation and execution are performed within `try-catch` blocks.
- **Mitigation**: A malformed template in a custom plugin will skip the file and report the error instead of causing a fatal CLI crash.

---

## 📈 Stability Protocols

### 1. Config Resilience
The `.helenrc` file is the source of truth for the project.
- **Behavior**: If the JSON is malformed, the CLI backs up the file to `.helenrc.corrupt` and initializes a fresh one.
- **Impact**: Ensures the CLI remains usable even if the user manually corrupts the config.

### 2. Spinner Fail-Safe
Integrated `ora` spinners for all long-running tasks.
- **Behavior**: Guaranteed resolution (`succeed` or `fail`) via the `runModule` wrapper.
- **Impact**: No more "zombie" spinners or frozen terminals on unexpected errors.

### 3. Global Exception Handling
- **Mechanism**: Listeners for `unhandledRejection` and `uncaughtException` in `src/cli.ts`.
- **Impact**: Provides a clean, branded error message and a graceful exit code (1) for all fatal errors.

---

## 🧪 Audit Prompt (For AI/Reviewers)
When auditing HELEN, use the following checklist:
1. **Can I write a file to `../../.ssh/id_rsa`?** (Expectation: Denied by Path Safety).
2. **Can I inject `{"__proto__": {"polluted": true}}` into `patchJson`?** (Expectation: Filtered by deepMerge).
3. **Does the CLI crash if `fs.writeFileSync` throws?** (Expectation: Captured by `writeFileSafe` try-catch).
4. **Is the spinner state consistent on module failure?** (Expectation: `spinner.fail()` is called).
