# Prompt Library Maintenance Flow

**Intención**: APPLY (Modificar el proyecto, salida mínima)

## Objetivo

Mantener la biblioteca de prompts de HELEN pequeña en intención, amplia en cobertura, coherente, accesible por la CLI y libre de redundancias o duplicaciones.

## Fase Ideal

Tras añadir, renombrar, fusionar o eliminar prompts de la biblioteca (Maintenance).

## Criterios de Mantenimiento y Calidad

1. **Integridad de Biblioteca**:
   - Asegurar que cada prompt tiene una única intención clara y bien diferenciada.
   - Revisar que `STANDARDS.md`, `TAXONOMY.md`, `COVERAGE.md` y `registry.json` estén alineados.
2. **Estructura y Sufijos**:
   - Confirmar que los archivos están en la carpeta de fase adecuada.
   - Validar que las puertas de calidad terminen en `-checkpoint.md` y los flujos en `-flow.md`.
3. **Calidad de Prompt**:
   - Asegurar que los prompts de tipo `APPLY` tengan una salida/entregable minimalista de confirmación.
   - Asegurar que los de tipo `AUDIT` contengan clasificación por severidad (Críticos, Importantes, Opcionales).

## Checkpoints Requeridos

- **Inicio**: Cargar y revisar [STANDARDS.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/STANDARDS.md) y [TAXONOMY.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/TAXONOMY.md).
- **Post-cambios**: Ejecutar tests unitarios (`npm run test`) para verificar que el CLI y el resolvedor de prompts local no sufren regresiones.

## Formato de Entrega

El entregable debe ser minimalista. Produce únicamente:

```text
✅ Mantenimiento de la biblioteca completado. / [o] ⚠️ Completado con advertencias.

Cambios aplicados:
- [Breve lista de 1-3 viñetas con prompts movidos, renombrados o consolidados]

Acciones manuales necesarias:
- Ninguna. / [o especificar acciones como correr tests locales]
```
*No generes informes extensos ni explicaciones teóricas.*
