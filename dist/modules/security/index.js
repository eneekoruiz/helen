import { createEmptyResult } from '../../core/context.js';
import { writeFileSafe } from '../../core/fs.js';
import path from 'node:path';
const meta = {
    id: 'security',
    name: 'Security Utilities',
    category: 'Security',
    summary: 'Env validation (zod) + sanitize utils + security headers reference [Simple / Strict Tiers]',
    description: 'Creates environment variable validation with Zod, HTML/text sanitization utilities, and an optional advanced Web Crypto module (strict mode) with AES-GCM symmetric encryption/decryption, secure hashing, CSRF generators, and strict Content-Security-Policy (CSP) validators.',
    problemItSolves: 'Missing env vars crash at runtime, unsanitized input leads to XSS, and security headers or cryptographic helpers are often forgotten.',
    whenToUse: 'On every project that handles user input, environment variables, or symmetric encryption.',
    whenNotToUse: 'If you already have strict env validation and enterprise-grade sanitization in place.',
    filesCreated: ['src/lib/env.ts', 'src/lib/sanitize.ts', 'docs/security-headers.md', 'src/lib/security.ts'],
    filesModified: [],
    runtimeDependencies: ['zod'],
    devDependencies: [],
    requirements: ['TypeScript project'],
    risks: ['env.ts will throw on missing required vars — intentional', 'strict mode enforces HTTPS in production'],
    nextSteps: ['Fill in your .env.local with real values', 'Review security headers for your deploy target', 'Import crypto utility wrappers for symmetric data encryption'],
    riskLevel: 'medium',
    recommendedLevel: 'intermediate',
    status: 'stable',
};
async function execute(ctx) {
    const result = createEmptyResult(meta.id, meta.name);
    const { cwd, dryRun, force, settings } = ctx;
    const securityLevel = settings?.securityLevel === 'strict' ? 'strict' : 'simple';
    result.warnings.push(`Configured in CYBERSECURITY LEVEL: ${securityLevel.toUpperCase()}`);
    // env.ts
    let envTs = '';
    if (securityLevel === 'strict') {
        envTs = `import { z } from 'zod';

const envSchema = z.object({
  // Enforced production environment vs local development fallback
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  VITE_APP_URL: z.string().url().refine((url) => {
    const isProd = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production');
    if (isProd) {
      return url.startsWith('https://');
    }
    return url.startsWith('http://localhost') || url.startsWith('https://') || url.startsWith('http://127.0.0.1');
  }, {
    message: 'Security Violation: VITE_APP_URL must resolve to a secure HTTPS endpoint in production.'
  }).default('http://localhost:5173'),
  VITE_APP_NAME: z.string().min(1).default('My App'),

  // Optional integrations (validated lengths for safety)
  VITE_SUPABASE_URL: z.string().url().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().min(20, { message: 'Invalid Supabase Anon Key length' }).optional(),
  VITE_SENTRY_DSN: z.string().url().optional(),
  VITE_GA_ID: z.string().startsWith('G-').optional(),
  VITE_API_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const metaEnv = (import.meta as any).env || {};
  const processEnv = typeof process !== 'undefined' ? process.env : {};
  const parsed = envSchema.safeParse({ ...metaEnv, ...processEnv });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => \`  - \${String(i.path[0])}: \${i.message}\`)
      .join('\\n');
    throw new Error(\`[SECURITY ERROR] Environmental validation failure:\\n\${issues}\`);
  }

  return parsed.data;
}

export const env = validateEnv();
`;
    }
    else {
        envTs = `import { z } from 'zod';

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
  const metaEnv = (import.meta as any).env || {};
  const processEnv = typeof process !== 'undefined' ? process.env : {};
  const parsed = envSchema.safeParse({ ...metaEnv, ...processEnv });

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
    }
    const r1 = writeFileSafe(path.join(cwd, 'src/lib/env.ts'), envTs, { dryRun, force });
    if (r1 === 'created' || r1 === 'overwritten')
        result.created.push('src/lib/env.ts');
    else
        result.skipped.push('src/lib/env.ts');
    // sanitize.ts
    let sanitizeTs = '';
    if (securityLevel === 'strict') {
        sanitizeTs = `/**
 * Strict HTML entity encoding to completely mitigate XSS injection paths.
 */
export function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '\`': '&#x60;',
    '=': '&#x3D;',
  };
  return str.replace(/[&<>"'\\/\`=]/g, (c) => map[c] ?? c);
}

/**
 * Strict HTML tag stripper to completely isolate text content and prevent DOM injection.
 */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>?/gm, '').trim();
}

