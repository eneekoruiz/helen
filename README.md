## Instalación y Uso Instantáneo
No necesitas clonar el repo completo para empezar a usarlo. Entra en la raíz de tu proyecto Vite y ejecuta:

curl -O https://raw.githubusercontent.com/eneekoruiz/helen-cli/main/helen.sh && chmod +x helen.sh && ./helen.sh

## What the script automates (0 manual configuration)
### BLOCK 1 — Dependencies
- [x] `zod` — Runtime type validation
- [x] `isomorphic-dompurify` — XSS sanitization
- [x] `@sentry/react` — Error tracking + Session Replay
- [x] `react-helmet-async` — Dynamic per-page meta
- [x] `husky` + `lint-staged` — Pre-commit quality gate
- [x] `audit-ci` — Blocks build on critical CVEs
- [x] `eslint-plugin-security` + `eslint-plugin-no-secrets` — Source code scanning
- [x] `eslint-plugin-jsx-a11y` — Accessibility linting
- [x] `vite-plugin-pwa` — Progressive Web App support

### BLOCK 2 — Vercel Edge Security Headers
- [x] `Strict-Transport-Security` (HSTS) — Forces HTTPS forever
- [x] `X-Frame-Options: DENY` — Blocks Clickjacking
- [x] `X-Content-Type-Options: nosniff` — Blocks MIME sniffing
- [x] `Permissions-Policy` — Disables camera, mic, geolocation, payment
- [x] `Cross-Origin-Opener-Policy` — Blocks cross-origin window attacks
- [x] `Content-Security-Policy` — XSS defense (tuned for Vite SPA)
- [x] `Referrer-Policy: strict-origin-when-cross-origin`
- [x] SPA rewrite rules — Prevents 404 on direct URL access / refresh
- [x] Immutable cache headers for `/assets`, `/fonts`, `/icons`

### BLOCK 3 — SEO, Social Sharing & PWA (index.html)
- [x] `<meta name="description">` — Search engine snippet
- [x] `<link rel="canonical">` — Prevents duplicate content penalties
- [x] **Open Graph** tags — Perfect WhatsApp/Facebook/LinkedIn preview thumbnail
- [x] **Twitter Card** — `summary_large_image` format
- [x] `manifest.json` link + Apple PWA meta tags
- [x] `dns-prefetch` + `preconnect` for Google Fonts, Analytics, Sentry
- [x] **App Shell Preloader** — CSS spinner in pure HTML/CSS, dismissed by MutationObserver when React mounts. Zero blank screen on cold load.

### BLOCK 4 — Global UX & Performance CSS
- [x] `scroll-behavior: smooth` — Butter scrolling on all anchor links
- [x] `@media (prefers-reduced-motion)` — Respects user accessibility preference
- [x] `min-height: 100dvh` — Mobile safe-area (replaces broken `100vh`)
- [x] `scrollbar-gutter: stable` — Prevents layout shift when scrollbar appears
- [x] `:focus-visible` ring — WCAG-compliant keyboard focus indicator
- [x] `image: display:block` — Eliminates inline image bottom gap (layout shift)
- [x] `-webkit-font-smoothing` — Crisp font rendering on macOS/iOS
- [x] CSS keyframes pre-registered: `skeleton-shimmer`, `fadeInRight`, `spin`
- [x] `.skip-link` class — Skip-to-content for keyboard/screen reader users

### BLOCK 5 — Security Utilities (`src/lib/`)
- [x] `sanitizeHtml()` — DOMPurify allowlist-based HTML sanitizer
- [x] `sanitizePlainText()` — Strips ALL HTML from user input
- [x] Zod schemas: `emailSchema`, `nameSchema`, `messageSchema`, `phoneSchema`
- [x] `contactFormSchema` — Ready-to-use form validation
- [x] `parseApiResponse()` — Type-safe API response parser
- [x] `env.ts` — Crash-fast env validator (app fails at startup, not at runtime)
- [x] `sentry.ts` — Error tracking with PII redaction, session replay, sampling
- [x] `analytics.ts` — Consent-gated, provider-agnostic event wrapper

