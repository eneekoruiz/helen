# HELEN · CLI de Flujos de Ingeniería y Optimización de Contexto

Herramienta de línea de comandos en Node.js y TypeScript diseñada para la gestión estructurada de flujos de trabajo de ingeniería, definición de dossiers técnicos y optimización de contexto de código para agentes de IA y desarrolladores.

- **Documentación de arquitectura:** [DeepWiki - helen](https://deepwiki.com/eneekoruiz/helen)

## Propósito y Valor Técnico

HELEN proporciona una metodología rigurosa para estructurar el trabajo técnico, minimizando la ambigüedad en implementaciones de software complejas y optimizando el consumo de tokens al alimentar modelos de lenguaje con contexto de código estrictamente acotado.

- **Dossiers Técnicos Estructurados (`helen work`):** Creación y seguimiento de expedientes técnicos en archivos Markdown locales, definiendo de forma obligatoria requisitos explícitos, exclusiones deliberadas y criterios de aceptación medibles antes de picar código.
- **Extracción Acotada de Contexto (`helen context`):** Algoritmos de filtrado e inspección de árbol sintáctico (AST) que extraen únicamente los fragmentos y dependencias de código relevantes para una tarea, reduciendo drásticamente el coste y la saturación de tokens en flujos agentic.
- **Catálogo de Conocimiento y ADRs (`helen knowledge`):** Registro e indexación de decisiones arquitectónicas (Architectural Decision Records), patrones de diseño documentados y guías de buenas prácticas reutilizables.
- **Ejecutor de Evaluaciones de Habilidades:** Suite automatizada para evaluar la precisión y coherencia de prompts y habilidades técnicas frente a casos de prueba definidos, con generadores de informes en formato JSON.

## Stack Técnico

- **Runtime & Lenguaje:** Node.js 18+, TypeScript
- **Framework CLI & Prompts:** Commander.js, `@clack/prompts`, Picocolors, Ora, `cli-progress`
- **Validación & Plantillas:** Zod (validación de esquemas en tiempo de ejecución), Handlebars
- **Integraciones:** `@anthropic-ai/sdk`
- **Testing & Tooling:** Vitest (ejecutor de pruebas unitarias y cobertura), ESLint, Prettier

## Puesta en Marcha Local

### Prerrequisitos

- Node.js 18+

### Instalación y Compilación

```bash
git clone https://github.com/eneekoruiz/helen.git
cd helen
npm install

# Compilar TypeScript a JavaScript ejecutable
npm run build
```

### Uso de la CLI

```bash
# Ejecución directa desde el binario compilado
node dist/index.js --help

# Enlazar comando globalmente en el entorno local
npm link
helen --help
```

### Verificación de Calidad

```bash
# Comprobación de tipos, linter, formateo y tests unitarios
npm run validate
```
