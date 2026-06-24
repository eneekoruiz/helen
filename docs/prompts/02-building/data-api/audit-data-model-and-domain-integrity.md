# Data Model and Domain Integrity Audit

**Intención**: AUDIT (No modificar código, buscar problemas)

Purpose: Detect weak domain modeling, data inconsistency, schema drift, and missing invariants before they become expensive.

## Prompt

Act as a Principal Engineer, data architect, domain modeler, and reliability-minded product engineer.

Review the repository's data model and domain integrity.

## Requisitos mínimos obligatorios

1. Identify core entities, schemas, config objects, persisted data, generated artifacts, cache data, and external data shapes.
2. Review invariants, validation, defaults, nullability, ownership, lifecycle, migrations, and serialization.
3. Check whether the same domain concept appears under multiple names or incompatible shapes.
4. Identify where invalid states can be represented.
5. Review tests around schema boundaries and data transformations.

## Más allá de estos criterios

Look for domain friction: names that lie, data structures that force awkward code, missing canonical source of truth, implicit migrations, state that can become inconsistent, or product concepts that are not modeled explicitly enough.

Recommend simplification before abstraction.

## Formato de entrega

1. Domain model map.
2. Invariant gaps and risks (classified by severity: Críticos, Importantes, Opcionales).
3. Drift and duplication.
4. Migration or compatibility risks.
5. Recommended model improvements.
6. Verdict: `DOMAIN MODEL CLEAR`, `MODEL DRIFT RISK`, or `INTEGRITY RISK`.