### BLOCK 6 — UI Components (`src/components/ui/`)
- [x] `GlobalErrorBoundary` — Top-level crash catcher + Sentry capture. No more white screens.
- [x] `Spinner` — Accessible loading indicator (`role="status"`, `aria-label`)
- [x] `Skeleton` / `SkeletonCard` / `SkeletonText` — Zero-CLS async placeholders
- [x] `Button` — Loading-aware button (disabled + aria-busy + spinner state)
- [x] `ToastProvider` + `useToast()` — ARIA live region notifications (success/error/warning/info)

### BLOCK 7 — Legal & RGPD
- [x] `CookieBanner.tsx` — Blocks analytics scripts until explicit user consent
- [x] `CookieConsentProvider` + `useCookieConsent()` — Context hook for conditional script injection
- [x] `PrivacyPolicy.tsx` — GDPR-structured template
- [x] `CookiePolicy.tsx` — Cookie table with all cookies documented
- [x] `Terms.tsx` — Terms of service template

### BLOCK 8 — Analytics
- [x] `AnalyticsProvider.tsx` — Injects GA4 script dynamically, only after consent
- [x] `anonymize_ip: true` — GDPR-compliant by default
- [x] `allow_google_signals: false` — No advertising data collection

### BLOCK 9 — Base Layout
- [x] `AppLayout.tsx` — Skip-link, `<header role="banner">`, `<main id="main-content">`, `<footer role="contentinfo">`
- [x] Legal footer links pre-wired

### BLOCK 10 — Utility Hooks
- [x] `useAsync` — Unified loading/error/data state for any async function
- [x] `useDebounce` — Delays value for search inputs (reduces API calls)
- [x] `useLocalStorage` — Persistent typed state with JSON serialization
- [x] `useMediaQuery` — Reactive CSS media queries (`isMobile`, `isDark`, `isReducedMotion`)
- [x] `useOnClickOutside` — Close modals/dropdowns on outside click

### BLOCK 11 — Shared Types
- [x] `ApiResponse<T>` — Standard API wrapper type
- [x] `PaginatedResponse<T>` — Pagination data structure
- [x] `AsyncStatus` — `"idle" | "loading" | "success" | "error"`
- [x] `SelectOption<T>` — Reusable select/dropdown type
- [x] `User` — Base user entity

### BLOCK 12 — Public Assets & Standards
- [x] `public/manifest.json` — PWA manifest with icon sizes
- [x] `public/robots.txt` — Search engine crawl rules
- [x] `public/.well-known/security.txt` — RFC 9116 responsible disclosure

### BLOCK 13 — CI/CD Pipeline & Pre-commit
- [x] `.github/workflows/ci.yml` — TypeScript check → ESLint → audit-ci → Gitleaks → build
- [x] Husky `pre-commit` hook — Runs lint-staged on every commit
- [x] `.eslintrc.json` — Security + accessibility rules
- [x] `.npmrc` — `save-exact=true`, `audit-level=critical`
- [x] `gitleaks` — Secret scanning on full git history (CI)

### BLOCK 14 — Environment
- [x] `.env.example` — Documented template for all `VITE_` variables
- [x] `.gitignore` — Guards against committing `.env*` files

### BLOCK 15 — Estado & Data Fetching
- [x] `Zustand` — Estado global con persistencia automática (`sessionStorage`).
- [x] `TanStack Query` (React Query) — Gestión de caché profesional, reintentos y asincronía.

### BLOCK 16 — API Client (Axios)
- [x] `axios` — Cliente HTTP centralizado.
- [x] Interceptores de seguridad e inyección automática de tokens (`Authorization: Bearer`).
- [x] Lógica de reintentos (ej. 429 Too Many Requests) y redirección por 401.

### BLOCK 17 — i18n Masivo
- [x] `react-i18next` + `i18next-browser-languagedetector` — Internacionalización completa.
- [x] Soporte base preparado para más de 15 idiomas.
- [x] Soporte dinámico para idiomas de lectura de derecha a izquierda (RTL) como el Árabe.

