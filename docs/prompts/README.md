# HELEN Prompt System

Esta carpeta contiene la biblioteca de prompts de HELEN, reestructurada en torno al ciclo de vida real del desarrollo ("momentos del proyecto") para minimizar la fricción y optimizar la mantenibilidad.

El sistema se orquesta a través del prompt maestro interactivo: **[MASTER.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/MASTER.md)**.

---

## 🧭 Momentos del Proyecto (Estructura de Carpetas)

Los prompts se organizan por la fase en la que se encuentra el proyecto, no por categorías técnicas. Cada carpeta incluye su propio `README.md` con objetivos y checklists bloqueantes para avanzar de fase:

1. **[01-start-project](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/01-start-project/README.md)** (Inicio): Diagnóstico rápido de riesgos, benchmark de competidores y priorización del roadmap.
2. **[02-building](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/README.md)** (Desarrollo): Clean code local, consistencia de datos, contratos de API y checkpoints de compilación/lint.
3. **[03-finish-features](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/03-finish-features/README.md)** (Refinamiento): Usabilidad (UX), diseño visual premium, responsive, accesibilidad y regresiones visuales.
4. **[04-before-production](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/04-before-production/README.md)** (Pre-Producción): QA adversarial, límites de escala, costes, privacidad (GDPR) e instrumentación de observabilidad.
5. **[05-final-audit](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/05-final-audit/README.md)** (Auditoría): Veredictos técnicos exigentes de código, internacionalización (i18n), documentación e higiene del repositorio.
6. **[06-release](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/06-release/README.md)** (Publicación): Empaquetado estable, changelogs, release notes y gates de versión.
7. **[07-client-handoff](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/07-client-handoff/README.md)** (Entrega): Comprobaciones de última milla (formularios, links, CTAs) y paquete de entrega.
8. **[08-maintenance](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/08-maintenance/README.md)** (Mantenimiento): Copias de seguridad, migraciones, portabilidad, briefs de tareas e integridad del propio sistema.

---

## ⚡ Métodos de Acceso y Uso de los Prompts

Existen múltiples formas de utilizar y consumir esta biblioteca de prompts en tu flujo diario de desarrollo asistido por IA:

| Método | Cómo Funciona | Ventajas | Inconvenientes |
|---|---|---|---|
| **1. Archivos Locales / MCP (Recomendado)** | Utilizar un editor con soporte MCP de acceso a ficheros o referenciar directamente la ruta local del archivo markdown. | - Acceso instantáneo.<br>- Contexto completo actualizado al segundo.<br>- Cero fricción. | Requiere que el editor tenga permisos de lectura en la carpeta. |
| **2. Copiar y Pegar** | Copiar el contenido de los archivos markdown directamente en el chat de la IA. | - Funciona en cualquier chat web externo (ChatGPT, Claude, Gemini). | - Proceso manual lento.<br>- Consume tokens de forma ineficiente. |
| **3. URLs Raw de GitHub / curl** | Consumir los prompts directamente desde el repositorio remoto (ej. `curl -s https://raw.githubusercontent.com/username/repo/main/docs/prompts/...`). | - No requiere clonar el repositorio.<br>- Prompts siempre actualizados a la última versión. | - Requiere conexión a internet.<br>- Inseguro en entornos sin red. |
| **4. Submódulos de Git / Subtrees** | Incrustar la biblioteca como un submódulo de Git dentro de otros proyectos de la organización. | - Prompts compartidos entre múltiples repositorios.<br>- Control de versiones independiente. | - Complejidad de Git.<br>- Requiere sincronizar cambios. |

> [!TIP]
> **Opción Recomendada**: Utiliza **Archivos Locales** a través de integraciones MCP o referencias directas en editores integrados (como Cursor, VS Code con Gemini/Claude, Windsurf). Esto permite a la IA leer autónomamente la fase y los prompts necesarios sin intervención manual.

---

## 🛠️ CLI de HELEN

La herramienta de CLI de HELEN te permite interactuar con esta biblioteca directamente desde la terminal:

```bash
helen prompts list                # Lista todos los prompts cargados por fases
helen prompts show master         # Muestra el prompt MASTER orchestrator
helen prompts show full-polish    # Busca y muestra un prompt por su nombre base
helen prompts path full-polish    # Devuelve la ruta absoluta del archivo
helen prompts show yearly-professional-presence-review # Revisión anual de presencia profesional
```
