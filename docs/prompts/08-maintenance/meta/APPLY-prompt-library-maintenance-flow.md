# [APPLY] - Prompt Library Maintenance Flow

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento minimo indispensable la excelencia absoluta en el campo (codigo limpio, sistemas agenticos, accesibilidad y rendimiento optimo).
- **Mente Abierta**: Se prohibe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad tecnica: si existe una tecnologia mas moderna, un enfoque mas optimo o mejores recursos disponibles, deben investigarse y aplicarse cuando reduzcan riesgo o aumenten calidad verificable.

**Intencion**: APPLY (Modificar el proyecto, salida minima)

## Objetivo

Mantener la biblioteca de prompts de HELEN pequena en intencion, amplia en cobertura, coherente, accesible por la CLI y libre de redundancias o duplicaciones. El flujo debe elevar la biblioteca con investigacion tecnica actual, reflexion acotada, memoria persistente y verificacion reproducible.

## Fase Ideal

Tras anadir, renombrar, fusionar o eliminar prompts de la biblioteca (Maintenance).

## Bucle Operativo Obligatorio

Ejecuta este ciclo hasta que una auditoria no encuentre brechas materiales:

```text
[INVESTIGAR] -> [AUDITAR BIBLIOTECA] -> [APLICAR CAMBIOS MINIMOS] -> [RE-AUDITAR] -> [REGISTRAR MEMORIA]
```

Limites del bucle:

- Maximo dos re-aplicaciones por familia de prompts en una misma pasada.
- No reescribir prompts completos si una mejora en contrato, flow o metadatos resuelve la brecha transversal.
- Detenerse ante riesgo destructivo, ambiguedad de intencion, cambios masivos no verificables o conflicto con compatibilidad CLI.
- Si no hay mejora material, registrar la razon y finalizar.

## Criterios de Mantenimiento y Calidad

1. **Integridad de Biblioteca**:
   - Asegurar que cada prompt tiene una unica intencion clara y bien diferenciada.
   - Revisar que `STANDARDS.md`, `TAXONOMY.md`, `COVERAGE.md` y `registry.json` esten alineados.
2. **Estructura y Sufijos**:
   - Confirmar que los archivos estan en la carpeta de fase adecuada.
   - Validar que las puertas de calidad terminen en `-checkpoint.md` y los flujos en `-flow.md`.
3. **Calidad de Prompt**:
   - Asegurar que los prompts de tipo `APPLY` tengan una salida/entregable minimalista de confirmacion.
   - Asegurar que los de tipo `AUDIT` contengan clasificacion por severidad (Criticos, Importantes, Opcionales).
   - Exigir evidencia minima, criterios de exito, limites de seguridad, manejo de excepciones y verificacion.
4. **Reflexion, Memoria y Excepciones**:
   - Convertir tareas criticas o ambiguas en bucles [APPLY/ANALYZE] -> [AUDIT] -> [RE-APPLY] -> [VERIFY].
   - Registrar cambios de arquitectura de prompts en `.quality_audit_log.md`.
   - Separar hechos verificados, inferencias y supuestos.
   - Evitar afirmaciones absolutas de perfeccion si quedan riesgos residuales.

## Checkpoints Requeridos

- **Inicio**: Cargar y revisar [STANDARDS.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/STANDARDS.md), [TAXONOMY.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/TAXONOMY.md), [PREMIUM_PROMPT_CONTRACT.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/PREMIUM_PROMPT_CONTRACT.md) y `.quality_audit_log.md` si existe.
- **Investigacion**: Consultar fuentes actuales cuando el cambio dependa de practicas externas, modelos, herramientas, seguridad, regulacion o patrones agenticos cambiantes.
- **Auditoria previa**: Medir cobertura de frontmatter, evidencia, seguridad, checks, memoria y excepciones antes de editar.
- **Post-cambios**: Ejecutar tests unitarios (`npm run test`) para verificar que el CLI y el resolvedor de prompts local no sufren regresiones.
- **Registro**: Actualizar `.quality_audit_log.md` con fecha, archivos modificados, fuentes usadas, razonamiento, verificacion y riesgo residual.

## Formato de Entrega

El entregable debe ser minimalista. Produce unicamente:

```text
✅ Mantenimiento de la biblioteca completado. / [o] ⚠️ Completado con advertencias.

Cambios aplicados:
- [Breve lista de 1-3 vinetas con prompts, contratos o flujos modificados]

Acciones manuales necesarias:
- Ninguna. / [o especificar acciones como correr tests locales]
```

*No generes informes extensos ni explicaciones teoricas.*