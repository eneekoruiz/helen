# HELEN

Herramienta de línea de comandos en Node.js y TypeScript para la gestión estructurada de flujos de trabajo de ingeniería, dossiers técnicos y optimización de contexto para agentes y desarrolladores.

## Características principales

- **Gestión de tareas (`helen work`):** Creación, planificación y verificación de dossiers técnicos con requisitos explícitos, exclusiones y criterios de aceptación.
- **Preparación de contexto (`helen context`):** Extracción acotada de contexto de código relevante para tareas específicas, reduciendo consumo de tokens.
- **Base de conocimiento (`helen knowledge`):** Búsqueda y reutilización de soluciones arquitectónicas y patrones técnicos documentados.
- **Auditoría y calidad (`helen audit`):** Verificación automatizada de consistencia y preparación para entrega.

## Stack técnico

- **Runtime:** Node.js 18+ / TypeScript.
- **Librerías principales:** Commander.js, `@anthropic-ai/sdk`, `@clack/prompts`, Zod.

## Instalación y uso local

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Compilar el proyecto:
   ```bash
   npm run build
   ```

3. Ejecutar la CLI:
   ```bash
   node dist/index.js --help
   ```

Para enlazar el comando globalmente en desarrollo:

```bash
npm link
helen --help
```
