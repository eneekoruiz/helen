# Security Hardening Flow

## Objetivo

Revisar y mitigar riesgos de seguridad antes de exposición pública, entrega o release.

## Fase Ideal

Prefinal o release candidate.

## Prompts Incluidos

1. `../steps/security/security-hardening.md`
2. `../steps/testing/fast-build-test-verification.md`

## Checkpoints Entre Pasos

- Inicio: `../checkpoints/security-risk-checkpoint.md`
- Después de fixes: `../checkpoints/lint-and-typecheck.md`
- Final: `../checkpoints/security-risk-checkpoint.md`

## Condiciones para Avanzar

- No hay secretos.
- Riesgos críticos mitigados.
- Cambios de seguridad no rompen flujo principal.

## Cuándo Detenerse

- Se detecta exposición sensible.
- La mitigación requiere cambio arquitectónico.
- Hay vulnerabilidad crítica sin mitigación clara.

## Qué Hacer si Falla Algo

Parar y corregir si es seguro. Si hay exposición real, no resumir secretos; indicar tipo de riesgo y acción.

## Resumen Final

1. Riesgos encontrados.
2. Mitigaciones.
3. Warnings.
4. Sign-off de seguridad.
