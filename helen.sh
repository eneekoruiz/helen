#!/usr/bin/env bash
# =============================================================================
# HELEN CLI v3.0 — The Definitive Assembly Machine
# Security · Vercel · Legal/RGPD · SEO · PWA · UX · A11y · Performance
# Usage: bash helen-init.sh   (run from inside the Lovable project folder)
# Requires: node >= 18, npm >= 9, jq
# =============================================================================
set -euo pipefail

# ── Terminal colors ───────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'
RED='\033[0;31m';   BOLD='\033[1m';      NC='\033[0m'
log()     { echo -e "${GREEN}[✓]${NC} $1"; }
info()    { echo -e "${CYAN}[→]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
die()     { echo -e "${RED}[✗]${NC} $1" >&2; exit 1; }
section() { echo -e "\n${BOLD}${CYAN}━━━  $1  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

clear
echo -e "${CYAN}${BOLD}"
cat << 'BANNER'
 ██╗  ██╗███████╗██╗     ███████╗██████╗ 
 ██║  ██║██╔════╝██║     ██╔════╝██╔══██╗
 ███████║█████╗  ██║     █████╗  ██║  ██║
 ██╔══██║██╔══╝  ██║     ██╔══╝  ██║  ██║
 ██║  ██║███████╗███████╗███████╗██║  ██║
 ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝
BANNER
echo -e "${NC}"
echo -e "${GREEN}${BOLD}  v3.0 — The Definitive Assembly Machine (FAANG Grade)${NC}\n"

# ── Preflight checks ──────────────────────────────────────────────────────────
[[ ! -f "package.json" ]]  && die "No package.json found. Run from the project root."
[[ ! -f "vite.config.ts" ]] && [[ ! -f "vite.config.js" ]] \
  && die "No vite.config.{ts,js} found. This script targets Vite projects."
command -v jq   >/dev/null 2>&1 || die "jq required:  brew install jq  |  apt install jq"
command -v npm  >/dev/null 2>&1 || die "npm required."
command -v node >/dev/null 2>&1 || die "node required."

PROJECT_NAME=$(jq -r '.name // "my-app"' package.json)
info "Armoring: ${BOLD}${PROJECT_NAME}${NC}"

# ── Create directory tree ─────────────────────────────────────────────────────
mkdir -p \
  src/lib \
  src/components/{ui,seo,legal,analytics,layout,forms} \
  src/hooks \
  src/types \
  public/{.well-known,icons,screenshots,fonts} \
  .github/workflows

# ─────────────────────────────────────────────────────────────────────────────
# BLOCK 1 ── DEPENDENCIES
# ─────────────────────────────────────────────────────────────────────────────
section "BLOCK 1 · Dependencies"

info "Installing runtime packages..."
npm install --save \
  zod@3.23.8 \
  isomorphic-dompurify@2.16.0 \
  @sentry/react@8.38.0 \
  react-helmet-async@2.0.4 \
  2>/dev/null
log "Runtime packages installed"

info "Installing dev packages..."
npm install --save-dev \
  husky@9.1.7 \
  lint-staged@15.2.10 \
  audit-ci@7.1.0 \
  @typescript-eslint/eslint-plugin@8.15.0 \
  @typescript-eslint/parser@8.15.0 \
  eslint-plugin-security@3.0.1 \
  eslint-plugin-no-secrets@1.0.2 \
  eslint-plugin-jsx-a11y@6.10.2 \
  vite-plugin-pwa@0.21.1 \
  2>/dev/null
log "Dev packages installed"

info "Patching package.json (surgical merge — Lovable scripts preserved)..."
PATCHED=$(jq '
  .scripts += {
    "lint:sec":      "eslint src --ext .ts,.tsx --max-warnings 0",
    "audit:ci":      "audit-ci --critical",
    "prepare":       "husky",
    "format:check":  "prettier --check \"src/**/*.{ts,tsx}\""
  } |
  .["lint-staged"] = {
    "*.{ts,tsx}": ["eslint --fix --max-warnings 0", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
' package.json)
echo "$PATCHED" > package.json
log "package.json patched"

# ─────────────────────────────────────────────────────────────────────────────
# BLOCK 2 ── VERCEL EDGE SECURITY
# ─────────────────────────────────────────────────────────────────────────────
section "BLOCK 2 · Vercel Edge Security"

info "Generating vercel.json..."
cat > vercel.json << 'EOF'
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/((?!api|assets|icons|fonts|favicon\\.ico|robots\\.txt|sitemap\\.xml|\\.well-known).*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        },
        { "key": "X-Frame-Options",              "value": "DENY" },
        { "key": "X-Content-Type-Options",        "value": "nosniff" },
        { "key": "Referrer-Policy",               "value": "strict-origin-when-cross-origin" },
        { "key": "X-XSS-Protection",              "value": "0" },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"
        },
        { "key": "Cross-Origin-Opener-Policy",    "value": "same-origin" },
        { "key": "Cross-Origin-Resource-Policy",  "value": "cross-origin" },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://analytics.google.com https://*.sentry.io https://firestore.googleapis.com https://identitytoolkit.googleapis.com; media-src 'self'; object-src 'none'; child-src 'none'; frame-src 'none'; worker-src 'self' blob:; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; manifest-src 'self'; upgrade-insecure-requests"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    },
    {
      "source": "/fonts/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    },
    {
      "source": "/icons/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
EOF
log "vercel.json created"

# ─────────────────────────────────────────────────────────────────────────────
# BLOCK 3 ── SEO + SOCIAL + PWA → index.html injection
# ─────────────────────────────────────────────────────────────────────────────
section "BLOCK 3 · SEO · Social · PWA (index.html)"

info "Patching index.html..."

if [[ ! -f "index.html" ]]; then
  warn "index.html not found at root — creating minimal one"
  cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>%VITE_APP_NAME%</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF
fi

if grep -q "ARMOR-V3" index.html 2>/dev/null || grep -q "HELEN" index.html 2>/dev/null; then
  warn "index.html already armored — skipping"
else
  cp index.html index.html.bak

  # ── Build the full meta block ─────────────────────────────────────────────
  META_BLOCK='    \n\n    \n    <meta name="description"        content="%VITE_APP_DESCRIPTION%" />\n    <meta name="keywords"           content="" />\n    <meta name="author"             content="%VITE_APP_NAME%" />\n    <meta name="robots"             content="index, follow" />\n    <link rel="canonical"           href="%VITE_APP_URL%" />\n\n    \n    <meta property="og:type"        content="website" />\n    <meta property="og:url"         content="%VITE_APP_URL%" />\n    <meta property="og:title"       content="%VITE_APP_NAME%" />\n    <meta property="og:description" content="%VITE_APP_DESCRIPTION%" />\n    <meta property="og:image"       content="%VITE_APP_URL%/og-image.png" />\n    <meta property="og:image:width"  content="1200" />\n    <meta property="og:image:height" content="630" />\n    <meta property="og:image:alt"   content="%VITE_APP_NAME%" />\n    <meta property="og:locale"      content="es_ES" />\n    <meta property="og:site_name"   content="%VITE_APP_NAME%" />\n\n    \n    <meta name="twitter:card"        content="summary_large_image" />\n    <meta name="twitter:site"        content="@yourhandle" />\n    <meta name="twitter:title"       content="%VITE_APP_NAME%" />\n    <meta name="twitter:description" content="%VITE_APP_DESCRIPTION%" />\n    <meta name="twitter:image"       content="%VITE_APP_URL%/og-image.png" />\n\n    \n    <link rel="manifest"             href="/manifest.json" />\n    <meta name="theme-color"         content="#6366f1" />\n    <meta name="apple-mobile-web-app-capable"          content="yes" />\n    <meta name="apple-mobile-web-app-status-bar-style" content="default" />\n    <meta name="apple-mobile-web-app-title"            content="%VITE_APP_NAME%" />\n    <link rel="apple-touch-icon"     href="/icons/apple-touch-icon.png" />\n    <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />\n    <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16.png" />\n\n    \n    <link rel="preconnect"      href="https://fonts.googleapis.com" />\n    <link rel="preconnect"      href="https://fonts.gstatic.com" crossorigin />\n    <link rel="dns-prefetch"    href="https://www.google-analytics.com" />\n    <link rel="dns-prefetch"    href="https://o0.ingest.sentry.io" />'

  # Inject before </head>
  sed -i "s|</head>|${META_BLOCK}\n\n  </head>|" index.html
  log "index.html: SEO + OG + Twitter + PWA meta injected"

  # ── App Shell Preloader (no blank screen on cold load) ────────────────────
  PRELOADER_CSS='  <style id="preloader-css">\n    #app-preloader {\n      position: fixed; inset: 0;\n      display: flex; flex-direction: column;\n      align-items: center; justify-content: center;\n      background: #ffffff;\n      z-index: 99999;\n      transition: opacity 0.35s ease, visibility 0.35s ease;\n    }\n    #app-preloader.hidden { opacity: 0; visibility: hidden; pointer-events: none; }\n    .preloader-ring {\n      width: 48px; height: 48px;\n      border: 4px solid #e2e8f0;\n      border-top-color: #6366f1;\n      border-radius: 50%;\n      animation: preloader-spin 0.75s linear infinite;\n    }\n    .preloader-dot {\n      width: 8px; height: 8px; border-radius: 50%;\n      background: #6366f1; margin-top: 20px;\n      animation: preloader-pulse 1.2s ease-in-out infinite;\n    }\n    @keyframes preloader-spin  { to { transform: rotate(360deg); } }\n    @keyframes preloader-pulse { 0%,100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }\n  </style>'

  PRELOADER_HTML='  \n  <div id="app-preloader" role="status" aria-label="Loading application">\n    <div class="preloader-ring" aria-hidden="true"></div>\n    <div class="preloader-dot" aria-hidden="true"></div>\n  </div>\n\n  \n  <script>\n    (function() {\n      var el = document.getElementById("app-preloader");\n      if (!el) return;\n      // MutationObserver watches for React root content\n      var observer = new MutationObserver(function() {\n        var root = document.getElementById("root");\n        if (root && root.children.length > 0) {\n          el.classList.add("hidden");\n          setTimeout(function() { el.remove(); document.getElementById("preloader-css").remove(); }, 400);\n          observer.disconnect();\n        }\n      });\n      observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });\n      // Fallback: force remove after 4s no matter what\n      setTimeout(function() { el.classList.add("hidden"); }, 4000);\n    })();\n  </script>'

  # Inject before </head> (CSS)
  sed -i "s|</head>|${PRELOADER_CSS}\n</head>|" index.html

  # Inject before </body> (HTML + script)
  sed -i "s|</body>|${PRELOADER_HTML}\n</body>|" index.html
  log "index.html: App Shell preloader injected (zero blank screen)"
fi

# ── Smooth scroll CSS injection via global.css / index.css ───────────────────
info "Injecting smooth scroll + global UX resets..."
GLOBAL_CSS="src/index.css"
[[ ! -f "$GLOBAL_CSS" ]] && GLOBAL_CSS="src/App.css"
[[ ! -f "$GLOBAL_CSS" ]] && GLOBAL_CSS="src/global.css"

if [[ -f "$GLOBAL_CSS" ]] && ! grep -q "HELEN" "$GLOBAL_CSS" 2>/dev/null; then
  cat >> "$GLOBAL_CSS" << 'CSSEOF'

/* ═══ HELEN CLI: Global UX & A11y resets ═══════════════════════════════════ */

/* Smooth scroll — "butter" scrolling across all browsers */
html {
  scroll-behavior: smooth;
}

/* Respect user preference for reduced motion */
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Mobile safe-area: 100dvh instead of 100vh */
:root { --vh: 1dvh; }
.full-height { min-height: 100dvh; }

/* Prevent layout shift from scrollbar appearing */
html { scrollbar-gutter: stable; }

/* Base box-sizing */
*, *::before, *::after { box-sizing: border-box; }

/* Prevent FOUC on images */
img, video { max-width: 100%; height: auto; display: block; }

/* Focus visible — never outline:none without an alternative */
:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 3px;
  border-radius: 3px;
}
:focus:not(:focus-visible) { outline: none; }

/* Smooth font rendering */
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

/* Skip-to-content link (a11y) */
.skip-link {
  position: absolute;
  top: -100%;
  left: 1rem;
  background: #6366f1;
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 0 0 0.5rem 0.5rem;
  font-weight: 600;
  z-index: 10001;
  text-decoration: none;
  transition: top 0.1s;
}
.skip-link:focus { top: 0; }

/* Skeleton shimmer keyframe (used by Skeleton.tsx) */
@keyframes skeleton-shimmer {
  0%   { background-position:  200% 0; }
  100% { background-position: -200% 0; }
}

/* Toast slide-in animation (used by Toast.tsx) */
@keyframes fadeInRight {
  from { opacity: 0; transform: translateX(1rem); }
  to   { opacity: 1; transform: translateX(0); }
}

/* Spinner rotation (used by Spinner.tsx / Button.tsx) */
@keyframes spin {
  to { transform: rotate(360deg); }
}
CSSEOF
  log "Global CSS: smooth scroll + a11y + resets injected into $GLOBAL_CSS"
else
  warn "Global CSS file not found at expected paths — creating src/helen-globals.css"
  cat > src/helen-globals.css << 'CSSEOF'
/* ═══ HELEN CLI globals — import this in src/main.tsx ═══ */
html { scroll-behavior: smooth; scrollbar-gutter: stable; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
*, *::before, *::after { box-sizing: border-box; }
img, video { max-width: 100%; height: auto; display: block; }
:focus-visible { outline: 2px solid #6366f1; outline-offset: 3px; border-radius: 3px; }
:focus:not(:focus-visible) { outline: none; }
body { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
.skip-link { position: absolute; top: -100%; left: 1rem; background: #6366f1; color: #fff; padding: 0.5rem 1rem; border-radius: 0 0 .5rem .5rem; font-weight: 600; z-index: 10001; text-decoration: none; transition: top .1s; }
.skip-link:focus { top: 0; }
@keyframes skeleton-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
@keyframes fadeInRight { from { opacity:0; transform:translateX(1rem); } to { opacity:1; transform:translateX(0); } }
@keyframes spin { to { transform: rotate(360deg); } }
CSSEOF
  log "src/helen-globals.css created — import it in main.tsx"
fi

# ─────────────────────────────────────────────────────────────────────────────
# BLOCK 4 ── SECURITY UTILITIES
# ─────────────────────────────────────────────────────────────────────────────
section "BLOCK 4 · Security Utilities"

info "Creating src/lib/security.ts..."
cat > src/lib/security.ts << 'EOF'
/**
 * security.ts — Input sanitization (DOMPurify) + Zod validation schemas.
 * Import and use in every form/component that handles user input.
 */
import DOMPurify from "isomorphic-dompurify";
import { z } from "zod";

// ── Sanitizers ────────────────────────────────────────────────────────────────
export const sanitizeHtml = (dirty: string): string =>
  DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li"],
    ALLOWED_ATTR: ["href", "target", "rel"],
    FORCE_BODY: true,
  });

export const sanitizePlainText = (s: string): string =>
  DOMPurify.sanitize(s, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();

export const sanitizeField = (v: string) => sanitizePlainText(v);

// ── Zod Schemas ───────────────────────────────────────────────────────────────
export const emailSchema   = z.string().email("Invalid email").max(254).transform(sanitizeField);
export const nameSchema    = z.string().min(2).max(100).regex(/^[a-zA-ZÀ-ÿ\s'\-]+$/, "Invalid name").transform(sanitizeField);
export const messageSchema = z.string().min(10).max(5000).transform(sanitizeField);
export const phoneSchema   = z.string().regex(/^\+?[\d\s\-().]{7,20}$/).optional().transform(v => v ? sanitizeField(v) : undefined);

export const contactFormSchema = z.object({ name: nameSchema, email: emailSchema, message: messageSchema, phone: phoneSchema });
export type ContactFormData = z.infer<typeof contactFormSchema>;

// ── Safe API response parser ──────────────────────────────────────────────────
export function parseApiResponse<T>(
  schema: z.ZodSchema<T>, raw: unknown
): { data: T; error: null } | { data: null; error: string } {
  const r = schema.safeParse(raw);
  return r.success
    ? { data: r.data, error: null }
    : { data: null, error: r.error.errors.map(e => `${e.path}: ${e.message}`).join(", ") };
}
EOF
log "src/lib/security.ts created"

info "Creating src/lib/env.ts..."
cat > src/lib/env.ts << 'EOF'
/**
 * env.ts — Runtime env validator (Zod).
 * Crashes the app at startup if any required VITE_ var is missing.
 * Import this as the FIRST import in main.tsx.
 */
import { z } from "zod";

const schema = z.object({
  VITE_APP_URL:           z.string().url(),
  VITE_APP_NAME:          z.string().min(1).default("My App"),
  VITE_APP_DESCRIPTION:   z.string().min(1).default("Built with HELEN CLI"),
  VITE_SUPABASE_URL:      z.string().url().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().optional(),
  VITE_SENTRY_DSN:        z.string().url().optional(),
  VITE_GA_ID:             z.string().startsWith("G-").optional(),
});

function validate() {
  const r = schema.safeParse({
    VITE_APP_URL:           import.meta.env.VITE_APP_URL,
    VITE_APP_NAME:          import.meta.env.VITE_APP_NAME,
    VITE_APP_DESCRIPTION:   import.meta.env.VITE_APP_DESCRIPTION,
    VITE_SUPABASE_URL:      import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_SENTRY_DSN:        import.meta.env.VITE_SENTRY_DSN,
    VITE_GA_ID:             import.meta.env.VITE_GA_ID,
  });
  if (!r.success) {
    const msg = r.error.errors.map(e => `  • ${String(e.path)}: ${e.message}`).join("\n");
    throw new Error(`\n[ENV ERROR] Missing or invalid environment variables:\n${msg}\n`);
  }
  return r.data;
}

export const env = validate();
EOF
log "src/lib/env.ts created"

info "Creating src/lib/sentry.ts..."
cat > src/lib/sentry.ts << 'EOF'
import * as Sentry from "@sentry/react";

const dsn    = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const isProd = import.meta.env.PROD as boolean;

Sentry.init({
  dsn,
  enabled: isProd && Boolean(dsn),
  environment: isProd ? "production" : "development",
  tracesSampleRate: isProd ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.02,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({ maskAllInputs: true }),
  ],
  beforeBreadcrumb(b) {
    if ((b.category === "xhr" || b.category === "fetch") && b.data) {
      delete b.data["body"];
      delete b.data["response"];
    }
    return b;
  },
});
EOF
log "src/lib/sentry.ts created"

info "Creating src/lib/analytics.ts..."
cat > src/lib/analytics.ts << 'EOF'
/**
 * analytics.ts — Consent-gated, provider-agnostic analytics wrapper.
 * Only calls window.gtag after the user grants analytics consent.
 */
declare global {
  interface Window { gtag?: (...a: unknown[]) => void; dataLayer?: unknown[]; }
}

type Params = Record<string, string | number | boolean>;
const loaded = () => typeof window !== "undefined" && typeof window.gtag === "function";

export const analytics = {
  pageview(path: string, title?: string) {
    if (!loaded()) return;
    window.gtag!("config", import.meta.env.VITE_GA_ID as string, {
      page_path: path, page_title: title ?? document.title,
    });
  },
  event(name: string, params?: Params) {
    if (!loaded()) return;
    window.gtag!("event", name, params);
  },
  conversion(id: string, params?: Params) {
    if (!loaded()) return;
    window.gtag!("event", "conversion", { send_to: id, ...params });
  },
};
EOF
log "src/lib/analytics.ts created"

# ─────────────────────────────────────────────────────────────────────────────
# BLOCK 5 ── UI COMPONENTS
# ─────────────────────────────────────────────────────────────────────────────
section "BLOCK 5 · UI Components"

# ── GlobalErrorBoundary ───────────────────────────────────────────────────────
info "Creating src/components/ui/GlobalErrorBoundary.tsx..."
cat > src/components/ui/GlobalErrorBoundary.tsx << 'EOF'
import { Component, type ReactNode, type ErrorInfo } from "react";
import * as Sentry from "@sentry/react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; errorId?: string; }

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false }; }

  static getDerivedStateFromError(): State { return { hasError: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const errorId = Sentry.captureException(error, {
      tags: { boundary: "global" },
      extra: { componentStack: info.componentStack },
    });
    this.setState({ errorId });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ minHeight:"100dvh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"system-ui,sans-serif", padding:"2rem", textAlign:"center", background:"#f8fafc" }}>
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ marginBottom:"1rem" }}>
          <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/>
          <path d="M12 8v4M12 16h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <h1 style={{ fontSize:"1.5rem", fontWeight:700, marginBottom:"0.5rem" }}>Something went wrong</h1>
        <p style={{ color:"#64748b", marginBottom:"1.5rem", maxWidth:"400px" }}>Our team has been notified automatically.</p>
        {this.state.errorId && <p style={{ fontSize:"0.75rem", color:"#94a3b8", marginBottom:"1rem" }}>Error ID: {this.state.errorId}</p>}
        <button onClick={() => window.location.href="/"} style={{ padding:"0.625rem 1.5rem", borderRadius:"0.5rem", background:"#6366f1", color:"#fff", border:"none", fontWeight:600, cursor:"pointer", fontSize:"0.9rem" }}>
          Back to Home
        </button>
      </div>
    );
  }
}
EOF
log "GlobalErrorBoundary.tsx created"

# ── Spinner ───────────────────────────────────────────────────────────────────
cat > src/components/ui/Spinner.tsx << 'EOF'
/**
 * Spinner — accessible loading indicator.
 * Usage: <Spinner size={32} color="#6366f1" label="Loading..." />
 */
interface SpinnerProps {
  size?: number;
  color?: string;
  label?: string;
}
export function Spinner({ size = 24, color = "currentColor", label = "Loading..." }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} style={{ display:"inline-flex" }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"
        style={{ animation:"spin 0.75s linear infinite" }}>
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3"
          strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round" opacity="0.25"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round"/>
      </svg>
    </span>
  );
}
EOF

# ── Skeleton ──────────────────────────────────────────────────────────────────
cat > src/components/ui/Skeleton.tsx << 'EOF'
/**
 * Skeleton — zero-CLS loading placeholders.
 * Usage:
 * <Skeleton height="1.25rem" width="60%" />
 * <Skeleton variant="circle" size={48} />
 * <SkeletonCard />
 */
import type { CSSProperties } from "react";

const base: CSSProperties = {
  display: "block",
  background: "linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)",
  backgroundSize: "200% 100%",
  animation: "skeleton-shimmer 1.5s infinite",
  borderRadius: "0.375rem",
};

interface SkeletonProps {
  width?: string | number; height?: string | number;
  variant?: "rect" | "circle"; size?: number;
  style?: CSSProperties;
}

export function Skeleton({ width="100%", height="1rem", variant="rect", size, style }: SkeletonProps) {
  const s = variant === "circle" && size
    ? { ...base, width: size, height: size, borderRadius: "50%" }
    : { ...base, width, height };
  return <span style={{ ...s, ...style }} aria-hidden="true" />;
}

export function SkeletonCard() {
  return (
    <div style={{ padding:"1.25rem", border:"1px solid #e2e8f0", borderRadius:"0.75rem", display:"flex", flexDirection:"column", gap:"0.75rem" }} aria-hidden="true">
      <Skeleton height="1.25rem" width="60%" />
      <Skeleton height="1rem" />
      <Skeleton height="1rem" width="80%" />
      <Skeleton height="2rem" width="30%" style={{ marginTop:"0.5rem" }} />
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height="1rem" width={i === lines - 1 ? "65%" : "100%"} />
      ))}
    </div>
  );
}
EOF

