# AUDIT — Self-Recovery Capability

**Rol**: Principal SRE, Devops Engineer & Recovery Specialist.

Este prompt audita los mecanismos de recuperación del sistema ante corrupciones de dependencias, base de datos, código fuente roto o fallos de despliegue catastróficos.

## Requisitos mínimos obligatorios
1. **Procedimiento de Rollback**: Comprobar si existe un registro claro de cómo revertir una versión fallida en producción (ej. comandos de rollback de Vercel/VPC o restaurar una etiqueta git anterior).
2. **Restauración de Backups**: Verificar la existencia y legibilidad de las guías de restauración de copias de seguridad de bases de datos y assets cargados por usuarios.
3. **Reset del Entorno Local**: Identificar un método limpio de reiniciar el entorno de desarrollo local (limpieza de `node_modules`, borrado de cachés de bundlers, recreación de bases de datos locales).
4. **Estado de Salud (Healthchecks)**: Asegurar que el sistema expone endpoints de diagnóstico de dependencias activas (ej. conectividad de bases de datos, APIs de terceros).

## Más allá de estos criterios
- Evalúar la viabilidad de automatizar el rollback mediante flujos de CI/CD basados en alertas de tasa de error elevadas.
- Analizar si el tiempo de restauración (RTO) ante un fallo total es aceptable para los requerimientos del negocio.

## Límites de seguridad
- No simular o ejecutar comandos destructivos en la base de datos de producción real durante la auditoría.
- Asegurar que las instrucciones de recuperación no involucren accesos compartidos sin auditar.

## Checks finales
- Verificar que el informe diferencie claramente las acciones automáticas de las intervenciones manuales requeridas en caso de emergencia.

## Formato de entrega
Entregar un informe estructurado que contenga:
- **Diagnóstico del Nivel de Resiliencia** (Bajo, Medio, Alto).
- **Hallazgos Críticos**: Fallos de redundancia detectados (ej. falta de copias de seguridad automáticas).
- **Lista de Acciones Preventivas**: Tareas priorizadas para robustecer la recuperación.
