---
action: AUDIT
phase: 02-building
summary: Check that scripts, CI jobs and automation do what their names say, fail loudly and save real time instead of creating false confidence.
modifies_code: false
---

# Automation and Scripts Audit

## Goal

Make sure automation saves time instead of creating false confidence.

## Use when

- Scripts, Makefiles, package scripts, CI jobs, codegen or release automation have grown without review.
- Before relying on automation in a release or handoff.

## Requirements

1. Inventory the automation and what each script actually does.
2. Check that names match behavior.
3. Find broken, stale, dangerous, duplicated or ceremonial automation.
4. Find missing scripts that would remove repeated manual work.
5. Verify scripts fail loudly (non-zero exit) and are safe by default (no destructive default action, dry-run where it matters).

## Beyond the checklist

High-leverage candidates: one-command verification, fixture reset, screenshot capture, release notes, dependency audit, docs link check, project health report. Do not add automation nobody will maintain.

## Limits

- Audit only: do not modify files. Do not run destructive scripts to "test" them.

## Output

1. Automation inventory.
2. Findings grouped as **Critical**, **Important** and **Optional**. For each: evidence (file, line, screen or command), impact, recommended fix and effort.
3. Missing high-leverage scripts and safety improvements.
4. Recommended command suite.
