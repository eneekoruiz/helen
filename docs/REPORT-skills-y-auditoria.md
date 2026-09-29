# Informe: Skills + auditoría del repositorio HELEN

Fecha: 2026-09-29 · Estado verificado: `typecheck`, `lint` y `test` (13 ficheros, 78 tests) en verde.

## 1. Qué es HELEN hoy (diagnóstico honesto)

Son **dos productos en un repo**:

1. **CLI TypeScript** (`src/`, ~3.000 líneas en `core/`): scaffolding de módulos (docker, ci, seo, security…). Sano: tipado estricto, tests, path-safety, rollback.
2. **Biblioteca de prompts** (`docs/prompts/`, 131 prompts atómicos, ~390 KB, 9 fases): el verdadero activo diferencial.

Además hay un tercero a medias: `src/core/orchestrator.ts` (`HelenAIOrchestrator`) con actor/QA **simulados por defecto** (`setTimeout` + texto fijo). Es una maqueta, no un orquestador.

## 2. Tu idea: prompts → Skills (valoración: correcta)

Un prompt de repositorio se carga **por fase, a mano** (`helen prompts show <id>`). Una Skill (`SKILL.md` con `name` + `description`) se carga **por intención**: el agente la activa solo cuando la tarea coincide, y solo paga tokens cuando se usa (divulgación progresiva: metadatos siempre, cuerpo bajo demanda, `references/` y `scripts/` si hacen falta).

**Regla para decidir qué va dónde:**

| Tipo de conocimiento | Dónde | Ejemplo en HELEN |
|---|---|---|
| Transversal, sin fase (criterio, estilo, reglas) | **Skill** | Clean Code, UI/UX Pro Max, a11y, performance web, anti-"AI slop" |
| Ligado a una fase y con checklist bloqueante | **Prompt/flow** (se queda) | `release-candidate`, `client-delivery`, `HUMAN_CHECKLIST` |
| Orquestación (qué fase toca) | **Skill "helen-router"** + registry | `[PLAN]_Orquestador_Fases.md` |

Clean Code es el caso perfecto: aparece en `02-building/clean-code/*` pero también lo necesitas en 05 (AUDIT-code-quality) y 08. Hoy está duplicado por fase; como Skill se escribe una vez.

## 3. Skills candidatas (verificadas por búsqueda; revisa el código antes de instalar)

| Skill | Fuente | Encaje en HELEN | Prioridad |
|---|---|---|---|
| **ui-ux-pro-max** (67 estilos, paletas, tipografías, 98 guías UX, 100 reglas de razonamiento; 13 stacks incl. React/Next/shadcn) | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Es lo que tus prompts ya nombran ("Skill de UI UX PRO MAX") **sin que exista en el repo**. Sustituye a fase 03 `visual/` y `ux/` como base de criterio | Alta |
| **frontend-design** (Anthropic) | [anthropics/skills](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) | Anti "AI slop", tipografía y motion deliberados. Cubre `AUDIT-ai-trace-erasure`, `ENHANCE-taste-visual-pov` | Alta |
| **web-design-guidelines** (100+ reglas a11y/UX/perf) | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | Sustituye `APPLY-basic-accessibility-pass` y parte de `performance/` | Alta |
| **react-best-practices** (45 reglas de rendimiento) | mismo repo Vercel | Fase 02/03 para proyectos React que genera HELEN | Media |
| **code-review / simplify / security-review** | ya disponibles en tu entorno Claude Code | Cubren `AUDIT-code-quality`, `APPLY-safe-clean-code-simplification-pass`, `AUDIT-security-risk-checkpoint` sin escribir nada | Alta (coste cero) |
| **skill-creator** | ya disponible (anthropic-skills) | Para crear y evaluar las skills propias de HELEN | Alta |
| **Skills propias de HELEN** (ver §4) | tú | Lo distintivo | Alta |

Nota: la búsqueda no encontró skills equivalentes ya instaladas en tu cuenta de claude.ai (`SearchSkills` devolvió vacío para "clean code / design"). Esto es una lista de candidatas de la web, no una recomendación auditada: las skills ejecutan instrucciones con tus permisos, así que léelas antes de instalarlas y fija versión/commit.

## 4. Propuesta de integración

