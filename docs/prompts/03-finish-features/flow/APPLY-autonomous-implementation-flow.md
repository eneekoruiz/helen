---
title: Autonomous Implementation (Implementa)
summary: Execute a plan autonomously with full technical freedom, self-correction loops, and Level 100 quality until zero improvements remain.
action: APPLY
phase: 03-finish-features
repeatable: true
modifies_code: true
stage: apply
aliases:
  - implementa
  - implement-all
  - just-do-it
---

# Autonomous Implementation Flow

> Read [RULES.md](../../RULES.md) once per session.

## Goal
Execute a complete plan or improvement set autonomously with full technical freedom, self-correction loops, and Level 100 quality.

## Use when
You have received a plan, improvement list, audit findings, or implementation request and the user wants sovereign, end-to-end execution.

## Limits
- Do not stop and ask "shall I proceed?". The user already said implement.
- Do not change irreversible business-critical data without explicit permission.

## Requirements

- **Completeness**: Implement 100% of the scope.
- **Autonomy**: Make confident technical decisions.
- **Proactive Quality**: Leave every file you touch cleaner, safer, and more robust than you found it.

## Steps

### 1. Scope Lock
1. Parse the full scope: every item, every file, every change.
2. List all discrete tasks. Number them.
3. Order by dependency (foundational → consumers → tests → docs).

### 2. Execution (Per Batch)
1. **Implement** the changes with full technical mastery.
2. **Hunt adjacent defects**: scan the surrounding code for bugs, type issues, missing validations, dead imports. Fix them.
3. **Verify** after each batch: build, typecheck, lint, test.
4. **Self-correct**: if any check fails, diagnose, fix, re-verify (max 3 rounds).
5. **Proceed** to the next batch only when the current one is fully green.

### 3. Final Sweep
1. Run full project verification: build + typecheck + lint + tests.
2. Scan for any remaining `any` types, empty catches, TODO comments, dead code.
3. Verify documentation accuracy against the new implementation.

## Output

Deliver a concise implementation report:

| Section | Content |
|---|---|
| **Implemented** | Numbered list of all changes with file paths |
| **Proactive Fixes** | Adjacent issues found and resolved |
| **Verification** | Build ✅/❌, Types ✅/❌, Lint ✅/❌, Tests ✅/❌ |
| **Excluded** | Items out of scope with reason (if any) |

Verdict:
- `✅ COMPLETE — All items implemented, all checks green.`
- `⚠️ PARTIAL — N items implemented, M excluded.`
