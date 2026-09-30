# Guía de HELEN: qué hay, en qué se diferencia y cómo se usa

HELEN es un repositorio con **tres capas** más un **cerebro** que las conecta:

| Pieza | Qué es | Analogía | Dónde está |
|---|---|---|---|
| **Prompt** | Una instrucción para *una tarea concreta* (auditar SEO, pulir responsive...) | Una receta | `docs/prompts/<fase>/...` |
| **Flow** | Un prompt que encadena varios prompts y checkpoints en orden | Un menú completo | `docs/prompts/*/flow/...` |
| **Checkpoint** | Una puerta: si falla (build, tests, seguridad), no se avanza | Un control de calidad | `docs/prompts/*/checkpoint/...` |
| **Skill** | Conocimiento *permanente* que el agente carga solo cuando la tarea encaja (carpeta con `SKILL.md`) | La formación del cocinero | `skills/<nombre>/SKILL.md` |
| **Catálogo** | Herramientas y skills **de terceros** recomendadas, con comandos y avisos | La lista de proveedores | `skills/catalog.json` |
| **Playbook** | "Para conseguir X, haz estos pasos en este orden" (mezcla prompts, skills y herramientas) | El plan del día | `docs/prompts/playbooks.json` |
| **`helen apply`** | El cerebro: detecta la fase del proyecto y aplica el playbook que toque | El jefe de cocina | CLI y skill `helen-apply` |

**Diferencia clave.** Un *prompt* es una tarea que se ejecuta una vez y sigue una fase. Una *skill* es criterio que el agente reutiliza siempre que la tarea coincide (no tiene fase). Un *playbook* decide cuáles usar y en qué orden.

## 1. Dónde ver lo que hay

| Quieres ver... | Comando |
|---|---|
| Todos los prompts, flows y checkpoints | `helen prompts list` (filtra con `--kind flow`) |
| Leer uno | `helen prompts show <id>` |
| Las skills propias de HELEN | `helen skills list` (con `--flows` incluye cada flow como skill) |
| Herramientas de terceros recomendadas | `helen skills catalog` (filtra con `--category design`) |
| Detalle y comandos de una herramienta | `helen skills external <id>` (solo muestra, no instala) |
| Qué skills tiene ya instaladas este proyecto | `helen skills installed` |
| Cómo va el plan en curso | `helen status` |
| En qué fase estás y qué te conviene | `helen apply` |
| Todas las metas disponibles | `helen apply` (sin argumentos) |
| Validar la biblioteca | `helen prompts lint` |

## 2. Cómo se instala

**HELEN (desde el repositorio):**

```bash
git clone https://github.com/eneekoruiz/helen && cd helen
npm install && npm run build
node dist/cli.js --help      # o: npm link  y luego simplemente: helen --help
```

(`npx helen-cli ...` solo funciona si el paquete está publicado en npm; desde el clon siempre funciona.)

**Lo más fácil: un solo comando dentro del proyecto donde trabajas.**

```bash
helen setup                     # skills para Claude, Codex y Antigravity + instrucciones en AGENTS.md y CLAUDE.md
helen setup --agents claude     # solo para un agente
helen setup --dry-run           # ver qué haría sin escribir
```

`helen setup` instala las skills y añade un bloque corto entre marcas `HELEN:START/END` en `AGENTS.md` (y `CLAUDE.md`) que enseña a cualquier IA a usar HELEN. Es repetible: solo reescribe su bloque y respeta el resto del archivo. Con eso, cualquier agente que lea `AGENTS.md` sabe qué hacer aunque no cargue skills.

**Control fino de las skills:**

```bash
helen skills install --target claude codex antigravity   # todas las skills propias
helen skills install helen-apply helen-router --target claude   # solo algunas
helen skills install --target custom --dir <carpeta>     # cualquier otro agente, con su carpeta
helen skills install --target claude --flows             # además, cada flow como skill (helen-flow-<id>)
helen skills installed                                   # comprobar
```