```
skills/                         # nuevo, formato estándar
  helen-clean-code/SKILL.md     # de 02-building/clean-code + AUDIT-code-quality
  helen-premium-design/SKILL.md # 40K, taste, anti-AI-trace; delega en ui-ux-pro-max + frontend-design
  helen-a11y-perf/SKILL.md      # basic-accessibility + performance budget
  helen-release/SKILL.md        # release-candidate + changelog (fase-específica, con scripts/)
  helen-router/SKILL.md         # sustituye [PLAN]_Orquestador_Fases.md
docs/prompts/                   # se queda SOLO lo ligado a fase (flows, checklists, ROUTER)
```

Pasos:

1. **Extraer** a `skills/` lo transversal. Cada SKILL.md: `description` en tercera persona con disparadores concretos ("usar al refactorizar, revisar código, eliminar código muerto…"). Detalle largo en `references/`.
2. **Un solo bloque "Nivel 0"** dentro de la skill de criterio en vez de copiarlo 131 veces (hoy son ~86 KB, 22 % del corpus, idéntico en todos los prompts).
3. **CLI**: añadir `helen skills install [--target claude|cursor|codex]` que copie `skills/` a `.claude/skills/` del proyecto destino (es lo que el CLI ya sabe hacer: módulos y templates). Encaja como un módulo más del `registry.ts`. Esto convierte a HELEN en el instalador de tu sistema, no solo en un scaffold.
4. **Registry**: añadir `skills[]` a `registry.json` y que `helen prompts` los liste; los flows referencian skills por nombre en lugar de duplicar texto.
5. **Evals**: usar skill-creator para 3–5 casos por skill (antes/después) — hoy no hay forma de saber si un prompt mejora algo.

## 5. Debilidades del repositorio (por gravedad)

**Alta**
- **Registro incompleto** (corrección: el CLI ya descubre los prompts escaneando `docs/prompts/`, así que `helen prompts list` sí los ve): `registry.json` solo lista 16 flows + 5 guías, es decir, solo esos llevan metadatos (`repeatable`, `stage`). El frontmatter de cada prompt es hoy la fuente de metadatos de los demás.
- **Frontmatter en 18/131 prompts** aunque `PREMIUM_PROMPT_CONTRACT` lo declara "obligatorio". El contrato no se hace cumplir: no hay lint. Tu propio `.quality_audit_log.md` lo reconoce como riesgo residual.
- **Ejecución remota con `curl | tu-cli-de-ia`** (README + `[PLAN]_Orquestador_Fases.md`): inyecta contenido de `main` sin fijar versión directamente en un agente con herramientas. Es un vector de prompt-injection/supply-chain (si `main` se compromete o hay un typo-squat de la URL, el agente lo ejecuta). Mitigación: pinear a tag/commit, y mejor entregarlo como skill instalada.
- **Boilerplate "Nivel 0 y Mente Abierta" idéntico ×131** y con instrucciones contraproducentes: "prohíbe limitar el desarrollo a lo pedido… aplicar sin dudarlo". Choca con los propios "Límites de Seguridad" ("no hagas refactors masivos") y con `APPLY` = "cambios pequeños y seguros". Un agente recibe órdenes contradictorias; el "sin dudarlo" invita a scope creep y a modificar dependencias sin consentir. Quítalo de los prompts de `APPLY` y déjalo solo en los de `AUDIT`/`GENERATE`, como *propuesta*, no aplicación.
- **Referencia a "Skill de UI UX PRO MAX" que no existe** en el repo: 132 menciones a algo no instalable = el agente lo alucina.

**Media**
- **Duplicación**: `[INIT] Director Creativo (Orquestador 40K).md` existe 3 veces (raíz, `docs/prompts/` y `INIT-director-creativo-…`), con contenido distinto. Fuente de verdad ambigua.
- **Solapamiento de contenido**: solo la carpeta `03-finish-features/visual/` tiene 15 prompts sobre casi lo mismo (40K, premium, taste, polish, awwwards). 28 ficheros citan Awwwards. Fusionar (`TAXONOMY.md` ya lo pide).
- **Sin escala de tamaño coherente**: 16 prompts <1,8 KB (esqueletos) frente a máx. 10 KB. Los "flow" enlazan prompts sin garantizar orden ni condiciones de parada verificables.
- **`orchestrator.ts` simulado** y sin conexión con el CLI real (`src/components/OrchestratorUI.tsx` es React dentro de un CLI y está excluido del tsconfig: código sin compilar ni testear en build).
- **`src/components`, `src/context` (React/TSX)** excluidos de `tsc`: no los valida CI. O se mueven a `templates/` (si son plantillas) o se borran.
- **`.helenrc` está en `.gitignore` pero commiteado** (`git ls-files` lo lista): estado local en el repo.
- **Mezcla de idiomas** (README inglés, prompts español, `tu-cli-de-ia`, typo "Changlog", "public-launch").
- **`helen.sh` y `legacy/`**: stub que solo imprime un aviso; borrar o mover a una rama/tag.
- **Prompts empaquetados en el npm** (`files: docs`) pero la ruta a prompts se resuelve con `../../docs/prompts` relativa al build: funciona, pero `docs/AUDIT.md` y módulos van también en el paquete. Separar `docs/prompts` a un directorio `prompts/` (o `skills/`) evita publicar documentación interna.