# ── Button ────────────────────────────────────────────────────────────────────
cat > src/components/ui/Button.tsx << 'EOF'
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./Spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

const V = {
  primary:   { background:"#6366f1", color:"#fff",    border:"none" },
  secondary: { background:"#f1f5f9", color:"#374151", border:"1px solid #e2e8f0" },
  danger:    { background:"#ef4444", color:"#fff",    border:"none" },
  ghost:     { background:"transparent", color:"#6366f1", border:"1px solid #6366f1" },
};
const S = {
  sm: { padding:"0.375rem 0.75rem",  fontSize:"0.8rem" },
  md: { padding:"0.625rem 1.25rem",  fontSize:"0.875rem" },
  lg: { padding:"0.875rem 1.75rem",  fontSize:"1rem" },
};

export function Button({ children, isLoading=false, variant="primary", size="md", fullWidth=false, disabled, style, ...props }: ButtonProps) {
  const off = disabled ?? isLoading;
  return (
    <button disabled={off} aria-disabled={off} aria-busy={isLoading}
      style={{ ...V[variant], ...S[size], width:fullWidth?"100%":undefined, display:"inline-flex", alignItems:"center", justifyContent:"center", gap:"0.5rem", borderRadius:"0.5rem", fontWeight:600, cursor:off?"not-allowed":"pointer", opacity:off?0.6:1, transition:"opacity 0.15s", fontFamily:"system-ui,sans-serif", ...style }}
      {...props}>
      {isLoading && <Spinner size={16} color="currentColor" />}
      {children}
    </button>
  );
}
EOF