### BLOCK 18 — Testing Suite
- [x] `Vitest` + `Testing Library` + `jsdom` — Entorno de pruebas súper rápido.
- [x] Mocks globales pre-configurados (`matchMedia`, `ResizeObserver`).
- [x] Componente de ejemplo (`Button.test.tsx`) con buenas prácticas.

### BLOCK 19 — Calidad de Código
- [x] `ESLint` estricto — Reglas avanzadas de `@typescript-eslint`, seguridad y accesibilidad (`jsx-a11y`).
- [x] `Prettier` — Formateo automático sincronizado para evitar conflictos de equipo.
- [x] `TypeScript` — Archivo `tsconfig.json` con todas las flags de `strict` activadas al máximo.

### BLOCK 20 — Infraestructura & Docker
- [x] Dockerfile Multi-stage — Construcción con Node y despliegue con Nginx (imagen final < 50MB).
- [x] `nginx.conf` optimizado — Fallback para SPA, caché inmutable de 1 año para assets y compresión gzip.
- [x] `docker-compose.yml` — Entorno de desarrollo levantado en un comando.

### BLOCK 21 — CI/CD Pipeline
- [x] GitHub Actions — Workflows pre-configurados para PRs y despliegues.
- [x] Pipeline de Calidad: `Install -> Type-check -> Lint -> Audit -> Gitleaks -> Test -> Build`.
- [x] Despliegue automatizado directo a Vercel (`deploy.yml`).

### BLOCK 22 — Clean Architecture
- [x] Estructura generada por dominios: `features/`, `core/`, `infra/`, `shared/`.
- [x] `README.md` de arquitectura interno — Documenta las reglas de dependencias del proyecto para nuevos devs.

### BLOCK 23 — DX (Developer Experience)
- [x] Configuración VS Code — Generación de `.vscode/settings.json` (auto-fix on save) y `extensions.json`.
- [x] `.env.example` — Plantilla generada con todas las variables necesarias documentadas.
- [x] `README.md` técnico — Generado con badges de CI, instrucciones de setup, lista de scripts y stack tecnológico.

## What you still configure per project

| Task | Where | Why not automated |
|---|---|---|
| Replace `YOUR_COMPANY` / `YOUR_EMAIL` | Legal pages, security.txt | Business-specific data |
| `public/og-image.png` (1200×630px) | `/public` | Requires design |
| `public/icons/*.png` | `/public/icons` | Requires design (use favicon.io) |
| Add your API domains to CSP `connect-src` | `vercel.json` | Project-specific endpoints |
| Mount routes `/privacy`, `/cookies`, `/terms` | Your router | Project-specific routing |
| Fill `.env.local` | Project root | Contains real secrets |
| Wrap root in providers (3 lines in main.tsx) | `src/main.tsx` | Requires knowing render tree |

# 🔍 Mega-Prompt de Auditoría Pre-Flight

> Copia y pega esto a Claude/Copilot justo antes de hacer deploy.
> Adjunta o pega todo el código relevante del proyecto cuando lo lances.

---

