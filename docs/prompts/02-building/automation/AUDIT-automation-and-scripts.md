# [AUDIT] - Automation and Scripts Audit

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo).
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


**Intención**: AUDIT (No modificar código, buscar problemas)

Purpose: Ensure scripts and automation save time instead of creating false confidence.

## Prompt

Act as a DevOps-minded Staff Engineer and maintainer.

Audit all scripts, Makefiles, package scripts, CI jobs, codegen, release automation, and local helpers.

## Requisitos mínimos obligatorios

1. List available automation and what each script actually does.
2. Check whether script names match behavior.
3. Identify broken, stale, dangerous, duplicated, or ceremonial automation.
4. Find missing scripts that would prevent repeated manual work.
5. Verify scripts fail loudly and are safe by default.

## Más allá de estos criterios

Look for automation that saves hours: one-command verification, screenshot capture, fixture reset, release notes generation, dependency audit, docs link checking, or project health report.

Do not add automation that will not be maintained.

## Formato de entrega

1. Automation inventory.
2. Broken, dangerous, or misleading scripts (classified by severity: Críticos, Importantes, Opcionales).
3. Missing high-leverage scripts.
4. Safety improvements.
5. Recommended command suite.
