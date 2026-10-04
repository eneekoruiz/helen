---
name: helen-design
description: Master skill for premium UX/UI, eliminating AI tropes (slop), optimizing web accessibility, scroll behavior, transitions, and 3D web graphics in an autonomous convergence loop.
version: 2.1.0
---

# Premium Design & Anti-Slop (UX/UI Master Skill)

HELEN does not produce standard web pages. It produces digital assets oriented to sales, trust, and perceived quality. `helen-design` is a comprehensive art direction and UI engineering skill that rejects default "AI slop" aesthetics and enforces bespoke, high-performance, and accessible design.

## Execution contract

- Preserve intent, exclusions and authorization. Audit-only stays read-only. Reuse context; ask only for essential unknowns.
- Define observable acceptance, baseline and verification before edits. Verify domain outcomes, compatibility and reproducible CI commands; report unavailable checks and residual risks.
- Inspect → act → verify → re-audit → discover further evidence-backed improvements → repeat. After initial checks, find more actionable improvements without another user request. Apply when authorized, otherwise report. No arbitrary retry cap. Finish when acceptance passes and fresh discovery finds no further actionable improvement within scope, or disclose an external blocker. Change failing hypotheses; respect cancellation and explicit resource limits.
- Start with the cheapest available model when selectable; escalate only for verified failure or unresolved reasoning. State unavailable controls.
- Delegate independent domains to focused specialist agents with exclusive ownership; integrate and verify. Reuse evidence, batch reads, avoid polling and duplicate output. Write concise English instructions; answer in the user's language. Measure tokens/cost; never claim fixed savings or perfection.
## The Anti-Slop & Premium Art Direction Principles

Generative coding tools systematically converge on identical design templates: glowing purple radial gradients, glassmorphism cards, uniform 3-card Bento grids, and buzzword-laden corporate filler. This skill audits and refactors interfaces forensically to detect AI tells and replace them with intentional art direction.

1. **Specific, not interchangeable**: Every choice must come from the brand, audience, and product context. Anything swappable with another brand is suspect.
2. **Forensic Detection of AI Tells**:
   - **Visual**: Eliminate the ubiquitous purple-to-indigo neon blurs, uniform `rounded-2xl` 3-column layouts, floating particle canvas gimmicks, and stacking `backdrop-blur-md` without hierarchy.
   - **Copywriting**: Eliminate inflated vocabulary ("Unleash", "Elevate", "Delve", "Supercharge"), robotic symmetrical tricolons ("Fast. Secure. Reliable."), and fabricated social proof (fake testimonials/jobs).
3. **Bespoke Craft & Tactile Physicality**:
   - Break symmetrical grids with intentional asymmetry and scale.
   - Ground animations in physical reality: spring physics, subtle hover state transitions, and immediate interaction feedback instead of continuous floating loops.
   - Replace fuzzy colored glows with crisp, physical 1px borders or subtle drop shadows with real optical weight.

## Typography & Layout Hierarchy

1. **Hierarchy First**: Check spacing, alignment, typography scale, contrast, density, and interaction feedback before adding decorative effects.
2. **Typographic Point of View**:
   - Choose a typeface pairing with friction and character: an idiosyncratic display font (e.g., bold humanist serif, industrial grotesque) for headlines, paired with a highly legible workhorse for functional UI.
   - Vary typographical rhythm: avoid keeping every heading at `font-semibold` with uniform letter spacing.
3. **Real Responsive Design**: Verify mobile, tablet, and desktop layouts with true responsive scaling, not just breakpoints that prevent overflow.

## Motion, 3D, and Cinematic Effects

1. **Purposeful Motion**: Motion needs a concept and a function (attention, hierarchy, feedback). Decorative motion is the first thing to cut.
2. **Graceful Degradation**: `prefers-reduced-motion` must be respected everywhere. Never add effects that reduce legibility or accessibility.
3. **Native over Heavy Libraries**: Prefer native features (View Transitions API, CSS scroll-driven animations) over heavy JavaScript libraries when they are enough.
4. **Performance Budgets for 3D**: Do not add heavy 3D (Spline, React Three Fiber), shaders, or video scrubbing without a strict performance budget (LCP, INP, total JS, perceived FPS). Isolate 3D components so the rest of the page works without them.

## Accessibility (a11y) & Core Web Vitals

1. **Minimum Accessibility Checks**:
   - Keyboard navigation reaches every interactive element in a sensible order; focus states (`:focus-visible`) are always visible.
   - Color contrast meets WCAG AA standards. The main flow does not depend solely on color or hover states.
   - Semantic HTML (landmarks, correct heading order, `<button>` vs `<a>`), labelled form fields, and `alt` text for content images.
   - Avoid "ARIA theater": Do not add redundant or incorrect ARIA attributes. Prefer native HTML semantics.
2. **Core Performance**:
   - Audit asset and bundle sizes, unnecessary network calls, redundant re-renders, and inefficient loops.
   - Prefer the smallest change that improves perceived speed (loading placeholders, lazy-loaded images, paginated data).
   - No premature micro-optimization without profiling evidence.
## Browser evidence

For affected UI, run Playwright Chromium at 375, 768 and 1440 px. Verify keyboard flow, contrast, reduced motion, interactions, layout overflow and browser errors. Mark blocked checks unverified; do not modify files in audit-only work.
