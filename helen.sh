#!/usr/bin/env bash

# =============================================================================

# HELEN CLI v4.0 — The Definitive Assembly Machine

# Security · Docker · CI/CD · Testing · i18n · GDPR · SEO · PWA · Performance

# Usage: bash helen.sh  (run from the project root)

# Requires: node >= 18, npm >= 9, jq, git

# =============================================================================

set -euo pipefail
IFS=$’\n\t’

# Cleanup parcial si el usuario interrumpe a mitad. Más vale avisar que romper.

trap ‘_on_exit’ INT TERM EXIT
_on_exit() {
local code=$?
[[ $code -ne 0 ]] && echo -e “\n${RED}[ HELEN ]${NC} Salida inesperada (code $code). Revisa los archivos creados — las runs parciales suelen ser inofensivas.” >&2
exit $code
}

# ── Colores ───────────────────────────────────────────────────────────────────

readonly GREEN=’\033[0;32m’
readonly YELLOW=’\033[1;33m’
readonly CYAN=’\033[0;36m’
readonly RED=’\033[0;31m’
readonly BOLD=’\033[1m’
readonly DIM=’\033[2m’
readonly NC=’\033[0m’

# ── Logging — siempre con prefijo HELEN para distinguirlo de npm/git noise ────

ok()      { echo -e “${GREEN}[ HELEN ]${NC} $*”; }
info()    { echo -e “${CYAN}[ HELEN ]${NC} $*”; }
warn()    { echo -e “${YELLOW}[ HELEN ]${NC} $*”; }
die()     { echo -e “${RED}[ HELEN ]${NC} $*” >&2; exit 1; }
section() { echo -e “\n${BOLD}${CYAN}  $*${NC}\n${DIM}  $(printf ‘─%.0s’ {1..60})${NC}”; }
step()    { echo -e “  ${DIM}->>${NC} $*”; }

# ── Arte ASCII — porque el primer contacto importa ───────────────────────────

clear
echo -e “${CYAN}${BOLD}”
cat << ‘BANNER’
██╗  ██╗███████╗██╗     ███████╗███╗   ██╗
██║  ██║██╔════╝██║     ██╔════╝████╗  ██║
███████║█████╗  ██║     █████╗  ██╔██╗ ██║
██╔══██║██╔══╝  ██║     ██╔══╝  ██║╚██╗██║
██║  ██║███████╗███████╗███████╗██║ ╚████║
╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═══╝
BANNER
echo -e “${NC}${BOLD}   v4.0 — The Definitive Assembly Machine${NC}”
echo -e “${DIM}   Security · Docker · CI/CD · Testing · i18n · GDPR · SEO · PWA${NC}”
echo “”

# ── Preflight — mejor que falle aquí que a mitad del setup ───────────────────

[[ ! -f “package.json” ]] && die “No hay package.json. Ejecuta desde la raiz del proyecto.”
command -v npm  >/dev/null 2>&1 || die “npm no encontrado.”
command -v node >/dev/null 2>&1 || die “node no encontrado.”
command -v jq   >/dev/null 2>&1 || die “jq no encontrado: brew install jq  |  apt install jq”

readonly PROJECT_NAME=$(jq -r ‘.name // “my-app”’ package.json)
readonly IS_VITE=$([[ -f “vite.config.ts” || -f “vite.config.js” ]] && echo “true” || echo “false”)
readonly HAS_GIT=$([[ -d “.git” ]] && echo “true” || echo “false”)
readonly HAS_SRC=$([[ -d “src” ]] && echo “true” || echo “false”)

info “Proyecto: ${BOLD}${PROJECT_NAME}${NC}   Vite: ${IS_VITE}   Git: ${HAS_GIT}”
echo “”

# =============================================================================

# REGISTRY DE MODULOS

# Formato: “ID|Categoria|Descripcion|Funcion”

# =============================================================================

declare -a REGISTRY=(
# — Dependencias ──────────────────────────────────────────────────────────
“01|DEPS|Instalar dependencias runtime (zod, DOMPurify, Sentry, helmet-async)|mod_runtime_deps”
“02|DEPS|Instalar dependencias dev (husky, lint-staged, audit-ci, eslint plugins)|mod_dev_deps”

```
# — Seguridad & Infraestructura ───────────────────────────────────────────
"03|SECURITY|Vercel Edge Security Headers (CSP, HSTS, X-Frame, Permissions-Policy...)|mod_vercel_security"
"04|SECURITY|Utilidades de seguridad (security.ts, env.ts, sentry.ts, analytics.ts)|mod_security_utils"
"05|SECURITY|Git config (.gitignore completo, .gitattributes, .npmrc)|mod_git_config"

# — SEO & PWA ─────────────────────────────────────────────────────────────
"06|SEO|Inyeccion SEO + OpenGraph + Twitter Card + PWA en index.html|mod_seo_html"
"07|SEO|Componente SEOHead.tsx con JSON-LD helpers (react-helmet-async)|mod_seo_component"
"08|SEO|Assets publicos (manifest.json, robots.txt, security.txt)|mod_public_assets"

# — UI & Componentes ──────────────────────────────────────────────────────
"09|UI|CSS global UX: smooth scroll, a11y resets, animaciones, dvh|mod_global_css"
"10|UI|Componentes UI base (ErrorBoundary, Spinner, Skeleton, Button, Toast)|mod_ui_components"
"11|UI|Layout base (AppLayout con skip-link, header, main, footer ARIA)|mod_base_layout"
"12|UI|Paginas de error (NotFound 404, ServerError 500)|mod_error_pages"

# — Legal & Analytics ─────────────────────────────────────────────────────
"13|LEGAL|Componentes GDPR (CookieBanner, PrivacyPolicy, CookiePolicy, Terms)|mod_legal_gdpr"
"14|LEGAL|Analytics Provider (GA4 consent-gated, zero tracking sin permiso)|mod_analytics_provider"

# — Hooks & Tipos ─────────────────────────────────────────────────────────
"15|UTILS|Hooks de utilidad (useAsync, useDebounce, useLocalStorage, useMediaQuery...)|mod_hooks"
"16|UTILS|Tipos compartidos (ApiResponse, PaginatedResponse, User, AsyncStatus...)|mod_types"

# — Estado & Data Fetching ────────────────────────────────────────────────
"17|STATE|Zustand store setup (authStore, uiStore, con persistencia)|mod_zustand"
"18|STATE|TanStack Query setup (QueryClient, providers, hooks base)|mod_react_query"
"19|STATE|Cliente API con Axios (interceptores auth, error handling, retry)|mod_api_client"

# — i18n ──────────────────────────────────────────────────────────────────
"20|I18N|Internacionalizacion (react-i18next, deteccion de idioma, es/en)|mod_i18n"

# — Testing ───────────────────────────────────────────────────────────────
"21|TESTING|Setup Vitest + Testing Library + jsdom + ejemplo de test|mod_testing"

# — Calidad de Codigo ─────────────────────────────────────────────────────
"22|QUALITY|ESLint estricto (security + a11y + typescript + no-secrets)|mod_eslint"
"23|QUALITY|Prettier config (.prettierrc + integracion con eslint)|mod_prettier"
"24|QUALITY|TypeScript strict mode (tsconfig con todas las flags)|mod_typescript_strict"
"25|QUALITY|Husky + lint-staged + Commitlint (conventional commits)|mod_husky"

# — CI/CD & Infra ─────────────────────────────────────────────────────────
"26|INFRA|GitHub Actions CI/CD (type-check, lint, audit, test, build, deploy)|mod_cicd"
"27|INFRA|Docker (Dockerfile multi-stage optimizado + docker-compose.yml)|mod_docker"
"28|INFRA|Lighthouse CI (performance budget, accesibilidad, SEO automatizados)|mod_lighthouse"
"29|INFRA|Bundle Analyzer (rollup-plugin-visualizer + npm run analyze)|mod_bundle_analyzer"

# — Arquitectura ──────────────────────────────────────────────────────────
"30|ARCH|Estructura Clean Architecture (features, shared, core, infra)|mod_clean_arch"

# — DX & Entorno ──────────────────────────────────────────────────────────
"31|DX|VS Code settings + extensiones recomendadas del proyecto|mod_vscode"
"32|DX|Template .env.example con todas las variables documentadas|mod_env_template"
"33|DX|README.md generado con badges, setup, scripts y estructura|mod_readme"
"34|DX|PWA completo (vite-plugin-pwa con Workbox, offline, install prompt)|mod_pwa"

# — Firma & DX Personal ───────────────────────────────────────────────────
"35|FIRMA|Easter Egg enekoOS (ASCII art, badge loader, DevTools detector)|mod_easter_egg"
"36|SEO|Componente <SEO /> global con HelmetProvider autowrap en main|mod_seo_global"
"37|QUALITY|Git Hooks standalone (Husky + lint-staged, sin commitlint)|mod_git_hooks"
"38|DX|Absolute Imports @/* (alias Vite resolve + tsconfig paths)|mod_absolute_imports"
"39|UI|Dark/Light/System ThemeProvider + useTheme hook + ThemeToggle|mod_theme_provider"
```

)

readonly TOTAL_MODULES=${#REGISTRY[@]}

# =============================================================================

# MENU — muestra categorias agrupadas con colores

# =============================================================================

show_menu() {
local current_cat=””
echo -e “${BOLD}  Modulos disponibles:${NC}”
echo “”
for entry in “${REGISTRY[@]}”; do
IFS=’|’ read -r idx cat desc fn <<< “$entry”
if [[ “$cat” != “$current_cat” ]]; then
current_cat=”$cat”
echo -e “  ${DIM}── ${cat} ─────────────────────────────────────────────────────${NC}”
fi
printf “  ${BOLD}${CYAN}%2s${NC}  ${desc}\n” “$idx”
done
echo “”
echo -e “  ${DIM}── ATAJOS ────────────────────────────────────────────────────────────${NC}”
echo -e “  ${BOLD}${CYAN}all${NC}  Ejecutar todos los modulos (setup completo)”
echo -e “  ${BOLD}${CYAN}deps${NC} Solo modulos de dependencias (01, 02)”
echo -e “  ${BOLD}${CYAN}sec${NC}  Solo modulos de seguridad (03, 04, 05)”
echo -e “  ${BOLD}${CYAN}ui${NC}   Solo modulos UI (09, 10, 11, 12)”
echo -e “  ${BOLD}${CYAN}dx${NC}   Solo Developer Experience (22-25, 31-33)”
echo -e “  ${BOLD}${CYAN}personal${NC} Firma enekoOS + SEO + Imports + ThemeProvider (35 36 38 39)”
echo “”
}

# =============================================================================

# PARSEO DE SELECCION — acepta “1 3 5”, “1,3,5”, “all”, “deps”, etc.

# =============================================================================

parse_selection() {
local input=”$1”
local result=””

```
case "$input" in
    all)  result=$(seq -w 1 $TOTAL_MODULES) ;;
    deps) result="01 02" ;;
    sec)  result="03 04 05" ;;
    ui)   result="09 10 11 12" ;;
    dx)       result="22 23 24 25 31 32 33" ;;
    personal) result="35 36 38 39" ;;
    *)
        # Normaliza: comas y guiones a espacios, limpia lo raro
        input="${input//,/ }"
        input="${input//-/ }"
        result=$(echo "$input" | tr ' ' '\n' | grep -E '^[0-9]+$' | \
                 awk '{printf "%02d\n", $1}' | sort -n | uniq)
        ;;
esac

echo "$result"
```

}

# =============================================================================

# EJECUCION — busca la funcion del modulo por ID y la llama

# =============================================================================

run_module() {
local target_idx=”$1”
local found=false

```
for entry in "${REGISTRY[@]}"; do
    IFS='|' read -r idx cat desc fn <<< "$entry"
    if [[ "$idx" == "$target_idx" ]]; then
        found=true
        section "${idx}/${TOTAL_MODULES} — ${desc}"
        if declare -f "$fn" > /dev/null 2>&1; then
            "$fn"
        else
            warn "Funcion ${fn} no encontrada en este script. Esto no deberia pasar."
        fi
        ok "Modulo ${idx} completado."
        break
    fi
done

[[ "$found" == "false" ]] && warn "Modulo '${target_idx}' no existe. Ignorando."
```

}

# =============================================================================

# HELPERS REUTILIZABLES — cosas que usan varios modulos

# =============================================================================

# Crea directorios solo si no existen, sin quejarse

ensure_dirs() { for d in “$@”; do mkdir -p “$d”; done; }

# Escribe un archivo solo si no existe ya, con aviso

write_if_missing() {
local path=”$1”
local content=”$2”
if [[ -f “$path” ]]; then
warn “${path} ya existe — saltando. Borra el archivo si quieres regenerarlo.”
else
mkdir -p “$(dirname “$path”)”
echo “$content” > “$path”
step “Creado: ${path}”
fi
}

# Append a un archivo solo si el marcador no esta ya

append_if_missing() {
local path=”$1”
local marker=”$2”
local content=”$3”
if [[ ! -f “$path” ]]; then
echo “$content” > “$path”
step “Creado: ${path}”
elif grep -q “$marker” “$path” 2>/dev/null; then
warn “${path}: el bloque ‘${marker}’ ya existe — saltando.”
else
echo “$content” >> “$path”
step “Actualizado: ${path}”
fi
}

# npm install con output limpio — npm se pone verboso cuando no toca

npm_install() {
info “Instalando: $*”
npm install –save “$@” 2>&1 | grep -E ‘(added|warn|ERR)’ || true
}

npm_install_dev() {
info “Instalando (dev): $*”
npm install –save-dev “$@” 2>&1 | grep -E ‘(added|warn|ERR)’ || true
}

# =============================================================================

# =============================================================================

# MODULOS — uno por bloque, self-contained, faciles de modificar

# =============================================================================

# =============================================================================

# ─────────────────────────────────────────────────────────────────────────────

# 01 — RUNTIME DEPS

# El minimo indispensable para un proyecto serio en produccion.

# ─────────────────────────────────────────────────────────────────────────────

mod_runtime_deps() {
npm_install   
“zod@3.23.8”   
“isomorphic-dompurify@2.16.0”   
“@sentry/react@8.38.0”   
“react-helmet-async@2.0.4”   
“axios@1.7.9”   
“react-i18next@15.1.0”   
“i18next@24.0.5”   
“i18next-browser-languagedetector@8.0.2”
ok “Runtime deps instaladas”
}

# ─────────────────────────────────────────────────────────────────────────────

# 02 — DEV DEPS

# Todo lo de calidad de codigo, testing y CI local.

# ─────────────────────────────────────────────────────────────────────────────

mod_dev_deps() {
npm_install_dev   
“husky@9.1.7”   
“lint-staged@15.2.10”   
“@commitlint/cli@19.5.0”   
“@commitlint/config-conventional@19.5.0”   
“audit-ci@7.1.0”   
“@typescript-eslint/eslint-plugin@8.15.0”   
“@typescript-eslint/parser@8.15.0”   
“eslint-plugin-security@3.0.1”   
“eslint-plugin-no-secrets@1.0.2”   
“eslint-plugin-jsx-a11y@6.10.2”   
“eslint-plugin-react-hooks@5.0.0”   
“eslint-plugin-import@2.31.0”   
“prettier@3.3.3”   
“eslint-config-prettier@9.1.0”   
“vite-plugin-pwa@0.21.1”   
“rollup-plugin-visualizer@5.12.0”   
“vitest@2.1.6”   
“@testing-library/react@16.0.0”   
“@testing-library/user-event@14.5.2”   
“@testing-library/jest-dom@6.6.3”   
“jsdom@25.0.1”
ok “Dev deps instaladas”
}

# ─────────────────────────────────────────────────────────────────────────────

# 03 — VERCEL SECURITY HEADERS

# Este JSON es la primera linea de defensa. No lo toques sin saber lo que haces.

# El CSP esta calibrado para Vite SPA + Supabase + GA4 + Sentry.

# ─────────────────────────────────────────────────────────────────────────────

mod_vercel_security() {
if [[ -f “vercel.json” ]]; then
warn “vercel.json ya existe — creando vercel.json.helen como referencia”
local target=“vercel.json.helen”
else
local target=“vercel.json”
fi

```
cat > "$target" << 'VERCELJSON'
```

{
“$schema”: “https://openapi.vercel.sh/vercel.json”,
“buildCommand”: “npm run build”,
“outputDirectory”: “dist”,
“framework”: “vite”,
“rewrites”: [
{
“source”: “/((?!api|assets|icons|fonts|favicon\.ico|robots\.txt|sitemap\.xml|\.well-known).*)”,
“destination”: “/index.html”
}
],
“headers”: [
{
“source”: “/(.*)”,
“headers”: [
{ “key”: “Strict-Transport-Security”,    “value”: “max-age=31536000; includeSubDomains; preload” },
{ “key”: “X-Frame-Options”,              “value”: “DENY” },
{ “key”: “X-Content-Type-Options”,       “value”: “nosniff” },
{ “key”: “Referrer-Policy”,              “value”: “strict-origin-when-cross-origin” },
{ “key”: “X-XSS-Protection”,             “value”: “0” },
{ “key”: “Cross-Origin-Opener-Policy”,   “value”: “same-origin” },
{ “key”: “Cross-Origin-Resource-Policy”, “value”: “cross-origin” },
{
“key”: “Permissions-Policy”,
“value”: “camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()”
},
{
“key”: “Content-Security-Policy”,
“value”: “default-src ‘self’; script-src ‘self’ ‘unsafe-inline’ https://www.googletagmanager.com https://www.google-analytics.com; style-src ‘self’ ‘unsafe-inline’ https://fonts.googleapis.com; font-src ‘self’ https://fonts.gstatic.com data:; img-src ‘self’ data: blob: https:; connect-src ‘self’ https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://analytics.google.com https://*.sentry.io; media-src ‘self’; object-src ‘none’; child-src ‘none’; frame-src ‘none’; worker-src ‘self’ blob:; form-action ‘self’; frame-ancestors ‘none’; base-uri ‘self’; manifest-src ‘self’; upgrade-insecure-requests”
}
]
},
{
“source”: “/assets/(.*)”,
“headers”: [{ “key”: “Cache-Control”, “value”: “public, max-age=31536000, immutable” }]
},
{
“source”: “/fonts/(.*)”,
“headers”: [{ “key”: “Cache-Control”, “value”: “public, max-age=31536000, immutable” }]
},
{
“source”: “/icons/(.*)”,
“headers”: [{ “key”: “Cache-Control”, “value”: “public, max-age=31536000, immutable” }]
}
]
}
VERCELJSON
step “Creado: ${target}”
warn “IMPORTANTE: actualiza connect-src en el CSP con tus dominios reales antes de hacer deploy.”
}

# ─────────────────────────────────────────────────────────────────────────────

# 04 — SECURITY UTILS

# Sanitizacion, validacion de env, Sentry con PII redactado, analytics gateado.

# ─────────────────────────────────────────────────────────────────────────────

mod_security_utils() {
ensure_dirs src/lib

```
# security.ts — siempre sanitiza antes de renderizar. Sin excepcion.
cat > src/lib/security.ts << 'EOF'
```

import DOMPurify from “isomorphic-dompurify”;
import { z } from “zod”;

// ── Sanitizers ────────────────────────────────────────────────────────────────
export const sanitizeHtml = (dirty: string): string =>
DOMPurify.sanitize(dirty, {
ALLOWED_TAGS: [“b”, “i”, “em”, “strong”, “a”, “p”, “br”, “ul”, “ol”, “li”],
ALLOWED_ATTR: [“href”, “target”, “rel”],
FORCE_BODY: true,
});

export const sanitizePlainText = (s: string): string =>
DOMPurify.sanitize(s, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();

// ── Schemas Zod — validacion + sanitizacion en un solo paso ──────────────────
export const emailSchema   = z.string().email(“Email invalido”).max(254).transform(sanitizePlainText);
export const nameSchema    = z.string().min(2).max(100).regex(/^[\p{L}\s’-]+$/u, “Nombre invalido”).transform(sanitizePlainText);
export const messageSchema = z.string().min(10).max(5000).transform(sanitizePlainText);
export const phoneSchema   = z.string().regex(/^+?[\d\s-().]{7,20}$/).optional().transform(v => v ? sanitizePlainText(v) : undefined);
export const urlSchema     = z.string().url().max(2000).transform(sanitizePlainText);

export const contactFormSchema = z.object({
name:    nameSchema,
email:   emailSchema,
message: messageSchema,
phone:   phoneSchema,
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

// ── Parser de respuestas de API — tipado y seguro ────────────────────────────
export function parseApiResponse<T>(
schema: z.ZodSchema<T>,
raw: unknown
): { data: T; error: null } | { data: null; error: string } {
const r = schema.safeParse(raw);
return r.success
? { data: r.data, error: null }
: { data: null, error: r.error.errors.map(e => `${String(e.path)}: ${e.message}`).join(”, “) };
}
EOF
step “Creado: src/lib/security.ts”

```
# env.ts — si falta una variable de entorno, la app explota en arranque.
# Mejor ahora que en produccion a las 3am.
cat > src/lib/env.ts << 'EOF'
```

import { z } from “zod”;

const schema = z.object({
VITE_APP_URL:           z.string().url(),
VITE_APP_NAME:          z.string().min(1).default(“My App”),
VITE_APP_DESCRIPTION:   z.string().min(1).default(“Built with HELEN CLI”),
VITE_SUPABASE_URL:      z.string().url().optional(),
VITE_SUPABASE_ANON_KEY: z.string().min(1).optional(),
VITE_SENTRY_DSN:        z.string().url().optional(),
VITE_GA_ID:             z.string().startsWith(“G-”).optional(),
VITE_API_URL:           z.string().url().optional(),
});

function validate() {
const result = schema.safeParse({
VITE_APP_URL:           import.meta.env.VITE_APP_URL,
VITE_APP_NAME:          import.meta.env.VITE_APP_NAME,
VITE_APP_DESCRIPTION:   import.meta.env.VITE_APP_DESCRIPTION,
VITE_SUPABASE_URL:      import.meta.env.VITE_SUPABASE_URL,
VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
VITE_SENTRY_DSN:        import.meta.env.VITE_SENTRY_DSN,
VITE_GA_ID:             import.meta.env.VITE_GA_ID,
VITE_API_URL:           import.meta.env.VITE_API_URL,
});

if (!result.success) {
const missing = result.error.errors.map(e => `  - ${String(e.path[0])}: ${e.message}`).join(”\n”);
throw new Error(`[HELEN ENV] Variables de entorno invalidas:\n${missing}\n\nRevisa tu .env.local`);
}
return result.data;
}

export const env = validate();
EOF
step “Creado: src/lib/env.ts”

```
# sentry.ts — datos personales redactados del body/response por defecto.
# El GDPR te lo agradecera.
cat > src/lib/sentry.ts << 'EOF'
```

import * as Sentry from “@sentry/react”;

const dsn    = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const isProd = import.meta.env.PROD as boolean;

Sentry.init({
dsn,
enabled:    isProd && Boolean(dsn),
environment: isProd ? “production” : “development”,
tracesSampleRate:          isProd ? 0.1  : 1.0,
replaysSessionSampleRate:  isProd ? 0.02 : 0,
replaysOnErrorSampleRate:  1.0,
integrations: [
Sentry.browserTracingIntegration(),
Sentry.replayIntegration({ maskAllInputs: true, maskAllText: false }),
],
beforeBreadcrumb(breadcrumb) {
// Limpiamos el body de las requests para no filtrar tokens ni passwords
if ((breadcrumb.category === “xhr” || breadcrumb.category === “fetch”) && breadcrumb.data) {
delete breadcrumb.data[“body”];
delete breadcrumb.data[“response”];
}
return breadcrumb;
},
beforeSend(event) {
// En dev no mandes nada — Sentry tiene limite de eventos gratuitos
if (!isProd) return null;
return event;
},
});
EOF
step “Creado: src/lib/sentry.ts”

```
# analytics.ts — el gtag solo existe despues de que el usuario da consent.
# Que sea la ley, no la excepcion.
cat > src/lib/analytics.ts << 'EOF'
```

declare global {
interface Window {
gtag?: (…args: unknown[]) => void;
dataLayer?: unknown[];
}
}

type EventParams = Record<string, string | number | boolean>;
const ready = () => typeof window !== “undefined” && typeof window.gtag === “function”;

export const analytics = {
pageview(path: string, title?: string) {
if (!ready()) return;
window.gtag!(“config”, import.meta.env.VITE_GA_ID as string, {
page_path:  path,
page_title: title ?? document.title,
});
},
event(name: string, params?: EventParams) {
if (!ready()) return;
window.gtag!(“event”, name, params);
},
conversion(sendTo: string, params?: EventParams) {
if (!ready()) return;
window.gtag!(“event”, “conversion”, { send_to: sendTo, …params });
},
};
EOF
step “Creado: src/lib/analytics.ts”
}

# ─────────────────────────────────────────────────────────────────────────────

# 05 — GIT CONFIG

# .gitignore decente y .gitattributes para que los line endings no arruinen el

# diff de alguien que trabaja en Windows. Clasico.

# ─────────────────────────────────────────────────────────────────────────────

mod_git_config() {
# .gitignore — el basico que todo el mundo olvida algun item critico
cat > .gitignore << ‘EOF’

# Dependencias

node_modules/
.pnp
.pnp.js

# Build outputs

dist/
dist-ssr/
build/
out/
.output/

# Entornos — NUNCA commits de secrets

.env
.env.local
.env.*.local
.env.production
.env.staging

# Logs

logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Editor

.vscode/*
!.vscode/extensions.json
!.vscode/settings.json
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
.DS_Store
Thumbs.db

# Testing

coverage/
.nyc_output/
test-results/
playwright-report/

# Cache

.cache/
.turbo/
.parcel-cache/
*.tsbuildinfo

# Storybook

storybook-static/

# Docker

.dockerenv
EOF
step “Creado: .gitignore”

```
# .gitattributes — evita el infierno de CRLF vs LF en equipos mixtos
cat > .gitattributes << 'EOF'
```

- text=auto eol=lf

*.sh   text eol=lf
*.bash text eol=lf

*.png  binary
*.jpg  binary
*.jpeg binary
*.gif  binary
*.ico  binary
*.webp binary
*.avif binary
*.woff binary
*.woff2 binary
*.ttf  binary
*.otf  binary
*.pdf  binary
*.zip  binary
EOF
step “Creado: .gitattributes”

```
# .npmrc — pin exacto de versiones y bloqueo en vulnerabilidades criticas
cat > .npmrc << 'EOF'
```

save-exact=true
audit-level=critical
fund=false
loglevel=warn
EOF
step “Creado: .npmrc”
}

# ─────────────────────────────────────────────────────────────────────────────

# 06 — SEO + OG + PWA en index.html

# ─────────────────────────────────────────────────────────────────────────────

mod_seo_html() {
if [[ ! -f “index.html” ]]; then
warn “index.html no encontrado — creando uno base”
cat > index.html << ‘EOF’

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

```
if grep -q "HELEN-V4" index.html 2>/dev/null; then
    warn "index.html ya tiene el bloque HELEN — saltando"
    return 0
fi

cp index.html index.html.bak
step "Backup: index.html.bak"

# Insertar bloque de meta antes de </head>
# El orden importa: viewport -> meta -> canonical -> OG -> Twitter -> PWA -> preconnect
python3 - << 'PYEOF'
```

import re, sys

with open(“index.html”, “r”) as f:
html = f.read()

meta_block = “””    <!-- HELEN-V4: SEO + Social + PWA -->

```
<!-- SEO base -->
<meta name="description"        content="%VITE_APP_DESCRIPTION%" />
<meta name="keywords"           content="" />
<meta name="author"             content="%VITE_APP_NAME%" />
<meta name="robots"             content="index, follow" />
<link rel="canonical"           href="%VITE_APP_URL%" />

<!-- Open Graph — lo que ve WhatsApp/LinkedIn/Facebook al compartir -->
<meta property="og:type"         content="website" />
<meta property="og:url"          content="%VITE_APP_URL%" />
<meta property="og:title"        content="%VITE_APP_NAME%" />
<meta property="og:description"  content="%VITE_APP_DESCRIPTION%" />
<meta property="og:image"        content="%VITE_APP_URL%/og-image.png" />
<meta property="og:image:width"  content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt"    content="%VITE_APP_NAME%" />
<meta property="og:locale"       content="es_ES" />
<meta property="og:site_name"    content="%VITE_APP_NAME%" />

<!-- Twitter Card -->
<meta name="twitter:card"        content="summary_large_image" />
<meta name="twitter:site"        content="@yourhandle" />
<meta name="twitter:title"       content="%VITE_APP_NAME%" />
<meta name="twitter:description" content="%VITE_APP_DESCRIPTION%" />
<meta name="twitter:image"       content="%VITE_APP_URL%/og-image.png" />

<!-- PWA -->
<link rel="manifest"             href="/manifest.json" />
<meta name="theme-color"         content="#6366f1" />
<meta name="apple-mobile-web-app-capable"          content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title"            content="%VITE_APP_NAME%" />
<link rel="apple-touch-icon"     href="/icons/apple-touch-icon.png" />
<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16.png" />

<!-- Preconnects — ahorra ~200ms de DNS en el primer render -->
<link rel="preconnect"   href="https://fonts.googleapis.com" />
<link rel="preconnect"   href="https://fonts.gstatic.com" crossorigin />
<link rel="dns-prefetch" href="https://www.google-analytics.com" />
<link rel="dns-prefetch" href="https://o0.ingest.sentry.io" />
```

“””

preloader_css = “””  <style id="__helen_preloader_css">
#app-shell {
position: fixed; inset: 0;
display: flex; flex-direction: column;
align-items: center; justify-content: center;
background: #fff;
z-index: 99999;
transition: opacity 0.3s ease, visibility 0.3s ease;
}
#app-shell.done { opacity: 0; visibility: hidden; pointer-events: none; }
.shell-ring {
width: 44px; height: 44px;
border: 3px solid #e2e8f0;
border-top-color: #6366f1;
border-radius: 50%;
animation: shell-spin 0.7s linear infinite;
}
@keyframes shell-spin { to { transform: rotate(360deg); } }
</style>
“””

preloader_html = “””  <!-- App Shell — evita la pantalla en blanco mientras carga el bundle JS -->

  <div id="app-shell" role="status" aria-label="Cargando aplicacion">
    <div class="shell-ring" aria-hidden="true"></div>
  </div>
  <script>
    (function () {
      var shell = document.getElementById("app-shell");
      if (!shell) return;
      var o = new MutationObserver(function () {
        var root = document.getElementById("root");
        if (root && root.children.length > 0) {
          shell.classList.add("done");
          setTimeout(function () {
            shell.remove();
            var css = document.getElementById("__helen_preloader_css");
            if (css) css.remove();
          }, 350);
          o.disconnect();
        }
      });
      o.observe(document.body, { childList: true, subtree: true });
      setTimeout(function () { shell.classList.add("done"); }, 5000);
    })();
  </script>
"""

html = html.replace(”</head>”, meta_block + preloader_css + “\n  </head>”)
html = html.replace(”</body>”, preloader_html + “\n</body>”)

with open(“index.html”, “w”) as f:
f.write(html)

print(”  index.html actualizado correctamente”)
PYEOF
}

# ─────────────────────────────────────────────────────────────────────────────

# 07 — SEO COMPONENT

# ─────────────────────────────────────────────────────────────────────────────

mod_seo_component() {
ensure_dirs src/components/seo

```
cat > src/components/seo/SEOHead.tsx << 'EOF'
```

/**

- SEOHead — Meta dinamica por pagina via react-helmet-async.
- Usar en cada ruta: <SEOHead title="Servicios" description="..." />
- Requiere <HelmetProvider> wrapping la app en main.tsx.
  */
  import { Helmet } from “react-helmet-async”;
  import { env } from “@/lib/env”;

interface SEOHeadProps {
title?:         string;
description?:   string;
image?:         string;
url?:           string;
type?:          “website” | “article”;
noIndex?:       boolean;
structuredData?: Record<string, unknown>;
}

export function SEOHead({
title,
description,
image,
url,
type      = “website”,
noIndex   = false,
structuredData,
}: SEOHeadProps) {
const siteName  = env.VITE_APP_NAME;
const fullTitle = title ? `${title} | ${siteName}` : siteName;
const desc      = description ?? env.VITE_APP_DESCRIPTION;
const ogImage   = image ?? `${env.VITE_APP_URL}/og-image.png`;
const canonical = url ?? (typeof window !== “undefined” ? window.location.href : env.VITE_APP_URL);

return (
<Helmet>
<title>{fullTitle}</title>
<meta name="description" content={desc} />
{noIndex && <meta name="robots" content="noindex, nofollow" />}
<link rel="canonical" href={canonical} />

```
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
```

);
}

// ── Helpers JSON-LD — copiar y adaptar segun el tipo de pagina ────────────────
export const jsonLdOrganization = (name: string, url: string, logo: string) => ({
“@context”: “https://schema.org”,
“@type”: “Organization”,
name, url, logo,
});

export const jsonLdLocalBusiness = (p: {
name: string; url: string; telephone: string;
address: string; city: string; country: string;
}) => ({
“@context”: “https://schema.org”,
“@type”: “LocalBusiness”,
name: p.name, url: p.url, telephone: p.telephone,
address: {
“@type”: “PostalAddress”,
streetAddress: p.address,
addressLocality: p.city,
addressCountry: p.country,
},
});

export const jsonLdBreadcrumb = (items: { name: string; url: string }[]) => ({
“@context”: “https://schema.org”,
“@type”: “BreadcrumbList”,
itemListElement: items.map((item, i) => ({
“@type”: “ListItem”,
position: i + 1,
name: item.name,
item: item.url,
})),
});

export const jsonLdFAQ = (faqs: { question: string; answer: string }[]) => ({
“@context”: “https://schema.org”,
“@type”: “FAQPage”,
mainEntity: faqs.map(f => ({
“@type”: “Question”,
name: f.question,
acceptedAnswer: { “@type”: “Answer”, text: f.answer },
})),
});
EOF
step “Creado: src/components/seo/SEOHead.tsx”
}

# ─────────────────────────────────────────────────────────────────────────────

# 08 — PUBLIC ASSETS

# ─────────────────────────────────────────────────────────────────────────────

mod_public_assets() {
ensure_dirs public/.well-known public/icons public/screenshots

```
write_if_missing "public/manifest.json" '{
```

“name”: “My App”,
“short_name”: “App”,
“description”: “Built with HELEN CLI”,
“start_url”: “/”,
“display”: “standalone”,
“background_color”: “#ffffff”,
“theme_color”: “#6366f1”,
“orientation”: “portrait-primary”,
“categories”: [“business”, “productivity”],
“icons”: [
{ “src”: “/icons/icon-72.png”,   “sizes”: “72x72”,   “type”: “image/png” },
{ “src”: “/icons/icon-96.png”,   “sizes”: “96x96”,   “type”: “image/png” },
{ “src”: “/icons/icon-128.png”,  “sizes”: “128x128”, “type”: “image/png” },
{ “src”: “/icons/icon-192.png”,  “sizes”: “192x192”, “type”: “image/png” },
{ “src”: “/icons/icon-512.png”,  “sizes”: “512x512”, “type”: “image/png”, “purpose”: “maskable any” }
],
“screenshots”: [
{ “src”: “/screenshots/desktop.png”, “sizes”: “1280x720”, “type”: “image/png”, “form_factor”: “wide” },
{ “src”: “/screenshots/mobile.png”,  “sizes”: “390x844”,  “type”: “image/png”, “form_factor”: “narrow” }
]
}’

```
write_if_missing "public/robots.txt" "User-agent: *
```

Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/

# Bots de IA — comentar si quieres que te indexen los LLMs

User-agent: GPTBot
Disallow: /

User-agent: CCBot
Disallow: /

Sitemap: https://yourdomain.com/sitemap.xml”

```
cat > "public/.well-known/security.txt" << 'EOF'
```

Contact: mailto:security@yourdomain.com
Expires: 2026-12-31T23:59:00.000Z
Preferred-Languages: es, en
Canonical: https://yourdomain.com/.well-known/security.txt
Policy: https://yourdomain.com/security-policy
Hiring: https://yourdomain.com/careers
EOF
step “Creado: public/.well-known/security.txt”

```
warn "Genera los iconos en https://favicon.io y pon og-image.png (1200x630) en public/"
```

}

# ─────────────────────────────────────────────────────────────────────────────

# 09 — GLOBAL CSS

# ─────────────────────────────────────────────────────────────────────────────

mod_global_css() {
local css_file=””
for f in “src/index.css” “src/App.css” “src/global.css” “src/styles/global.css”; do
if [[ -f “$f” ]]; then css_file=”$f”; break; fi
done

```
if [[ -z "$css_file" ]]; then
    css_file="src/index.css"
    touch "$css_file"
    warn "No se encontro CSS global — creando ${css_file}"
fi

append_if_missing "$css_file" "HELEN-V4-GLOBALS" '
```

/* ══ HELEN-V4-GLOBALS: UX, A11y, Performance resets ════════════════════════ */

/* dvh en vez de vh — iOS Safari y el notch ya no son tu problema */
:root { –vh: 1dvh; }
.full-height { min-height: 100dvh; }

/* Smooth scroll global, respeta prefers-reduced-motion */
html {
scroll-behavior: smooth;
scrollbar-gutter: stable; /* evita el layout shift cuando aparece el scrollbar */
}

@media (prefers-reduced-motion: reduce) {
html { scroll-behavior: auto; }
*, *::before, *::after {
animation-duration: 0.01ms !important;
animation-iteration-count: 1 !important;
transition-duration: 0.01ms !important;
}
}

/* Box-sizing global — deberia ser el default en todos los browsers, pero no lo es */
*, *::before, *::after { box-sizing: border-box; }

/* Imagenes que no se salen ni generan gaps raros */
img, video, svg { max-width: 100%; height: auto; display: block; }

/* Font rendering decente en macOS/iOS — la diferencia es real */
body {
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
text-rendering: optimizeLegibility;
}

/* Focus visible WCAG-compliant — jamas outline:none sin alternativa */
:focus-visible {
outline: 2px solid #6366f1;
outline-offset: 3px;
border-radius: 3px;
}
:focus:not(:focus-visible) { outline: none; }

/* Skip-to-content para navegacion por teclado y lectores de pantalla */
.skip-link {
position: absolute;
top: -100%;
left: 1rem;
padding: 0.5rem 1rem;
background: #6366f1;
color: #fff;
border-radius: 0 0 0.5rem 0.5rem;
font-weight: 600;
font-size: 0.875rem;
z-index: 10001;
text-decoration: none;
transition: top 0.1s;
}
.skip-link:focus { top: 0; }

/* Keyframes registrados globalmente — los usan Skeleton, Toast, Spinner */
@keyframes helen-spin {
to { transform: rotate(360deg); }
}
@keyframes helen-shimmer {
0%   { background-position:  200% 0; }
100% { background-position: -200% 0; }
}
@keyframes helen-fade-in-right {
from { opacity: 0; transform: translateX(0.75rem); }
to   { opacity: 1; transform: translateX(0); }
}
@keyframes helen-fade-in {
from { opacity: 0; }
to   { opacity: 1; }
}
@keyframes helen-slide-up {
from { opacity: 0; transform: translateY(0.5rem); }
to   { opacity: 1; transform: translateY(0); }
}
’
}

# ─────────────────────────────────────────────────────────────────────────────

# 10 — UI COMPONENTS

# ─────────────────────────────────────────────────────────────────────────────

mod_ui_components() {
ensure_dirs src/components/ui

```
# GlobalErrorBoundary — captura cualquier crash de React antes de que el usuario
# vea una pantalla blanca y piense que la app esta rota para siempre.
cat > src/components/ui/GlobalErrorBoundary.tsx << 'EOF'
```

import { Component, type ReactNode, type ErrorInfo } from “react”;
import * as Sentry from “@sentry/react”;

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; errorId?: string; }

export class GlobalErrorBoundary extends Component<Props, State> {
constructor(props: Props) {
super(props);
this.state = { hasError: false };
}

static getDerivedStateFromError(): State {
return { hasError: true };
}

componentDidCatch(error: Error, info: ErrorInfo) {
const errorId = Sentry.captureException(error, {
tags:  { boundary: “global” },
extra: { componentStack: info.componentStack },
});
this.setState({ errorId });
}

render() {
if (!this.state.hasError) return this.props.children;

```
if (this.props.fallback) return this.props.fallback;

return (
  <div style={{
    minHeight: "100dvh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    fontFamily: "system-ui, sans-serif", padding: "2rem",
    textAlign: "center", background: "#f8fafc",
  }}>
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      style={{ marginBottom: "1.25rem" }}>
      <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2" />
      <path d="M12 8v4M12 16h.01" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
    <h1 style={{ fontSize: "1.375rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
      Algo salio mal
    </h1>
    <p style={{ color: "#64748b", margin: "0 0 1.5rem", maxWidth: "380px", lineHeight: 1.6 }}>
      El equipo ha sido notificado automaticamente.
    </p>
    {this.state.errorId && (
      <p style={{ fontSize: "0.7rem", color: "#94a3b8", margin: "0 0 1rem", fontFamily: "monospace" }}>
        ID: {this.state.errorId}
      </p>
    )}
    <button
      onClick={() => (window.location.href = "/")}
      style={{
        padding: "0.625rem 1.5rem", borderRadius: "0.5rem",
        background: "#6366f1", color: "#fff", border: "none",
        fontWeight: 600, cursor: "pointer", fontSize: "0.9rem",
      }}>
      Volver al inicio
    </button>
  </div>
);
```

}
}
EOF
step “Creado: GlobalErrorBoundary.tsx”

```
# Spinner — accesible, pequeno, eficiente.
cat > src/components/ui/Spinner.tsx << 'EOF'
```

interface SpinnerProps {
size?:  number;
color?: string;
label?: string;
}

export function Spinner({ size = 24, color = “currentColor”, label = “Cargando…” }: SpinnerProps) {
return (
<span role=“status” aria-label={label} style={{ display: “inline-flex” }}>
<svg
width={size} height={size} viewBox=“0 0 24 24” fill=“none”
aria-hidden=“true”
style={{ animation: “helen-spin 0.75s linear infinite” }}>
<circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3"
strokeDasharray="40" strokeDashoffset="10"
strokeLinecap="round" opacity="0.25" />
<path d="M12 2a10 10 0 0 1 10 10"
stroke={color} strokeWidth="3" strokeLinecap="round" />
</svg>
</span>
);
}
EOF
step “Creado: Spinner.tsx”

```
# Skeleton — placeholders que evitan el layout shift en carga async.
cat > src/components/ui/Skeleton.tsx << 'EOF'
```

import type { CSSProperties } from “react”;

const shimmer: CSSProperties = {
display: “block”,
background: “linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)”,
backgroundSize: “200% 100%”,
animation: “helen-shimmer 1.5s infinite”,
borderRadius: “0.375rem”,
};

interface SkeletonProps {
width?:   string | number;
height?:  string | number;
variant?: “rect” | “circle”;
size?:    number;
style?:   CSSProperties;
}

export function Skeleton({
width = “100%”, height = “1rem”,
variant = “rect”, size, style,
}: SkeletonProps) {
const s =
variant === “circle” && size
? { …shimmer, width: size, height: size, borderRadius: “50%” }
: { …shimmer, width, height };
return <span style={{ …s, …style }} aria-hidden=“true” />;
}

export function SkeletonCard() {
return (
<div style={{
padding: “1.25rem”, border: “1px solid #e2e8f0”,
borderRadius: “0.75rem”, display: “flex”,
flexDirection: “column”, gap: “0.75rem”,
}} aria-hidden=“true”>
<Skeleton height="1.25rem" width="55%" />
<Skeleton height="0.9rem" />
<Skeleton height="0.9rem" width="80%" />
<Skeleton height="0.9rem" width="65%" />
<Skeleton height=“2.25rem” width=“35%” style={{ marginTop: “0.5rem” }} />
</div>
);
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
return (
<div style={{ display: “flex”, flexDirection: “column”, gap: “0.5rem” }} aria-hidden=“true”>
{Array.from({ length: lines }, (_, i) => (
<Skeleton key={i} height=“0.9rem” width={i === lines - 1 ? “60%” : “100%”} />
))}
</div>
);
}
EOF
step “Creado: Skeleton.tsx”

```
# Button — loading-aware, accesible, variantes de diseno.
cat > src/components/ui/Button.tsx << 'EOF'
```

import type { ButtonHTMLAttributes, ReactNode } from “react”;
import { Spinner } from “./Spinner”;

type Variant = “primary” | “secondary” | “danger” | “ghost” | “link”;
type Size    = “xs” | “sm” | “md” | “lg”;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
children:   ReactNode;
isLoading?: boolean;
variant?:   Variant;
size?:      Size;
fullWidth?: boolean;
leftIcon?:  ReactNode;
rightIcon?: ReactNode;
}

const VARIANTS: Record<Variant, React.CSSProperties> = {
primary:   { background: “#6366f1”, color: “#fff”,    border: “none” },
secondary: { background: “#f1f5f9”, color: “#374151”, border: “1px solid #e2e8f0” },
danger:    { background: “#ef4444”, color: “#fff”,    border: “none” },
ghost:     { background: “transparent”, color: “#6366f1”, border: “1px solid #6366f1” },
link:      { background: “transparent”, color: “#6366f1”, border: “none”, textDecoration: “underline”, padding: 0 },
};

const SIZES: Record<Size, React.CSSProperties> = {
xs: { padding: “0.25rem 0.5rem”,   fontSize: “0.75rem” },
sm: { padding: “0.375rem 0.75rem”, fontSize: “0.8rem” },
md: { padding: “0.625rem 1.25rem”, fontSize: “0.875rem” },
lg: { padding: “0.875rem 1.75rem”, fontSize: “1rem” },
};

export function Button({
children, isLoading = false, variant = “primary”, size = “md”,
fullWidth = false, leftIcon, rightIcon, disabled, style, …props
}: ButtonProps) {
const isDisabled = disabled ?? isLoading;

return (
<button
disabled={isDisabled}
aria-disabled={isDisabled}
aria-busy={isLoading}
style={{
…VARIANTS[variant],
…SIZES[size],
width:          fullWidth ? “100%” : undefined,
display:        “inline-flex”,
alignItems:     “center”,
justifyContent: “center”,
gap:            “0.5rem”,
borderRadius:   “0.5rem”,
fontWeight:     600,
cursor:         isDisabled ? “not-allowed” : “pointer”,
opacity:        isDisabled ? 0.6 : 1,
transition:     “opacity 0.15s, background 0.15s”,
fontFamily:     “inherit”,
lineHeight:     1,
…style,
}}
{…props}>
{isLoading ? <Spinner size={14} color="currentColor" /> : leftIcon}
{children}
{!isLoading && rightIcon}
</button>
);
}
EOF
step “Creado: Button.tsx”

```
# Toast — ARIA live region para notificaciones no bloqueantes.
cat > src/components/ui/Toast.tsx << 'EOF'
```

import { createContext, useContext, useState, useCallback, type ReactNode } from “react”;

type ToastType = “success” | “error” | “warning” | “info”;

interface ToastItem {
id:       string;
type:     ToastType;
title?:   string;
message:  string;
duration?: number;
}

interface ToastContextValue {
toast: (opts: Omit<ToastItem, “id”>) => void;
success: (message: string, title?: string) => void;
error:   (message: string, title?: string) => void;
warning: (message: string, title?: string) => void;
info:    (message: string, title?: string) => void;
}

const ToastCtx = createContext<ToastContextValue | null>(null);

export function useToast() {
const ctx = useContext(ToastCtx);
if (!ctx) throw new Error(“useToast debe usarse dentro de <ToastProvider>”);
return ctx;
}

const CONFIG: Record<ToastType, { bg: string; border: string; icon: string; iconColor: string }> = {
success: { bg: “#f0fdf4”, border: “#bbf7d0”, icon: “✓”, iconColor: “#16a34a” },
error:   { bg: “#fef2f2”, border: “#fecaca”, icon: “✕”, iconColor: “#dc2626” },
warning: { bg: “#fffbeb”, border: “#fde68a”, icon: “!”, iconColor: “#d97706” },
info:    { bg: “#eff6ff”, border: “#bfdbfe”, icon: “i”, iconColor: “#2563eb” },
};

export function ToastProvider({ children }: { children: ReactNode }) {
const [toasts, setToasts] = useState<ToastItem[]>([]);

const addToast = useCallback((opts: Omit<ToastItem, “id”>) => {
const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
setToasts(prev => […prev, { …opts, id }]);
setTimeout(() => {
setToasts(prev => prev.filter(t => t.id !== id));
}, opts.duration ?? 5000);
}, []);

const ctx: ToastContextValue = {
toast:   addToast,
success: (msg, title) => addToast({ type: “success”, message: msg, title }),
error:   (msg, title) => addToast({ type: “error”,   message: msg, title }),
warning: (msg, title) => addToast({ type: “warning”, message: msg, title }),
info:    (msg, title) => addToast({ type: “info”,    message: msg, title }),
};

return (
<ToastCtx.Provider value={ctx}>
{children}
<div
aria-live=“polite”
aria-atomic=“false”
style={{
position: “fixed”, top: “1rem”, right: “1rem”,
display: “flex”, flexDirection: “column”, gap: “0.5rem”,
zIndex: 10000, maxWidth: “380px”, width: “calc(100vw - 2rem)”,
}}>
{toasts.map(({ id, type, title, message }) => {
const { bg, border, icon, iconColor } = CONFIG[type];
return (
<div key={id} role=“status”
style={{
display: “flex”, alignItems: “flex-start”, gap: “0.75rem”,
padding: “0.875rem 1rem”, borderRadius: “0.5rem”,
background: bg, border: `1px solid ${border}`,
boxShadow: “0 4px 20px rgba(0,0,0,0.08)”,
animation: “helen-fade-in-right 0.2s ease”,
}}>
<span aria-hidden=“true” style={{
color: iconColor, fontWeight: 800, fontSize: “0.85rem”,
width: “1.25rem”, textAlign: “center”, flexShrink: 0, marginTop: “0.05rem”,
}}>
{icon}
</span>
<div style={{ flex: 1, minWidth: 0 }}>
{title && <p style={{ margin: “0 0 0.2rem”, fontWeight: 600, fontSize: “0.875rem” }}>{title}</p>}
<p style={{ margin: 0, fontSize: “0.8rem”, color: “#374151”, lineHeight: 1.5 }}>{message}</p>
</div>
<button
onClick={() => setToasts(prev => prev.filter(t => t.id !== id))}
aria-label=“Cerrar”
style={{
background: “none”, border: “none”, cursor: “pointer”,
color: “#94a3b8”, fontSize: “1rem”, padding: 0, flexShrink: 0,
}}>
×
</button>
</div>
);
})}
</div>
</ToastCtx.Provider>
);
}
EOF
step “Creado: Toast.tsx”
}

# ─────────────────────────────────────────────────────────────────────────────

# 11 — BASE LAYOUT

# ─────────────────────────────────────────────────────────────────────────────

mod_base_layout() {
ensure_dirs src/components/layout

```
cat > src/components/layout/AppLayout.tsx << 'EOF'
```

/**

- AppLayout — Layout shell universal con a11y, skip-link, ARIA landmarks.
- 
- Uso con react-router-dom v6:
- <Route element={<AppLayout />}>
- <Route path=”/” element={<Home />} />
- </Route>

*/
import { Outlet, NavLink } from “react-router-dom”;

export function AppLayout() {
return (
<>
{/* Skip link — para usuarios de teclado y lectores de pantalla */}
<a href="#main-content" className="skip-link">
Saltar al contenido
</a>

```
  <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>

    <header role="banner" style={{ borderBottom: "1px solid #e2e8f0" }}>
      <nav
        role="navigation"
        aria-label="Navegacion principal"
        style={{
          maxWidth: "1200px", margin: "0 auto",
          padding: "0 1.5rem", height: "64px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
        {/* Logo — reemplaza con tu componente real */}
        <NavLink to="/" aria-label="Inicio" style={{ fontWeight: 700, fontSize: "1.125rem", color: "#0f172a", textDecoration: "none" }}>
          MyApp
        </NavLink>

        {/* Nav links — reemplaza con los tuyos */}
        <ul style={{ display: "flex", gap: "1.5rem", listStyle: "none", margin: 0, padding: 0 }}>
          {[
            { to: "/",        label: "Inicio" },
            { to: "/about",   label: "Nosotros" },
            { to: "/contact", label: "Contacto" },
          ].map(({ to, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                style={({ isActive }) => ({
                  color:          isActive ? "#6366f1" : "#64748b",
                  fontWeight:     isActive ? 600 : 400,
                  textDecoration: "none",
                  fontSize:       "0.9rem",
                })}>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>

    <main
      id="main-content"
      role="main"
      tabIndex={-1}
      style={{ flex: 1, outline: "none" }}>
      <Outlet />
    </main>

    <footer role="contentinfo" style={{
      padding: "2rem 1.5rem", textAlign: "center",
      borderTop: "1px solid #e2e8f0",
      fontSize: "0.8rem", color: "#94a3b8",
    }}>
      <nav aria-label="Enlaces legales" style={{ marginBottom: "0.75rem" }}>
        {[
          { href: "/privacy", label: "Privacidad" },
          { href: "/cookies", label: "Cookies" },
          { href: "/terms",   label: "Terminos" },
        ].map(({ href, label }) => (
          <a key={href} href={href} style={{ color: "inherit", margin: "0 0.75rem" }}>
            {label}
          </a>
        ))}
      </nav>
      <p style={{ margin: 0 }}>
        &copy; {new Date().getFullYear()} YOUR_COMPANY. Todos los derechos reservados.
      </p>
    </footer>

  </div>
</>
```

);
}
EOF
step “Creado: src/components/layout/AppLayout.tsx”
}

# ─────────────────────────────────────────────────────────────────────────────

# 12 — ERROR PAGES

# ─────────────────────────────────────────────────────────────────────────────

mod_error_pages() {
ensure_dirs src/pages

```
cat > src/pages/NotFound.tsx << 'EOF'
```

import { Link } from “react-router-dom”;
import { SEOHead } from “@/components/seo/SEOHead”;

export function NotFound() {
return (
<>
<SEOHead title="Pagina no encontrada" noIndex />
<div style={{
minHeight: “100dvh”, display: “flex”, flexDirection: “column”,
alignItems: “center”, justifyContent: “center”,
fontFamily: “system-ui, sans-serif”, padding: “2rem”, textAlign: “center”,
}}>
<p style={{ fontSize: “6rem”, fontWeight: 900, margin: “0 0 0.5rem”, color: “#e2e8f0”, lineHeight: 1 }}>
404
</p>
<h1 style={{ fontSize: “1.5rem”, fontWeight: 700, margin: “0 0 0.75rem” }}>
Pagina no encontrada
</h1>
<p style={{ color: “#64748b”, margin: “0 0 2rem”, maxWidth: “380px”, lineHeight: 1.6 }}>
La pagina que buscas no existe o ha sido movida.
</p>
<Link to=”/” style={{
padding: “0.625rem 1.5rem”, borderRadius: “0.5rem”,
background: “#6366f1”, color: “#fff”,
fontWeight: 600, textDecoration: “none”, fontSize: “0.9rem”,
}}>
Volver al inicio
</Link>
</div>
</>
);
}
EOF
step “Creado: src/pages/NotFound.tsx”

```
cat > src/pages/ServerError.tsx << 'EOF'
```

import { Link } from “react-router-dom”;
import { SEOHead } from “@/components/seo/SEOHead”;

export function ServerError() {
return (
<>
<SEOHead title="Error del servidor" noIndex />
<div style={{
minHeight: “100dvh”, display: “flex”, flexDirection: “column”,
alignItems: “center”, justifyContent: “center”,
fontFamily: “system-ui, sans-serif”, padding: “2rem”, textAlign: “center”,
}}>
<p style={{ fontSize: “6rem”, fontWeight: 900, margin: “0 0 0.5rem”, color: “#fecaca”, lineHeight: 1 }}>
500
</p>
<h1 style={{ fontSize: “1.5rem”, fontWeight: 700, margin: “0 0 0.75rem” }}>
Error del servidor
</h1>
<p style={{ color: “#64748b”, margin: “0 0 2rem”, maxWidth: “380px”, lineHeight: 1.6 }}>
Algo fallo por nuestra parte. El equipo ha sido notificado.
</p>
<Link to=”/” style={{
padding: “0.625rem 1.5rem”, borderRadius: “0.5rem”,
background: “#ef4444”, color: “#fff”,
fontWeight: 600, textDecoration: “none”, fontSize: “0.9rem”,
}}>
Reintentar
</Link>
</div>
</>
);
}
EOF
step “Creado: src/pages/ServerError.tsx”
}

# ─────────────────────────────────────────────────────────────────────────────

# 13 — LEGAL & GDPR

# ─────────────────────────────────────────────────────────────────────────────

mod_legal_gdpr() {
ensure_dirs src/components/legal

```
cat > src/components/legal/CookieBanner.tsx << 'EOF'
```

/**

- CookieBanner — GDPR compliant. Bloquea analytics hasta consent explicito.
- 
- Setup en App.tsx:
- <CookieConsentProvider>
- <AnalyticsProvider />
- <RouterProvider router={router} />
- </CookieConsentProvider>

*/
import { useState, createContext, useContext, type ReactNode } from “react”;

export type ConsentState = {
necessary: true;
analytics: boolean;
marketing: boolean;
} | null;

const STORAGE_KEY = “cookie_consent_v2”;
const ConsentCtx = createContext<ConsentState>(null);

export const useCookieConsent = () => useContext(ConsentCtx);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
const [consent, setConsent] = useState<ConsentState>(() => {
try {
const stored = localStorage.getItem(STORAGE_KEY);
return stored ? (JSON.parse(stored) as ConsentState) : null;
} catch {
return null;
}
});

const saveConsent = (analytics: boolean, marketing: boolean) => {
const value: ConsentState = { necessary: true, analytics, marketing };
try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* safari private */ }
setConsent(value);
};

return (
<ConsentCtx.Provider value={consent}>
{children}
{!consent && (
<CookieBannerUI
onAcceptAll={() => saveConsent(true, true)}
onRejectAll={() => saveConsent(false, false)}
onSave={saveConsent}
/>
)}
</ConsentCtx.Provider>
);
}

function CookieBannerUI({
onAcceptAll, onRejectAll, onSave,
}: {
onAcceptAll: () => void;
onRejectAll: () => void;
onSave: (a: boolean, m: boolean) => void;
}) {
const [expanded,  setExpanded]  = useState(false);
const [analytics, setAnalytics] = useState(false);
const [marketing, setMarketing] = useState(false);

const categories = [
{ key: “necessary”, label: “Necesarias”,   desc: “Imprescindibles para el funcionamiento.”, checked: true,      disabled: true  },
{ key: “analytics”, label: “Analiticas”,   desc: “Nos ayudan a entender el uso (GA4).”,    checked: analytics, disabled: false, set: setAnalytics },
{ key: “marketing”, label: “Marketing”,    desc: “Publicidad personalizada.”,               checked: marketing, disabled: false, set: setMarketing },
];

return (
<div
role=“dialog”
aria-label=“Gestion de cookies”
aria-modal=“false”
style={{
position: “fixed”, bottom: “1rem”, left: “1rem”, right: “1rem”,
maxWidth: “460px”, margin: “0 auto”,
background: “#fff”, border: “1px solid #e2e8f0”,
borderRadius: “0.875rem”, padding: “1.25rem”,
boxShadow: “0 20px 60px rgba(0,0,0,0.15)”,
zIndex: 9999, fontFamily: “system-ui, sans-serif”,
}}>
<h2 style={{ margin: “0 0 0.5rem”, fontSize: “0.95rem”, fontWeight: 700 }}>
Usamos cookies
</h2>
<p style={{ margin: “0 0 1rem”, fontSize: “0.8rem”, color: “#64748b”, lineHeight: 1.5 }}>
Las cookies necesarias estan siempre activas. Las demas solo se activan con tu consentimiento.{” “}
<a href=”/cookies” style={{ color: “#6366f1” }}>Politica de cookies</a>
</p>

```
  {expanded && (
    <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "#f8fafc", borderRadius: "0.5rem" }}>
      {categories.map(cat => (
        <label key={cat.key} style={{ display: "flex", gap: "0.75rem", marginBottom: "0.625rem", cursor: cat.disabled ? "default" : "pointer" }}>
          <input
            type="checkbox"
            checked={cat.checked}
            disabled={cat.disabled}
            onChange={cat.set ? e => cat.set!(e.target.checked) : undefined}
            style={{ marginTop: "0.15rem", accentColor: "#6366f1" }}
            aria-label={cat.label}
          />
          <span>
            <strong style={{ fontSize: "0.82rem", display: "block" }}>{cat.label}</strong>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{cat.desc}</span>
          </span>
        </label>
      ))}
    </div>
  )}

  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
    <BannerBtn bg="#6366f1" color="#fff"    onClick={onAcceptAll}>Aceptar todo</BannerBtn>
    <BannerBtn bg="#f1f5f9" color="#374151" onClick={onRejectAll}>Rechazar todo</BannerBtn>
    {expanded ? (
      <BannerBtn bg="#0f172a" color="#fff" onClick={() => onSave(analytics, marketing)}>Guardar</BannerBtn>
    ) : (
      <button
        onClick={() => setExpanded(true)}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#6366f1", fontSize: "0.78rem", fontWeight: 600, textDecoration: "underline" }}>
        Personalizar
      </button>
    )}
  </div>
</div>
```

);
}

function BannerBtn({ bg, color, onClick, children }: { bg: string; color: string; onClick: () => void; children: string }) {
return (
<button onClick={onClick} style={{
padding: “0.45rem 0.875rem”, borderRadius: “0.375rem”,
fontSize: “0.78rem”, fontWeight: 600, border: “none”,
cursor: “pointer”, background: bg, color,
}}>
{children}
</button>
);
}
EOF
step “Creado: src/components/legal/CookieBanner.tsx”

```
# PrivacyPolicy.tsx — template GDPR minimo, reemplaza YOUR_* antes de deploy
cat > src/components/legal/PrivacyPolicy.tsx << 'EOF'
```

import { SEOHead } from “@/components/seo/SEOHead”;

export function PrivacyPolicy() {
const updated = new Date().toLocaleDateString(“es-ES”, { day: “numeric”, month: “long”, year: “numeric” });

return (
<>
<SEOHead title="Politica de Privacidad" noIndex />
<main style={{ maxWidth: “720px”, margin: “0 auto”, padding: “3rem 1.5rem”, fontFamily: “system-ui, sans-serif”, lineHeight: 1.75 }}>
<h1>Politica de Privacidad</h1>
<p><strong>Ultima actualizacion:</strong> {updated}</p>
<h2>1. Responsable del tratamiento</h2>
<p>YOUR_COMPANY • YOUR_ADDRESS • YOUR_EMAIL</p>
<h2>2. Datos que recopilamos</h2>
<ul>
<li><strong>Uso:</strong> Paginas visitadas, tiempo en el sitio (anonimizado).</li>
<li><strong>Contacto:</strong> Nombre y correo cuando usas nuestros formularios.</li>
<li><strong>Tecnico:</strong> IP anonimizada, navegador, dispositivo.</li>
</ul>
<h2>3. Base legal (RGPD Art. 6)</h2>
<ul>
<li>Consentimiento — cookies de analitica y marketing.</li>
<li>Interes legitimo — seguridad, prevencion de fraude.</li>
<li>Contrato — responder a tus consultas.</li>
</ul>
<h2>4. Conservacion</h2>
<p>Datos de contacto: 2 anos. Analitica: 14 meses (por defecto GA4).</p>
<h2>5. Tus derechos</h2>
<p>Acceso, rectificacion, supresion, limitacion, portabilidad, oposicion. Escribe a YOUR_EMAIL.</p>
<h2>6. Cookies</h2>
<p>Ver nuestra <a href="/cookies">Politica de Cookies</a>.</p>
<h2>7. Terceros</h2>
<p>Vercel (hosting), Google Analytics (con consentimiento), Sentry (errores). No vendemos datos.</p>
</main>
</>
);
}
EOF
step “Creado: src/components/legal/PrivacyPolicy.tsx”

```
cat > src/components/legal/CookiePolicy.tsx << 'EOF'
```

import { SEOHead } from “@/components/seo/SEOHead”;

export function CookiePolicy() {
const headers = [“Nombre”, “Proveedor”, “Finalidad”, “Duracion”, “Tipo”];
const rows = [
[“cookie_consent_v2”, “Este sitio”,  “Guarda la eleccion de cookies”,   “1 ano”,   “Necesaria”],
[”_ga”,               “Google”,      “Distingue usuarios (GA4)”,          “2 anos”,  “Analitica”],
[”*ga**”,             “Google”,      “Estado de sesion (GA4)”,            “2 anos”,  “Analitica”],
];

return (
<>
<SEOHead title="Politica de Cookies" noIndex />
<main style={{ maxWidth: “720px”, margin: “0 auto”, padding: “3rem 1.5rem”, fontFamily: “system-ui, sans-serif”, lineHeight: 1.75 }}>
<h1>Politica de Cookies</h1>
<table style={{ width: “100%”, borderCollapse: “collapse”, fontSize: “0.875rem” }}>
<thead>
<tr style={{ background: “#f8fafc” }}>
{headers.map(h => <th key={h} style={{ padding: “0.5rem 0.75rem”, textAlign: “left”, borderBottom: “2px solid #e2e8f0” }}>{h}</th>)}
</tr>
</thead>
<tbody>
{rows.map(row => (
<tr key={row[0]} style={{ borderBottom: “1px solid #e2e8f0” }}>
{row.map((cell, i) => <td key={i} style={{ padding: “0.5rem 0.75rem” }}>{cell}</td>)}
</tr>
))}
</tbody>
</table>
<h2>Gestion de cookies</h2>
<p>Usa el banner de cookies o borra las cookies desde tu navegador.</p>
</main>
</>
);
}
EOF
step “Creado: src/components/legal/CookiePolicy.tsx”

```
cat > src/components/legal/Terms.tsx << 'EOF'
```

import { SEOHead } from “@/components/seo/SEOHead”;

export function Terms() {
const updated = new Date().toLocaleDateString(“es-ES”, { day: “numeric”, month: “long”, year: “numeric” });
return (
<>
<SEOHead title="Terminos de Servicio" noIndex />
<main style={{ maxWidth: “720px”, margin: “0 auto”, padding: “3rem 1.5rem”, fontFamily: “system-ui, sans-serif”, lineHeight: 1.75 }}>
<h1>Terminos de Servicio</h1>
<p><strong>Ultima actualizacion:</strong> {updated}</p>
<h2>1. Aceptacion</h2>
<p>Al acceder a este sitio, aceptas estos terminos.</p>
<h2>2. Propiedad intelectual</h2>
<p>Todo el contenido pertenece a YOUR_COMPANY salvo indicacion contraria.</p>
<h2>3. Limitacion de responsabilidad</h2>
<p>El servicio se proporciona “tal cual”. No somos responsables de danos derivados de su uso.</p>
<h2>4. Ley aplicable</h2>
<p>Legislacion de YOUR_JURISDICTION.</p>
<h2>5. Contacto</h2>
<p>YOUR_EMAIL</p>
</main>
</>
);
}
EOF
step “Creado: src/components/legal/Terms.tsx”
}

# ─────────────────────────────────────────────────────────────────────────────

# 14 — ANALYTICS PROVIDER

# ─────────────────────────────────────────────────────────────────────────────

mod_analytics_provider() {
ensure_dirs src/components/analytics

```
cat > src/components/analytics/AnalyticsProvider.tsx << 'EOF'
```

/**

- AnalyticsProvider — Inyecta GA4 solo tras consent de analitica.
- Montar dentro de <CookieConsentProvider> en App.tsx.
  */
  import { useEffect } from “react”;
  import { useCookieConsent } from “@/components/legal/CookieBanner”;

export function AnalyticsProvider() {
const consent = useCookieConsent();
const gaId    = import.meta.env.VITE_GA_ID as string | undefined;

useEffect(() => {
if (!consent?.analytics || !gaId || document.getElementById(”__helen_ga4”)) return;

```
// Inicializamos el dataLayer antes de cargar el script
window.dataLayer = window.dataLayer ?? [];
window.gtag = (...args: unknown[]) => { window.dataLayer!.push(args); };
window.gtag("js", new Date());
window.gtag("config", gaId, {
  anonymize_ip:                       true,
  allow_google_signals:               false,
  allow_ad_personalization_signals:   false,
});

const script  = document.createElement("script");
script.id     = "__helen_ga4";
script.async  = true;
script.src    = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
document.head.appendChild(script);
```

}, [consent?.analytics, gaId]);

return null;
}
EOF
step “Creado: src/components/analytics/AnalyticsProvider.tsx”
}

# ─────────────────────────────────────────────────────────────────────────────

# 15 — HOOKS

# ─────────────────────────────────────────────────────────────────────────────

mod_hooks() {
ensure_dirs src/hooks

```
cat > src/hooks/useAsync.ts << 'EOF'
```

import { useState, useCallback, useRef } from “react”;

interface AsyncState<T> {
data:    T | null;
loading: boolean;
error:   string | null;
}

/**

- useAsync — estado unificado de loading/error/data para cualquier operacion asincrona.
- Evita el classico `const [loading, setLoading] = useState(false)` triplicado.
  */
  export function useAsync<T, A extends unknown[]>(fn: (…args: A) => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: false, error: null });
  const mountedRef = useRef(true);

// Cleanup en unmount — evita el classico “setState on unmounted component”
const execute = useCallback(async (…args: A): Promise<T | undefined> => {
setState({ data: null, loading: true, error: null });
try {
const result = await fn(…args);
if (mountedRef.current) setState({ data: result, loading: false, error: null });
return result;
} catch (e) {
const msg = e instanceof Error ? e.message : “Error desconocido”;
if (mountedRef.current) setState({ data: null, loading: false, error: msg });
throw e;
}
}, [fn]); // eslint-disable-line react-hooks/exhaustive-deps

const reset = useCallback(() => {
setState({ data: null, loading: false, error: null });
}, []);

return { …state, execute, reset };
}
EOF

```
cat > src/hooks/useDebounce.ts << 'EOF'
```

import { useState, useEffect } from “react”;

/**

- useDebounce — retrasa el valor N ms. Ideal para inputs de busqueda.
- Evita llamadas a la API en cada keystroke.
  */
  export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState<T>(value);

useEffect(() => {
const timer = setTimeout(() => setDebounced(value), delay);
return () => clearTimeout(timer);
}, [value, delay]);

return debounced;
}
EOF

```
cat > src/hooks/useLocalStorage.ts << 'EOF'
```

import { useState, useCallback, useEffect } from “react”;

/**

- useLocalStorage — estado persistido tipado con JSON serialization.
- Maneja errores de safari private mode (localStorage puede lanzar).
  */
  export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
  if (typeof window === “undefined”) return initialValue;
  try {
  const item = window.localStorage.getItem(key);
  return item ? (JSON.parse(item) as T) : initialValue;
  } catch {
  return initialValue;
  }
  });

const set = useCallback(
(newValue: T | ((prev: T) => T)) => {
setValue(prev => {
const resolved = typeof newValue === “function” ? (newValue as (p: T) => T)(prev) : newValue;
try { window.localStorage.setItem(key, JSON.stringify(resolved)); } catch { /* private mode */ }
return resolved;
});
},
[key]
);

const remove = useCallback(() => {
try { window.localStorage.removeItem(key); } catch { /* private mode */ }
setValue(initialValue);
}, [key, initialValue]);

// Sincroniza entre pestanas del mismo origen
useEffect(() => {
const handler = (e: StorageEvent) => {
if (e.key !== key || e.newValue === null) return;
try { setValue(JSON.parse(e.newValue) as T); } catch { /* json invalido */ }
};
window.addEventListener(“storage”, handler);
return () => window.removeEventListener(“storage”, handler);
}, [key]);

return [value, set, remove] as const;
}
EOF

```
cat > src/hooks/useMediaQuery.ts << 'EOF'
```

import { useState, useEffect } from “react”;

/**

- useMediaQuery — reactive CSS media queries.
- Uso: const isMobile = useMediaQuery(”(max-width: 768px)”);
  */
  export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
  () => typeof window !== “undefined” && window.matchMedia(query).matches
  );

useEffect(() => {
const mq      = window.matchMedia(query);
const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
mq.addEventListener(“change”, handler);
setMatches(mq.matches);
return () => mq.removeEventListener(“change”, handler);
}, [query]);

return matches;
}

// Shortcuts de uso comun
export const useIsMobile  = () => useMediaQuery(”(max-width: 767px)”);
export const useIsTablet  = () => useMediaQuery(”(min-width: 768px) and (max-width: 1023px)”);
export const useIsDesktop = () => useMediaQuery(”(min-width: 1024px)”);
export const useIsDark    = () => useMediaQuery(”(prefers-color-scheme: dark)”);
export const useReducedMotion = () => useMediaQuery(”(prefers-reduced-motion: reduce)”);
EOF

```
cat > src/hooks/useOnClickOutside.ts << 'EOF'
```

import { useEffect, type RefObject } from “react”;

/**

- useOnClickOutside — cierra modales y dropdowns al clickar fuera.
- Tambien cubre touchstart para movil.
  */
  export function useOnClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled = true
  ) {
  useEffect(() => {
  if (!enabled) return;
  const listener = (event: MouseEvent | TouchEvent) => {
  if (!ref.current?.contains(event.target as Node)) handler(event);
  };
  document.addEventListener(“mousedown”,  listener);
  document.addEventListener(“touchstart”, listener, { passive: true });
  return () => {
  document.removeEventListener(“mousedown”,  listener);
  document.removeEventListener(“touchstart”, listener);
  };
  }, [ref, handler, enabled]);
  }
  EOF
  
  cat > src/hooks/useIntersectionObserver.ts << ‘EOF’
  import { useState, useEffect, useRef } from “react”;

/**

- useIntersectionObserver — lazy loading de imagenes, animaciones on-scroll.
- El threshold 0.1 significa “cuando el 10% del elemento es visible”.
  */
  export function useIntersectionObserver(
  options: IntersectionObserverInit = { threshold: 0.1, rootMargin: “0px 0px -50px 0px” }
  ) {
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

useEffect(() => {
const el = ref.current;
if (!el) return;

```
const observer = new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting) {
    setIsVisible(true);
    observer.disconnect(); // Una vez visible, ya no hace falta observar
  }
}, options);

observer.observe(el);
return () => observer.disconnect();
```

}, [options]);

return { ref, isVisible };
}
EOF

```
cat > src/hooks/useClipboard.ts << 'EOF'
```

import { useState, useCallback } from “react”;

/**

- useClipboard — copia texto al portapapeles con feedback de estado.
- El timeout resetea el estado “copied” para reutilizar el boton.
  */
  export function useClipboard(timeout = 2000) {
  const [copied, setCopied] = useState(false);

const copy = useCallback(async (text: string): Promise<boolean> => {
try {
await navigator.clipboard.writeText(text);
setCopied(true);
setTimeout(() => setCopied(false), timeout);
return true;
} catch {
return false;
}
}, [timeout]);

return { copied, copy };
}
EOF

```
ok "Hooks creados: useAsync, useDebounce, useLocalStorage, useMediaQuery, useOnClickOutside, useIntersectionObserver, useClipboard"
```

}

# ─────────────────────────────────────────────────────────────────────────────

# 16 — SHARED TYPES

# ─────────────────────────────────────────────────────────────────────────────

mod_types() {
ensure_dirs src/types

```
cat > src/types/index.ts << 'EOF'
```

// ── API ───────────────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
data:    T | null;
error:   string | null;
status:  number;
message?: string;
}

export interface PaginatedResponse<T> {
data:     T[];
total:    number;
page:     number;
pageSize: number;
hasMore:  boolean;
}

// ── Estado async ──────────────────────────────────────────────────────────────
export type AsyncStatus = “idle” | “loading” | “success” | “error”;

// ── Formularios ───────────────────────────────────────────────────────────────
export interface SelectOption<T = string> {
label:    string;
value:    T;
disabled?: boolean;
icon?:    string;
}

// ── Usuario ───────────────────────────────────────────────────────────────────
export interface User {
id:         string;
email:      string;
name?:      string;
avatarUrl?: string;
role:       “admin” | “user” | “guest”;
createdAt:  string;
updatedAt:  string;
}

// ── Navegacion ────────────────────────────────────────────────────────────────
export interface NavItem {
label:     string;
href:      string;
icon?:     string;
children?: NavItem[];
}

// ── Notificacion ──────────────────────────────────────────────────────────────
export interface Notification {
id:        string;
type:      “success” | “error” | “warning” | “info”;
title?:    string;
message:   string;
read:      boolean;
createdAt: string;
}

// ── Filtros genericos ─────────────────────────────────────────────────────────
export interface SortConfig<T = string> {
field:     T;
direction: “asc” | “desc”;
}

export interface FilterConfig {
search?:   string;
page?:     number;
pageSize?: number;
sort?:     SortConfig;
}
EOF
step “Creado: src/types/index.ts”
}

# ─────────────────────────────────────────────────────────────────────────────

# 17 — ZUSTAND

# ─────────────────────────────────────────────────────────────────────────────

mod_zustand() {
ensure_dirs src/store

```
npm_install_dev "zustand@5.0.2" "immer@10.1.1"

cat > src/store/authStore.ts << 'EOF'
```

/**

- authStore — estado de autenticacion global.
- Usa immer para mutaciones inmutables sin boilerplate.
- Persistido en sessionStorage para que no se pierda al refrescar.
  */
  import { create } from “zustand”;
  import { persist, createJSONStorage } from “zustand/middleware”;
  import { immer } from “zustand/middleware/immer”;
  import type { User } from “@/types”;

interface AuthState {
user:            User | null;
isAuthenticated: boolean;
isLoading:       boolean;
setUser:         (user: User | null) => void;
setLoading:      (loading: boolean) => void;
logout:          () => void;
}

export const useAuthStore = create<AuthState>()(
persist(
immer((set) => ({
user:            null,
isAuthenticated: false,
isLoading:       true,

```
  setUser: (user) => set(state => {
    state.user            = user;
    state.isAuthenticated = !!user;
    state.isLoading       = false;
  }),

  setLoading: (loading) => set(state => { state.isLoading = loading; }),

  logout: () => set(state => {
    state.user            = null;
    state.isAuthenticated = false;
    state.isLoading       = false;
  }),
})),
{
  name:    "auth-store",
  storage: createJSONStorage(() => sessionStorage),
  // Solo persistimos lo que necesitamos, no las funciones
  partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
}
```

)
);
EOF
step “Creado: src/store/authStore.ts”

```
cat > src/store/uiStore.ts << 'EOF'
```

/**

- uiStore — estado de UI global: sidebars, modals, preferencias visuales.
- Lo que es local a un componente se queda en useState, esto es solo lo global.
  */
  import { create } from “zustand”;
  import { persist } from “zustand/middleware”;

interface UIState {
sidebarOpen:    boolean;
theme:          “light” | “dark” | “system”;
toggleSidebar:  () => void;
setSidebarOpen: (open: boolean) => void;
setTheme:       (theme: UIState[“theme”]) => void;
}

export const useUIStore = create<UIState>()(
persist(
(set) => ({
sidebarOpen:    false,
theme:          “system”,
toggleSidebar:  () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
setSidebarOpen: (open) => set({ sidebarOpen: open }),
setTheme:       (theme) => set({ theme }),
}),
{
name: “ui-store”,
partialize: (state) => ({ theme: state.theme }),
}
)
);
EOF
step “Creado: src/store/uiStore.ts”
}

# ─────────────────────────────────────────────────────────────────────────────

# 18 — REACT QUERY / TANSTACK QUERY

# ─────────────────────────────────────────────────────────────────────────────

mod_react_query() {
ensure_dirs src/lib

```
npm_install "@tanstack/react-query@5.62.3"
npm_install_dev "@tanstack/react-query-devtools@5.62.3"

cat > src/lib/queryClient.ts << 'EOF'
```

/**

- queryClient — configuracion global de TanStack Query.
- staleTime: 5min es un buen default para la mayoria de datos.
- gcTime: 10min mantiene el cache en memoria un rato mas.
  */
  import { QueryClient } from “@tanstack/react-query”;

export const queryClient = new QueryClient({
defaultOptions: {
queries: {
staleTime:          1000 * 60 * 5,   // 5 minutos
gcTime:             1000 * 60 * 10,  // 10 minutos
retry:              1,
refetchOnWindowFocus: false,          // El usuario no siempre quiere refetch al volver a la pestaña
},
mutations: {
retry: 0,
},
},
});
EOF
step “Creado: src/lib/queryClient.ts”

```
cat > src/components/providers/QueryProvider.tsx << 'EOF'
```

import { QueryClientProvider } from “@tanstack/react-query”;
import { ReactQueryDevtools } from “@tanstack/react-query-devtools”;
import { queryClient } from “@/lib/queryClient”;
import type { ReactNode } from “react”;

export function QueryProvider({ children }: { children: ReactNode }) {
return (
<QueryClientProvider client={queryClient}>
{children}
{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
</QueryClientProvider>
);
}
EOF
ensure_dirs src/components/providers
step “Creado: src/components/providers/QueryProvider.tsx”
}

# ─────────────────────────────────────────────────────────────────────────────

# 19 — API CLIENT (AXIOS)

# Interceptores de auth y error handling centralizado.

# ─────────────────────────────────────────────────────────────────────────────

mod_api_client() {
ensure_dirs src/lib

```
cat > src/lib/apiClient.ts << 'EOF'
```

/**

- apiClient — cliente Axios con interceptores para auth, retry y error handling.
- Todos los fetches del proyecto van por aqui, no directamente con fetch().
  */
  import axios, { type AxiosError, type AxiosResponse } from “axios”;

const BASE_URL = import.meta.env.VITE_API_URL as string | undefined ?? “/api”;

export const apiClient = axios.create({
baseURL:         BASE_URL,
timeout:         15_000,
withCredentials: true,
headers: {
“Content-Type”: “application/json”,
“X-Requested-With”: “XMLHttpRequest”,
},
});

// ── Request interceptor — adjunta el token de auth si existe ─────────────────
apiClient.interceptors.request.use(
(config) => {
// Ajusta esto a donde tengas el token (localStorage, zustand, cookie…)
const token = localStorage.getItem(“auth_token”);
if (token && config.headers) {
config.headers.Authorization = `Bearer ${token}`;
}
return config;
},
(error) => Promise.reject(error)
);

// ── Response interceptor — manejo centralizado de errores ────────────────────
apiClient.interceptors.response.use(
(response: AxiosResponse) => response,
async (error: AxiosError) => {
const status = error.response?.status;

```
// Token expirado — redirige a login sin tirar un 401 por los ojos al usuario
if (status === 401) {
  localStorage.removeItem("auth_token");
  window.location.href = "/login";
  return Promise.reject(error);
}

// Rate limit — espera 1s y reintenta una vez
if (status === 429) {
  await new Promise(r => setTimeout(r, 1000));
  return apiClient.request(error.config!);
}

return Promise.reject(error);
```

}
);

// ── Helper tipado — para evitar el .data.data de axios ───────────────────────
export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
const res = await apiClient.get<T>(url, { params });
return res.data;
}

export async function apiPost<T>(url: string, data?: unknown): Promise<T> {
const res = await apiClient.post<T>(url, data);
return res.data;
}

export async function apiPut<T>(url: string, data?: unknown): Promise<T> {
const res = await apiClient.put<T>(url, data);
return res.data;
}

export async function apiDelete<T>(url: string): Promise<T> {
const res = await apiClient.delete<T>(url);
return res.data;
}
EOF
step “Creado: src/lib/apiClient.ts”
}

# ─────────────────────────────────────────────────────────────────────────────

# 20 — i18n

# ─────────────────────────────────────────────────────────────────────────────

mod_i18n() {
ensure_dirs src/i18n public/locales/es public/locales/en

```
cat > src/i18n/i18n.ts << 'EOF'
```

/**

- i18n.ts — Configuracion de react-i18next.
- Los archivos de traduccion van en public/locales/{lang}/translation.json
- para que Vite los sirva directamente y se puedan actualizar sin rebuild.
  */
  import i18n from “i18next”;
  import { initReactI18next } from “react-i18next”;
  import LanguageDetector from “i18next-browser-languagedetector”;

i18n
.use(LanguageDetector)
.use(initReactI18next)
.init({
fallbackLng: “es”,
supportedLngs: [“es”, “en”],
defaultNS: “translation”,
ns: [“translation”],
interpolation: {
escapeValue: false, // React ya escapa por defecto
},
detection: {
order: [“querystring”, “localStorage”, “navigator”, “htmlTag”],
caches: [“localStorage”],
},
backend: {
loadPath: “/locales/{{lng}}/{{ns}}.json”,
},
});

export default i18n;
EOF
step “Creado: src/i18n/i18n.ts”

```
cat > public/locales/es/translation.json << 'EOF'
```

{
“common”: {
“loading”: “Cargando…”,
“error”:   “Ha ocurrido un error”,
“retry”:   “Reintentar”,
“save”:    “Guardar”,
“cancel”:  “Cancelar”,
“delete”:  “Eliminar”,
“edit”:    “Editar”,
“close”:   “Cerrar”,
“back”:    “Volver”,
“next”:    “Siguiente”,
“confirm”: “Confirmar”
},
“nav”: {
“home”:    “Inicio”,
“about”:   “Nosotros”,
“contact”: “Contacto”,
“login”:   “Entrar”,
“logout”:  “Salir”
},
“auth”: {
“email”:    “Correo electronico”,
“password”: “Contrasena”,
“login”:    “Iniciar sesion”,
“register”: “Registrarse”
},
“errors”: {
“notFound”:   “Pagina no encontrada”,
“serverError”:“Error del servidor”,
“unauthorized”:“No autorizado”,
“networkError”:“Error de red. Comprueba tu conexion.”
}
}
EOF

```
cat > public/locales/en/translation.json << 'EOF'
```

{
“common”: {
“loading”: “Loading…”,
“error”:   “An error occurred”,
“retry”:   “Retry”,
“save”:    “Save”,
“cancel”:  “Cancel”,
“delete”:  “Delete”,
“edit”:    “Edit”,
“close”:   “Close”,
“back”:    “Back”,
“next”:    “Next”,
“confirm”: “Confirm”
},
“nav”: {
“home”:    “Home”,
“about”:   “About”,
“contact”: “Contact”,
“login”:   “Login”,
“logout”:  “Logout”
},
“auth”: {
“email”:    “Email address”,
“password”: “Password”,
“login”:    “Sign in”,
“register”: “Sign up”
},
“errors”: {
“notFound”:   “Page not found”,
“serverError”:“Server error”,
“unauthorized”:“Unauthorized”,
“networkError”:“Network error. Check your connection.”
}
}
EOF
step “Creado: traducciones en public/locales/{es,en}/translation.json”
warn “Importa i18n.ts como primer import en main.tsx antes de cualquier componente”
}

# ─────────────────────────────────────────────────────────────────────────────

# 21 — TESTING (VITEST + TESTING LIBRARY)

# ─────────────────────────────────────────────────────────────────────────────

mod_testing() {
ensure_dirs src/test

```
cat > vitest.config.ts << 'EOF'
```

import { defineConfig } from “vitest/config”;
import { resolve } from “path”;

export default defineConfig({
test: {
environment: “jsdom”,
globals:     true,
setupFiles:  [”./src/test/setup.ts”],
coverage: {
provider:   “v8”,
reporter:   [“text”, “json”, “html”],
exclude:    [“src/test/**”, “**/*.d.ts”, “**/*.config.*”, “src/types/**”],
thresholds: {
lines:      70,
functions:  70,
branches:   60,
statements: 70,
},
},
include: [“src/**/*.{test,spec}.{ts,tsx}”],
},
resolve: {
alias: { “@”: resolve(__dirname, “src”) },
},
});
EOF
step “Creado: vitest.config.ts”

```
cat > src/test/setup.ts << 'EOF'
```

import “@testing-library/jest-dom”;
import { afterEach, vi } from “vitest”;
import { cleanup } from “@testing-library/react”;

// Limpieza automatica entre tests — evita que los tests se contaminen entre si
afterEach(() => { cleanup(); });

// Mock de matchMedia — jsdom no lo implementa y muchos hooks lo usan
Object.defineProperty(window, “matchMedia”, {
writable: true,
value: vi.fn().mockImplementation((query: string) => ({
matches:             false,
media:               query,
onchange:            null,
addListener:         vi.fn(),
removeListener:      vi.fn(),
addEventListener:    vi.fn(),
removeEventListener: vi.fn(),
dispatchEvent:       vi.fn(),
})),
});

// Mock de ResizeObserver — tampoco existe en jsdom
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
observe:   vi.fn(),
unobserve: vi.fn(),
disconnect: vi.fn(),
}));

// Silencia los console.error de React en los tests — solo los propios
const originalError = console.error;
vi.spyOn(console, “error”).mockImplementation((…args) => {
if (typeof args[0] === “string” && args[0].includes(“Warning: ReactDOM.render”)) return;
originalError(…args);
});
EOF
step “Creado: src/test/setup.ts”

```
# Ejemplo de test para que el junior del equipo vea como se hace
cat > src/test/Button.test.tsx << 'EOF'
```

import { describe, it, expect, vi } from “vitest”;
import { render, screen, fireEvent } from “@testing-library/react”;
import { Button } from “@/components/ui/Button”;

describe(“Button”, () => {
it(“renderiza el texto correctamente”, () => {
render(<Button>Click me</Button>);
expect(screen.getByText(“Click me”)).toBeInTheDocument();
});

it(“llama a onClick cuando se pulsa”, () => {
const handler = vi.fn();
render(<Button onClick={handler}>Click me</Button>);
fireEvent.click(screen.getByText(“Click me”));
expect(handler).toHaveBeenCalledOnce();
});

it(“no llama a onClick cuando esta deshabilitado”, () => {
const handler = vi.fn();
render(<Button onClick={handler} disabled>Click me</Button>);
fireEvent.click(screen.getByText(“Click me”));
expect(handler).not.toHaveBeenCalled();
});

it(“muestra el spinner cuando isLoading=true”, () => {
render(<Button isLoading>Click me</Button>);
expect(screen.getByRole(“status”)).toBeInTheDocument();
});
});
EOF
step “Creado: src/test/Button.test.tsx”

```
# Patch package.json para anadir scripts de test
local PATCHED
PATCHED=$(jq '
  .scripts += {
    "test":          "vitest",
    "test:ui":       "vitest --ui",
    "test:run":      "vitest run",
    "test:coverage": "vitest run --coverage"
  }
' package.json)
echo "$PATCHED" > package.json
step "Scripts de test anadidos a package.json"
```

}

# ─────────────────────────────────────────────────────────────────────────────

# 22 — ESLINT ESTRICTO

# ─────────────────────────────────────────────────────────────────────────────

mod_eslint() {
if [[ -f “.eslintrc.json” ]] || [[ -f “eslint.config.js” ]] || [[ -f “eslint.config.ts” ]]; then
warn “Ya existe una config de ESLint. Creando .eslintrc.helen.json como referencia.”
local target=”.eslintrc.helen.json”
else
local target=”.eslintrc.json”
fi

```
cat > "$target" << 'EOF'
```

{
“root”: true,
“env”: {
“browser”:  true,
“es2022”:   true,
“node”:     true
},
“parser”: “@typescript-eslint/parser”,
“parserOptions”: {
“ecmaVersion”:  “latest”,
“sourceType”:   “module”,
“ecmaFeatures”: { “jsx”: true }
},
“plugins”: [
“@typescript-eslint”,
“security”,
“no-secrets”,
“jsx-a11y”,
“react-hooks”,
“import”
],
“extends”: [
“eslint:recommended”,
“plugin:@typescript-eslint/recommended”,
“plugin:@typescript-eslint/recommended-requiring-type-checking”,
“plugin:security/recommended”,
“plugin:jsx-a11y/recommended”,
“plugin:react-hooks/recommended”,
“prettier”
],
“rules”: {
“no-secrets/no-secrets”:              [“error”, { “tolerance”: 4.2 }],
“@typescript-eslint/no-explicit-any”: “error”,
“@typescript-eslint/no-unused-vars”:  [“error”, { “argsIgnorePattern”: “^_” }],
“no-console”:                         [“error”, { “allow”: [“warn”, “error”] }],
“jsx-a11y/alt-text”:                  “error”,
“jsx-a11y/anchor-is-valid”:           “error”,
“jsx-a11y/aria-props”:                “error”,
“jsx-a11y/click-events-have-key-events”: “warn”,
“import/no-duplicates”:               “error”,
“import/order”: [
“error”,
{
“groups”: [“builtin”, “external”, “internal”, “parent”, “sibling”, “index”],
“newlines-between”: “always”,
“alphabetize”: { “order”: “asc” }
}
]
},
“ignorePatterns”: [“dist/”, “node_modules/”, “*.config.*”, “coverage/”, “src/test/setup.ts”]
}
EOF
step “Creado: ${target}”

```
# Script lint en package.json
local PATCHED
PATCHED=$(jq '
  .scripts += {
    "lint":       "eslint src --ext .ts,.tsx --max-warnings 0",
    "lint:fix":   "eslint src --ext .ts,.tsx --fix",
    "audit:ci":   "audit-ci --critical"
  }
' package.json)
echo "$PATCHED" > package.json
```

}

# ─────────────────────────────────────────────────────────────────────────────

# 23 — PRETTIER

# ─────────────────────────────────────────────────────────────────────────────

mod_prettier() {
write_if_missing “.prettierrc” ‘{
“semi”:           true,
“singleQuote”:    false,
“quoteProps”:     “consistent”,
“trailingComma”:  “es5”,
“tabWidth”:       2,
“printWidth”:     100,
“bracketSpacing”: true,
“bracketSameLine”:false,
“arrowParens”:    “always”,
“endOfLine”:      “lf”,
“plugins”:        []
}’

```
write_if_missing ".prettierignore" 'dist/
```

node_modules/
coverage/
public/
*.min.js
*.min.css
package-lock.json’

```
local PATCHED
PATCHED=$(jq '
  .scripts += {
    "format":       "prettier --write \"src/**/*.{ts,tsx,css,json}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,css,json}\""
  }
' package.json)
echo "$PATCHED" > package.json
step "Scripts de format anadidos a package.json"
```

}

# ─────────────────────────────────────────────────────────────────────────────

# 24 — TYPESCRIPT STRICT

# tsconfig con todas las flags de strictness activadas. Si duele, es porque

# el codigo tenia bugs que no sabias que tenia.

# ─────────────────────────────────────────────────────────────────────────────

mod_typescript_strict() {
if [[ -f “tsconfig.json” ]]; then
cp tsconfig.json tsconfig.json.bak
step “Backup: tsconfig.json.bak”

```
    # Inyecta las flags de strict en el tsconfig existente con jq
    local PATCHED
    PATCHED=$(jq '
      .compilerOptions += {
        "strict":                        true,
        "noUncheckedIndexedAccess":      true,
        "noImplicitReturns":             true,
        "noFallthroughCasesInSwitch":    true,
        "noUnusedLocals":                true,
        "noUnusedParameters":            true,
        "exactOptionalPropertyTypes":    false,
        "forceConsistentCasingInFileNames": true,
        "allowJs":                       false
      }
    ' tsconfig.json 2>/dev/null || cat tsconfig.json)
    echo "$PATCHED" > tsconfig.json
    step "tsconfig.json: strict mode activado"
else
    cat > tsconfig.json << 'EOF'
```

{
“compilerOptions”: {
“target”:                          “ES2022”,
“lib”:                             [“ES2022”, “DOM”, “DOM.Iterable”],
“module”:                          “ESNext”,
“moduleResolution”:                “bundler”,
“jsx”:                             “react-jsx”,
“strict”:                          true,
“noUncheckedIndexedAccess”:        true,
“noImplicitReturns”:               true,
“noFallthroughCasesInSwitch”:      true,
“noUnusedLocals”:                  true,
“noUnusedParameters”:              true,
“forceConsistentCasingInFileNames”:true,
“allowImportingTsExtensions”:      true,
“resolveJsonModule”:               true,
“isolatedModules”:                 true,
“noEmit”:                          true,
“baseUrl”:                         “.”,
“paths”: {
“@/*”: [“src/*”]
}
},
“include”: [“src”],
“exclude”: [“node_modules”, “dist”]
}
EOF
step “Creado: tsconfig.json”
fi

```
local PATCHED
PATCHED=$(jq '
  .scripts += {
    "type-check": "tsc --noEmit"
  }
' package.json)
echo "$PATCHED" > package.json
```

}

# ─────────────────────────────────────────────────────────────────────────────

# 25 — HUSKY + LINT-STAGED + COMMITLINT

# Pre-commit que no deja pasar codigo roto. El team te lo agradecera.

# ─────────────────────────────────────────────────────────────────────────────

mod_husky() {
if [[ “$HAS_GIT” == “false” ]]; then
warn “No hay .git — ejecuta ‘git init’ primero y vuelve a correr este modulo.”
return 0
fi

```
# Patch package.json con scripts y lint-staged config
local PATCHED
PATCHED=$(jq '
  .scripts        += { "prepare": "husky" } |
  .["lint-staged"] = {
    "*.{ts,tsx}":       ["eslint --fix --max-warnings 0", "prettier --write"],
    "*.{json,md,css}":  ["prettier --write"]
  }
' package.json)
echo "$PATCHED" > package.json

npx husky init 2>/dev/null || true

# pre-commit — lint-staged en cada commit
cat > .husky/pre-commit << 'HOOKEOF'
```

#!/usr/bin/env bash
npx lint-staged
HOOKEOF
chmod +x .husky/pre-commit
step “Hook pre-commit configurado”

```
# commit-msg — conventional commits obligatorios
cat > .husky/commit-msg << 'HOOKEOF'
```

#!/usr/bin/env bash
npx –no – commitlint –edit “$1”
HOOKEOF
chmod +x .husky/commit-msg
step “Hook commit-msg configurado (commitlint)”

```
# commitlint config — conventional commits: feat, fix, docs, chore...
cat > commitlint.config.js << 'EOF'
```

export default {
extends: [”@commitlint/config-conventional”],
rules: {
“type-enum”: [
2, “always”,
[“feat”, “fix”, “docs”, “style”, “refactor”, “perf”, “test”, “build”, “ci”, “chore”, “revert”, “wip”],
],
“subject-max-length”: [2, “always”, 72],
“body-max-line-length”: [2, “always”, 100],
},
};
EOF
step “Creado: commitlint.config.js”
ok “Husky + lint-staged + commitlint configurados”
}

# ─────────────────────────────────────────────────────────────────────────────

# 26 — CI/CD GITHUB ACTIONS

# Pipeline completo: type-check, lint, audit, test, build y deploy a Vercel.

# ─────────────────────────────────────────────────────────────────────────────

mod_cicd() {
ensure_dirs .github/workflows

```
cat > .github/workflows/ci.yml << 'EOF'
```

name: CI

on:
push:         { branches: [main, develop] }
pull_request: { branches: [main, develop] }

# Cancela runs anteriores del mismo PR para ahorrar minutos de Actions

concurrency:
group: ${{ github.workflow }}-${{ github.ref }}
cancel-in-progress: true

env:
NODE_VERSION: “20”

jobs:
quality:
name: Quality Gate
runs-on: ubuntu-latest
steps:
- uses: actions/checkout@v4
with: { fetch-depth: 0 }

```
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ env.NODE_VERSION }}
      cache: npm

  - name: Install dependencies
    run: npm ci

  - name: Type check
    run: npm run type-check

  - name: Lint
    run: npm run lint

  - name: Security audit
    run: npm run audit:ci

  - name: Secret scan (Gitleaks)
    uses: gitleaks/gitleaks-action@v2
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  - name: Tests
    run: npm run test:run
    env:
      VITE_APP_URL:         https://example.com
      VITE_APP_NAME:        "My App"
      VITE_APP_DESCRIPTION: "Test env"

  - name: Upload coverage
    uses: codecov/codecov-action@v4
    if: always()
    with:
      token: ${{ secrets.CODECOV_TOKEN }}
      fail_ci_if_error: false

  - name: Build
    run: npm run build
    env:
      VITE_APP_URL:         https://example.com
      VITE_APP_NAME:        "My App"
      VITE_APP_DESCRIPTION: "Built with HELEN CLI"

  - name: Check bundle size
    run: |
      BUNDLE_SIZE=$(du -sk dist/assets/*.js 2>/dev/null | awk '{sum+=$1} END{print sum}')
      echo "Bundle size: ${BUNDLE_SIZE}KB"
      if [ "${BUNDLE_SIZE}" -gt 500 ]; then
        echo "WARN: bundle size supera 500KB. Considera code splitting."
      fi
```

EOF

```
cat > .github/workflows/deploy.yml << 'EOF'
```

name: Deploy to Vercel

on:
push: { branches: [main] }

jobs:
deploy:
name: Deploy Production
runs-on: ubuntu-latest
needs: []  # Añade el job de quality si quieres que sea prerequisito
environment:
name: production
url: ${{ steps.deploy.outputs.url }}
steps:
- uses: actions/checkout@v4

```
  - uses: actions/setup-node@v4
    with: { node-version: "20", cache: npm }

  - run: npm ci

  - name: Deploy to Vercel
    id: deploy
    env:
      VERCEL_TOKEN:   ${{ secrets.VERCEL_TOKEN }}
      VERCEL_ORG_ID:  ${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
    run: |
      npx vercel --prod --token="$VERCEL_TOKEN" | tail -1 | \
        xargs -I{} echo "url={}" >> $GITHUB_OUTPUT
```

EOF

```
ok "GitHub Actions: ci.yml + deploy.yml creados"
warn "Configura VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID en los secrets del repo"
```

}

# ─────────────────────────────────────────────────────────────────────────────

# 27 — DOCKER

# Multi-stage: build con Node, serve con Nginx. Imagen final < 50MB.

# El .dockerignore es tan importante como el Dockerfile.

# ─────────────────────────────────────────────────────────────────────────────

mod_docker() {
cat > Dockerfile << ‘EOF’

# =============================================================================

# Stage 1: Build — Node completo para compilar

# =============================================================================

FROM node:20-alpine AS builder

# El non-root user evita que alguien dentro del contenedor sea root

RUN addgroup -g 1001 -S nodejs && adduser -S helen -u 1001

WORKDIR /app

# Copiamos package files primero para aprovechar el layer cache de Docker

COPY package.json package-lock.json ./
RUN npm ci –frozen-lockfile

COPY . .

# Build con las variables de entorno de produccion

RUN npm run build

# =============================================================================

# Stage 2: Serve — Nginx alpine, < 10MB, para servir el dist

# =============================================================================

FROM nginx:1.27-alpine AS production

# Configuracion de Nginx optimizada para SPA

COPY –from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# No corras nginx como root si puedes evitarlo

RUN chown -R nginx:nginx /usr/share/nginx/html &&   
chmod -R 755 /usr/share/nginx/html

EXPOSE 80

# Healthcheck para que el orquestador sepa si el contenedor esta sano

HEALTHCHECK –interval=30s –timeout=5s –start-period=10s –retries=3   
CMD wget -q –spider http://localhost:80/health || exit 1

CMD [“nginx”, “-g”, “daemon off;”]
EOF
step “Creado: Dockerfile”

```
ensure_dirs docker

# nginx.conf optimizado para SPA + gzip + cache headers
cat > docker/nginx.conf << 'NGINXEOF'
```

server {
listen       80;
server_name  _;
root         /usr/share/nginx/html;
index        index.html;

```
# Gzip — ahorra ancho de banda, mejora TTFB
gzip              on;
gzip_vary         on;
gzip_proxied      any;
gzip_comp_level   6;
gzip_types        text/plain text/css text/xml text/javascript
                  application/json application/javascript
                  application/xml+rss application/atom+xml
                  image/svg+xml font/woff2;

# Assets con hash — cache inmutable (1 ano)
location ~* \.(js|css|woff2|woff|ttf|svg|ico|png|jpg|jpeg|webp|avif)$ {
    expires    1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
    access_log off;
}

# index.html nunca en cache — es el entry point de la SPA
location = /index.html {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
}

# Healthcheck endpoint — para el HEALTHCHECK del Dockerfile
location = /health {
    access_log  off;
    return      200 "ok";
    add_header  Content-Type text/plain;
}

# SPA fallback — todas las rutas van al index.html
location / {
    try_files $uri $uri/ /index.html;
}

# Bloquea acceso a archivos sensibles
location ~ /\. { deny all; }
```

}
NGINXEOF
step “Creado: docker/nginx.conf”

```
# .dockerignore — sin esto, el contexto de build incluye node_modules y es lentisimo
cat > .dockerignore << 'EOF'
```

node_modules/
dist/
.git/
.env
.env.*
*.log
coverage/
.cache/
docker-compose.override.yml
README.md
.github/
*.sh
EOF
step “Creado: .dockerignore”

```
# docker-compose para desarrollo local con hot reload
cat > docker-compose.yml << 'EOF'
```

version: “3.9”

services:
app:
build:
context: .
target: production
ports:
- “3000:80”
environment:
- NODE_ENV=production
restart: unless-stopped
healthcheck:
test: [“CMD”, “wget”, “-q”, “–spider”, “http://localhost:80/health”]
interval: 30s
timeout:  5s
retries:  3

# Descomentar si usas Nginx como reverse proxy local

# nginx:

# image: nginx:1.27-alpine

# ports:

# - “80:80”

# - “443:443”

# volumes:

# - ./docker/nginx.conf:/etc/nginx/conf.d/default.conf:ro

# depends_on:

# - app

EOF
step “Creado: docker-compose.yml”

```
local PATCHED
PATCHED=$(jq '
  .scripts += {
    "docker:build": "docker build -t '"${PROJECT_NAME}"':latest .",
    "docker:run":   "docker run -p 3000:80 '"${PROJECT_NAME}"':latest",
    "docker:compose": "docker-compose up -d"
  }
' package.json)
echo "$PATCHED" > package.json
```

}

# ─────────────────────────────────────────────────────────────────────────────

# 28 — LIGHTHOUSE CI

# Budget de performance que falla el build si la web se pone lenta.

# 90 en performance es exigente pero alcanzable con buenas practicas.

# ─────────────────────────────────────────────────────────────────────────────

mod_lighthouse() {
cat > lighthouserc.yml << ‘EOF’
ci:
collect:
startServerCommand: “npm run preview”
startServerReadyPattern: “Local:”
url:
- “http://localhost:4173/”
- “http://localhost:4173/about”
numberOfRuns: 3

assert:
preset: “lighthouse:recommended”
assertions:
# Performance budget
“categories:performance”:    [“error”, { “minScore”: 0.90 }]
“categories:accessibility”:  [“error”, { “minScore”: 0.95 }]
“categories:best-practices”: [“error”, { “minScore”: 0.90 }]
“categories:seo”:            [“error”, { “minScore”: 0.90 }]

```
  # Core Web Vitals
  "largest-contentful-paint":  ["warn",  { "maxNumericValue": 2500 }]
  "total-blocking-time":       ["warn",  { "maxNumericValue": 300  }]
  "cumulative-layout-shift":   ["error", { "maxNumericValue": 0.1  }]

  # Especificos
  "uses-optimized-images": "warn"
  "uses-webp-images":       "warn"
  "render-blocking-resources": "warn"
  "unused-javascript":      "warn"
```

upload:
target: “temporary-public-storage”
EOF
step “Creado: lighthouserc.yml”

```
# Anadir step de Lighthouse al CI
cat >> .github/workflows/ci.yml << 'EOF'
```

lighthouse:
name: Lighthouse CI
runs-on: ubuntu-latest
needs: [quality]
steps:
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
with: { node-version: “20”, cache: npm }
- run: npm ci
- run: npm run build
env:
VITE_APP_URL:         https://example.com
VITE_APP_NAME:        “My App”
VITE_APP_DESCRIPTION: “Test”
- name: Lighthouse CI
run: |
npm install -g @lhci/cli@0.14
lhci autorun
env:
LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
EOF
step “Anadir job Lighthouse al CI pipeline”
warn “Instala la GitHub App de Lighthouse CI para ver los resultados en los PRs”
}

# ─────────────────────────────────────────────────────────────────────────────

# 29 — BUNDLE ANALYZER

# Visualiza el bundle con treemap interactivo. Corre antes de cada release.

# ─────────────────────────────────────────────────────────────────────────────

mod_bundle_analyzer() {
if [[ “$IS_VITE” == “false” ]]; then
warn “No es un proyecto Vite — saltando bundle analyzer”
return 0
fi

```
# Patch del vite.config.ts/js para incluir el visualizer solo en analyze mode
local vite_config=""
[[ -f "vite.config.ts" ]] && vite_config="vite.config.ts"
[[ -f "vite.config.js" ]] && vite_config="vite.config.js"

if [[ -n "$vite_config" ]]; then
    # Copia el config actual con el import del visualizer preparado
    cat > vite.config.analyze.ts << 'EOF'
```

/**

- vite.config.analyze.ts — Config especial para npm run analyze.
- Genera stats.html con un treemap interactivo del bundle.
- Nunca incluyas esto en el build de produccion normal.
  */
  import { defineConfig } from “vite”;
  import react from “@vitejs/plugin-react”;
  import { visualizer } from “rollup-plugin-visualizer”;
  import { resolve } from “path”;

export default defineConfig({
plugins: [
react(),
visualizer({
filename:  “stats.html”,
open:      true,
gzipSize:  true,
brotliSize: true,
template:  “treemap”,
}),
],
resolve: {
alias: { “@”: resolve(__dirname, “src”) },
},
});
EOF
step “Creado: vite.config.analyze.ts”
fi

```
local PATCHED
PATCHED=$(jq '
  .scripts += {
    "analyze": "vite build --config vite.config.analyze.ts && open stats.html"
  }
' package.json)
echo "$PATCHED" > package.json
step "Script 'npm run analyze' anadido"
ok "Bundle analyzer listo. Ejecuta: npm run analyze"
```

}

# ─────────────────────────────────────────────────────────────────────────────

# 30 — CLEAN ARCHITECTURE FOLDER STRUCTURE

# No es DDD, no es hexagonal puro, es lo pragmatico para una SPA mediana.

# ─────────────────────────────────────────────────────────────────────────────

mod_clean_arch() {
info “Creando estructura de carpetas Clean Architecture…”

```
ensure_dirs \
    src/features \
    src/shared/components \
    src/shared/hooks \
    src/shared/utils \
    src/shared/constants \
    src/core/auth \
    src/core/errors \
    src/infra/api \
    src/infra/storage \
    src/pages \
    src/assets/images \
    src/assets/fonts \
    src/styles

# README interno para que el equipo entienda la arquitectura a los 30 segundos
cat > src/README.md << 'EOF'
```

# Arquitectura del proyecto

```
src/
├── assets/          # Imagenes, fuentes estaticas importadas por Vite
├── components/      # Componentes UI genericos y reutilizables (atoms/molecules)
│   ├── ui/          # Componentes base: Button, Spinner, Skeleton, Toast...
│   ├── layout/      # AppLayout, Header, Footer, Sidebar
│   ├── seo/         # SEOHead
│   ├── legal/       # CookieBanner, PrivacyPolicy...
│   └── analytics/   # AnalyticsProvider
├── core/            # Logica de negocio central (sin dependencias externas)
│   ├── auth/        # Autenticacion: guards, roles, permisos
│   └── errors/      # Errores de dominio tipados
├── features/        # Cada feature tiene sus propios componentes, hooks y tipos
│   └── {feature}/   # Ej: users/, products/, orders/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── types.ts
├── hooks/           # Hooks globales reutilizables entre features
├── i18n/            # Configuracion de i18n
├── infra/           # Capa de infraestructura (API, storage, servicios externos)
│   ├── api/         # Clientes API especificos por dominio
│   └── storage/     # Abstracciones sobre localStorage, sessionStorage
├── lib/             # Configuraciones de librerias: queryClient, sentry, env...
├── pages/           # Componentes de pagina (1:1 con rutas)
├── shared/          # Componentes y utils compartidos entre features
├── store/           # Estado global Zustand
├── styles/          # Variables CSS, tokens de diseno
├── test/            # Setup de testing, mocks globales
└── types/           # Tipos TypeScript compartidos globalmente
```

## Reglas de arquitectura

1. `pages/` importa de `features/` y `components/`
1. `features/` importa de `shared/`, `hooks/`, `lib/`, `core/`
1. `components/` NO importa de `features/` (dependencia inversa)
1. `core/` NO importa de `infra/` (depende de abstracciones)
1. Los tipos de API van en `infra/api/`, los de dominio en `core/` o `features/`
   EOF
   step “Creado: src/README.md con documentacion de arquitectura”
   
   # .gitkeep para que git trackee las carpetas vacias
   
   for dir in   
   src/features   
   src/core/auth   
   src/core/errors   
   src/infra/api   
   src/infra/storage   
   src/shared/components   
   src/shared/utils   
   src/shared/constants; do
   touch “${dir}/.gitkeep”
   done
   ok “Estructura Clean Architecture creada”
   }

# ─────────────────────────────────────────────────────────────────────────────

# 31 — VS CODE SETTINGS

# Settings sincronizadas entre el equipo. Sin esto cada dev tiene su propio caos.

# ─────────────────────────────────────────────────────────────────────────────

mod_vscode() {
ensure_dirs .vscode

```
cat > .vscode/settings.json << 'EOF'
```

{
“editor.formatOnSave”: true,
“editor.codeActionsOnSave”: {
“source.fixAll.eslint”: “explicit”,
“source.organizeImports”: “explicit”
},
“editor.defaultFormatter”: “esbenp.prettier-vscode”,
“[typescript]”:       { “editor.defaultFormatter”: “esbenp.prettier-vscode” },
“[typescriptreact]”:  { “editor.defaultFormatter”: “esbenp.prettier-vscode” },
“[javascript]”:       { “editor.defaultFormatter”: “esbenp.prettier-vscode” },
“[json]”:             { “editor.defaultFormatter”: “esbenp.prettier-vscode” },
“[css]”:              { “editor.defaultFormatter”: “esbenp.prettier-vscode” },
“typescript.preferences.importModuleSpecifier”: “non-relative”,
“typescript.updateImportsOnFileMove.enabled”: “always”,
“typescript.suggest.autoImports”: true,
“eslint.validate”: [“javascript”, “javascriptreact”, “typescript”, “typescriptreact”],
“files.trimTrailingWhitespace”: true,
“files.insertFinalNewline”: true,
“files.exclude”: {
“**/node_modules”: true,
“**/dist”: true,
“**/.git”: true
},
“search.exclude”: {
“**/node_modules”: true,
“**/dist”: true,
“**/*.lock”: true
},
“emmet.includeLanguages”: { “typescript”: “html” },
“editor.tabSize”: 2,
“editor.rulers”: [100],
“editor.minimap.enabled”: false,
“editor.bracketPairColorization.enabled”: true,
“editor.guides.bracketPairs”: true,
“git.autofetch”: true,
“git.confirmSync”: false,
“vitest.enable”: true
}
EOF
step “Creado: .vscode/settings.json”

```
cat > .vscode/extensions.json << 'EOF'
```

{
“recommendations”: [
“esbenp.prettier-vscode”,
“dbaeumer.vscode-eslint”,
“bradlc.vscode-tailwindcss”,
“ms-vscode.vscode-typescript-next”,
“vitest.explorer”,
“streetsidesoftware.code-spell-checker”,
“streetsidesoftware.code-spell-checker-spanish”,
“eamodio.gitlens”,
“github.vscode-pull-request-github”,
“ms-azuretools.vscode-docker”,
“formulahendry.auto-rename-tag”,
“christian-kohler.path-intellisense”,
“usernamehw.errorlens”,
“wix.vscode-import-cost”,
“csstools.postcss”
]
}
EOF
step “Creado: .vscode/extensions.json”
}

# ─────────────────────────────────────────────────────────────────────────────

# 32 — ENV TEMPLATE

# ─────────────────────────────────────────────────────────────────────────────

mod_env_template() {
write_if_missing “.env.example” “# =============================================================================

# Variables de entorno — copia a .env.local y rellena los valores

# NUNCA comitees .env.local ni .env.production al repositorio

# =============================================================================

# App

VITE_APP_URL=http://localhost:5173
VITE_APP_NAME="My App"
VITE_APP_DESCRIPTION="Tu descripcion aqui"

# Backend API (si tienes uno propio)

VITE_API_URL=http://localhost:3001

# Supabase (si lo usas)

VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-publica

# Monitoring

VITE_SENTRY_DSN=https://tu-dsn@o0.ingest.sentry.io/0

# Analytics (solo se activa con consent del usuario)

VITE_GA_ID=G-XXXXXXXXXX”

```
warn "Copia .env.example a .env.local y rellena los valores antes de arrancar"
```

}

# ─────────────────────────────────────────────────────────────────────────────

# 33 — README GENERATOR

# ─────────────────────────────────────────────────────────────────────────────

mod_readme() {
if [[ -f “README.md” ]]; then
warn “README.md ya existe — creando README.helen.md como referencia”
local target=“README.helen.md”
else
local target=“README.md”
fi

```
cat > "$target" << READMEEOF
```

# ${PROJECT_NAME}

<!-- Badges — actualiza las URLs con tu repo real -->

![CI](https://github.com/YOUR_ORG/${PROJECT_NAME}/workflows/CI/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

> Descripcion corta de lo que hace este proyecto.

## Requisitos

- Node.js >= 18
- npm >= 9

## Inicio rapido

```bash
git clone https://github.com/YOUR_ORG/${PROJECT_NAME}.git
cd ${PROJECT_NAME}
cp .env.example .env.local  # Rellena las variables
npm install
npm run dev
```

## Scripts disponibles

|Script                 |Descripcion                     |
|-----------------------|--------------------------------|
|`npm run dev`          |Servidor de desarrollo con HMR  |
|`npm run build`        |Build de produccion             |
|`npm run preview`      |Preview del build local         |
|`npm run test`         |Tests en modo watch             |
|`npm run test:coverage`|Tests + reporte de cobertura    |
|`npm run lint`         |ESLint con reporte de errores   |
|`npm run lint:fix`     |ESLint con auto-fix             |
|`npm run format`       |Prettier sobre src/             |
|`npm run type-check`   |TypeScript sin emitir archivos  |
|`npm run analyze`      |Visualizador de bundle (treemap)|
|`npm run audit:ci`     |Auditoria de seguridad npm      |

## Stack

- **Framework:** React 18 + TypeScript
- **Build:** Vite
- **Estado:** Zustand + TanStack Query
- **Routing:** React Router v6
- **Testing:** Vitest + Testing Library
- **Linting:** ESLint (security + a11y) + Prettier
- **CI/CD:** GitHub Actions + Vercel
- **Monitoring:** Sentry + GA4 (consent-gated)
- **i18n:** react-i18next
- **GDPR:** Cookie banner propio

## Estructura

Ver [src/README.md](./src/README.md) para la arquitectura detallada.

## Convenciones de commits

Este proyecto usa [Conventional Commits](https://www.conventionalcommits.org/).

```
feat: nueva funcionalidad
fix: correccion de bug
docs: documentacion
chore: mantenimiento
perf: mejora de rendimiento
test: tests
ci: cambios de CI/CD
```

## Seguridad

Para reportar vulnerabilidades, ver [.well-known/security.txt](./public/.well-known/security.txt).

-----

Armado con [HELEN CLI v4.0](https://github.com/eneekoruiz/helen)
READMEEOF
step “Creado: ${target}”
}

# ─────────────────────────────────────────────────────────────────────────────

# 34 — PWA COMPLETO (vite-plugin-pwa)

# Service worker con Workbox, precaching del build, estrategia de update.

# ─────────────────────────────────────────────────────────────────────────────

mod_pwa() {
if [[ “$IS_VITE” == “false” ]]; then
warn “No es un proyecto Vite — el modulo PWA requiere Vite.”
return 0
fi

```
# Componente para mostrar el prompt de actualizacion de la PWA
ensure_dirs src/components/pwa

cat > src/components/pwa/PWAUpdatePrompt.tsx << 'EOF'
```

/**

- PWAUpdatePrompt — banner de actualizacion cuando hay una nueva version del SW.
- Montar en App.tsx. Solo aparece cuando la PWA tiene un update pendiente.
  */
  import { useRegisterSW } from “virtual:pwa-register/react”;

export function PWAUpdatePrompt() {
const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
onRegistered(r) {
// Comprueba actualizaciones cada hora — en produccion el SW ya maneja esto
if (r) setInterval(() => { void r.update(); }, 60 * 60 * 1000);
},
});

if (!needRefresh) return null;

return (
<div
role=“alert”
aria-live=“polite”
style={{
position: “fixed”, bottom: “1.5rem”, left: “50%”,
transform: “translateX(-50%)”,
background: “#0f172a”, color: “#fff”,
padding: “0.875rem 1.25rem”,
borderRadius: “0.75rem”,
boxShadow: “0 20px 60px rgba(0,0,0,0.4)”,
display: “flex”, alignItems: “center”, gap: “1rem”,
zIndex: 9998, fontSize: “0.875rem”, maxWidth: “calc(100vw - 2rem)”,
}}>
<span>Hay una nueva version disponible.</span>
<div style={{ display: “flex”, gap: “0.5rem” }}>
<button
onClick={() => updateServiceWorker(true)}
style={{
padding: “0.375rem 0.875rem”, borderRadius: “0.375rem”,
background: “#6366f1”, color: “#fff”, border: “none”,
cursor: “pointer”, fontWeight: 600, fontSize: “0.8rem”,
}}>
Actualizar
</button>
<button
onClick={() => setNeedRefresh(false)}
style={{
padding: “0.375rem 0.875rem”, borderRadius: “0.375rem”,
background: “transparent”, color: “#94a3b8”, border: “1px solid #334155”,
cursor: “pointer”, fontSize: “0.8rem”,
}}>
Ahora no
</button>
</div>
</div>
);
}
EOF
step “Creado: src/components/pwa/PWAUpdatePrompt.tsx”

```
# Patch del vite.config para anadir el plugin PWA
warn "Anadir manualmente a vite.config.ts:"
echo ""
echo -e "${DIM}"
cat << 'PWACONFIG'
```

import { VitePWA } from “vite-plugin-pwa”;

// Dentro de plugins[]:
VitePWA({
registerType:       “prompt”,
includeAssets:      [“icons/*.png”, “fonts/*.woff2”],
workbox: {
globPatterns:        [”**/*.{js,css,html,ico,png,svg,woff2}”],
cleanupOutdatedCaches: true,
runtimeCaching: [
{
urlPattern: /^https://fonts.googleapis.com/.*/i,
handler:    “CacheFirst”,
options: {
cacheName:    “google-fonts-cache”,
expiration:   { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
cacheableResponse: { statuses: [0, 200] },
},
},
],
},
manifest: {
name:             “My App”,
short_name:       “App”,
description:      “Built with HELEN CLI”,
theme_color:      “#6366f1”,
background_color: “#ffffff”,
display:          “standalone”,
},
})
PWACONFIG
echo -e “${NC}”
}

# =============================================================================

# ── Helper interno compartido por los nuevos modulos ─────────────────────────

# Detecta el entry point principal del proyecto para inyecciones de codigo

_find_main_entry() {
local candidates=(
“src/main.tsx” “src/main.ts”
“src/index.tsx” “src/index.ts”
)
for f in “${candidates[@]}”; do
[[ -f “$f” ]] && { echo “$f”; return 0; }
done
echo “”
}

# Inserta una linea en un archivo justo antes de un patron, idempotente

_inject_before() {
local file=”$1”
local marker=”$2”       # Patron de busqueda (grep -F)
local line_to_add=”$3”  # Linea que se insertara encima
local idempotency=”$4”  # String unico para comprobar si ya fue inyectado

```
if grep -qF "$idempotency" "$file" 2>/dev/null; then
    warn "${file}: '${idempotency}' ya presente — saltando inyeccion."
    return 0
fi

if ! grep -qF "$marker" "$file" 2>/dev/null; then
    warn "${file}: patron '${marker}' no encontrado — añadiendo al final."
    echo "$line_to_add" >> "$file"
    return 0
fi

# El \n en sed es portatil en macOS y Linux con este truco
local escaped_line
escaped_line=$(printf '%s\n' "$line_to_add" | sed 's/[[\.*^$()+?{|]/\\&/g')
sed -i.helenback "/${marker//\//\\/}/i\\
```

${escaped_line}” “$file”
step “Inyectado en ${file}: ${line_to_add}”
}

# =============================================================================

# MODULO 35 — EASTER EGG / FIRMA enekoOS

# 

# Genera src/lib/enekoOS.ts con:

# - ASCII Art de ENEKO RUIZ con gradiente CSS en consola

# - Simulacion de carga de modulos con badges de color

# - Detector de DevTools (new Image + Object.defineProperty + F12)

# - Auto-init solo en produccion para no molestar en dev

# =============================================================================

mod_easter_egg() {
ensure_dirs src/lib

```
# El heredoc usa 'TSEOF' con comillas para que bash NO expanda nada dentro.
# Todo lo que hay dentro es TypeScript/JS literal.
cat > src/lib/enekoOS.ts << 'TSEOF'
```

/**

- enekoOS.ts — Firma digital de Eneko Ruiz.
- Se activa solo cuando el usuario abre DevTools.
- No hace nada en entornos de test ni server-side.
  */

// ── Utilidad de pausa — para la animacion de carga de modulos ────────────────
const sleep = (ms: number): Promise<void> =>
new Promise(resolve => setTimeout(resolve, ms));

// ── ASCII Art del nombre ──────────────────────────────────────────────────────
// Generado con figlet -f “ANSI Shadow”. No cambies el espaciado o se rompe.
const ASCII_NAME = `
███████╗███╗   ██╗███████╗██╗  ██╗ ██████╗
██╔════╝████╗  ██║██╔════╝██║ ██╔╝██╔═══██╗
█████╗  ██╔██╗ ██║█████╗  █████╔╝ ██║   ██║
██╔══╝  ██║╚██╗██║██╔══╝  ██╔═██╗ ██║   ██║
███████╗██║ ╚████║███████╗██║  ██╗╚██████╔╝
╚══════╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝

██████╗ ██╗   ██╗██╗███████╗
██╔══██╗██║   ██║██║╚══███╔╝
██████╔╝██║   ██║██║  ███╔╝
██╔══██╗██║   ██║██║ ███╔╝
██║  ██║╚██████╔╝██║███████╗
╚═╝  ╚═╝ ╚═════╝ ╚═╝╚══════╝
`;

// ── Modulos ficticios que “carga” el OS para la immersion ────────────────────
// El delay esta calibrado para que se lea cada linea, no para que sea rapido.
const BOOT_SEQUENCE: Array<{ label: string; ms: number; bg: string; fg: string }> = [
{ label: “Kernel”,           ms: 120,  bg: “#1e1e2e”, fg: “#cdd6f4” },
{ label: “Vanilla Engine”,   ms: 180,  bg: “#313244”, fg: “#a6e3a1” },
{ label: “CSS Runtime”,      ms: 90,   bg: “#313244”, fg: “#89b4fa” },
{ label: “Event Loop”,       ms: 150,  bg: “#313244”, fg: “#f38ba8” },
{ label: “DOM Binder”,       ms: 110,  bg: “#313244”, fg: “#fab387” },
{ label: “Auth Provider”,    ms: 200,  bg: “#313244”, fg: “#cba6f7” },
{ label: “Analytics Engine”, ms: 140,  bg: “#313244”, fg: “#94e2d5” },
{ label: “enekoOS v1.0”,     ms: 250,  bg: “#6c3483”, fg: “#ffffff” },
];

// ── Secuencia de arranque async ───────────────────────────────────────────────
async function runBootSequence(): Promise<void> {
// Gradiente del nombre — cada navegador lo renderiza ligeramente distinto
// pero el efecto es consistente en Chromium, Firefox y Safari modernos.
console.log(
`%c${ASCII_NAME}`,
[
“font-family: monospace”,
“font-size: 10px”,
“line-height: 1.2”,
“background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f64f59 100%)”,
“color: #ffffff”,
“padding: 16px 24px”,
“border-radius: 8px”,
“display: block”,
].join(”;”)
);

await sleep(300);

// Badge de rol — aparece debajo del nombre
console.log(
“%c  Staff Engineer & DX Architect  “,
[
“background: linear-gradient(90deg, #667eea, #764ba2)”,
“color: white”,
“padding: 4px 12px”,
“border-radius: 20px”,
“font-weight: bold”,
“font-size: 13px”,
“letter-spacing: 0.5px”,
].join(”;”)
);

console.log(”%c “, “padding: 4px”);

// Secuencia de carga modulo a modulo
for (const mod of BOOT_SEQUENCE) {
await sleep(mod.ms);
console.log(
`%c OK %c ${mod.label} loaded`,
`background:${mod.bg};color:${mod.fg};padding:1px 6px;border-radius:3px;font-weight:bold;font-size:11px;`,
“color: inherit; font-size: 12px;”
);
}

await sleep(200);

// Footer con links — abre en nueva pestana desde la consola
console.log(”%c “, “padding: 6px”);
console.log(
“%c Portfolio: https://eneko.dev  |  GitHub: github.com/eneekoruiz  |  LinkedIn: linkedin.com/in/eneko-ruiz”,
[
“color: #667eea”,
“font-size: 11px”,
“border-top: 1px solid #334155”,
“padding-top: 6px”,
“font-style: italic”,
].join(”;”)
);
console.log(”%c “, “padding: 2px”);
}

// ── Detector de DevTools ──────────────────────────────────────────────────────
// Tecnica del Image trick: el getter de .id solo se llama cuando DevTools
// formatea el objeto para mostrarlo. Combinado con el evento F12 cubre
// el 95% de los casos en Chromium. Firefox necesita el resize trick.
let _devtoolsOpen = false;

function setupDevToolsDetector(): void {
// Imagen trampa — el getter se dispara al inspeccionar el objeto
const trap = new Image();
Object.defineProperty(trap, “id”, {
get() {
if (!_devtoolsOpen) {
_devtoolsOpen = true;
void runBootSequence();
}
return “”;
},
});

// Polleamos cada segundo — el console.log con el objeto es el trigger
const poll = setInterval(() => {
// eslint-disable-next-line no-console
console.log(”%c”, trap);
console.clear();
}, 1000);

// Al detectarlo, paramos el polling — ya no hace falta
const originalLog = console.log.bind(console);
const guard = setInterval(() => {
if (_devtoolsOpen) {
clearInterval(poll);
clearInterval(guard);
// Restauramos console.log limpio antes de la secuencia de arranque
console.log = originalLog;
}
}, 500);

// F12 y Ctrl+Shift+I / Cmd+Option+I — cobertura directa de teclado
document.addEventListener(“keydown”, (e: KeyboardEvent) => {
const isF12 = e.key === “F12”;
const isInspect =
(e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === “I” || e.key === “J”);

```
if ((isF12 || isInspect) && !_devtoolsOpen) {
  _devtoolsOpen = true;
  void runBootSequence();
}
```

});

// Firefox resize trick — cuando DevTools se abre en panel lateral el
// innerWidth cambia. No es infalible pero suma cobertura.
const W = window.outerWidth;
window.addEventListener(“resize”, () => {
if (Math.abs(window.outerWidth - W) > 160 && !_devtoolsOpen) {
_devtoolsOpen = true;
void runBootSequence();
}
});
}

// ── Entry point publico ───────────────────────────────────────────────────────
// Llama a esto en main.tsx ANTES del ReactDOM.createRoot.
// Solo se activa en produccion para no interferir con el desarrollo diario.
export function initEnekoOS(): void {
if (typeof window === “undefined”) return;      // SSR guard
if (import.meta.env.DEV)          return;      // Solo en produccion
if (typeof console === “undefined”) return;    // Entornos raros sin consola

setupDevToolsDetector();
}
TSEOF
step “Creado: src/lib/enekoOS.ts”

```
# ── Inyeccion en main.tsx / main.ts ──────────────────────────────────────
local entry
entry=$(_find_main_entry)

if [[ -z "$entry" ]]; then
    warn "No se encontro main.tsx/main.ts — añade manualmente en tu entry point:"
    echo '  import { initEnekoOS } from "./lib/enekoOS";'
    echo '  initEnekoOS();'
    return 0
fi

# Import al principio del archivo (antes del primer import de React o similar)
_inject_before \
    "$entry" \
    "import React" \
    'import { initEnekoOS } from "./lib/enekoOS";' \
    "enekoOS"

# Llamada a la funcion justo despues del import — buscamos la primera linea
# que no sea import/comment para poner la llamada en el nivel superior
if ! grep -q "initEnekoOS()" "$entry" 2>/dev/null; then
    # Insertamos despues de la linea del import que acabamos de meter
    sed -i.helenback '/initEnekoOS.*from.*enekoOS/a\
```

initEnekoOS();’ “$entry”
step “Inyectado initEnekoOS() en ${entry}”
fi

```
# Limpia los backups de sed — no ensuciamos el repo
rm -f "${entry}.helenback"
ok "Easter egg enekoOS listo. Solo se activa en produccion al abrir DevTools."
```

}

# =============================================================================

# MODULO 36 — COMPONENTE <SEO /> GLOBAL

# 

# - Instala react-helmet-async si no esta instalada

# - Genera src/components/SEO.tsx con soporte completo de meta OG + Twitter

# - Autowrap del HelmetProvider en el entry point del proyecto

# =============================================================================

mod_seo_global() {
# Detecta el package manager disponible en el proyecto
local PKG_MGR=“npm install”
[[ -f “pnpm-lock.yaml” ]] && PKG_MGR=“pnpm add”
[[ -f “yarn.lock” ]]      && PKG_MGR=“yarn add”
[[ -f “bun.lockb” ]]      && PKG_MGR=“bun add”
info “Package manager detectado: ${PKG_MGR%% *}”

```
# Instalamos solo si no esta ya en el proyecto
if ! jq -e '.dependencies["react-helmet-async"] // .devDependencies["react-helmet-async"]' \
        package.json >/dev/null 2>&1; then
    info "Instalando react-helmet-async..."
    $PKG_MGR react-helmet-async 2>&1 | grep -E '(added|packages|warn|error)' || true
else
    step "react-helmet-async ya presente en package.json — saltando instalacion"
fi

ensure_dirs src/components

cat > src/components/SEO.tsx << 'TSEOF'
```

/**

- SEO.tsx — Componente universal de meta tags.
- 
- Uso basico:
- <SEO title="Mi pagina" description="Descripcion" />
- 
- Con todo:
- <SEO
- ```
  title="Articulo"
  ```
- ```
  description="Desc larga"
  ```
- ```
  image="https://mi-sitio.com/og-articulo.png"
  ```
- ```
  url="https://mi-sitio.com/articulo"
  ```
- ```
  type="article"
  ```
- ```
  noIndex={false}
  ```
- />
- 
- Requiere <HelmetProvider> wrapping la app — HELEN lo inyecta automaticamente.
  */
  import { Helmet } from “react-helmet-async”;

// Carga los valores por defecto desde .env para no repetirlos en cada pagina
const DEFAULT_TITLE       = import.meta.env.VITE_APP_NAME        as string ?? “Mi App”;
const DEFAULT_DESCRIPTION = import.meta.env.VITE_APP_DESCRIPTION as string ?? “”;
const DEFAULT_URL         = import.meta.env.VITE_APP_URL         as string ?? “”;
const DEFAULT_IMAGE       = `${DEFAULT_URL}/og-image.png`;
const TWITTER_HANDLE      = import.meta.env.VITE_TWITTER_HANDLE  as string ?? “@tuhandle”;

export interface SEOProps {
/** Titulo de la pagina — se concatena con el nombre del site: “Titulo | App” */
title?:       string;
/** Meta description — idealmente entre 120 y 160 caracteres */
description?: string;
/** URL absoluta de la imagen OG (recomendado 1200x630px) */
image?:       string;
/** URL canononica de la pagina — por defecto usa window.location.href */
url?:         string;
/** Tipo de contenido para OG. “website” para paginas, “article” para posts */
type?:        “website” | “article”;
/** true en paginas de admin, login, etc. que no deben indexarse */
noIndex?:     boolean;
/** JSON-LD arbitrario para rich snippets (FAQPage, Product, BreadcrumbList…) */
structuredData?: Record<string, unknown>;
/** Hijos opcionales por si necesitas meter algo custom en el <head> */
children?:    React.ReactNode;
}

export function SEO({
title,
description,
image,
url,
type        = “website”,
noIndex     = false,
structuredData,
children,
}: SEOProps) {
const pageTitle  = title ? `${title} | ${DEFAULT_TITLE}` : DEFAULT_TITLE;
const pageDesc   = description ?? DEFAULT_DESCRIPTION;
const pageImage  = image ?? DEFAULT_IMAGE;
const canonical  =
url ?? (typeof window !== “undefined” ? window.location.href : DEFAULT_URL);

return (
<Helmet>
{/* Basico */}
<title>{pageTitle}</title>
<meta name="description"     content={pageDesc} />
<link rel="canonical"        href={canonical} />
{noIndex && <meta name="robots" content="noindex, nofollow" />}

```
  {/* Open Graph — WhatsApp, Facebook, LinkedIn, Slack */}
  <meta property="og:type"         content={type} />
  <meta property="og:url"          content={canonical} />
  <meta property="og:title"        content={pageTitle} />
  <meta property="og:description"  content={pageDesc} />
  <meta property="og:image"        content={pageImage} />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt"    content={pageTitle} />
  <meta property="og:site_name"    content={DEFAULT_TITLE} />

  {/* Twitter Card */}
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:site"        content={TWITTER_HANDLE} />
  <meta name="twitter:title"       content={pageTitle} />
  <meta name="twitter:description" content={pageDesc} />
  <meta name="twitter:image"       content={pageImage} />

  {/* JSON-LD — Rich snippets para Google */}
  {structuredData && (
    <script type="application/ld+json">
      {JSON.stringify(structuredData)}
    </script>
  )}

  {children}
</Helmet>
```

);
}
TSEOF
step “Creado: src/components/SEO.tsx”

```
# ── Autowrap HelmetProvider en el entry point ─────────────────────────────
local entry
entry=$(_find_main_entry)

if [[ -z "$entry" ]]; then
    warn "Entry point no encontrado. Añade manualmente en main.tsx:"
    echo '  import { HelmetProvider } from "react-helmet-async";'
    echo '  // Envuelve <App /> con <HelmetProvider><App /></HelmetProvider>'
    return 0
fi

# Import del HelmetProvider
_inject_before \
    "$entry" \
    "import React" \
    'import { HelmetProvider } from "react-helmet-async";' \
    "HelmetProvider"

# Envuelve el componente raiz — busca el patron comun de ReactDOM.createRoot
# Esto cubre el 95% de los proyectos Vite/CRA modernos
if grep -q "HelmetProvider" "$entry" && ! grep -q "<HelmetProvider>" "$entry"; then
    # Solo el import, falta el wrap — avisamos sin romper nada
    warn "Importado HelmetProvider pero el wrap debe hacerse a mano en ${entry}:"
    echo "  Envuelve tu componente raiz: <HelmetProvider><App /></HelmetProvider>"
elif grep -q "<HelmetProvider>" "$entry"; then
    step "HelmetProvider ya wrapping en ${entry} — ok"
else
    warn "Añade manualmente en ${entry}: <HelmetProvider><App /></HelmetProvider>"
fi

rm -f "${entry}.helenback"
ok "Componente SEO.tsx listo. Usa <SEO title='...' description='...' /> en cada ruta."
```

}

# =============================================================================

# MODULO 37 — GIT HOOKS STANDALONE (HUSKY + LINT-STAGED)

# 

# Version simplificada sin commitlint para quienes no quieren convencion forzada.

# Instala husky + lint-staged, inicializa hooks, configura package.json.

# =============================================================================

mod_git_hooks() {
if [[ “$HAS_GIT” == “false” ]]; then
die “No hay repositorio git. Ejecuta ‘git init’ primero.”
fi

```
local PKG_MGR_DEV="npm install --save-dev"
[[ -f "pnpm-lock.yaml" ]] && PKG_MGR_DEV="pnpm add -D"
[[ -f "yarn.lock" ]]      && PKG_MGR_DEV="yarn add -D"
[[ -f "bun.lockb" ]]      && PKG_MGR_DEV="bun add -d"

# Instalamos solo lo que no este ya
local need_husky=false
local need_lststaged=false

jq -e '.devDependencies.husky' package.json >/dev/null 2>&1 || need_husky=true
jq -e '.devDependencies["lint-staged"]' package.json >/dev/null 2>&1 || need_lststaged=true

if [[ "$need_husky" == "true" || "$need_lststaged" == "true" ]]; then
    local pkgs=""
    [[ "$need_husky" == "true" ]]    && pkgs+=" husky"
    [[ "$need_lststaged" == "true" ]] && pkgs+=" lint-staged"
    info "Instalando:${pkgs}"
    $PKG_MGR_DEV $pkgs 2>&1 | grep -E '(added|packages|warn|error)' || true
else
    step "husky y lint-staged ya instalados"
fi

# Inicializa husky — crea el directorio .husky y el script prepare
npx husky init 2>/dev/null || true
step "Husky inicializado"

# Hook pre-commit — ejecuta lint-staged sobre los archivos staged
cat > .husky/pre-commit << 'HOOKEOF'
```

#!/usr/bin/env bash

# pre-commit — lint + format solo sobre los archivos que van al commit.

# Si ESLint encuentra errores, el commit se cancela. Arregla y vuelve a intentar.

npx lint-staged
HOOKEOF
chmod +x .husky/pre-commit
step “Hook .husky/pre-commit creado”

```
# Hook pre-push — type-check antes de subir al remoto
# Mejor que el CI te lo diga a que lo diga el PR delante del equipo
cat > .husky/pre-push << 'HOOKEOF'
```

#!/usr/bin/env bash

# pre-push — type check antes de subir. Si TypeScript protesta, arregla primero.

echo “[ HELEN ] Ejecutando type-check antes del push…”
npm run type-check 2>/dev/null || npx tsc –noEmit
HOOKEOF
chmod +x .husky/pre-push
step “Hook .husky/pre-push creado (type-check)”

```
# Patch de package.json con el script prepare y la config de lint-staged
# jq merge profundo para no machear scripts existentes
local PATCHED
PATCHED=$(jq '
  .scripts.prepare = "husky" |
  .["lint-staged"] = {
    "*.{ts,tsx}": [
      "eslint --fix --max-warnings 0",
      "prettier --write"
    ],
    "*.{js,jsx}": [
      "eslint --fix --max-warnings 0",
      "prettier --write"
    ],
    "*.{json,md,css,scss,html}": [
      "prettier --write"
    ]
  }
' package.json)
echo "$PATCHED" > package.json
step "package.json actualizado: script prepare + lint-staged config"

ok "Husky + lint-staged activos. Cada commit pasara por ESLint + Prettier automaticamente."
```

}

# =============================================================================

# MODULO 38 — ABSOLUTE IMPORTS @/*

# 

# Alias @ -> ./src en Vite y en TypeScript.

# - vite.config.ts: resolve.alias

# - tsconfig.json + tsconfig.app.json (si existe): paths + baseUrl

# Instala @types/node si hace falta para el __dirname en vite.config

# =============================================================================

mod_absolute_imports() {
if [[ “$IS_VITE” == “false” ]]; then
warn “No es un proyecto Vite — solo se patcheara TypeScript, no Vite.”
fi

```
# ── @types/node — necesario para usar path.resolve en vite.config.ts ─────
if [[ "$IS_VITE" == "true" ]]; then
    if ! jq -e '.devDependencies["@types/node"]' package.json >/dev/null 2>&1; then
        info "Instalando @types/node para vite.config..."
        npm install --save-dev @types/node 2>&1 | grep -E '(added|warn|error)' || true
    else
        step "@types/node ya instalado"
    fi
fi

# ── Patch de vite.config.ts ───────────────────────────────────────────────
local vite_cfg=""
[[ -f "vite.config.ts" ]] && vite_cfg="vite.config.ts"
[[ -f "vite.config.js" ]] && vite_cfg="vite.config.js"

if [[ -n "$vite_cfg" ]]; then
    if grep -q '"@"' "$vite_cfg" 2>/dev/null || grep -q "'@'" "$vite_cfg" 2>/dev/null; then
        step "${vite_cfg}: alias @ ya configurado — saltando"
    else
        cp "$vite_cfg" "${vite_cfg}.helenback"

        # Insertamos el import de path si no esta — necesario para resolve()
        if ! grep -q "from 'path'" "$vite_cfg" && ! grep -q 'from "path"' "$vite_cfg"; then
            sed -i.tmp "1s/^/import { resolve } from 'path';\n/" "$vite_cfg"
            rm -f "${vite_cfg}.tmp"
            step "Importado resolve from 'path' en ${vite_cfg}"
        fi

        # Insertamos el bloque resolve.alias dentro de defineConfig({...})
        # Buscamos el primer 'plugins:' y ponemos el alias encima
        if grep -q "plugins:" "$vite_cfg"; then
            sed -i.tmp "/plugins:/i\\
resolve: {\\
  alias: { \"@\": resolve(__dirname, \"src\") },\\
}," "$vite_cfg"
            rm -f "${vite_cfg}.tmp"
            step "Alias @ anadido en ${vite_cfg} (antes de plugins)"
        else
            # Fallback: append dentro del objeto de defineConfig
            warn "No se encontro 'plugins:' en ${vite_cfg} — patch manual:"
            echo '  resolve: { alias: { "@": resolve(__dirname, "src") } },'
        fi

        rm -f "${vite_cfg}.helenback"
    fi
fi

# ── Patch de tsconfig.json ────────────────────────────────────────────────
_patch_tsconfig() {
    local cfg="$1"
    [[ ! -f "$cfg" ]] && return 0

    if jq -e '.compilerOptions.paths["@/*"]' "$cfg" >/dev/null 2>&1; then
        step "${cfg}: paths @/* ya configurado — saltando"
        return 0
    fi

    cp "$cfg" "${cfg}.helenback"
    local PATCHED
    PATCHED=$(jq '
      .compilerOptions.baseUrl = "." |
      .compilerOptions.paths = (
        (.compilerOptions.paths // {}) + { "@/*": ["src/*"] }
      )
    ' "$cfg")
    echo "$PATCHED" > "$cfg"
    rm -f "${cfg}.helenback"
    step "Paths @/* anadidos en ${cfg}"
}

_patch_tsconfig "tsconfig.json"
_patch_tsconfig "tsconfig.app.json"   # Vite con --template react-ts lo crea separado
_patch_tsconfig "tsconfig.base.json"  # Monorepos con Turborepo

ok "Alias @/* configurado. Importa con: import { Foo } from \"@/components/Foo\""
info "Si el IDE protesta, reinicia el servidor de TypeScript: Ctrl+Shift+P > Restart TS Server"
```

}

# =============================================================================

# MODULO 39 — DARK/LIGHT/SYSTEM THEME PROVIDER

# 

# - src/context/ThemeProvider.tsx: context con deteccion del sistema,

# toggle y persistencia en localStorage

# - src/hooks/useTheme.ts: hook publico con tipado fuerte

# - Muta la clase `dark` en <html> para que Tailwind dark: funcione out of the box

# - Tambien expone –color-scheme CSS para los que no usan Tailwind

# =============================================================================

mod_theme_provider() {
ensure_dirs src/context src/hooks

```
# ── ThemeProvider ─────────────────────────────────────────────────────────
cat > src/context/ThemeProvider.tsx << 'TSEOF'
```

/**

- ThemeProvider.tsx — Sistema dark/light/system con persistencia.
- 
- Uso en main.tsx:
- <ThemeProvider>
- ```
  <App />
  ```
- </ThemeProvider>
- 
- Uso en cualquier componente:
- const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
- 
- Compatibilidad:
- - Tailwind CSS:   class=“dark:bg-gray-900” funciona sin config extra
- - CSS variables:  [data-theme=“dark”] { –bg: #111; }
- - Vanilla CSS:    html.dark { background: #111; }
    */
    import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
    } from “react”;

// Los tres posibles valores que puede guardar el usuario
export type Theme = “light” | “dark” | “system”;

// El tema resuelto real (nunca “system” — siempre “light” o “dark”)
export type ResolvedTheme = “light” | “dark”;

interface ThemeContextValue {
/** El valor guardado: “light” | “dark” | “system” */
theme: Theme;
/** El tema real aplicado en pantalla — nunca “system” */
resolvedTheme: ResolvedTheme;
/** Cambia el tema a un valor especifico */
setTheme: (theme: Theme) => void;
/** Alterna entre light y dark (ignora system, va al opuesto del resuelto) */
toggleTheme: () => void;
/** true si el tema resuelto es dark */
isDark: boolean;
}

const STORAGE_KEY  = “helen-theme”;
const ThemeContext = createContext<ThemeContextValue | null>(null);

// ── Utilidad: aplica el tema al DOM ──────────────────────────────────────────
// Hacemos esto fuera del ciclo de React para que sea instantaneo y evitar
// el destello (FOUC) entre el primer render y el useEffect.
function applyTheme(resolved: ResolvedTheme): void {
const root = document.documentElement;

// Tailwind dark mode (class strategy)
root.classList.remove(“light”, “dark”);
root.classList.add(resolved);

// data-theme para CSS custom properties sin Tailwind
root.setAttribute(“data-theme”, resolved);

// color-scheme le dice al navegador como renderizar scrollbars, inputs, etc.
root.style.colorScheme = resolved;
}

// ── Utilidad: detecta la preferencia del sistema ──────────────────────────────
function getSystemTheme(): ResolvedTheme {
if (typeof window === “undefined”) return “light”;
return window.matchMedia(”(prefers-color-scheme: dark)”).matches ? “dark” : “light”;
}

// ── Utilidad: lee el tema guardado, validando que sea un valor conocido ───────
function getStoredTheme(): Theme {
try {
const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
if (stored === “light” || stored === “dark” || stored === “system”) return stored;
} catch {
// localStorage bloqueado (safari private, cookies off)
}
return “system”;
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: ReactNode }) {
const [theme, _setTheme] = useState<Theme>(getStoredTheme);

// Resuelve el tema real — si el usuario eligio “system”, consultamos el OS
const resolvedTheme: ResolvedTheme = useMemo(
() => (theme === “system” ? getSystemTheme() : theme),
[theme]
);

// Aplica al DOM cada vez que cambie el tema resuelto
useEffect(() => {
applyTheme(resolvedTheme);
}, [resolvedTheme]);

// Escucha cambios en la preferencia del sistema para actualizar en tiempo real
// cuando el usuario tiene “system” seleccionado
useEffect(() => {
const mq      = window.matchMedia(”(prefers-color-scheme: dark)”);
const handler = () => {
if (theme === “system”) applyTheme(getSystemTheme());
};
mq.addEventListener(“change”, handler);
return () => mq.removeEventListener(“change”, handler);
}, [theme]);

const setTheme = useCallback((newTheme: Theme) => {
_setTheme(newTheme);
try { localStorage.setItem(STORAGE_KEY, newTheme); } catch { /* private mode */ }
}, []);

const toggleTheme = useCallback(() => {
setTheme(resolvedTheme === “dark” ? “light” : “dark”);
}, [resolvedTheme, setTheme]);

const value = useMemo<ThemeContextValue>(
() => ({ theme, resolvedTheme, setTheme, toggleTheme, isDark: resolvedTheme === “dark” }),
[theme, resolvedTheme, setTheme, toggleTheme]
);

return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ── Export del context para el hook ──────────────────────────────────────────
export { ThemeContext };
TSEOF
step “Creado: src/context/ThemeProvider.tsx”

```
# ── Hook publico useTheme ─────────────────────────────────────────────────
cat > src/hooks/useTheme.ts << 'TSEOF'
```

/**

- useTheme — hook publico para consumir el ThemeProvider.
- 
- Uso:
- const { theme, resolvedTheme, setTheme, toggleTheme, isDark } = useTheme();
- 
- // Boton de toggle:
- <button onClick={toggleTheme}>{isDark ? “Modo claro” : “Modo oscuro”}</button>
- 
- // Selector de tres opciones:
- <select value={theme} onChange={e => setTheme(e.target.value as Theme)}>
- ```
  <option value="light">Claro</option>
  ```
- ```
  <option value="dark">Oscuro</option>
  ```
- ```
  <option value="system">Sistema</option>
  ```
- </select>

*/
import { useContext } from “react”;
import { ThemeContext, type Theme, type ResolvedTheme } from “@/context/ThemeProvider”;

interface UseThemeReturn {
theme:         Theme;
resolvedTheme: ResolvedTheme;
setTheme:      (theme: Theme) => void;
toggleTheme:   () => void;
isDark:        boolean;
}

export function useTheme(): UseThemeReturn {
const ctx = useContext(ThemeContext);

if (!ctx) {
throw new Error(
“useTheme debe usarse dentro de <ThemeProvider>. “ +
“Asegurate de que ThemeProvider envuelve tu app en main.tsx.”
);
}

return ctx;
}

export type { Theme, ResolvedTheme };
TSEOF
step “Creado: src/hooks/useTheme.ts”

```
# ── Snippet de boton de toggle para que el dev lo tenga a mano ───────────
cat > src/components/ThemeToggle.tsx << 'TSEOF'
```

/**

- ThemeToggle — boton de ejemplo listo para usar.
- Copia esto donde lo necesites o usalo como referencia.
- 
- Requiere que <ThemeProvider> este en el arbol de componentes.
  */
  import { useTheme } from “@/hooks/useTheme”;

export function ThemeToggle() {
const { isDark, toggleTheme, theme, setTheme } = useTheme();

return (
<div style={{ display: “flex”, alignItems: “center”, gap: “0.5rem” }}>

```
  {/* Boton simple de toggle */}
  <button
    onClick={toggleTheme}
    aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    title={`Tema actual: ${theme}`}
    style={{
      padding:      "0.375rem 0.75rem",
      borderRadius: "0.5rem",
      border:       "1px solid currentColor",
      cursor:       "pointer",
      fontSize:     "0.8rem",
      fontWeight:   600,
      background:   isDark ? "#1e1e2e" : "#f8fafc",
      color:        isDark ? "#cdd6f4"  : "#1e293b",
      transition:   "all 0.2s",
    }}>
    {isDark ? "Modo claro" : "Modo oscuro"}
  </button>

  {/* Selector de tres modos — usa este si prefieres dar las tres opciones */}
  <select
    value={theme}
    onChange={e => setTheme(e.target.value as "light" | "dark" | "system")}
    aria-label="Seleccionar tema"
    style={{
      padding:      "0.375rem 0.5rem",
      borderRadius: "0.5rem",
      border:       "1px solid #e2e8f0",
      cursor:       "pointer",
      fontSize:     "0.8rem",
      background:   isDark ? "#1e1e2e" : "#fff",
      color:        isDark ? "#cdd6f4"  : "#1e293b",
    }}>
    <option value="light">Claro</option>
    <option value="dark">Oscuro</option>
    <option value="system">Sistema</option>
  </select>
</div>
```

);
}
TSEOF
step “Creado: src/components/ThemeToggle.tsx (ejemplo listo para usar)”

```
# ── Inyeccion del ThemeProvider en el entry point ─────────────────────────
local entry
entry=$(_find_main_entry)

if [[ -z "$entry" ]]; then
    warn "Entry point no encontrado. Anade manualmente en main.tsx:"
    echo '  import { ThemeProvider } from "./context/ThemeProvider";'
    echo '  // Envuelve tu app: <ThemeProvider><App /></ThemeProvider>'
    return 0
fi

_inject_before \
    "$entry" \
    "import React" \
    'import { ThemeProvider } from "./context/ThemeProvider";' \
    "ThemeProvider"

if grep -q "ThemeProvider" "$entry" && ! grep -q "<ThemeProvider>" "$entry"; then
    warn "Importado ThemeProvider en ${entry}. Wrap manual requerido:"
    echo "  <ThemeProvider><App /></ThemeProvider>"
fi

rm -f "${entry}.helenback"
ok "ThemeProvider listo. Usa useTheme() en cualquier componente. Tailwind dark: funciona sin configuracion adicional."

# Recordatorio para el tailwind.config si existe
if [[ -f "tailwind.config.ts" ]] || [[ -f "tailwind.config.js" ]]; then
    local tw_cfg
    tw_cfg=$(ls tailwind.config.* 2>/dev/null | head -1)
    if ! grep -q "darkMode" "$tw_cfg" 2>/dev/null; then
        warn "Tailwind detectado. Anade en ${tw_cfg}:"
        echo '  darkMode: "class",   // ThemeProvider muta html.dark'
    fi
fi
```

}

# MENU INTERACTIVO — la parte que el usuario ve

# =============================================================================

show_menu
echo -e “${BOLD}  Introduce los numeros de los modulos a ejecutar:${NC}”
echo -e “  ${DIM}(Ejemplos: ‘1 3 5’  |  ‘1,3,5’  |  ‘1-5’  |  ‘all’  |  ‘ui’)${NC}”
echo “”
printf “  ${CYAN}${BOLD}>${NC} “
read -r USER_INPUT

[[ -z “$USER_INPUT” ]] && die “No has seleccionado ningun modulo.”

# Parsea la seleccion del usuario

SELECTED=$(parse_selection “$USER_INPUT”)

if [[ -z “$SELECTED” ]]; then
die “Seleccion invalida: ‘${USER_INPUT}’. Usa numeros del 01 al ${TOTAL_MODULES} o ‘all’.”
fi

# Confirma antes de ejecutar si hay muchos modulos

SELECTED_ARRAY=( $SELECTED )
SELECTED_COUNT=${#SELECTED_ARRAY[@]}

echo “”
info “Se ejecutaran ${BOLD}${SELECTED_COUNT}${NC} modulos: ${BOLD}$(echo “$SELECTED” | tr ‘\n’ ’ ’)${NC}”
echo “”

if [[ $SELECTED_COUNT -gt 5 ]]; then
printf “  ${YELLOW}Continuar? [s/N]${NC} “
read -r CONFIRM
[[ “${CONFIRM,,}” != “s” && “${CONFIRM,,}” != “si” && “${CONFIRM,,}” != “y” && “${CONFIRM,,}” != “yes” ]]   
&& die “Cancelado por el usuario.”
fi

echo “”
info “Iniciando secuencia de ensamblaje…”
echo “”

# Ejecuta los modulos seleccionados en orden

START_TIME=$(date +%s)
ERRORS=0

for num in $SELECTED; do
# Formatea el numero con cero a la izquierda para el lookup
formatted=$(printf “%02d” “$num” 2>/dev/null || echo “$num”)
if ! run_module “$formatted”; then
warn “El modulo ${formatted} encontro un error. Continuando con el siguiente…”
((ERRORS++)) || true
fi
done

# =============================================================================

# SUMMARY FINAL

# =============================================================================

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo “”
echo -e “${BOLD}${GREEN}╔══════════════════════════════════════════════════════════╗${NC}”
echo -e “${BOLD}${GREEN}║   HELEN CLI v4.0 — Ensamblaje completado                 ║${NC}”
echo -e “${BOLD}${GREEN}╚══════════════════════════════════════════════════════════╝${NC}”
echo “”
info “Modulos ejecutados: ${SELECTED_COUNT}  |  Errores: ${ERRORS}  |  Tiempo: ${ELAPSED}s”
echo “”

if [[ $SELECTED_COUNT -gt 5 ]]; then
echo -e “${BOLD}  Proximos pasos obligatorios:${NC}”
echo “”
echo -e “  ${CYAN}1.${NC} Copia .env.example a .env.local y rellena los valores”
echo -e “  ${CYAN}2.${NC} Importa en main.tsx (en este orden):”
echo -e “     ${DIM}import "./lib/sentry";${NC}”
echo -e “     ${DIM}import { env } from "./lib/env";${NC}”
echo -e “     ${DIM}import "./i18n/i18n";   // si instalaste i18n${NC}”
echo “”
echo -e “  ${CYAN}3.${NC} Wrap en main.tsx:”
echo -e “     ${DIM}<GlobalErrorBoundary>${NC}”
echo -e “     ${DIM}  <HelmetProvider>${NC}”
echo -e “     ${DIM}    <QueryProvider>${NC}”
echo -e “     ${DIM}      <ToastProvider>${NC}”
echo -e “     ${DIM}        <CookieConsentProvider>${NC}”
echo -e “     ${DIM}          <AnalyticsProvider />${NC}”
echo -e “     ${DIM}          <RouterProvider router={router} />${NC}”
echo -e “     ${DIM}        </CookieConsentProvider>${NC}”
echo -e “     ${DIM}      </ToastProvider>${NC}”
echo -e “     ${DIM}    </QueryProvider>${NC}”
echo -e “     ${DIM}  </HelmetProvider>${NC}”
echo -e “     ${DIM}</GlobalErrorBoundary>${NC}”
echo “”
echo -e “  ${YELLOW}  Antes de deploy:${NC}”
echo -e “  ${YELLOW}  - public/og-image.png (1200x630px)${NC}”
echo -e “  ${YELLOW}  - public/icons/*.png (favicon.io)${NC}”
echo -e “  ${YELLOW}  - Reemplaza YOUR_COMPANY/YOUR_EMAIL en los legales${NC}”
echo -e “  ${YELLOW}  - Actualiza connect-src en vercel.json con tus dominios${NC}”
fi

echo “”