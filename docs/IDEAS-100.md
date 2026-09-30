# 104 ideas para llevar HELEN a la perfección y a la máxima agilidad

Informe generado el 2026-09-30 sobre HELEN 2.0.0. Todo parte de lo que existe hoy en el repositorio (CLI, 94 prompts, 15 skills, playbooks, catálogo, evals, módulo `guardrails`). Nada de esto está implementado salvo lo marcado como **[hecho]**.

**Cómo leerlo.** Cada idea lleva número (los usan la tabla y las oleadas) y:
- **Impacto**: Alto / Medio / Bajo (cuánto acelera o protege tu trabajo).
- **Esfuerzo**: S (horas), M (1-2 días), L (varios días).
- Las ideas de la sección 0 son las que haría primero.

**Honestidad sobre los datos.** Las evals actuales tienen 3 casos por skill y un solo juez, así que diferencias menores de 10 puntos son ruido. Donde una idea depende de una herramienta de terceros, hay que verificar su estado antes de recomendarla (el catálogo ya lo exige con `verified`).

---

## 0. Las 10 que haría primero

| Rank | Idea (número en este informe) | Impacto | Esfuerzo |
|---|---|---|---|
| 1 | `helen init-project`: un comando que hace `setup` + `guardrails` + `apply` (idea 4) **[hecho]** | Alto | M |
| 2 | Publicar `helen-cli` en npm con provenance (idea 1) **[hecho]** | Alto | S |
| 3 | Plantilla de repositorio con todo configurado (idea 3) | Alto | M |
| 4 | Evals con 10 casos por skill y 3 ejecuciones (idea 57) **[hecho]** | Alto | M |
| 5 | `helen apply --auto` con parada en cada escritura (idea 14) **[hecho]** | Alto | L |
| 6 | Servidor MCP propio de HELEN (idea 96) **[hecho]** | Alto | L |
| 7 | Release automático con changelog desde commits (idea 81) **[hecho]** | Medio | S |
| 8 | `helen doctor --fix` para lo seguro (idea 13) **[hecho]** | Alto | M |
| 9 | Presupuesto de tokens por prompt (idea 41) **[hecho]** | Medio | S |
| 10 | `helen report`, panel HTML local (idea 93) **[hecho]** | Medio | M |

---|---|---|---|
| 1 | `helen init-project`: un solo comando que hace `setup` + `guardrails` + `apply` y deja el proyecto listo **[hecho]** | Alto | M |
| 2 | Publicar `helen-cli` en npm con provenance para que `npx helen-cli` funcione de verdad **[hecho]** | Alto | S |
| 3 | Plantilla de repositorio (GitHub template) con todo ya configurado | Alto | M |
| 4 | Evals con más casos (10 por skill) y 3 ejecuciones por caso para medir varianza **[hecho]** | Alto | M |
| 5 | `helen apply --auto`: ejecuta los pasos de solo lectura y se para en cada paso que escribe o instala **[hecho]** | Alto | L |
| 6 | Servidor MCP propio de HELEN (`helen mcp`) que expone prompts, playbooks y progreso **[hecho]** | Alto | L |
| 7 | Release automático con changelog desde commits (release-please) **[hecho]** | Medio | S |
| 8 | Comando `helen doctor --fix` que corrige lo seguro (hooks, skills desactualizadas) **[hecho]** | Alto | M |
| 9 | Presupuesto de tokens por prompt visible en `helen token-budget` **[hecho]** | Medio | S |
| 10 | Panel HTML local (`helen report`) con fase, progreso, calidad y salud del proyecto **[hecho]** | Medio | M |

---

## 1. Arranque y distribución (ideas 1-12)

