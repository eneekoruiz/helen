# Stress, Scale, and Cost Audit

**Intención**: AUDIT (No modificar código, buscar problemas)

Purpose: Find scale, performance, and cost problems before success makes them painful.

## Prompt

Act as an SRE, Staff Engineer, performance engineer, and cost-conscious founder.

Audit the project for growth pressure.

## Requisitos mínimos obligatorios

1. Identify likely scaling dimensions: users, records, files, requests, builds, integrations, tenants, locales, or contributors.
2. Find bottlenecks, unbounded loops, synchronous work, repeated parsing, large assets, expensive queries, and hidden N+1 patterns.
3. Review cacheability, batching, pagination, quotas, rate limits, and backpressure.
4. Estimate cost drivers if infrastructure or third-party services are involved.
5. Identify simple mitigations before premature architecture.

## Más allá de estos criterios

Look for success failure modes: the product works at 10 users but fails at 1,000; works with demo data but not real data; or becomes too expensive to operate.

## Formato de entrega

1. Scaling assumptions.
2. Bottlenecks and risks (classified by severity: Críticos, Importantes, Opcionales).
3. Cost drivers and cost risks.
4. Simple mitigations (short-term).
5. Do-not-overengineer notes.
