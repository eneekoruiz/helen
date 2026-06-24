# Fase 3: Finish Features (Refinar y Pulir Interfaces)

**Objetivo de la fase**:
Elevar la experiencia de usuario (UX) e interfaz (UI) de un estado puramente funcional a uno premium y altamente pulido. Asegurar la excelencia visual, responsive, accesibilidad y rendimiento básico.

**Cuándo se utiliza**:
- Cuando las funcionalidades principales de la iteración ya están operativas.
- Antes de iniciar pruebas adversarial o endurecimiento final.
- Al final de etapas de diseño y maquetación de frontend.

**Qué problemas resuelve**:
- Interfaces de usuario genéricas, toscas, saturadas o que se sienten incompletas.
- Ausencia de feedback del sistema (estados de carga, error, vacío o confirmaciones).
- Errores de responsive y visual jumps en múltiples resoluciones de pantalla.
- Barreras de accesibilidad y degradación del rendimiento de renderizado inicial.

---

## Diferencia Operativa de Etiquetas

- **GENERATE**: crea una pieza visual nueva, como setup 3D global o componente aislado.
- **ENHANCE/APPLY**: pule una interfaz o escena existente sin romper contratos ni flujos.
- **AUDIT**: evalúa UX, visual craft o regresiones sin modificar código.
- **INIT**: no se usa aquí; la base estratégica debe venir de Start Project.

## Prompts Incluidos en esta Fase

| Prompt / Flow / Checkpoint | Intención | Propósito / Cuándo usarlo | Frecuencia |
|---|---|---|---|
| [generate-3d-global-canvas-setup.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/3d/generate-3d-global-canvas-setup.md) | **GENERATE** | Crear setup 3D global: canvas, provider, fallback, rendimiento y reglas de integración. | Media |
| [generate-3d-isolated-experience-component.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/3d/generate-3d-isolated-experience-component.md) | **GENERATE** | Crear escenas, carruseles o showcases 3D aislados sobre el setup existente. | Media |
| [enhance-3d-premium-scene-polish.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/3d/enhance-3d-premium-scene-polish.md) | **ENHANCE** | Pulir escenas 3D existentes sin romper API, responsive, performance ni conversión. | Alta (Si hay 3D) |
| [product-ux-and-premium-quality-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/product-ux-and-premium-quality-audit.md) | **AUDIT** | Auditoría integral del feeling premium y la usabilidad de la UI/CLI. | Alta |
| [onboarding-activation-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/onboarding-activation-audit.md) | **AUDIT** | Optimizar los primeros minutos de uso y la conversión del usuario. | Media |
| [empty-states-errors-and-microcopy.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/empty-states-errors-and-microcopy.md) | **APPLY** | Implementar/mejorar pantallas vacías, cargas, errores y microcopys. | Alta |
| [premium-detail-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/premium-detail-pass.md) | **APPLY** | Pulido microscópico de detalles visuales, micro-interacciones y copy. | Alta |
| [product-design-and-awards-visual-excellence-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/product-design-and-awards-visual-excellence-audit.md) | **AUDIT** | Análisis estético bajo criterios del nivel Awwwards/SOTY. | Media |
| [primary-user-experience-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/primary-user-experience-audit.md) | **AUDIT** | Auditar los flujos principales del usuario de extremo a extremo. | Alta |
| [premium-visual-polish-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/premium-visual-polish-pass.md) | **APPLY** | Aplicar sombras, gradientes, tipografía premium y espaciados armoniosos. | Alta |
| [responsive-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/responsive-pass.md) | **APPLY** | Corregir roturas de diseño a lo largo de breakpoints móviles y desktop. | Alta |
| [basic-accessibility-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/basic-accessibility-pass.md) | **APPLY** | Mejorar semántica, focos de teclado y compatibilidad con lectores de pantalla. | Media |
| [basic-performance-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/basic-performance-pass.md) | **APPLY** | Optimizar assets, lazy loadings y evitar renders redundantes. | Media |
| [ux-visual-pass-flow.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/ux-visual-pass-flow.md) | **APPLY flow** | Flujo compuesto centrado en pulir visualmente y resolver responsive. | Media |
| [awwwards-soty-design-review-flow.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/awwwards-soty-design-review-flow.md) | **AUDIT/APPLY flow** | Flujo completo de craft estético y revisión de visual excellence. | Media |
| [full-polish-flow.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/full-polish-flow.md) | **APPLY flow** | El flujo más amplio de refinamiento UX, visual, responsive y verificación. | Alta |
| [visual-ux-regression-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/visual-ux-regression-checkpoint.md) | **Checkpoint** | Validar que no hay roturas visuales ni regresiones tras los cambios. | Alta |

