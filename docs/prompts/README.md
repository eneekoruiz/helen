`npm run dev -- prompts list`

# HELEN Prompt System vNext

Esta carpeta contiene la biblioteca de prompts de HELEN, estructurada en torno al ciclo de vida real del desarrollo ("momentos del proyecto") y clasificada por la intención de cada prompt para minimizar la fricción y optimizar la mantenibilidad y automatización con agentes de IA.

---

## 🧭 Momentos del Proyecto (Estructura de Carpetas)

Los prompts se organizan por la fase en la que se encuentra el proyecto, respondiendo a la pregunta: **¿Cuándo debe usarse este prompt?**

1. **[01-start-project](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/01-start-project/README.md)** (Inicio): Diagnóstico rápido de riesgos, benchmark de competidores, priorización del roadmap y lifecycle tecnológico.
2. **[02-building](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/README.md)** (Desarrollo): Clean code local, consistencia de datos, contratos de API, conversión CMS y checkpoints de compilación/lint.
3. **[03-finish-features](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/README.md)** (Refinamiento): Usabilidad (UX), diseño visual premium, responsive, accesibilidad y regresiones visuales.
4. **[04-before-production](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/04-before-production/README.md)** (Pre-Producción): QA adversarial, límites de escala, costes, privacidad (GDPR) e instrumentación de observabilidad.
5. **[05-final-audit](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/05-final-audit/README.md)** (Auditoría): Veredictos técnicos de código, internacionalización (i18n), documentación e higiene del repositorio.
6. **[06-release](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/06-release/README.md)** (Publicación): Empaquetado estable, changelogs, release notes y gates de versión.
7. **[07-client-handoff](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/07-client-handoff/README.md)** (Entrega): Comprobaciones de última milla (formularios, links, CTAs) y paquete de entrega.
8. **[08-maintenance](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/08-maintenance/README.md)** (Mantenimiento): Copias de seguridad, gobernanza del repositorio, showcases e integridad de la biblioteca.
9. **[09-future-knowledge](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/09-future-knowledge/README.md)** (Preservación): Onboarding futuro, autorestauración, factor autobús y bitácora de decisiones (ADR).

---

## 🏷️ Clasificación de Intenciones (Nombres de Archivos)

Cada prompt expone su intención primaria en su prefijo de nombre de archivo, respondiendo a la pregunta: **¿Qué hace este prompt y qué formato de salida entrega?**

- **`apply-` (APPLY)**: Modifica código o estado del proyecto. **Formato de salida**: Estrictamente minimalista. Sin informes verbosos de cambios exitosos; solo reporta acciones manuales críticas que requieran intervención humana.
- **`audit-` (AUDIT)**: Evalúa la base de código o diseño sin realizar modificaciones. **Formato de salida**: Listado estructurado clasificado por gravedad: **Críticos**, **Importantes**, **Opcionales**.
- **`plan-` (PLAN)**: Diseña estrategias, secuencias de tareas o checklists accionables. **Formato de salida**: Checklists claras con sintaxis `[ ]` listas para ejecución.
- **`research-` (RESEARCH)**: Realiza benchmarks, comparativas de stack y análisis competitivos. **Formato de salida**: Reportes detallados estructurados con tablas comparativas.
- **`generate-` (GENERATE)**: Crea plantillas, release notes, changelogs o scaffolding listo para producción. **Formato de salida**: Código o texto crudo directamente copiable sin placeholders.

---

## 🔌 Integración Automática con MCP (Model Context Protocol)

> [!TIP]
> **Prompt de Auto-Configuración para tu Agente IA**
> Copia y pega el siguiente prompt directamente en tu editor habilitado para MCP (como Cursor, Windsurf, Claude o Gemini) para que el asistente integre y consuma autónomamente esta biblioteca de prompts:

```markdown
Actúa como mi agente técnico de desarrollo e integra esta biblioteca de prompts en tu contexto mediante el Filesystem MCP Server.
Sigue estas instrucciones operativas para interactuar con el repositorio:
1. Configura el servidor MCP para dar acceso al directorio del repositorio: `c:/Users/User/Desktop/PROYECTOS/helen`.
2. Lee `docs/prompts/registry.json` para comprender el mapa completo de prompts y sus rutas correspondientes.
3. Utiliza `docs/prompts/MASTER.md` como el prompt de orquestación (Master Orchestrator) para guiarte en el desarrollo, usando los comandos `/status` o `/recommend`.
4. Ante cualquier tarea específica que te sea asignada, busca el prompt adecuado en `docs/prompts/` (ej. para un refactoring usa uno con prefijo `apply-`, para una revisión uno con prefijo `audit-`), lee sus instrucciones y aplícalas rigurosamente.
```

---

## Orquestador 40K

El prompt [`[INIT] Director Creativo (Orquestador 40K).md`](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/%5BINIT%5D%20Director%20Creativo%20(Orquestador%2040K).md) es el punto de entrada para proyectos visuales ultra-premium. Absorbe nicho, oferta, cliente, conversion y ambicion estetica antes de ejecutar sub-prompts de Fase 3.

Usalo cuando el objetivo sea una web con direccion de arte propia, efectos tecnicos avanzados, conversion clara y cero rastro de IA.

## 🌐 Orquestación de Fases Remota

Cuando estés trabajando en cualquier otro proyecto ajeno y quieras saber en qué estado se encuentra, puedes ejecutar el orquestador maestro directamente desde la terminal con el siguiente comando:

```bash
curl -s https://raw.githubusercontent.com/eneekoruiz/helen/main/%5BPLAN%5D_Orquestador_Fases.md | tu-cli-de-ia
```
*(Reemplaza `tu-cli-de-ia` por el comando de ejecución de tu asistente de IA).*

---

## 🛠️ Acceso Mediante CLI de HELEN

La herramienta CLI de HELEN te permite interactuar con esta biblioteca directamente desde tu terminal local:

```bash
npm run dev -- prompts list                # Lista todos los prompts cargados por fase e intención
npm run dev -- prompts show master         # Muestra el prompt MASTER orchestrator
npm run dev -- prompts show apply-full-polish-flow  # Busca y muestra un prompt específico por su ID
npm run dev -- prompts path apply-full-polish-flow  # Devuelve la ruta absoluta del archivo de prompt
```
