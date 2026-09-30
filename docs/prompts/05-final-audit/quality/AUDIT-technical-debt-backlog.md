---
action: AUDIT
phase: 05-final-audit
summary: Audit codebase for technical debt, legacy patterns, and prioritize a structured mitigation backlog.
modifies_code: false
aliases:
  - technical-debt-backlog
  - debt-audit
---

# Technical Debt Audit & Backlog Prioritization

## Goal

Catalog accumulated technical debt, obsolete dependencies, dead code, and architecture shortcuts into a prioritized backlog.

## Use when

- Concluding a development sprint or preparing for a major release.
- A codebase exhibits friction during feature changes or slow test suites.

## Steps

1. **Scan for Dead Code**: Locate unused imports, abandoned components, and orphaned utility helpers.
2. **Review Type Assertions**: Find `any` casts, `@ts-ignore` comments, and missing error boundary checks.
3. **Inspect Dependency Freshness**: Run ecosystem dependency checkers to find deprecated or unsupported libraries.
4. **Identify Coupling Hotspots**: Identify oversized files (>500 lines) with too many responsibilities.
5. **Estimate Effort & Impact**: Assign effort (S/M/L) and architectural risk (High/Med/Low) to each item.

## Limits

- Do not perform spontaneous refactors during the audit.
- Do not log trivial stylistic preferences as technical debt.

## Output

A Markdown backlog table:
- **Component / File**
- **Issue Description**
- **Impact (High/Med/Low)**
- **Effort (S/M/L)**
- **Remediation Plan**
