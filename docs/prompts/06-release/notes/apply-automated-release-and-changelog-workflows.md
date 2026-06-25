# [APPLY] - Automated Release and Changelog Workflows

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo).
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


**Intención**: APPLY (Modificar el proyecto, salida mínima)

## Objetivo

Implementar workflows automáticos de GitHub Actions para gestionar lanzamientos (releases), empaquetado de producción, etiquetado semántico de versiones (semver) y generación interactiva de changelogs basados en PRs.

## Cuándo Usarlo

- En la fase de preparación de releases (`06-release`) o antes de publicar el proyecto a producción.
- Para proyectos open-source o productos comerciales donde se requiere consistencia en el historial de versiones y notas de lanzamiento.

## Cuándo NO Usarlo

- Durante las fases tempranas de descubrimiento o prototipado rápido.
- Si el repositorio no sigue un flujo estructurado de Pull Requests con títulos descriptivos.

## Rol de la IA

Actúas como un DevOps Engineer y Lead Release Manager.

## Requisitos mínimos obligatorios

1. **Configuración de Workflow de Release (`.github/workflows/release.yml`)**:
   - Crear o modificar el archivo de flujo de GitHub Actions para que se active en la publicación de una nueva tag de versión (ej. `v*`).
   - El workflow debe correr tests, typecheck y compilar el paquete de producción antes de subir los artefactos a la release de GitHub.

2. **Automatización de Borradores (Release Drafter)**:
   - Configurar un archivo de configuración para categorizar los Pull Requests según etiquetas (ej. `feat` -> Features, `fix` -> Bug Fixes, `chore` -> Maintenance).
   - Crear un workflow que actualice automáticamente un borrador (draft) de release cada vez que se fusione un PR en la rama principal.

3. **Versionamiento Semántico (SemVer)**:
   - Asegurar que la nomenclatura siga las reglas de SemVer (`MAJOR.MINOR.PATCH`).

## Más allá de estos criterios

Implementa flujos de publicación automática a registros de paquetes (como npm o Docker Hub) cuando la release se marque como publicada desde el borrador inicial, con verificación de firmas criptográficas de commits.

## Límites de Seguridad

- Nunca hardcodear tokens de publicación o acceso al repositorio; usar siempre `GITHUB_TOKEN` nativo o secretos configurados en GitHub (`secrets.NPM_TOKEN`, etc.).
- Asegurar que el workflow requiera permisos de escritura mínimos (`contents: write`).

## Checks Finales

- Sintaxis de los archivos YAML de GitHub Actions válida.
- Mapeo correcto de ramas principales (ej. `main` o `master`).
- Las etiquetas de PRs requeridas coinciden con las del workflow.

## Formato de Entrega

El entregable debe ser minimalista. Produce únicamente:

```text
✅ Flujos de release automatizada configurados con éxito. / [o] ⚠️ Configurados con advertencias.

Configuración realizada:
- [Creación o parche de .github/workflows/release.yml y config de changelog/drafter]
- [Instrucciones de etiquetado o labels requeridos en el repo]

Acciones manuales adicionales:
- [Configurar secretos de registro (ej. NPM_TOKEN, DOCKER_PASSWORD) en GitHub Settings, si aplica]
```
*No generes informes extensos ni explicaciones teóricas.*