| Agente | Carpeta de skills del proyecto | Fuente |
|---|---|---|
| Claude Code | `.claude/skills/` | convención de Claude Code |
| Codex | `.agents/skills/` | documentación de Codex |
| Antigravity | `.agents/skills/` (la misma que Codex) | codelab oficial de Google Antigravity; en Antigravity las skills globales van en `~/.gemini/config/skills/` |

Material antiguo de Antigravity habla de `.agent/skills/`: si tu versión lo usa, `--target custom --dir .agent/skills`. Añade `--dry-run` para ver qué haría; no pisa archivos existentes salvo con `--force`.

**Herramientas de terceros:** HELEN **nunca** las instala por ti. `helen skills external <id>` te enseña los comandos oficiales; los ejecutas tú después de revisarlos (ver secciones 7 y 8).

## 3. Uso básico: tres formas, de más a menos automática

**A) Con tu IA (lo más cómodo).** Instala `helen-apply` en el proyecto y di:

- "Usa HELEN: analiza en qué punto está el proyecto y dime qué aplicarías."
- "Usa HELEN y aplica todas las mejoras de diseño."
- "Usa HELEN para dejar esto listo para publicar."

La IA detecta la fase, elige la meta, sigue el playbook, usa las skills pertinentes y **te pide permiso antes de instalar nada externo**.

**B) Con el CLI.**

```bash
helen apply                    # fase detectada + metas sugeridas
helen apply design             # plan de diseño: pasos, skills, herramientas
helen apply "mejora el diseño" # también entiende frases (español o inglés)
helen apply design --install   # instala las skills propias que falten
helen apply design --brief     # texto listo para pegar en cualquier IA
helen apply design --track     # seguir el plan paso a paso (ver abajo)
```

**Seguimiento paso a paso (`--track`)**: guarda el progreso en `.helen/progress.json`.

| Comando | Qué hace |
|---|---|
| `helen next` | Muestra el paso actual con todo lo necesario (texto del prompt, o comandos y avisos si es una herramienta externa) |
| `helen done "qué hice"` | Marca el paso como hecho y avanza |
| `helen skip "motivo"` | Salta el paso y guarda el motivo |
| `helen check` | Ejecuta `typecheck`, `lint`, `test` y `build` del proyecto (los que existan) |
| `helen status` | Muestra el avance |

Los pasos de tipo *checkpoint* no se pueden dar por hechos hasta que `helen check` pase (salvo `--force` con nota). Una IA puede llevar todo el proceso solo con `helen next` / `helen done`.

**C) Manual.** Elige un prompt con `helen prompts list` o las "Quick decisions" del README de la fase y ejecútalo con `helen prompts show <id>`.

## 4. Las fases del proyecto

| Fase | Para qué | Metas típicas |
|---|---|---|
| 01-start-project | Empezar, riesgos, mercado, base visual | strategy, design |
| 02-building | Construir con calidad | quality, security, data, autonomy |
| 03-finish-features | Pulir UX, visual, motion | design, copy, motion, quality |
| 04-before-production | QA, escala, privacidad | qa, security, seo-legal |
| 05-final-audit | Auditoría final | quality, seo-legal, knowledge |
| 06-release | Release candidate y publicar | release, deploy |
| 07-client-handoff | Entrega al cliente | handoff, copy |
| 08-maintenance | Mantener la biblioteca y las skills | knowledge, safe-install |
| 09-future-knowledge | Que el proyecto sobreviva a ti | knowledge |

La fase detectada por `helen apply` es una **estimación** basada en archivos (package.json, tests, CI, CHANGELOG, despliegue). Confírmala.

## 5. Metas (lo que puedes pedir)

`design`, `copy`, `motion`, `quality`, `security`, `seo-legal`, `qa`, `release`, `deploy`, `handoff`, `strategy`, `data`, `knowledge`, `autonomy`, `connect-tools`, `safe-install`. Cada una está definida en `docs/prompts/playbooks.json` con sus pasos.

## 6. Skills propias incluidas

