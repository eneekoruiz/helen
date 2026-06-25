# [AUDIT] - Adversarial QA and Edge Cases Audit

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo).
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


**Intención**: AUDIT (No modificar código, buscar problemas)

Purpose: Find bugs that normal happy-path testing misses.

## Prompt

Act as a QA Lead, Security Engineer, Staff Engineer, and impatient real user.

Attack the project with edge cases.

## Requisitos mínimos obligatorios

1. Identify critical flows and risky inputs.
2. Test or reason through malformed data, empty data, huge data, duplicate actions, slow network, cancelled actions, permission failures, partial failures, and repeated retries.
3. Review destructive flows and rollback behavior.
4. Check race conditions, concurrency, idempotency, and state recovery.
5. Identify missing regression tests.

## Más allá de estos criterios

Think of weird but plausible user behavior, integration failures, time-based bugs, browser differences, file-system oddities, and state combinations nobody designed for.

## Formato de entrega

1. Edge-case matrix.
2. Bugs found or potential risks (classified by severity: Críticos, Importantes, Opcionales).
3. Missing tests.
4. Manual QA script.
5. Must-fix before release.