1. **Publicar en npm** con `npm publish --provenance` desde GitHub Actions y una etiqueta de versión. **[hecho]** Workflow `publish.yml` configurado con OIDC. Alto · S.
2. **`npx helen-cli setup` sin instalar nada**: depende de la idea 1. **[hecho]** Bin alias `helen-cli` configurado en `package.json`. Alto · S.
3. **GitHub template repository** con `.githooks`, Dependabot, CI, `AGENTS.md` y skills ya instalados: "Use this template" y empiezas. Alto · M.
4. **`helen init-project <nombre>`** que encadena `create`, `setup`, `add guardrails`, `apply strategy --track`. **[hecho]** Idempotente con `--dry-run`, `--json`, `--goal`. Alto · M.
5. **Script de instalación de una línea con checksum**: `curl` a una versión fijada con hash publicado. Siempre fijado, nunca la rama. Medio · S.
6. **Homebrew tap** para `brew install helen`. Bajo · M.
7. **Imagen Docker `helen`** para ejecutarlo en CI sin instalar Node. Bajo · S.
8. **Extensión de `helen setup --global`** que instala las skills a nivel usuario (`~/.claude/skills`, `~/.gemini/config/skills/`) además de proyecto. Medio · S.
9. **Detección automática del agente instalado** (existe `claude`, `codex`, `gemini`...) para sugerir `--target`. Medio · S.
10. **`helen uninstall`** que quita skills y el bloque `HELEN:START/END` de forma limpia. Medio · S.
11. **Versionado de skills** (campo `version` en el frontmatter) para que `skills update` muestre qué cambió. Medio · S.
12. **Plugin de Claude Code** empaquetado (`/plugin install helen`) que trae skills y comandos. Alto · M.

## 2. Núcleo del CLI (13-28)

13. **`helen doctor --fix`** con confirmación: activa hooks, actualiza skills, crea el bloque en `AGENTS.md`. **[hecho]** Implementado con reparación segura de hooks, dependabot, skills y .helenrc. Alto · M.
14. **`helen apply --auto`**: ejecuta pasos de lectura (auditorías) y se detiene ante escritura, instalación o gasto. **[hecho]** Modo semi-autónomo con validación automática de checkpoints. Alto · L.
15. **`helen apply --resume`** que retoma el plan aunque haya cambiado de rama. Medio · S.
16. **Planes en paralelo**: varias metas trackeadas a la vez (`.helen/plans/<meta>.json`). Medio · M.
17. **`helen undo`** que revierte el último paso hecho usando un commit por paso. Medio · L.
18. **Un commit por paso** opcional (`--commit-steps`) con mensaje estándar y referencia al prompt. Medio · M.
19. **`helen diff`**: muestra qué cambió desde el último `helen check`. Bajo · S.
20. **`helen explain <prompt>`**: resumen de 5 líneas de qué hace, cuándo usarlo y cuánto cuesta en tokens. Medio · S.
21. **Autocompletado de shell** (bash, zsh, fish) para ids de prompts, metas y skills. Medio · S.
22. **Salida `--json`** en todos los comandos para que otras herramientas y agentes la lean sin parsear texto. **[hecho]** Envolvente estándar `{ ok, command, data, warnings, errors }` con logs a stderr. Alto · M.
23. **Códigos de salida documentados** (0 ok, 1 error, 2 aviso, 3 checkpoint fallido). **[hecho]** Implementados y cubiertos por tests. Bajo · S.
24. **`helen config`** (`.helenrc` con idioma, agentes por defecto, metas favoritas, ruta de prompts propios). Medio · M.
25. **Prompts propios del usuario** (`.helen/prompts/`) que pasan el mismo `lint` y se mezclan con los de HELEN. Alto · M.
26. **Playbooks propios** (`.helen/playbooks.json`) que extienden los incluidos. Alto · S.
27. **Modo `--offline`** que garantiza que nada sale a la red (ni catálogo ni actualizaciones). Bajo · S.
28. **Telemetría: ninguna**. Documentarlo explícitamente en el README como garantía. Bajo · S.

## 3. Detección de fase y `helen apply` (29-40)

