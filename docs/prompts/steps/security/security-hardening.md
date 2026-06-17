# Security Hardening

## Objetivo

Reducir riesgos de seguridad antes de release, entrega o exposición pública.

## Cuándo Usarlo

- En `release-candidate`.
- En `security-hardening`.
- Antes de entregar a cliente o publicar.

## Cuándo NO Usarlo

- Como excusa para rediseñar toda la arquitectura sin evidencia.

## Criterios Mínimos

- Revisa secretos, env vars, logs, input validation, path traversal, permisos, dependencias, auth, datos sensibles y operaciones destructivas.
- Ejecuta auditorías de dependencias si existen.
- Distingue vulnerabilidad real de hardening opcional.

## Más allá de estos criterios

Piensa en abuso, error humano, datos filtrados, supply chain, configuración insegura y escenarios que suelen descubrirse tarde.

## Límites de Seguridad

No imprimas secretos. No pegues tokens en reportes. No hagas cambios destructivos sin aprobación.

## Checks Finales

- No hay secretos obvios.
- Riesgos críticos mitigados o bloquean avance.
- Dependencias revisadas si aplica.

## Formato de Entrega

1. Bloqueadores.
2. Riesgos.
3. Mitigaciones.
4. Warnings aceptables.