**Baja**
- Módulos `docs/modules/*.md` sin tests que verifiquen que documentan lo que hace cada módulo.
- `README` lista badges y comandos, pero no explica la relación CLI ↔ prompts para un tercero.
- Cobertura de tests: 13 ficheros para 20+ módulos; `cinematicArt.ts` (1.096 líneas de arte ASCII) es el fichero más grande del core y no aporta funcionalidad.

## 6. Fortalezas (conservar)

- CI limpio (typecheck+lint+test+build, Node 22, dependabot con automerge).
- Path-safety, anti prototype-pollution, backup/rollback de `.helenrc`: bien pensado.
- La taxonomía de intenciones (`INIT/GENERATE/ENHANCE/AUDIT/APPLY`) y los `HUMAN_CHECKLIST` por fase son un modelo mental claro y diferencial.
- Formatos de salida mínimos en los `APPLY` (buen control de tokens y ruido).

## 7. Plan recomendado (orden)

1. **Ya (1 h)**: quitar el boilerplate contradictorio de los `APPLY`; borrar duplicados de `[INIT]`; pinear el `curl` a un tag.
2. **Skills (1–2 días)**: crear `helen-clean-code` como piloto (es el caso que planteas), evaluarlo con skill-creator; luego `helen-premium-design` apoyado en ui-ux-pro-max + frontend-design.
3. **Herramienta**: script de CI que valide frontmatter y regenere `registry.json`; esto hace real el contrato.
4. **CLI**: `helen skills install`.
5. **Decisión pendiente tuya**: ¿el orquestador se convierte en algo real (integración con Claude Agent SDK) o se elimina?

## 8. Qué NO he hecho

No he modificado nada del repo salvo este informe. No he instalado ni auditado línea a línea el código de las skills externas: las descripciones vienen de sus páginas públicas.

## 9. Addendum: compatibilidad multi-agente (Claude Code, Codex, Antigravity)

`SKILL.md` (carpeta con `name` + `description` + cuerpo Markdown, más `references/` y `scripts/` opcionales) es un estándar abierto y lo leen los tres agentes. Lo que cambia es **dónde se instala** y **cómo se llaman los prompts de fase**:

| Concepto HELEN | Claude Code | Codex | Antigravity |
|---|---|---|---|
| Skill (transversal) | `.claude/skills/<n>/SKILL.md` | `.agents/skills/<n>/SKILL.md` (también `~/.agents/skills`) | `.agent/skills/<n>/SKILL.md` (según fuentes, a veces `.agents/`: **verificar en tu versión**) |
| Reglas siempre activas | `CLAUDE.md` | `AGENTS.md` | reglas en `.agent/rules/` (también lee `AGENTS.md`) |
| Prompt de fase / flow invocable | skill con invocación explícita o `.claude/commands/` | skill invocada por nombre | `.agent/workflows/*.md` |

