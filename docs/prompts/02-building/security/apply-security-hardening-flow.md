# Security Hardening Flow

**Intención**: APPLY (Modificar el proyecto, salida mínima)

## Objetivo

Revisar y mitigar riesgos de seguridad antes de exposición pública, entrega o release.

## Fase Ideal

Durante el desarrollo (Building) y antes de estabilización.

## Criterios de Auditoría y Mitigación

1. **Secretos y Configuración**:
   - Buscar credenciales, tokens, contraseñas hardcoded y variables de entorno expuestas.
2. **Entrada de Datos e Inyecciones**:
   - Revisar validación de entradas, path traversal, inyecciones de comandos, consultas, etc.
3. **Dependencias**:
   - Ejecutar auditoría rápida de vulnerabilidades en dependencias (`npm audit` si aplica).
4. **Permisos y Operaciones Destructivas**:
   - Revisar llamadas a filesystem, subprocesos y privilegios innecesarios.

## Checkpoints Requeridos

- **Inicio**: Cargar [security-risk-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/04-before-production/flow/audit-security-risk-checkpoint.md)
- **Fixes**: Aplicar mitigaciones automáticas directamente en el código de forma segura.
- **Validación**: Ejecutar [lint-and-typecheck-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/checkpoint/audit-lint-and-typecheck-checkpoint.md) y confirmar que la compilación continúa siendo correcta.

## Límites de Seguridad

No imprimas secretos en los logs del chat ni en archivos de reporte. No realices cambios estructurales de arquitectura de red o auth sin confirmación explícita.

## Formato de Entrega

El entregable debe ser minimalista. Produce únicamente:

```text
✅ Mitigaciones aplicadas. / [o] ⚠️ Mitigaciones aplicadas con advertencias.

Cambios aplicados:
- [Breve lista de 1-3 viñetas con las correcciones aplicadas]

Acciones manuales necesarias:
- Ninguna. / [o detallar variables a configurar, comando npm audit fix, etc.]
```
*No generes informes extensos ni explicaciones teóricas.*
