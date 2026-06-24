---
action: AUDIT
label: AUDIT-
phase: 04-before-production
modifies_code: false
requires_context:
  - project_state
  - business_goal
stop_conditions:
  - missing_required_context
  - unsafe_to_continue
---

# Checklist Humano - 04 Before Production

## Que incluye esta fase
- Comprobar riesgos antes de salir a internet.
- Revisar seguridad, privacidad, cookies, politicas legales y cumplimiento.
- Validar SEO, analitica, logs, costes, escala y casos de borde.
- Corregir bloqueos reales antes de release candidate.

## Que puedes hacer con los prompts de esta fase
- **AUDIT-**: encontrar riesgos legales, tecnicos, SEO, analiticos, seguridad y escala sin tocar codigo.
- **ENHANCE-**: corregir hardening, cookies, privacidad, paginas legales y configuracion prefinal.
- **GENERATE-**: crear artefactos faltantes si una politica, pagina o configuracion no existe.
- **INIT-**: no aplica; si estas aqui, el producto ya deberia existir.

## Checklist humano legal antes de publicar
- [ ] Existe pagina de Politica de Privacidad accesible desde footer y rutas legales.
- [ ] Existe Politica de Cookies o seccion clara de cookies.
- [ ] Existe Aviso Legal, Terminos o texto equivalente si el proyecto lo requiere.
- [ ] El banner de cookies no activa analitica/marketing antes del consentimiento.
- [ ] El usuario puede aceptar, rechazar y configurar cookies no esenciales.
- [ ] Las preferencias de consentimiento se guardan y pueden cambiarse.
- [ ] La politica explica responsable, datos recogidos, finalidades, base legal, retencion, terceros, derechos y contacto.
- [ ] Los formularios tienen consentimiento o informacion legal suficiente.
- [ ] Analytics, pixels, embeds, mapas, chat y scripts externos estan inventariados.
- [ ] No hay claims legales falsos tipo "100% GDPR compliant" sin soporte real.

## Checklist humano antes de pasar a Final Audit
- [ ] QA adversarial no tiene bugs criticos abiertos.
- [ ] Seguridad y privacidad no tienen bloqueos criticos.
- [ ] SEO tecnico basico esta completo.
- [ ] Logs y gestion de errores funcionan.
- [ ] Costes y limites de terceros estan entendidos.
- [ ] El producto puede salir a internet sin riesgos obvios de multas o perdida de confianza.

## Prompts clave
- `audit-privacy-legal-and-compliance.md`
- `enhance-privacy-cookie-legal-publication-readiness.md`
- `audit-security-risk-checkpoint.md`
- `audit-final-seo.md`
- `apply-prefinal-hardening-flow.md`
