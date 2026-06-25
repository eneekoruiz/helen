# [AUDIT] - Content Model and Editorial Workflow Audit

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo).
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


**Intención**: AUDIT (No modificar código, buscar problemas)

Purpose: Ensure editable content is not just technically editable, but usable, maintainable, safe, and pleasant for the person editing it.

Use this after or before converting static content into CMS fields.

## Prompt

Act as a CMS architect, product designer, content strategist, Staff Frontend Engineer, and client-delivery consultant.

Audit the project's content model and editorial workflow.

## Requisitos mínimos obligatorios

1. Review content model
- Identify fields, groups, repeatable sections, images, rich text, links, metadata, legal text, and global content.
- Check naming, grouping, field type, validation, fallback values, and required/optional status.

2. Review editor experience
- Check whether a non-developer can find and edit the right content safely.
- Flag confusing field names, duplicate fields, overly granular fields, missing previews, and fields that can break layout.

3. Review content safety
- Check max lengths, rich text constraints, image constraints, link validation, required alt text, and fallback behavior.
- Identify content changes that could break UX, SEO, accessibility, or legal claims.

4. Review repeatability
- Identify sections that should be modeled as arrays/repeatable blocks instead of many one-off fields.
- Check whether content keys are stable across reorder, delete, duplicate, and localization.

5. Review delivery readiness
- Check whether the client/editor has instructions, defaults, examples, and recovery guidance.

## Más allá de estos criterios

Think like the person who will receive this tomorrow and immediately ask, "Can I edit this?"

Look for avoidable support tickets: unclear labels, no preview, missing image guidance, no alt text guidance, fields that accept too much, fields that accept too little, and content that requires developer intervention.

Recommend schema simplification when too many fields make the CMS feel fragile.

## Límites de seguridad

- Do not give editors control over product-critical logic unless intentional.
- Do not make every string editable if that creates chaos or breaks consistency.
- Do not allow unbounded rich text where structured fields are safer.
- Do not remove developer-owned guardrails.

## Checks finales

- Field names are understandable.
- Repeatable content is modeled cleanly.
- Editor can recover from missing/invalid content.
- SEO/accessibility-critical fields are protected.
- Client handoff notes are clear.

## Formato de entrega

1. Content model map.
2. Editorial UX issues (classified by severity: Críticos, Importantes, Opcionales).
3. Fields to merge, split, rename, or constrain.
4. Missing repeatable structures.
5. Client handoff recommendations.
6. Delivery risk verdict.