# ── Toast ─────────────────────────────────────────────────────────────────────
cat > src/components/ui/Toast.tsx << 'EOF'
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type ToastType = "success" | "error" | "warning" | "info";
interface Toast { id: string; type: ToastType; message: string; duration?: number; }
const Ctx = createContext<{ addToast: (t: Omit<Toast,"id">) => void }>({ addToast: () => {} });
export const useToast = () => useContext(Ctx);

const C: Record<ToastType, { bg:string; border:string; icon:string }> = {
  success: { bg:"#f0fdf4", border:"#bbf7d0", icon:"✓" },
  error:   { bg:"#fef2f2", border:"#fecaca", icon:"✕" },
  warning: { bg:"#fffbeb", border:"#fde68a", icon:"⚠" },
  info:    { bg:"#eff6ff", border:"#bfdbfe", icon:"ℹ" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, set] = useState<Toast[]>([]);

  const addToast = useCallback(({ type, message, duration=5000 }: Omit<Toast,"id">) => {
    const id = Math.random().toString(36).slice(2);
    set(t => [...t, { id, type, message }]);
    setTimeout(() => set(t => t.filter(x => x.id !== id)), duration);
  }, []);

  const dismiss = (id: string) => set(t => t.filter(x => x.id !== id));

  return (
    <Ctx.Provider value={{ addToast }}>
      {children}
      <div aria-live="polite" aria-atomic="false"
        style={{ position:"fixed", top:"1rem", right:"1rem", display:"flex", flexDirection:"column", gap:"0.5rem", zIndex:10000, maxWidth:"380px", width:"100%" }}>
        {toasts.map(({ id, type, message }) => {
          const { bg, border, icon } = C[type];
          return (
            <div key={id} role="status"
              style={{ display:"flex", alignItems:"flex-start", gap:"0.75rem", padding:"0.875rem 1rem", borderRadius:"0.5rem", background:bg, border:`1px solid ${border}`, boxShadow:"0 4px 16px rgba(0,0,0,.08)", fontSize:"0.875rem", animation:"fadeInRight 0.2s ease" }}>
              <span aria-hidden="true" style={{ fontWeight:700, flexShrink:0 }}>{icon}</span>
              <span style={{ flex:1, lineHeight:1.5 }}>{message}</span>
              <button onClick={() => dismiss(id)} aria-label="Dismiss" style={{ background:"none", border:"none", cursor:"pointer", color:"#64748b", fontSize:"1rem", flexShrink:0, padding:0 }}>×</button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
EOF
log "UI components created: GlobalErrorBoundary, Spinner, Skeleton, Button, Toast"

# ─────────────────────────────────────────────────────────────────────────────
# BLOCK 6 ── SEO COMPONENT
# ─────────────────────────────────────────────────────────────────────────────
section "BLOCK 6 · SEO Component"

cat > src/components/seo/SEOHead.tsx << 'EOF'
/**
 * SEOHead — Per-page dynamic meta via react-helmet-async.
 * Wrap App in <HelmetProvider> (main.tsx), then:
 * <SEOHead title="Servicios" description="Desc" image="/og-servicios.png" />
 */
import { Helmet } from "react-helmet-async";
import { env } from "@/lib/env";

interface SEOHeadProps {
  title?: string; description?: string; image?: string;
  url?: string; type?: "website"|"article"; noIndex?: boolean;
  structuredData?: Record<string, unknown>;
}

export function SEOHead({ title, description, image, url, type="website", noIndex=false, structuredData }: SEOHeadProps) {
  const siteName  = env.VITE_APP_NAME;
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const desc      = description ?? env.VITE_APP_DESCRIPTION;
  const ogImage   = image ?? `${env.VITE_APP_URL}/og-image.png`;
  const canonical = url ?? (typeof window !== "undefined" ? window.location.href : env.VITE_APP_URL);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={canonical} />
      <meta property="og:type"         content={type} />
      <meta property="og:url"          content={canonical} />
      <meta property="og:title"        content={fullTitle} />
      <meta property="og:description"  content={desc} />
      <meta property="og:image"        content={ogImage} />
      <meta property="og:image:width"  content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name"    content={siteName} />
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image"       content={ogImage} />
      {structuredData && (
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      )}
    </Helmet>
  );
}

// ── JSON-LD helpers ───────────────────────────────────────────────────────────
export const jsonLdOrganization = (name: string, url: string, logo: string) =>
  ({ "@context":"https://schema.org", "@type":"Organization", name, url, logo });

export const jsonLdLocalBusiness = (p: { name:string; url:string; telephone:string; address:string; city:string; country:string }) =>
  ({ "@context":"https://schema.org", "@type":"LocalBusiness", name:p.name, url:p.url, telephone:p.telephone, address:{ "@type":"PostalAddress", streetAddress:p.address, addressLocality:p.city, addressCountry:p.country } });

export const jsonLdBreadcrumb = (items: { name:string; url:string }[]) =>
  ({ "@context":"https://schema.org", "@type":"BreadcrumbList", itemListElement: items.map((x,i) => ({ "@type":"ListItem", position:i+1, name:x.name, item:x.url })) });
EOF
log "src/components/seo/SEOHead.tsx created"

# ─────────────────────────────────────────────────────────────────────────────
# BLOCK 7 ── LEGAL & RGPD
# ─────────────────────────────────────────────────────────────────────────────
section "BLOCK 7 · Legal & RGPD"

cat > src/components/legal/CookieBanner.tsx << 'EOF'
/**
 * CookieBanner — RGPD compliant. Blocks analytics until explicit consent.
 *
 * Setup in App.tsx:
 * <CookieConsentProvider>
 * <AnalyticsProvider />   ← reads consent from context
 * <App />
 * </CookieConsentProvider>
 */
import { useState, createContext, useContext, type ReactNode } from "react";

type ConsentState = { necessary: true; analytics: boolean; marketing: boolean } | null;
const KEY = "cookie_consent_v1";
const Ctx = createContext<ConsentState>(null);
export const useCookieConsent = () => useContext(Ctx);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, set] = useState<ConsentState>(() => {
    try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) as ConsentState : null; }
    catch { return null; }
  });

  const save = (analytics: boolean, marketing: boolean) => {
    const v: ConsentState = { necessary: true, analytics, marketing };
    localStorage.setItem(KEY, JSON.stringify(v));
    set(v);
  };

  return (
    <Ctx.Provider value={consent}>
      {children}
      {!consent && <Banner onAll={() => save(true,true)} onNone={() => save(false,false)} onSave={save} />}
    </Ctx.Provider>
  );
}

function Banner({ onAll, onNone, onSave }: { onAll:()=>void; onNone:()=>void; onSave:(a:boolean,m:boolean)=>void }) {
  const [open, setOpen] = useState(false);
  const [a, setA] = useState(false);
  const [m, setM] = useState(false);

  return (
    <div role="dialog" aria-label="Cookie consent" aria-modal="false"
      style={{ position:"fixed", bottom:"1rem", left:"1rem", right:"1rem", maxWidth:"480px", margin:"0 auto", background:"#fff", border:"1px solid #e2e8f0", borderRadius:"0.75rem", padding:"1.25rem", boxShadow:"0 20px 60px rgba(0,0,0,.15)", zIndex:9999, fontFamily:"system-ui,sans-serif" }}>
      <h2 style={{ margin:"0 0 0.5rem", fontSize:"1rem", fontWeight:600 }}>🍪 We use cookies</h2>
      <p style={{ margin:"0 0 1rem", fontSize:"0.85rem", color:"#64748b", lineHeight:1.5 }}>
        We use necessary cookies to make our site work. Analytics and marketing cookies are only set with your consent.{" "}
        <a href="/cookies" style={{ color:"#6366f1" }}>Cookie Policy</a>
      </p>

      {open && (
        <div style={{ marginBottom:"1rem", padding:"0.75rem", background:"#f8fafc", borderRadius:"0.5rem" }}>
          {[
            { label:"Necessary", desc:"Required for the site to function.", checked:true, disabled:true, set:undefined as unknown as (v:boolean)=>void },
            { label:"Analytics", desc:"Help us understand usage (GA4).",    checked:a,    disabled:false, set:setA },
            { label:"Marketing", desc:"Used for personalised advertising.",  checked:m,    disabled:false, set:setM },
          ].map(({ label, desc, checked, disabled, set: setter }) => (
            <label key={label} style={{ display:"flex", gap:"0.75rem", alignItems:"flex-start", marginBottom:"0.5rem" }}>
              <input type="checkbox" checked={checked} disabled={disabled}
                onChange={setter ? e => setter(e.target.checked) : undefined}
                style={{ marginTop:"0.2rem", accentColor:"#6366f1" }} aria-label={label} />
              <span>
                <strong style={{ fontSize:"0.85rem" }}>{label}</strong>
                <span style={{ display:"block", fontSize:"0.78rem", color:"#64748b" }}>{desc}</span>
              </span>
            </label>
          ))}
        </div>
      )}

      <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
        <Btn bg="#6366f1" color="#fff"    onClick={onAll}>Accept All</Btn>
        <Btn bg="#f1f5f9" color="#374151" onClick={onNone}>Reject All</Btn>
        {open
          ? <Btn bg="#0f172a" color="#fff" onClick={() => onSave(a,m)}>Save</Btn>
          : <button onClick={() => setOpen(true)} style={{ background:"none", border:"none", cursor:"pointer", color:"#6366f1", fontSize:"0.8rem", textDecoration:"underline", fontWeight:600 }}>Customize</button>
        }
      </div>
    </div>
  );
}

function Btn({ bg, color, onClick, children }: { bg:string; color:string; onClick:()=>void; children:string }) {
  return (
    <button onClick={onClick}
      style={{ padding:"0.5rem 1rem", borderRadius:"0.375rem", fontSize:"0.8rem", fontWeight:600, border:"none", cursor:"pointer", background:bg, color }}>
      {children}
    </button>
  );
}
EOF

cat > src/components/legal/PrivacyPolicy.tsx << 'EOF'
import { SEOHead } from "@/components/seo/SEOHead";
const d = new Date().toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" });
export function PrivacyPolicy() {
  return (<>
    <SEOHead title="Privacy Policy" noIndex />
    <main style={{ maxWidth:"720px", margin:"0 auto", padding:"3rem 1.5rem", fontFamily:"system-ui,sans-serif", lineHeight:1.7 }}>
      <h1>Privacy Policy</h1><p><strong>Last updated:</strong> {d}</p>
      <h2>1. Data Controller</h2><p>YOUR_COMPANY · YOUR_ADDRESS · YOUR_EMAIL</p>
      <h2>2. Data We Collect</h2>
      <ul><li><strong>Usage:</strong> Pages visited, time on site.</li><li><strong>Contact:</strong> Name and email via forms.</li><li><strong>Technical:</strong> IP (anonymised), browser, device.</li></ul>
      <h2>3. Legal Basis (GDPR Art. 6)</h2>
      <ul><li>Consent — analytics & marketing cookies.</li><li>Legitimate interest — security, fraud prevention.</li><li>Contract — responding to your enquiries.</li></ul>
      <h2>4. Retention</h2><p>Contact data: 2 years. Analytics: 14 months (GA4 default).</p>
      <h2>5. Your Rights</h2><p>Access, rectify, erase, restrict, portability, object. Email YOUR_EMAIL.</p>
      <h2>6. Cookies</h2><p>See our <a href="/cookies">Cookie Policy</a>.</p>
      <h2>7. Third Parties</h2><p>Vercel (hosting), Google Analytics (if consented), Sentry (error tracking). No data is sold.</p>
    </main>
  </>);
}
EOF

cat > src/components/legal/CookiePolicy.tsx << 'EOF'
import { SEOHead } from "@/components/seo/SEOHead";
export function CookiePolicy() {
  return (<>
    <SEOHead title="Cookie Policy" noIndex />
    <main style={{ maxWidth:"720px", margin:"0 auto", padding:"3rem 1.5rem", fontFamily:"system-ui,sans-serif", lineHeight:1.7 }}>
      <h1>Cookie Policy</h1>
      <h2>Cookies We Use</h2>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.9rem" }}>
        <thead><tr style={{ background:"#f8fafc" }}>{["Name","Provider","Purpose","Duration","Type"].map(h => <th key={h} style={{ padding:"0.5rem 0.75rem", textAlign:"left", borderBottom:"2px solid #e2e8f0" }}>{h}</th>)}</tr></thead>
        <tbody>
          {[
            ["cookie_consent_v1","This site","Stores consent choice","1 year","Necessary"],
            ["_ga","Google","Distinguish users (GA4)","2 years","Analytics"],
            ["_ga_*","Google","Session state (GA4)","2 years","Analytics"],
          ].map(row => <tr key={row[0]} style={{ borderBottom:"1px solid #e2e8f0" }}>{row.map((c,i) => <td key={i} style={{ padding:"0.5rem 0.75rem" }}>{c}</td>)}</tr>)}
        </tbody>
      </table>
      <h2>Managing Cookies</h2>
      <p>Use the cookie banner at the bottom of any page or clear your browser cookies.</p>
    </main>
  </>);
}
EOF

cat > src/components/legal/Terms.tsx << 'EOF'
import { SEOHead } from "@/components/seo/SEOHead";
const d = new Date().toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" });
export function Terms() {
  return (<>
    <SEOHead title="Terms of Service" noIndex />
    <main style={{ maxWidth:"720px", margin:"0 auto", padding:"3rem 1.5rem", fontFamily:"system-ui,sans-serif", lineHeight:1.7 }}>
      <h1>Terms of Service</h1><p><strong>Last updated:</strong> {d}</p>
      <h2>1. Acceptance</h2><p>By accessing this site you agree to these terms.</p>
      <h2>2. Intellectual Property</h2><p>All content belongs to YOUR_COMPANY unless stated otherwise.</p>
      <h2>3. Disclaimer</h2><p>Provided "as is" without warranties. We are not liable for damages from use of this site.</p>
      <h2>4. Governing Law</h2><p>Laws of YOUR_JURISDICTION.</p>
      <h2>5. Contact</h2><p>YOUR_EMAIL</p>
    </main>
  </>);
}
EOF
log "Legal components created: CookieBanner, PrivacyPolicy, CookiePolicy, Terms"

# ─────────────────────────────────────────────────────────────────────────────
# BLOCK 8 ── ANALYTICS PROVIDER
# ─────────────────────────────────────────────────────────────────────────────
section "BLOCK 8 · Analytics Provider"

cat > src/components/analytics/AnalyticsProvider.tsx << 'EOF'
/**
 * AnalyticsProvider — Injects GA4 only after analytics consent.
 * Mount inside <CookieConsentProvider> in App.tsx.
 */
import { useEffect } from "react";
import { useCookieConsent } from "@/components/legal/CookieBanner";

export function AnalyticsProvider() {
  const consent = useCookieConsent();
  const gaId = import.meta.env.VITE_GA_ID as string | undefined;

  useEffect(() => {
    if (!consent?.analytics || !gaId || document.getElementById("ga4")) return;
    window.dataLayer = window.dataLayer ?? [];
    window.gtag = (...a: unknown[]) => { window.dataLayer!.push(a); };
    window.gtag("js", new Date());
    window.gtag("config", gaId, { anonymize_ip:true, allow_google_signals:false, allow_ad_personalization_signals:false });
    const s = document.createElement("script");
    s.id = "ga4"; s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(s);
  }, [consent?.analytics, gaId]);

  return null;
}
EOF
log "src/components/analytics/AnalyticsProvider.tsx created"

# ─────────────────────────────────────────────────────────────────────────────
# BLOCK 9 ── LAYOUT
# ─────────────────────────────────────────────────────────────────────────────
section "BLOCK 9 · Base Layout"

cat > src/components/layout/AppLayout.tsx << 'EOF'
/**
 * AppLayout — Universal shell with a11y skip-link, nav, main, footer.
 * Use as parent route in react-router-dom:
 * <Route element={<AppLayout />}>
 * <Route path="/" element={<Home />} />
 * </Route>
 */
import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>

      <div style={{ display:"flex", flexDirection:"column", minHeight:"100dvh" }}>
        <header role="banner">
          <nav role="navigation" aria-label="Main navigation">
            {/* ← Insert your Lovable Navbar here */}
          </nav>
        </header>

        <main id="main-content" role="main" tabIndex={-1} style={{ flex:1 }}>
          <Outlet />
        </main>

        <footer role="contentinfo" style={{ padding:"2rem 1.5rem", textAlign:"center", borderTop:"1px solid #e2e8f0", fontSize:"0.85rem", color:"#64748b" }}>
          <nav aria-label="Legal links">
            <a href="/privacy" style={{ color:"inherit", marginRight:"1rem" }}>Privacy</a>
            <a href="/cookies" style={{ color:"inherit", marginRight:"1rem" }}>Cookies</a>
            <a href="/terms"   style={{ color:"inherit" }}>Terms</a>
          </nav>
          <p style={{ marginTop:"0.5rem" }}>© {new Date().getFullYear()} YOUR_COMPANY. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
}
EOF
log "src/components/layout/AppLayout.tsx created"

