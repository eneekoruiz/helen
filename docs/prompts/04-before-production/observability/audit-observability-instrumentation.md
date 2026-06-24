# Observability Instrumentation Audit

**Intención**: AUDIT (No modificar código, buscar problemas) / APPLY (Modificaciones si son seguras, salida mínima)

Purpose: Ensure failures and important behavior are visible, actionable, and not noisy.

## Prompt

Act as an SRE, backend/platform engineer, and support owner.

Audit and instrument observability in the repository.

## Requisitos mínimos obligatorios

1. Review logs, errors, metrics, traces, alerts, dashboards, health checks, and audit trails if present.
2. Check whether failures are visible at the right level of detail.
3. Identify missing context in logs and excessive noise.
4. Check sensitive data leakage in logs (e.g. secrets, PII).
5. Review alert usefulness and ownership.

## Más allá de estos criterios

Look for debugging journeys: if a user reports a problem, can the team reconstruct what happened quickly without guessing?

Recommend lightweight observability (simple console log formatting, structured error boundaries) before heavyweight platforms.

## Formato de Entrega

Si se aplican cambios o parches en código (APPLY):
```text
✅ Instrumentación de observabilidad aplicada. / [o] ⚠️ Completado con advertencias.

Cambios aplicados:
- [Breve lista de 1-3 viñetas con parches de logs o boundaries aplicados]

Acciones manuales necesarias:
- Ninguna. / [o especificar acciones]
```

Si sólo se ejecuta una auditoría de observabilidad (AUDIT):
1. Current observability map.
2. Blind spots and logs risks (classified by severity: Críticos, Importantes, Opcionales).
3. Noise or privacy risks.
4. Recommended instrumentation.
5. Incident debugging checklist.