29. **Más señales de fase**: cobertura de tests, presencia de Sentry, Lighthouse en CI, licencia, `SECURITY.md`. Medio · M.
30. **Puntuación por fase** (0-100) con desglose, no solo "estás en la fase 03". Medio · M.
31. **Detección de stack** (Next, Astro, Remix, SvelteKit, Vue) para elegir prompts y comandos correctos. Alto · M.
32. **Detección de monorepo** (pnpm workspaces, turbo, nx) y planes por paquete. Medio · L.
33. **Sugerencia proactiva**: `helen apply` sin meta ordena las metas por impacto estimado. Medio · S.
34. **Explicación de por qué**: cada paso del plan muestra la evidencia que lo motiva. Medio · S.
35. **Estimación de tiempo y tokens por meta**, basada en el tamaño de los prompts. Medio · S.
36. **Metas compuestas**: `helen apply launch` = qa + seo-legal + security + release. Alto · S.
37. **Metas por tipo de proyecto**: `landing`, `saas`, `portfolio`, `ecommerce`, `docs-site`. Alto · M.
38. **Perfiles**: `--profile solo | team | client` cambian el rigor y las puertas. Medio · M.
39. **Punto de reanudación entre sesiones de IA**: `helen brief --since <fecha>` resume lo hecho. Alto · S.
40. **Plantilla de "estado del proyecto"** (`.helen/STATE.md`) que la IA lee al empezar. Alto · S.

## 4. Biblioteca de prompts (41-56)

41. **Presupuesto de tokens por prompt** en el frontmatter o vía `helen token-budget`. **[hecho]** Comando `helen token-budget` con cálculo de tokens y estimación de coste multidivisa y multimodel (Gemini, Claude, GPT-4o). Medio · S.
42. **Límite de tamaño en `lint`** (por ejemplo 2 000 palabras) para mantener los prompts ágiles. Medio · S.
43. **Ejemplos de salida esperada** (`## Example output`) en los 15 prompts más usados. Medio · M.
44. **Variables en prompts** (`{{project_name}}`, `{{stack}}`) rellenadas por `helen prompts show --fill`. Medio · M.
45. **Prompts por stack** (variantes Next, Astro, Vue) seleccionadas automáticamente. Alto · L.
46. **Tabla de solapamiento**: `helen prompts overlaps` lista pares con contenido casi duplicado (DRY continuo). Medio · M.
47. **Prompts de "corrección"** (`fix-*`) además de auditoría: auditar y luego arreglar con un solo flujo. Alto · L.
48. **Registro de cambios por prompt** (`changed:` en frontmatter) para saber qué prompts cambiaron entre versiones. Bajo · S.
49. **Etiquetas de coste** (`cost: low | medium | high`) según cuántos archivos toca y cuántas herramientas usa. Medio · S.
50. **Prompts de seguridad para agentes**: revisión de inyección de instrucciones en contenido externo (README, issues, páginas web). Alto · M.
51. **Prompt de "explica este repositorio en 10 minutos"** para incorporar a alguien (o a una IA) rápido. Alto · S.
52. **Prompt de migración** (React 18→19, Vite majors, Tailwind 3→4) con lista de cambios y pruebas. Medio · M.
53. **Prompts de accesibilidad por componente** (formulario, modal, tabla, navegación) más específicos que el general. Medio · M.
54. **Prompts de rendimiento con medición** (Lighthouse CI, bundle analyzer) con umbrales concretos. Alto · M.
55. **Prompt de "deuda técnica"** que produce backlog priorizado con esfuerzo y riesgo. Medio · S.
56. **Traducción del contenido de salida**: prompts en inglés, pero con `--reply-lang es` para que la IA conteste en tu idioma sin traducir el prompt. Medio · S.

## 5. Skills (57-70)

