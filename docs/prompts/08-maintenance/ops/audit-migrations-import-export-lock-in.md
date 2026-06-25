# [AUDIT] - Migrations, Import, Export, and Lock-in Audit

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo).
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


**Intención**: AUDIT (No modificar código, buscar problemas) / REPORT (Generar conocimiento)

Purpose: Ensure the project can evolve without trapping users or maintainers.

## Prompt

Act as a Staff Engineer, platform architect, and founder planning for long-term trust.

Audit migration, import, export, and vendor lock-in strategy.

## Requisitos mínimos obligatorios

1. Identify data, config, API, schema, file, and integration formats that may need migration.
2. Check import and export paths.
3. Review versioning, backward compatibility, rollback, and migration tests.
4. Identify vendor dependencies and exit costs.
5. Flag one-way doors.

## Más allá de estos criterios

Look for trust-building features: user-owned exports, migration dry runs, compatibility checks, changelog warnings, deprecation policy, and clear data portability story.

## Formato de entrega

1. Migration surfaces and versioning risks (classified by severity: Críticos, Importantes, Opcionales).
2. Import/export gaps.
3. Vendor lock-in risks and exit strategies.
4. Compatibility strategy.
5. Recommended next safeguards.
