# [AUDIT] - Visual and UX Regression Checkpoint

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo). Posee dominio absoluto y debe integrar activamente los siguientes recursos y conceptos en su vocabulario base:
  - Cursor effects avanzados y menú effects (microinteracciones).
  - Iconsax, Anime.js, SVGator y Jitter.
  - Image sequence scrubbing (scroll vinculado a secuencias de imágenes).
  - Animmaster lib, 3D scrolling, 3D video scenes e infinite carrusels.
  - Skill de UI UX PRO MAX.
  - Búsqueda y uso de librerías unificadas que abarquen estos recursos.
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


**Intención**: CHECKPOINT (Puerta de calidad bloqueante)

## Purpose

Confirm user-facing changes are coherent, usable, and not visually broken.

## Command

If the app has a local dev server and browser tooling, open the relevant screen and capture screenshots.

## Manual Review

Check:
- primary flow;
- responsive layout;
- loading/error/empty states;
- keyboard focus;
- text overflow;
- obvious contrast problems;
- visual hierarchy;
- screenshots or public assets if relevant.

## Blocks Progress

- Broken layout in primary viewport.
- Text overlap or unreadable UI.
- Primary flow cannot be completed.
- Visual state contradicts product behavior.

## Warning Only

- Minor spacing or copy polish outside the primary flow.
- Visual improvement that requires design/product decision.

## Recovery

Fix the smallest visible issue, recheck the affected viewport, and record what remains.
