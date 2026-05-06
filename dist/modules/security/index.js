import { createEmptyResult } from '../../core/context.js';
import { writeFileSafe } from '../../core/fs.js';
import path from 'node:path';
const meta = {
    id: 'security',
    name: 'Security Utilities',
    category: 'Security',
    summary: 'Env validation (zod) + sanitize utils + security headers reference',
    description: 'Creates environment variable validation with Zod, HTML/text sanitization utilities, and a reference file for security headers.',
    problemItSolves: 'Missing env vars crash at runtime, unsanitized input leads to XSS, and security headers are often forgotten.',
    whenToUse: 'On every project that handles user input or environment variables.',
    whenNotToUse: 'If you already have env validation and sanitization in place.',
    filesCreated: ['src/lib/env.ts', 'src/lib/sanitize.ts', 'docs/security-headers.md'],
    filesModified: [],
    runtimeDependencies: ['zod'],
    devDependencies: [],
    requirements: ['TypeScript project'],
    risks: ['env.ts will throw on missing required vars — intentional'],
    nextSteps: ['Fill in your .env.local with real values', 'Review security headers for your deploy target'],
    riskLevel: 'medium',
    recommendedLevel: 'intermediate',
    status: 'stable',
};
async function execute(ctx) {
    const result = createEmptyResult(meta.id, meta.name);
    const { cwd, dryRun, force } = ctx;
    // env.ts
    const envTs = `import { z } from 'zod';

const envSchema = z.object({
  // Required
  VITE_APP_URL: z.string().url().default('http://localhost:5173'),
  VITE_APP_NAME: z.string().min(1).default('My App'),

  // Optional integrations
  VITE_SUPABASE_URL: z.string().url().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  VITE_SENTRY_DSN: z.string().url().optional(),
  VITE_GA_ID: z.string().startsWith('G-').optional(),
  VITE_API_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(import.meta.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => \`  - \${String(i.path[0])}: \${i.message}\`)
      .join('\\n');
    throw new Error(\`[ENV] Invalid environment variables:\\n\${issues}\`);
  }

  return parsed.data;
}

export const env = validateEnv();
`;
    const r1 = writeFileSafe(path.join(cwd, 'src/lib/env.ts'), envTs, { dryRun, force });
    if (r1 === 'created' || r1 === 'overwritten')
        result.created.push('src/lib/env.ts');
    else
        result.skipped.push('src/lib/env.ts');
    // sanitize.ts
    const sanitizeTs = `/**
 * Basic HTML entity encoding to prevent XSS.
 * For full sanitization, use DOMPurify.
 */
export function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  };
  return str.replace(/[&<>"']/g, (c) => map[c] ?? c);
}

/**
 * Strip all HTML tags from a string.
 */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '').trim();
}

/**
 * Sanitize a string for safe use in URLs.
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}
`;
    const r2 = writeFileSafe(path.join(cwd, 'src/lib/sanitize.ts'), sanitizeTs, { dryRun, force });
    if (r2 === 'created' || r2 === 'overwritten')
        result.created.push('src/lib/sanitize.ts');
    else
        result.skipped.push('src/lib/sanitize.ts');
    // Security headers reference doc
    const headersDoc = `# Security Headers Reference

Recommended headers for production deployments.

| Header | Value | Purpose |
|--------|-------|---------|
| Strict-Transport-Security | max-age=31536000; includeSubDomains; preload | Force HTTPS |
| X-Frame-Options | DENY | Prevent clickjacking |
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| Referrer-Policy | strict-origin-when-cross-origin | Control referrer info |
| Content-Security-Policy | default-src 'self' | XSS defense |
| Permissions-Policy | camera=(), microphone=() | Disable browser APIs |
| Cross-Origin-Opener-Policy | same-origin | Isolate browsing context |

Configure these in your hosting platform (Vercel, Nginx, Cloudflare, etc.).
`;
    const r3 = writeFileSafe(path.join(cwd, 'docs/security-headers.md'), headersDoc, { dryRun, force });
    if (r3 === 'created' || r3 === 'overwritten')
        result.created.push('docs/security-headers.md');
    else
        result.skipped.push('docs/security-headers.md');
    result.nextSteps.push('Fill .env.local with your values');
    result.nextSteps.push('Configure security headers in your hosting platform');
    return result;
}
export const securityModule = { meta, execute };
//# sourceMappingURL=index.js.map