#!/usr/bin/env node
// Verifies what `npm publish` would ship: required files present, nothing private or oversized.
import { execFileSync } from 'node:child_process';

const REQUIRED = [
  'package.json', 'README.md', 'LICENSE', 'dist/cli.js', 'dist/index.js', 'skills/catalog.json',
  'docs/prompts/playbooks.json', 'docs/GUIA.md', 'templates/docker/Dockerfile',
];
const FORBIDDEN = [/(^|\/)\.env(\.|$)/, /(^|\/)\.helen\//, /^tests\//, /^evals\/results\//, /\.map$/, /(^|\/)node_modules\//, /\.helen-backup$/, /\.pem$/, /\.key$/];
const MAX_UNPACKED_BYTES = 6 * 1024 * 1024;

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const raw = execFileSync(npm, ['pack', '--dry-run', '--json', '--ignore-scripts'], { encoding: 'utf8', shell: process.platform === 'win32' });
const [pack] = JSON.parse(raw);
const paths = pack.files.map(file => file.path);
const problems = [];

for (const file of REQUIRED) if (!paths.includes(file)) problems.push(`missing from the package: ${file}`);
for (const file of paths) for (const pattern of FORBIDDEN) if (pattern.test(file)) problems.push(`must not be published: ${file}`);
if (pack.unpackedSize > MAX_UNPACKED_BYTES) problems.push(`unpacked size ${(pack.unpackedSize / 1048576).toFixed(1)} MiB exceeds ${MAX_UNPACKED_BYTES / 1048576} MiB`);

if (problems.length) {
  for (const problem of problems) console.error(`✖ ${problem}`);
  process.exit(1);
}
console.log(`Package OK: ${paths.length} files, ${(pack.unpackedSize / 1024).toFixed(0)} KiB unpacked.`);