/**
 * Secure URL sanitizer to prevent dynamic javascript: or data: client-side XSS executions,
 * strictly restricting resolution protocols to HTTP, HTTPS, or mailto.
 */
export function sanitizeUrl(url: string): string {
  try {
    const hasWindow = typeof globalThis !== 'undefined' && 'window' in globalThis;
    const origin = hasWindow ? (globalThis as any).window.location.origin : undefined;
    const parsed = new URL(url, origin);
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return '';
    }
    if (parsed.protocol === 'javascript:' || parsed.protocol === 'data:') {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}
`;
    }
    else {
        sanitizeTs = `/**
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
    const hasWindow = typeof globalThis !== 'undefined' && 'window' in globalThis;
    const origin = hasWindow ? (globalThis as any).window.location.origin : undefined;
    const parsed = new URL(url, origin);
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}
`;
    }
    const r2 = writeFileSafe(path.join(cwd, 'src/lib/sanitize.ts'), sanitizeTs, { dryRun, force });
    if (r2 === 'created' || r2 === 'overwritten')
        result.created.push('src/lib/sanitize.ts');
    else
        result.skipped.push('src/lib/sanitize.ts');
    // src/lib/security.ts (Strict mode only)
    if (securityLevel === 'strict') {
        const securityTs = `/**
 * HELEN Cryptographic Security Engine
 * Web Crypto Standard Compliant (compatible with modern browser and node backends).
 */

/**
 * Generates a cryptographically secure random token (e.g. for session IDs, CSRF, salts).
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (dec) => dec.toString(16).padStart(2, '0')).join('').slice(0, length);
}

/**
 * Creates a SHA-256 cryptographic digest of the input string.
 */
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const rawData = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', rawData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Encrypts plain text using AES-GCM 256-bit symmetric encryption.
 */
export async function encryptAES(text: string, secretKey: string): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(secretKey));
  const key = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(text)
  );
  return {
    ciphertext: Array.from(new Uint8Array(encrypted), (b) => b.toString(16).padStart(2, '0')).join(''),
    iv: Array.from(iv, (b) => b.toString(16).padStart(2, '0')).join(''),
  };
}

/**
 * Decrypts AES-GCM 256-bit symmetric encrypted ciphertext.
 */
export async function decryptAES(ciphertext: string, ivHex: string, secretKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
  const cipherBuffer = new Uint8Array(ciphertext.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
  const keyBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(secretKey));
  const key = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipherBuffer
  );
  return decoder.decode(decrypted);
}

/**
 * Strict Content-Security-Policy (CSP) headers helper.
 */
export function generateCSPDirectives(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.supabase.co https://*.sentry.io",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ');
}
`;
        const r4 = writeFileSafe(path.join(cwd, 'src/lib/security.ts'), securityTs, { dryRun, force });
        if (r4 === 'created' || r4 === 'overwritten')
            result.created.push('src/lib/security.ts');
        else
            result.skipped.push('src/lib/security.ts');
    }
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

${securityLevel === 'strict' ? `
### Strict Mode Checklist
1. **CSP Enforced**: Directives generated in \`src/lib/security.ts\` are ready to deploy to production.
2. **Web Crypto Symmetric Ciphers**: Use the \`encryptAES\` and \`decryptAES\` features to protect local or database user-bound payload files.
3. **Environment Security Enforcements**: HTTPS is strictly verified in production to block plaintext leakage.
` : `
Configure these in your hosting platform (Vercel, Nginx, Cloudflare, etc.).
`}
`;
    const r3 = writeFileSafe(path.join(cwd, 'docs/security-headers.md'), headersDoc, { dryRun, force });
    if (r3 === 'created' || r3 === 'overwritten')
        result.created.push('docs/security-headers.md');
    else
        result.skipped.push('docs/security-headers.md');
    result.nextSteps.push('Fill .env.local with your values');
    result.nextSteps.push('Configure security headers in your hosting platform');
    if (securityLevel === 'strict') {
        result.nextSteps.push('Import the AES, Hashing, and Token utilities from src/lib/security.ts');
    }
    return result;
}
export const securityModule = { meta, execute };
//# sourceMappingURL=index.js.map