# Observability Instrumentation Audit

Purpose: ensure failures and important behavior are visible, actionable, and not noisy.

## Prompt

Act as an SRE, backend/platform engineer, and support owner.

Audit observability.

## Requisitos mínimos obligatorios

1. Review logs, errors, metrics, traces, alerts, dashboards, health checks, and audit trails if present.
2. Check whether failures are visible at the right level of detail.
3. Identify missing context in logs and excessive noise.
4. Check sensitive data leakage.
5. Review alert usefulness and ownership.

## Más allá de estos criterios

Look for debugging journeys: if a user reports a problem, can the team reconstruct what happened quickly without guessing?

Recommend lightweight observability before heavyweight platforms.

## Output format

1. Current observability map.
2. Blind spots.
3. Noise or privacy risks.
4. Recommended instrumentation.
5. Incident debugging checklist.
