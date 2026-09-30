---
action: AUDIT
phase: 04-before-production
summary: Find scale, performance and cost problems before success makes them painful: bottlenecks, N+1s, quotas, rate limits, cost drivers.
modifies_code: false
---

# Stress, Scale and Cost Audit

## Goal

Find what breaks or gets too expensive when the product succeeds: it works with 10 users but not 1,000, with demo data but not real data.

## Use when

- Before production, a launch or a marketing push; when usage or costs are growing.

## Requirements

1. Scaling dimensions: users, records, files, requests, builds, integrations, tenants, locales, contributors.
2. Bottlenecks: unbounded loops, synchronous work, repeated parsing, large assets, expensive queries, hidden N+1 patterns.
3. Caching, batching, pagination, quotas, rate limits and backpressure.
4. Cost drivers of infrastructure and third-party services, with rough estimates.
5. Simple mitigations before any new architecture.

## Limits

- Audit only: do not modify files or run load tests against production without approval.

## Output

1. Scaling assumptions.
2. Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort.
3. Cost drivers and risks, short-term mitigations, and what not to over-engineer.
