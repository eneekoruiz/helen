---
action: AUDIT
label: AUDIT-
phase: 07-client-handoff
modifies_code: false
requires_context:
  - project_state
  - business_goal
stop_conditions:
  - missing_required_context
  - unsafe_to_continue
---

# Checklist Humano - 07 Client Handoff

## Que incluye esta fase
- Preparar entrega al cliente.
- Revisar formularios, links, CTAs, copy, assets y soporte.
- Asegurar que el cliente entiende que se entrega y como mantenerlo.
- Evitar detalles pequenos que arruinan una entrega premium.

## Que puedes hacer con los prompts de esta fase
- **AUDIT-**: revisar puntos de entrega sin modificar codigo.
- **ENHANCE-**: aplicar ultimo pase de delivery y correcciones pequenas.
- **GENERATE-**: crear documentacion de entrega si falta.
- **INIT-**: no aplica.

## Checklist humano antes de entregar
- [ ] Formularios envian y muestran feedback claro.
- [ ] CTAs llevan al destino correcto.
- [ ] Links internos y externos funcionan.
- [ ] Copy y claims estan aprobados.
- [ ] Imagenes tienen alt text y peso razonable.
- [ ] El cliente tiene instrucciones minimas de uso.
- [ ] No quedan marcas de desarrollo, placeholders o contenido interno.

## Prompts clave
- `audit-links-forms-ctas-and-conversion-paths.md`
- `audit-content-copy-brand-and-claims.md`
- `audit-media-assets-alt-text-and-performance.md`
- `apply-client-delivery-flow.md`