# ─────────────────────────────────────────────────────────────────────────────
# BLOCK 10 ── HOOKS
# ─────────────────────────────────────────────────────────────────────────────
section "BLOCK 10 · Utility Hooks"

cat > src/hooks/useAsync.ts << 'EOF'
import { useState, useCallback } from "react";
interface S<T> { data:T|null; loading:boolean; error:string|null; }
export function useAsync<T, A extends unknown[]>(fn: (...a:A) => Promise<T>) {
  const [s, set] = useState<S<T>>({ data:null, loading:false, error:null });
  const execute = useCallback(async (...a:A) => {
    set({ data:null, loading:true, error:null });
    try   { const d = await fn(...a); set({ data:d, loading:false, error:null }); return d; }
    catch (e) { set({ data:null, loading:false, error: e instanceof Error ? e.message : "Error" }); throw e; }
  }, [fn]); // eslint-disable-line
  return { ...s, execute };
}
EOF

cat > src/hooks/useDebounce.ts << 'EOF'
import { useState, useEffect } from "react";
export function useDebounce<T>(value:T, delay=400): T {
  const [d, set] = useState(value);
  useEffect(() => { const t = setTimeout(() => set(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return d;
}
EOF

cat > src/hooks/useLocalStorage.ts << 'EOF'
import { useState, useCallback } from "react";
export function useLocalStorage<T>(key:string, init:T) {
  const [v, set] = useState<T>(() => {
    if (typeof window === "undefined") return init;
    try { const i = localStorage.getItem(key); return i ? JSON.parse(i) as T : init; }
    catch { return init; }
  });
  const setV = useCallback((nv: T | ((p:T) => T)) => {
    set(p => {
      const r = typeof nv === "function" ? (nv as (p:T) => T)(p) : nv;
      try { localStorage.setItem(key, JSON.stringify(r)); } catch {}
      return r;
    });
  }, [key]);
  const remove = useCallback(() => { try { localStorage.removeItem(key); } catch {} set(init); }, [key, init]);
  return [v, setV, remove] as const;
}
EOF

cat > src/hooks/useMediaQuery.ts << 'EOF'
import { useState, useEffect } from "react";
export function useMediaQuery(q:string): boolean {
  const [m, set] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const h = (e:MediaQueryListEvent) => set(e.matches);
    mq.addEventListener("change", h);
    set(mq.matches);
    return () => mq.removeEventListener("change", h);
  }, [q]);
  return m;
}
EOF

cat > src/hooks/useOnClickOutside.ts << 'EOF'
import { useEffect, type RefObject } from "react";
export function useOnClickOutside<T extends HTMLElement>(ref:RefObject<T>, handler:(e:MouseEvent|TouchEvent)=>void) {
  useEffect(() => {
    const l = (e:MouseEvent|TouchEvent) => { if (!ref.current?.contains(e.target as Node)) handler(e); };
    document.addEventListener("mousedown", l);
    document.addEventListener("touchstart", l);
    return () => { document.removeEventListener("mousedown", l); document.removeEventListener("touchstart", l); };
  }, [ref, handler]);
}
EOF

log "Hooks created: useAsync, useDebounce, useLocalStorage, useMediaQuery, useOnClickOutside"

# ─────────────────────────────────────────────────────────────────────────────
# BLOCK 11 ── TYPES
# ─────────────────────────────────────────────────────────────────────────────
section "BLOCK 11 · Shared Types"

cat > src/types/index.ts << 'EOF'
export interface ApiResponse<T> { data:T|null; error:string|null; status:number; }
export interface PaginatedResponse<T> { data:T[]; total:number; page:number; pageSize:number; hasMore:boolean; }
export type AsyncStatus = "idle"|"loading"|"success"|"error";
export interface SelectOption<T = string> { label:string; value:T; disabled?:boolean; }
export interface User { id:string; email:string; name?:string; avatarUrl?:string; role:"admin"|"user"|"guest"; createdAt:string; }
EOF
log "src/types/index.ts created"

# ─────────────────────────────────────────────────────────────────────────────
# BLOCK 12 ── PUBLIC ASSETS
# ─────────────────────────────────────────────────────────────────────────────
section "BLOCK 12 · Public Assets"

cat > public/manifest.json << 'EOF'
{
  "name": "My App",
  "short_name": "App",
  "description": "Built with HELEN CLI",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#6366f1",
  "orientation": "portrait-primary",
  "categories": ["business"],
  "icons": [
    { "src": "/icons/icon-72.png",  "sizes": "72x72",  "type": "image/png" },
    { "src": "/icons/icon-96.png",  "sizes": "96x96",  "type": "image/png" },
    { "src": "/icons/icon-128.png", "sizes": "128x128","type": "image/png" },
    { "src": "/icons/icon-192.png", "sizes": "192x192","type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512","type": "image/png","purpose":"maskable" }
  ]
}
EOF

[[ ! -f "public/robots.txt" ]] && cat > public/robots.txt << 'EOF'
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Sitemap: https://yourdomain.com/sitemap.xml
EOF

cat > "public/.well-known/security.txt" << 'EOF'
Contact: mailto:security@yourdomain.com
Expires: 2026-12-31T23:59:00.000Z
Preferred-Languages: en, es
Canonical: https://yourdomain.com/.well-known/security.txt
Policy: https://yourdomain.com/security-policy
EOF

log "public/manifest.json, robots.txt, security.txt created"

# ─────────────────────────────────────────────────────────────────────────────
# BLOCK 13 ── CI/CD + HUSKY + ESLINT
# ─────────────────────────────────────────────────────────────────────────────
section "BLOCK 13 · CI/CD · Husky · ESLint"

cat > .github/workflows/ci.yml << 'EOF'
name: CI
on:
  push:    { branches: [main, develop] }
  pull_request: { branches: [main] }
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
jobs:
  quality:
    name: Quality Gate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run lint:sec
      - run: npm run audit:ci
      - uses: gitleaks/gitleaks-action@v2
        env: { GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}" }
      - run: npm run build
        env:
          VITE_APP_URL: https://example.com
          VITE_APP_NAME: "My App"
          VITE_APP_DESCRIPTION: "My app"
EOF

if [[ -d ".git" ]]; then
  npx husky init 2>/dev/null || true
  echo "npx lint-staged" > .husky/pre-commit
  chmod +x .husky/pre-commit
  log "Husky pre-commit hook configured"
else
  warn "No .git — run 'git init && npx husky init' manually"
fi

if [[ ! -f ".eslintrc.json" ]] && [[ ! -f "eslint.config.js" ]] && [[ ! -f "eslint.config.ts" ]]; then
cat > .eslintrc.json << 'EOF'
{
  "extends": ["eslint:recommended","plugin:@typescript-eslint/recommended","plugin:security/recommended","plugin:jsx-a11y/recommended","plugin:react-hooks/recommended"],
  "plugins": ["security","no-secrets","@typescript-eslint","jsx-a11y"],
  "parser": "@typescript-eslint/parser",
  "parserOptions": { "ecmaVersion": "latest", "sourceType": "module" },
  "rules": {
    "no-secrets/no-secrets": ["error", { "tolerance": 4.2 }],
    "@typescript-eslint/no-explicit-any": "error",
    "no-console": ["error", { "allow": ["warn","error"] }],
    "jsx-a11y/alt-text": "error",
    "jsx-a11y/anchor-is-valid": "error",
    "jsx-a11y/aria-props": "error"
  },
  "ignorePatterns": ["dist/","node_modules/","*.config.*"]
}
EOF
  log ".eslintrc.json created (security + a11y)"
else
  warn "ESLint config exists — add jsx-a11y and security plugins manually"
fi

[[ ! -f ".npmrc" ]] && printf "save-exact=true\naudit-level=critical\n" > .npmrc

# ─────────────────────────────────────────────────────────────────────────────
# BLOCK 14 ── ENV TEMPLATE + GITIGNORE
# ─────────────────────────────────────────────────────────────────────────────
section "BLOCK 14 · Env Template"

[[ ! -f ".env.example" ]] && cat > .env.example << 'EOF'
VITE_APP_URL=http://localhost:5173
VITE_APP_NAME="My App"
VITE_APP_DESCRIPTION="Your app description"
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SENTRY_DSN=https://your-dsn@o0.ingest.sentry.io/0
VITE_GA_ID=G-XXXXXXXXXX
EOF

for p in ".env" ".env.local" ".env.*.local"; do
  grep -qxF "$p" .gitignore 2>/dev/null || echo "$p" >> .gitignore
done
log ".env.example + .gitignore updated"

# ─────────────────────────────────────────────────────────────────────────────
# FINAL SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║   ✓  HELEN CLI v3.0 — Assembly complete                  ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}  3 required edits in src/main.tsx:${NC}"
echo ""
echo -e '  ${CYAN}// 1. First imports (before React)${NC}'
echo    '  import "./lib/sentry";'
echo    '  import { env } from "./lib/env";'
echo    '  import "react-helmet-async";'
echo ""
echo -e '  ${CYAN}// 2. Wrap root render${NC}'
echo    '  <GlobalErrorBoundary>'
echo    '    <HelmetProvider>'
echo    '      <ToastProvider>'
echo    '        <CookieConsentProvider>'
echo    '          <AnalyticsProvider />'
echo    '          <RouterProvider router={router} />'
echo    '        </CookieConsentProvider>'
echo    '      </ToastProvider>'
echo    '    </HelmetProvider>'
echo    '  </GlobalErrorBoundary>'
echo ""
echo -e "${YELLOW}  ⚠  Manual tasks before going live:${NC}"
echo    "  1. public/og-image.png     — 1200×630px social share image"
echo    "  2. public/icons/*.png      — generate from https://favicon.io"
echo    "  3. legal pages             — replace YOUR_COMPANY / YOUR_EMAIL"
echo    "  4. public/manifest.json    — update name, colors, description"
echo    "  5. public/robots.txt       — replace yourdomain.com"
echo    "  6. .env.local              — fill from .env.example"
echo    "  7. vercel.json CSP         — add your real API domains to connect-src"
echo ""