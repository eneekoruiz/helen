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
| [generate-3d-global-canvas-setup.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/generate-3d-global-canvas-setup.md) | **GENERATE** | Crear setup 3D global: canvas, provider, fallback, rendimiento y reglas de integración. | Media |
| [generate-3d-isolated-experience-component.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/generate-3d-isolated-experience-component.md) | **GENERATE** | Crear escenas, carruseles o showcases 3D aislados sobre el setup existente. | Media |
| [enhance-3d-premium-scene-polish.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/enhance-3d-premium-scene-polish.md) | **ENHANCE** | Pulir escenas 3D existentes sin romper API, responsive, performance ni conversión. | Alta (Si hay 3D) |
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