Fuentes: [Codex skills](https://developers.openai.com/codex/skills), [Antigravity skills](https://codelabs.developers.google.com/getting-started-with-antigravity-skills), [Antigravity + AGENTS.md](https://thepromptshelf.dev/blog/google-antigravity-agents-md-rules-guide-2026/).

### Diseño: una fuente, compilada por destino

```
src/                          # FUENTE ÚNICA (lo que editas)
  skills/<name>/SKILL.md      # transversales (clean-code, premium-design, a11y-perf, router)
  prompts/<fase>/<id>.md      # prompts de fase con frontmatter (los 131 actuales, migrados)
  rules/core.md               # reglas siempre activas (sustituye el "Nivel 0" repetido)
dist-agents/  (generado, no se edita)
  claude/  .claude/skills, .claude/commands, CLAUDE.md
  codex/   .agents/skills, AGENTS.md
  antigravity/ .agent/skills, .agent/workflows, .agent/rules
```

- **`helen agents install --target claude|codex|antigravity|all`** copia/compila al proyecto destino (lo mismo que ya hace el CLI con módulos; dry-run y rollback incluidos).
- Los prompts de fase se emiten como **skills invocables** en Claude/Codex y como **workflows** en Antigravity; el contenido es el mismo, solo cambian el wrapper y la ruta.
- `AGENTS.md` como formato común de reglas; `CLAUDE.md` puede ser un simple enlace/import a él.
- Diferencias por agente (herramientas, nombres de comandos) van en un bloque condicional del frontmatter (`targets:`), no en copias del prompt.
- CI: validar frontmatter, regenerar `registry.json` y comprobar que la salida compilada está al día.

### Alcance "todo el workflow"

Las 9 fases quedan cubiertas así: 5 skills transversales + los flows (`full-polish`, `release-candidate`, `client-delivery`, …) como workflows/skills invocables + `helen-router` que detecta la fase y recomienda el siguiente paso, con los `HUMAN_CHECKLIST` como puertas de transición.

### Riesgos

- Las rutas de Antigravity y Codex cambian entre versiones: aislarlas en una tabla de destinos del CLI (una línea por agente) para corregirlas sin tocar contenido.
- Un mismo texto rinde distinto en cada modelo: 3–5 evals por skill en al menos Claude y Codex antes de darla por buena.
- Limitar la longitud de `description` y del cuerpo de cada SKILL.md (el resto a `references/`), porque todos cargan metadatos de todas las skills en cada sesión.


## 10. Estado de implementación (rama `claude/skills-audit-report`)

Hecho:

- **Skills incluidas** (`skills/`): `helen-clean-code`, `helen-premium-design` (con `references/vocabulary.md`, donde se conserva el vocabulario de recursos que estaba repetido en los prompts), `helen-a11y-perf`, `helen-release`, `helen-router`.
- **Flows como skills**: `helen skills install --flows` genera una skill `helen-flow-<id>` por cada flow ejecutable (16), con los enlaces a pasos reescritos a `helen prompts show <id>`.
- **Instalador genérico**: `helen skills list|install`, destinos `claude` (`.claude/skills`), `codex` (`.agents/skills`) y `custom --dir <ruta>` para cualquier otro agente (p. ej. Antigravity), sin rutas inventadas.
- **Bloque "Nivel 0 y Mente Abierta"**: sustituido en los 132 ficheros por una versión corta que apunta a las skills y pide proponer, no aplicar sin encargo (elimina la contradicción con los Límites de Seguridad y el ~22 % de contenido repetido).
- **Frontmatter**: añadido a los 113 prompts que no lo tenían (ahora 131/131); `helen prompts lint` valida frontmatter, coherencia acción/prefijo/fase, y enlaces, y corre en CI.
- **Enlaces**: eliminadas 210 rutas absolutas `file:///c:/Users/...`, y corregidos ~226 enlaces que apuntaban a nombres en minúscula (`audit-…`) tras el renombrado a mayúscula: estaban rotos en sistemas de archivos sensibles a mayúsculas (Linux, macOS por defecto no, pero sí CI/npm en Linux).
- **Duplicado eliminado**: `[INIT] Director Creativo (Orquestador 40K).md` de la raíz (no estaba referenciado). Se mantienen el de `docs/prompts/` (registrado) y `INIT-director-creativo-orquestador-40k.md` (sub-orquestador).
- **Limpieza**: `.helenrc` deja de estar versionado (ya estaba en `.gitignore`); erratas (`Changlog`, `public-laúnch`, `laúnch`, `funcióna`…); el `curl | agente` del README ahora exige fijar `<TAG_OR_COMMIT>`.

Pendiente (requiere decisión tuya, no lo he tocado):

- Destino de `src/orchestrator.ts` y `src/components|context` (React excluido de `tsc`): integrarlo de verdad con un SDK de agentes o eliminarlo.
- `helen.sh` y `legacy/`: borrar o mover a un tag.
- Verificar la carpeta de skills de Antigravity en tu versión y, si es estable, añadirla como destino conocido en `SKILL_TARGETS` (una línea).
- Evals de cada skill (skill-creator) en al menos dos agentes.
- Fusionar los ~15 prompts solapados de `03-finish-features/visual/` (decisión editorial).
- Regla de aprobación de PRs y fijar un tag de release para el `curl`.
