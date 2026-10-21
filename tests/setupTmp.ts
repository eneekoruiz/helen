import fs from "node:fs";
import os from "node:os";

// On macOS the temp directory is a symlink (/var -> /private/var). Use the real path so code that
// resolves symlinks and tests that compare paths agree.
try {
  process.env.TMPDIR = fs.realpathSync(os.tmpdir());
} catch {
  // Keep the default.
}