| Skill | Sirve para |
|---|---|
| helen-apply | Punto de entrada: detecta fase y aplica la meta |
| helen-router | Solo saber en qué fase estás |
| helen-clean-code | Refactor seguro, cero código muerto |
| helen-premium-design | Diseño premium y anti-plantilla (+ vocabulario y patrones de layout) |
| helen-a11y-perf | Accesibilidad y rendimiento |
| helen-copy-cro | Textos, claims y conversión |
| helen-motion-3d | Animación, scroll, 3D con presupuesto |
| helen-security | Secretos, inyecciones, dependencias |
| helen-seo-compliance | SEO, i18n, privacidad |
| helen-qa-scale | QA adversarial, escala, observabilidad |
| helen-release | Release candidate |
| helen-client-handoff | Entrega a cliente |
| helen-strategy | Benchmark, roadmap, ROI |
| helen-data-api | Contratos de API y modelo de datos |
| helen-knowledge | ADRs, contexto para IA, runbook |

## 7. Herramientas de terceros (catálogo) y seguridad

`helen skills catalog` lista, entre otras: taste-skill, impeccable, ui-ux-pro-max, image-to-code (diseño); web-design-guidelines (calidad); humanizer, cro-optimization (textos); scroll-craft, transitions-dev, 21st-dev, animos-app (motion y componentes); playwright-cli (que el agente vea la página); google-design-md, awesome-design-md, godly, deck-gallery, inspiration-sources (referencias); gsd-core, ralph-loop, coderabbit (flujo de agente); seo; github-cli y hosting (publicar).

Cada entrada tiene **estado**: `active`, `caution` (léelo antes) o `discontinued` (no instalar, p. ej. Roo Code).

Reglas:

1. Una skill ejecuta instrucciones y a veces scripts con tus permisos: revísala con el prompt `audit-third-party-tools-and-mcp` antes de instalarla.
2. Usa **una sola** skill de diseño principal (taste-skill, impeccable o ui-ux-pro-max).
3. Instala solo la skill que necesitas, no repositorios enteros; evita `curl ... | sh` a ciegas.
4. Los comandos del catálogo salen del README de cada proyecto en el momento de la verificación: compruébalos antes de ejecutarlos.

## 8. Servidores MCP (conectar herramientas a la IA)

Un **servidor MCP** es un programa o servicio remoto que da a tu IA herramientas reales: abrir un navegador, leer tu GitHub, ver logs de Vercel, consultar tu base de datos. Diferencias:

| | Skill | Servidor MCP |
|---|---|---|
| Qué aporta | Conocimiento e instrucciones | Herramientas que actúan |
| Riesgo | Instrucciones y scripts que lee la IA | Acceso real a tus cuentas y tokens |
| Dónde se ve en HELEN | `helen skills list` | `helen skills catalog --kind mcp` |

Incluidos en el catálogo: `playwright-mcp` y `chrome-devtools-mcp` (ver y medir la web), `context7` (documentación actual), `github-mcp`, `vercel-mcp` y `supabase-mcp`. `helen skills external <id>` muestra los comandos oficiales y sus avisos.

Reglas por defecto: endpoint oficial, permisos mínimos, **solo lectura** cuando solo necesites mirar, base de datos y hosting de **desarrollo** (no producción), tokens fuera del repositorio, y confirmación humana para escribir, desplegar o gastar. La meta `helen apply connect-tools` empieza por el prompt `audit-third-party-tools-and-mcp`.

## 9. Mantener y ampliar HELEN

- **Nuevo prompt**: crea el archivo en su fase siguiendo `docs/prompts/CONTRACT.md` (en inglés) y ejecuta `helen prompts index`; el índice de la fase se genera solo.
- **Nueva skill**: carpeta `skills/<nombre>/SKILL.md` con `name` (igual que la carpeta) y `description`.
- **Nueva meta o paso**: edita `docs/prompts/playbooks.json`.
- **Nueva herramienta externa**: entrada en `skills/catalog.json` con `source`, `install`, `license`, `status`.
- Después ejecuta `helen prompts lint` y `npm test`: validan frontmatter, enlaces, playbooks y catálogo.

## 10. Qué NO hace HELEN

- No instala herramientas de terceros por ti.
- No garantiza que la fase detectada sea correcta: la propone con evidencia.
- No sustituye la revisión humana ni los tests.
- No ejecuta un modelo de IA por su cuenta: prepara, ordena y verifica; el trabajo lo hace tu IA.
