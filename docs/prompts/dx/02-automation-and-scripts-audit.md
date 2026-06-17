# Automation and Scripts Audit

Purpose: ensure scripts and automation save time instead of creating false confidence.

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

## Output format

1. Automation inventory.
2. Broken or misleading scripts.
3. Missing high-leverage scripts.
4. Safety improvements.
5. Recommended command suite.
