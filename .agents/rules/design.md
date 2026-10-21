<!-- HELEN:START (managed by helen setup, edit outside this block) -->
# HELEN Design System & UI/UX Rules
- Playwright + Chromium Testing Gate: Every visual component or design change must pass headless Chromium verification across 3 viewports (375px mobile, 768px tablet, 1440px desktop) with zero console errors.
- Model routing: choose the cheapest available capable model when supported; keep the current agent when handoff overhead outweighs its benefit. Escalate on evidenced failure or capability limits; never lower reasoning effort automatically.
- Maintain accessible contrast (WCAG AA/AAA) across all color themes.
- Ensure responsive layouts across mobile, tablet, and desktop breakpoints without horizontal overflow.
- Respect prefers-reduced-motion for all UI transitions and animations.

## UI/UX & Design Excellence (Anti-AI Slop)
- Apply UI UX Pro Max & Hallmark: Never generate generic AI template designs (avoid standard purple-pink gradients, generic 3-column feature cards, or unstyled Inter fonts). Choose bold, deliberate color anchors, asymmetric layouts, and varied macrostructures.
- Apply Impeccable Standards: Ensure high-contrast ratios, deterministic spacing scales, intentional typographic hierarchy, fluid animations, and responsive polish.
- Component Quality: Favor production-ready, accessible components (e.g. 21st.dev / shadcn/ui patterns) over toy snippets.

## Traducción de Diseño a Código (Canvas / Figma / tldraw / Pencil / Excalidraw / MCP)
- Rol: UI/UX Developer experto con detección adaptativa de stack.
- 1. Fidelidad Absoluta (Pixel-Perfect): Extrae con precisión medidas, colores, tipografías y jerarquías del origen. No inventes estilos, paletas ni espaciados que no estén en el diseño. Si un valor no está definido, detente y pregunta qué estándar usar.
- 2. Detección Contextual de Stack (Zero-Assumption):
  - Inspecciona el proyecto antes de generar código:
    - Si existe package.json con next -> Next.js (App Router, Server/Client components, Server Actions).
    - Si existe package.json con react (sin Next) -> React + Vite/Tailwind.
    - Si es un proyecto estático sin bundler -> HTML5 semántico nativo + CSS moderno (variables CSS, flexbox/grid, @layer). NUNCA fuerces React, JSX o CDNs de Tailwind si el proyecto es HTML puro.
- 3. Tailwind v3 vs v4 Rigor:
  - Si el proyecto usa Tailwind v4 (@import "tailwindcss" con directivas @theme), nunca uses tailwind.config.js.
  - Si usa Tailwind v3, respeta tailwind.config.js y postcss.config.js.
- 4. Estructura Modular & Calidad de Componentes:
  - En React/Next: prioriza componentes probados y accesibles (shadcn/ui, radix-ui, lucide-react) en lugar de divs planos.
  - En HTML/CSS: usa etiquetas semánticas (<header>, <main>, <nav>, <article>, <dialog>) y atributos ARIA para cumplimiento de accesibilidad WCAG AA.
- 5. Mínimo Cambio (Anti-Refactor): Si el diseño es una actualización de un componente existente, modifica únicamente las clases, estilos o etiquetas HTML afectadas por el nuevo diseño.
- 6. Cero Suposiciones de Lógica: El diseño dicta la interfaz, no el backend. Genera la estructura visual y los estados básicos (UI: active, hover, focus, disabled, loading), pero no alucines lógica de negocio ni endpoints complejos.
- 7. Verificación Visual (Playwright): Ante dudas o entregas de componentes complejos, genera un renderizado de prueba para comprobar visualmente la fidelidad frente a la maqueta original.

## Frontend Architecture & Production Standards (Next.js, React, Tailwind & HTML)
- 1. Server vs Client Boundaries (Next.js 15+ & React 19): Mantén Server Components como valor predeterminado para renderizado ultrarrápido y SEO. Añade 'use client' únicamente en las hojas del árbol que requieran interactividad (useState, useEffect, handlers de eventos).
- 2. Diseño Responsivo Fluido (Zero-Overflow): Prohibido usar anchos fijos en contenedores principales (width: Xpx). Diseña mobile-first usando contenedores fluidos (w-full, max-w-*, min-h-screen, overflow-x-hidden) con espaciados proporcionales para evitar barras de desplazamiento horizontal accidentales.
- 3. Modo Oscuro / Claro de Primera Clase (Dark Mode First-Class): Diseña interfaces preparadas para temas claro y oscuro por defecto. En Tailwind, usa clases semánticas con variantes dark: (o tokens CSS tipo bg-background text-foreground). En HTML/CSS puro, declara color-scheme: light dark; con variables CSS adaptativas bajo @media (prefers-color-scheme: dark). Prohibido hardcodear fondos blancos puros sin su variante oscura.
- 4. Pruebas de Interacción y Regresiones: Para componentes con interactividad o estado dinámico (formularios, modales, pestañas, filtros), genera pruebas complementarias en Vitest o Playwright que verifiquen el renderizado y los eventos antes de dar la tarea por finalizada.
- 5. Gestión Profesional de Recursos e Iconos:
  - En React/Next: usa exclusivamente lucide-react para iconos y next/image con dimensiones (width, height, alt) para eliminar el Cumulative Layout Shift (CLS).
  - En HTML/CSS: usa SVGs inline limpios con currentColor y etiquetas <img> con loading="lazy" y decoding="async" (sin CDNs externas no verificadas que fallen offline).
- 6. Metadatos & SEO Técnico Automático: Exporta siempre metadatos completos (metadata en Next.js App Router; <meta name="viewport">, <meta charset="utf-8"> y <title> en HTML5).
- 7. Limpieza de Formato e Importaciones: Sigue estrictamente la jerarquía estándar de imports (1º core de React/Next, 2º librerías externas y componentes UI, 3º utilidades/hooks locales, 4º tipos TypeScript). Cero código muerto.
<!-- HELEN:END -->
