# [AUDIT] - Security Risk Checkpoint

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo).
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


**Intención**: CHECKPOINT (Puerta de calidad bloqueante)

## Purpose

Stop unsafe changes before release, delivery, or public exposure.

## Command

Use available commands:
- `npm audit`
- dependency scanner if configured;
- project-specific security checks.

## Manual Review

Check:
- secrets;
- private URLs;
- unsafe logs;
- path handling;
- input validation;
- auth and permissions if applicable;
- dependency risk;
- destructive operations.

## Blocks Progress

- Secret committed or exposed.
- Critical/high dependency issue with reachable impact.
- Unsafe destructive behavior.
- Public release with known sensitive data leakage.

## Warning Only

- Low-severity dependency issue with no reachable path.
- Security improvement that requires larger architecture work and is documented.

## Recovery

Remove exposure, patch or mitigate, document residual risk, and repeat the checkpoint.