---

## Checklist de Transición: ¿Ya estoy preparado para pasar a la siguiente fase?

Antes de pasar a la fase de **Before Production (04-before-production)**, asegúrate de responder afirmativamente a las siguientes preguntas:

- [ ] ¿Los flujos principales de la interfaz funcionan sin bloqueos ergonómicos?
- [ ] ¿El diseño es responsive en móviles, tablets y monitores de escritorio?
- [ ] ¿Están implementados todos los estados vacíos (empty), de carga (loading) y de error (error)?
- [ ] ¿Se ha superado el `visual-ux-regression-checkpoint` con éxito?

**Siguiente Fase**:
Si la respuesta es **Sí** a todas las anteriores, estás listo para entrar en la fase **[04-before-production](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/04-before-production/README.md)**.

---

## Ecosistema 40K Ultra Premium

Usa primero [`../[INIT] Director Creativo (Orquestador 40K).md`](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/%5BINIT%5D%20Director%20Creativo%20(Orquestador%2040K).md) cuando el proyecto requiera una estrategia visual profunda antes de implementar.

| Prompt | Intencion | Uso |
|---|---|---|
| [apply-40k-visual-craft-flow.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/apply-40k-visual-craft-flow.md) | **APPLY flow** | Flujo completo y orquestador de ejecución para interfaces €100k+ Awwwards. |
| [audit-ux-strategist-core.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/audit-ux-strategist-core.md) | **AUDIT** | Evaluar targets táctiles, flujos de error, contraste WCAG y estados vacíos. |
| [enhance-taste-visual-pov.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/enhance-taste-visual-pov.md) | **ENHANCE** | Inyectar paleta CSS HSL curada, jerarquía tipográfica editorial y taste real. |
| [generate-premium-web-artifacts.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/generate-premium-web-artifacts.md) | **GENERATE** | Crear bloques interactivos premium (pricing, toggles, bento grids) listos para producción. |
| [enhance-motion-polish-and-transitions.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/enhance-motion-polish-and-transitions.md) | **ENHANCE** | Añadir transiciones dinámicas (escala, opacidad, easing) en modales y dropdowns. |
| [enhance-scroll-linked-sequences.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/enhance-scroll-linked-sequences.md) | **ENHANCE** | Integrar secuencias animadas al scroll (scrubbing timeline, GSAP, Lenis). |
| [enhance-native-view-transitions.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/enhance-native-view-transitions.md) | **ENHANCE** | Implementar la API de View Transitions nativa del navegador con la máscara clip-path. |
| [enhance-dynamic-typography-pretext.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/enhance-dynamic-typography-pretext.md) | **ENHANCE** | Pretexting off-DOM y layouts de revista con flujo de texto alrededor de 3D. |
| [generate-webgpu-shaders.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/generate-webgpu-shaders.md) | **GENERATE** | Crear canvas WebGPU/WebGL interactivos con shaders líquidos y de ruido. |
| [generate-app-store-canvas-exports.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/generate-app-store-canvas-exports.md) | **GENERATE** | Desarrollar herramienta Canvas de exportación automatizada de capturas de marketing. |
| [generate-modern-ui-libraries-aceternity-magic-ui.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/generate-modern-ui-libraries-aceternity-magic-ui.md) | **GENERATE** | Integrar componentes modernos de catálogo (Aceternity UI, Magic UI) adaptando tokens. |
| [audit-animation-performance-and-fps.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/audit-animation-performance-and-fps.md) | **AUDIT** | Evaluar estabilidad de fotogramas, cuellos de botella y Cumulative Layout Shift (CLS). |
| [enhance-ui-audio-micro-feedback.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/enhance-ui-audio-micro-feedback.md) | **ENHANCE** | Añadir haptics y micro-feedback auditivo con osciladores Web Audio y mute. |
| [generate-webgpu-shader-experience.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/generate-webgpu-shader-experience.md) | **GENERATE** | Shaders WebGPU/WebGL con fallback y presupuesto de rendimiento. |
| [generate-premium-mockup-layout-system.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/generate-premium-mockup-layout-system.md) | **GENERATE** | Mockups high-end tipo ls.graphics dentro del layout. |
| [generate-scroll-video-scrubbing-sequence.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/generate-scroll-video-scrubbing-sequence.md) | **GENERATE** | Secuencias scroll/video con GSAP ScrollTrigger, Lenis, canvas o video scrubbing. |
| [generate-view-transition-state-system.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/generate-view-transition-state-system.md) | **GENERATE** | Transiciones de tema, pagina y estado con View Transitions API. |
| [generate-premium-component-library-integration.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/generate-premium-component-library-integration.md) | **GENERATE** | Aceternity, Magic UI, Motion Primitives, shadcn u otras librerías sin rastro de plantilla. |
| [generate-conversion-led-hero-system.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/generate-conversion-led-hero-system.md) | **GENERATE** | Heroes premium con promesa, prueba visual, confianza y CTA. |
| [generate-editorial-art-direction-system.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/generate-editorial-art-direction-system.md) | **GENERATE** | Direccion editorial: grilla, ritmo, imagen, copy visual y jerarquia. |
| [generate-immersive-product-configurator.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/generate-immersive-product-configurator.md) | **GENERATE** | Configuradores, simuladores o demos interactivas que prueban valor antes de comprar. |
| [generate-ai-personalized-landing-flow.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/generate-ai-personalized-landing-flow.md) | **GENERATE** | Landings personalizadas por segmento, fuente o intención con reglas responsables. |
| [enhance-cinematic-loading-and-page-transition-polish.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/enhance-cinematic-loading-and-page-transition-polish.md) | **ENHANCE** | Loaders, rutas y cambios de estado como momentos premium breves. |
| [enhance-cro-friction-removal-and-cta-depth.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/enhance-cro-friction-removal-and-cta-depth.md) | **ENHANCE** | Friccion, CTAs, objeciónes, formularios y medicion. |
| [enhance-microinteraction-sensory-detail-pass.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/enhance-microinteraction-sensory-detail-pass.md) | **ENHANCE** | Botones, inputs, cards, menús, hover/focus y feedback sensorial. |
| [audit-40k-creative-direction-and-conversion.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/audit-40k-creative-direction-and-conversion.md) | **AUDIT** | Veredicto 40K sobre direccion creativa, conversion, craft y diferenciacion. |
| [audit-performance-budget-for-cinematic-sites.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/audit-performance-budget-for-cinematic-sites.md) | **AUDIT** | Presupuestos de rendimiento para webs con 3D, shaders, video y motion. |
| [audit-ai-trace-erasure-and-human-craft.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/audit-ai-trace-erasure-and-human-craft.md) | **AUDIT** | Rastros de IA, plantilla, claims genericos y falta de autoria humana. |
| [3d/generate-3d-motion-templates.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/3d/generate-3d-motion-templates.md) | **GENERATE** | Setup de cámara cinemática, iluminación bokeh y layouts 3D interactivos. |
| [3d/generate-3d-spline-vs-react-three-fiber.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/3d/generate-3d-spline-vs-react-three-fiber.md) | **GENERATE** | Tomar decisión e implementar Spline (no-code 3D) vs React Three Fiber (código nativo). |
| [3d/generate-integrated-premium-mockups.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/3d/generate-integrated-premium-mockups.md) | **GENERATE** | Integrar mockups tridimensionales o vectoriales interactivos de dispositivos en la web. |
| [3d/generate-motion-template-asset-system.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/3d/generate-motion-template-asset-system.md) | **GENERATE** | Assets 3D y motion templates inspirados en benchmarks premium tipo ContentCore. |
| [3d/generate-spline-rapid-interactive-embed.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/3d/generate-spline-rapid-interactive-embed.md) | **GENERATE** | Spline para experiencias 3D rapidas, acotadas y conversionales. |
| [3d/generate-3d-react-fiber-premium-architecture.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/3d/generate-3d-react-fiber-premium-architecture.md) | **GENERATE** | Arquitectura 3D custom con React Three Fiber y Drei. |