57. **10 casos por skill y 3 ejecuciones** en las evals para separar señal de ruido. **[hecho]** Runner ampliado a 90 casos totales con `--runs N`, intervalos t-Student y detección de ruido. Alto · M.
58. **Evals de "no activar"**: casos donde la skill NO debe cargarse (falsos positivos). **[hecho]** Soporte de `expectTrigger: false` y cálculo de tasa de falsos positivos. Medio · S.
59. **Evals de seguridad de las propias skills**: que no impriman secretos ni ejecuten sin permiso. Alto · M.
60. **Descripciones optimizadas por bucle**: probar 3-5 redacciones y quedarse con la que más se activa. **[hecho]** Optimizadas descripciones con frases reales de usuario en todas las skills con baja activación. Alto · M.
61. **Skills más pequeñas y con referencias** (progressive disclosure): mover tablas largas a `references/`. Medio · S.
62. **Skill `helen-review`** que revisa un diff contra las reglas de HELEN antes de un PR. Alto · M.
63. **Skill `helen-onboarding`**: guía a una persona nueva por el repositorio. Medio · S.
64. **Skill `helen-migration`** para actualizaciones mayores de dependencias. Medio · M.
65. **Skill `helen-content`** (blog, docs, changelogs) separada de copy/CRO. Bajo · S.
66. **Skill `helen-analytics`** (eventos, embudos, privacidad) ligada a `audit-growth-and-metrics`. Medio · S.
67. **Skill `helen-mobile`** (PWA, capacitor, rendimiento móvil). Bajo · M.
68. **Scripts dentro de skills** (validadores deterministas) para comprobar cosas sin gastar tokens. Alto · M.
69. **Plantillas dentro de skills** (`assets/`): `DESIGN.md`, ADR, runbook listos para rellenar. Alto · S.
70. **Compatibilidad verificada por agente**: tabla de qué campos del frontmatter respeta cada agente, con fecha. Medio · S.

## 6. Catálogo y recursos externos (71-80)

71. **`helen skills catalog --check`**: comprueba que los enlaces siguen vivos y avisa de repositorios archivados. Alto · M.
72. **Fijado de versiones** (`pinned:` con hash de commit) en cada entrada instalable. Alto · S.
73. **Puntuación de confianza** (licencia, actividad, mantenimiento, número de mantenedores). Medio · M.
74. **Comparador**: `helen skills compare taste-skill impeccable` con solapamientos. Medio · S.
75. **Recetas de combinación** aprobadas ("diseño: una skill principal + web-design-guidelines + playwright-cli"). Medio · S.
76. **Más referencias visuales** (portfolios, sistemas de diseño, bibliotecas de animación) con criterio de "qué estudiar". Medio · S.
77. **Sección de recursos por meta**: cada meta enlaza a 3-5 lecturas y herramientas de confianza. Medio · M.
78. **Importar entradas desde un `catalog.json` remoto propio** (tu lista personal versionada). Bajo · M.
79. **Alertas de descontinuados**: `doctor` avisa si algo instalado pasó a `discontinued`. Medio · S.
80. **Auditoría de MCP instalados**: lista servidores configurados, permisos y si tienen secretos incrustados (ya existe la parte de secretos) con puntuación. Alto · M.

## 7. Calidad, CI y seguridad del repositorio (81-92)

81. **Release automático** con release-please: changelog y etiquetas desde commits. **[hecho]** Configurado `.github/workflows/release-please.yml`, `release-please-config.json` y `.release-please-manifest.json`. Medio · S.
82. **CodeQL** y **secret scanning** activados en el repositorio. Alto · S.
83. **`SECURITY.md`** con política de divulgación y versiones soportadas. **[hecho]** Añadido `SECURITY.md` en la raíz del repositorio. Medio · S.
84. **Renovate o Dependabot con auto-merge solo para parches** con CI verde. Medio · S. (La parte de Dependabot **[hecho]**.)
85. **Tests de humo por sistema operativo** (Linux, macOS, Windows) en CI. Alto · M.
86. **Tests de instantáneas** de la salida de `apply` y `next` para detectar cambios accidentales. Medio · S.
87. **Cobertura de código** con umbral mínimo en CI. Medio · S.
88. **Job semanal de evals** en CI (con clave de API) que abre una incidencia si baja la calidad. Alto · M.
89. **Comprobación de enlaces externos** en los documentos, semanal. Medio · S.
90. **Firma de commits y etiquetas** (sigstore o GPG) y SBOM en cada release. Medio · M.
91. **`.editorconfig` y Prettier aplicados** a todo el repositorio (hoy hay 66 archivos con estilo distinto). Medio · S.
92. **Hooks de commit por convención** (Conventional Commits) comprobados en `commit-msg`. Bajo · S.

