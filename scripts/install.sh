#!/usr/bin/env bash
set -euo pipefail

VERSION="${HELEN_VERSION:-2.1.0}"
echo "Installing HELEN CLI v${VERSION}..."

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js (v18+) is required to run HELEN." >&2
  exit 1
fi

npm install -g "helen-cli@${VERSION}"
echo "HELEN CLI installed successfully!"
echo "Run 'helen --help' to get started."