```
ROL: Actúa como un equipo de revisión técnica compuesto por:
  - Staff Engineer (arquitectura y escalabilidad)
  - Security Engineer (vulnerabilidades y datos)
  - Frontend Performance Engineer (Core Web Vitals)
  - QA Accessibility Specialist (WCAG 2.2 AA)

CONTEXTO:
Estoy a punto de hacer deploy de una SPA en Vite + React + Tailwind desplegada en Vercel.
La infraestructura base (headers de seguridad, sanitización, Sentry, analytics, RGPD) ya está
inyectada automáticamente por mi script lovable-armor-v3.sh. NO necesito auditar esa capa.

Lo que necesito que audites es la LÓGICA DE NEGOCIO específica de este proyecto.

CÓDIGO A REVISAR: [PEGA AQUÍ TUS ARCHIVOS O DESCRIBE LA ESTRUCTURA]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÁREA 1 — SEGURIDAD EN BASE DE DATOS (Supabase / Firebase)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Revisa específicamente:

1. REGLAS DE SUPABASE / RLS (Row Level Security):
   - ¿Cada tabla tiene RLS activado?
   - ¿Existe alguna tabla con `SELECT`, `INSERT`, `UPDATE` o `DELETE` para `anon` sin restricción?
   - ¿Los policies usan `auth.uid()` correctamente para que cada usuario solo vea sus datos?
   - ¿Hay alguna función `SECURITY DEFINER` que eleve permisos sin validación?

2. REGLAS DE FIREBASE (si aplica):
   - ¿Las reglas de Firestore permiten `read: true` o `write: true` sin condición?
   - ¿Se valida que `request.auth != null` en cada ruta que maneja datos de usuario?
   - ¿Los índices exponen datos de otros usuarios?

3. IDOR (Insecure Direct Object Reference):
   - ¿Algún endpoint o query acepta un ID de recurso sin verificar que pertenece al usuario autenticado?
   - Ejemplo: `GET /api/orders?id=123` — ¿puede un usuario ver el pedido de otro?

4. EXPOSICIÓN DE SECRETS EN CLIENTE:
   - ¿Hay alguna `VITE_` variable que contenga un secret de servidor (service role key, webhook secret)?
   - ¿Alguna lógica del cliente toma decisiones de autorización basándose en datos que el servidor debería verificar?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÁREA 2 — ESCALABILIDAD Y CONCURRENCIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5. QUERIES N+1:
   - ¿Hay bucles que ejecutan queries dentro de `.map()`, `forEach`, o similares?
   - Ejemplo: `users.forEach(u => fetchOrders(u.id))` — debe ser un JOIN o `.in()`.

6. CACHE Y REFETCH INNECESARIO:
   - ¿Los datos globales (lista de productos, configuración) se re-fetchen en cada montaje de componente?
   - ¿Se usa React Query / SWR con `staleTime` configurado, o todo es `useEffect + fetch` sin cache?

7. SUSCRIPCIONES EN TIEMPO REAL SIN CLEANUP:
   - ¿Hay `supabase.channel()` o `onSnapshot()` de Firebase sin `return () => subscription.unsubscribe()`?
   - Cada suscripción sin cleanup crea un memory leak que escala con el número de usuarios.

8. OPTIMISTIC UPDATES:
   - En acciones del usuario (like, follow, borrar), ¿la UI espera a que el servidor responda antes de actualizar?
   - Esto genera latencia percibida innecesaria. ¿Hay manejo de rollback si la operación falla?

9. PAGINACIÓN:
   - ¿Alguna query carga todos los registros sin límite? (`.from("table").select("*")` sin `.limit()`)
   - Con 10,000 registros esto revienta la UI y la BD. ¿Hay paginación por cursor o por página?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÁREA 3 — GESTIÓN DE ESTADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

10. PROP DRILLING EXCESIVO:
    - ¿Hay props que bajan más de 3 niveles? Indica estado que debería estar en Context o Zustand.

11. ESTADO DUPLICADO:
    - ¿Existe el mismo dato en dos `useState` diferentes que pueden desincronizarse?
    - Ejemplo: `userId` en el contexto de auth Y en un estado local de otro componente.

12. useEffect CON DEPENDENCIAS INCORRECTAS:
    - ¿Hay `useEffect` con array de dependencias vacío `[]` que debería re-ejecutarse?
    - ¿Hay efectos que crean loops infinitos por incluir objetos/funciones sin `useCallback`/`useMemo`?

13. MEMORY LEAKS EN ASYNC:
    - ¿Hay `fetch` dentro de `useEffect` sin comprobar si el componente sigue montado antes de llamar `setState`?
    - Patrón correcto: `let mounted = true; fetch().then(() => { if (mounted) setState(...) }); return () => { mounted = false; };`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÁREA 4 — ACCESIBILIDAD (WCAG 2.2 AA)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

14. IMÁGENES SIN ALT:
    - ¿Todas las `<img>` tienen `alt`? Las decorativas deben tener `alt=""`.
    - ¿Iconos de botones tienen `aria-label` o texto visible?

15. FORMULARIOS:
    - ¿Cada `<input>` tiene un `<label>` asociado con `htmlFor` o `aria-label`?
    - ¿Los errores de validación usan `aria-describedby` y `role="alert"`?
    - ¿El orden del tab sigue el flujo visual?

16. CONTRASTE DE COLOR:
    - ¿El texto sobre fondos de color tiene al menos 4.5:1 de contraste? (WCAG AA)
    - Comprueba especialmente textos grises sobre fondo blanco y botones con hover.

17. MODALES Y DIALOGS:
    - ¿Los modales atrapan el foco (`focus trap`) dentro mientras están abiertos?
    - ¿Se cierra con `Escape`?
    - ¿El foco vuelve al elemento que lo abrió cuando el modal cierra?

18. NAVEGACIÓN POR TECLADO:
    - ¿Todos los elementos interactivos (botones, links, dropdowns) son alcanzables con `Tab`?
    - ¿Hay algún `onClick` en `<div>` o `<span>` sin `role="button"` y `tabIndex={0}`?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÁREA 5 — FLUJOS DE USUARIO Y LÓGICA DE NEGOCIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

19. FORMULARIOS SIN FEEDBACK COMPLETO:
    - ¿Cada formulario tiene: estado de carga (botón disabled + spinner), mensaje de éxito, mensaje de error específico?
    - ¿El formulario se resetea o redirige después de un submit exitoso?

20. RUTAS PROTEGIDAS:
    - ¿Las rutas que requieren autenticación redirigen a `/login` si el usuario no está autenticado?
    - ¿La comprobación de auth ocurre en el servidor/middleware o solo en el cliente (hackeable)?

21. MANEJO DE ERRORES DE RED:
    - Si el usuario pierde conexión a mitad de un formulario, ¿qué ocurre?
    - ¿Hay reintentos automáticos para operaciones críticas?

22. ESTADOS EDGE CASE DE UI:
    - ¿Qué muestra la app si la BD devuelve 0 resultados? ¿Empty state con CTA?
    - ¿Qué ocurre si la imagen de perfil de un usuario es `null`? ¿Fallback o crash?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÁREA 6 — PERFORMANCE Y CORE WEB VITALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

23. LCP (Largest Contentful Paint):
    - ¿La imagen principal (hero) tiene `fetchpriority="high"` y está en formato WebP/AVIF?
    - ¿Hay alguna fuente web cargando síncronamente que bloquee el render?

24. CLS (Cumulative Layout Shift):
    - ¿Todas las imágenes tienen `width` y `height` o `aspect-ratio` definido?
    - ¿Hay elementos que aparecen dinámicamente y empujan el contenido hacia abajo?

25. BUNDLE SIZE:
    - ¿Se importan librerías enteras donde solo se necesitan funciones específicas?
    - Ejemplo: `import _ from 'lodash'` en lugar de `import debounce from 'lodash/debounce'`.
    - ¿Las rutas usan `React.lazy()` + `<Suspense>` para code splitting?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENTREGABLES ESPERADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Estructura tu respuesta exactamente así:

## 🔴 CRÍTICO (Bloquea el deploy)
[Vulnerabilidades de seguridad, data leaks, crashes garantizados]

## 🟡 IMPORTANTE (Resolver antes de escalar)
[Performance, memory leaks, accesibilidad legal]

## 🟢 MEJORAS (Backlog técnico)
[Optimizaciones, DX, nice-to-haves]

## ✅ APROBADO
[Áreas que están correctamente implementadas — no me digas solo lo malo]

Para cada issue encontrado proporciona:
- **Archivo y línea** donde está el problema
- **Por qué es un problema** (impacto real)
- **El fix exacto** en código (no descripciones vagas)

Tono: de ingeniero a ingeniero. Sin condescendencia. Si algo está bien hecho, dilo.
```