## 8. Experiencia para humanos y para IAs (93-100+)

93. **`helen report`**: informe HTML local con fase, progreso, salud, calidad de skills y siguientes pasos. **[hecho]** Generador de dashboard interactivo `.helen/report.html` y resumen JSON. Medio · M.
94. **Menú interactivo mejorado** (`helen` sin argumentos) con "qué quieres hacer hoy" y atajos. Medio · S.
95. **Modo "explícame"** (`--explain`): cada comando cuenta qué hizo y por qué, para aprender. Medio · S.
96. **Servidor MCP de HELEN** (`helen mcp`): expone `apply`, `next`, `done`, `prompts show` como herramientas para cualquier agente. **[hecho]** Servidor stdio JSON-RPC 2.0 nativo con herramientas de ciclo de vida completo. Alto · L.
97. **Comandos de barra para Claude Code** (`/helen-apply`, `/helen-next`, `/helen-check`) empaquetados. Alto · S.
98. **Reglas para Cursor y Copilot** generadas a partir de las mismas fuentes (`.cursor/rules`, `.github/copilot-instructions.md`). Medio · S.
99. **Documentación como sitio** (Docusaurus, Starlight o VitePress) generado desde `docs/`, con búsqueda. Medio · M.
100. **Vídeo o GIF de 60 s** en el README que muestre `setup` → `apply` → `next` → `done`. Alto · S.
101. **Glosario** de términos (prompt, flow, checkpoint, skill, playbook, MCP) en una página de una pantalla. Medio · S.
102. **Ejemplos completos** (`examples/landing`, `examples/saas`) con el historial de un plan real. Alto · M.
103. **Página de comparación honesta** con GSD, ECC y otras herramientas: cuándo usar cada una. Medio · S.
104. **Modo de trabajo autónomo seguro** (`AUTONOMY.md`): qué puede hacer la IA sin preguntar, qué necesita permiso, y cómo se registra. Alto · M.

---

## Lo que NO haría (por ahora)

- **Un servicio en la nube de HELEN**: añade cuentas, coste y riesgo de datos sin aportar nada que el repositorio no haga ya.
- **Instalar herramientas de terceros automáticamente**: rompe la regla central de seguridad.
- **Más prompts por acumulación**: la biblioteca ya está consolidada (131 → 94). Cada prompt nuevo debe pasar por `helen prompts overlaps` (idea 46).
- **Mezclar varias skills de diseño principales**: se solapan y se contradicen; el catálogo ya recomienda una sola.
- **Depender de un solo agente**: cualquier mejora debe funcionar en Claude Code, Codex y Antigravity.

## Orden sugerido en tres oleadas

**Oleada 1: hacerlo instalable y fiable (1-2 semanas).** Ideas 1, 2, 3, 4, 81, 82, 83, 91, 97, 100, 22, 13.

**Oleada 2: hacerlo medible y ágil (2-4 semanas).** Ideas 57, 58, 60, 88, 41, 42, 46, 25, 26, 36, 37, 39, 40, 71, 72.

**Oleada 3: hacerlo autónomo y conectado (1-2 meses).** Ideas 14, 96, 45, 47, 62, 68, 80, 85, 93, 99, 104.

## Mi recomendación

Si solo pudieras hacer cinco cosas: **publicar en npm (1)**, **la plantilla de repositorio (3)**, **más evals con varianza (57)**, **`--json` en todos los comandos (22)** y **el servidor MCP de HELEN (96)**. Las dos primeras hacen que cualquiera lo use en un minuto; la tercera te dice con datos si las skills valen la pena; las dos últimas hacen que cualquier agente conduzca HELEN sin leer texto.
