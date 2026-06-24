---
action: ENHANCE
label: ENHANCE-
phase: 04-before-production
modifies_code: true
requires_context:
  - project_state
  - business_goal
stop_conditions:
  - missing_required_context
  - unsafe_to_continue
---

# ENHANCE- Privacy, Cookies, and Legal Publication Readiness

## Proposito e intencion
Corregir e implementar lo necesario para que una web pueda salir a internet con una postura legal y de privacidad honesta: cookies, politica de privacidad, textos legales, consentimiento y enlaces visibles. No sustituye asesoramiento legal profesional, pero elimina riesgos obvios y reduce exposicion a multas.

## Cuando usarlo
- Despues de `audit-privacy-legal-and-compliance.md`.
- Antes de publicar en produccion o entregar al cliente.
- Cuando faltan paginas legales, banner de cookies, consentimiento o inventario de terceros.

## Prompt
Actua como Staff Engineer, Privacy Engineer y Product Counsel Partner. Corrige el proyecto para que su salida publica sea legalmente prudente, clara para el usuario y tecnicamente coherente con lo que realmente hace la web.

Entradas:
- Jurisdiccion principal: `{{JURISDICCION}}`
- Tipo de negocio: `{{TIPO_NEGOCIO}}`
- Datos recogidos: `{{DATOS_RECOGIDOS}}`
- Terceros usados: `{{TERCEROS}}`
- Stack y rutas: `{{STACK_RUTAS}}`
- Contacto legal/responsable: `{{CONTACTO_LEGAL}}`

## Requisitos minimos obligatorios
- Crear o corregir una pagina de Politica de Privacidad accesible desde footer y rutas legales.
- Crear o corregir Politica de Cookies o seccion equivalente si hay cookies o tracking.
- Crear o corregir Aviso Legal, Terminos, disclaimers o pagina legal equivalente si aplica al negocio.
- Implementar banner/centro de preferencias de cookies con aceptar, rechazar y configurar.
- Bloquear analytics, pixels, marketing, embeds no esenciales y scripts de terceros hasta consentimiento valido.
- Guardar preferencias de consentimiento y permitir cambiarlas despues.
- Inventariar cookies y terceros: nombre, finalidad, proveedor, duracion, categoria y base de uso.
- Revisar formularios: informacion de privacidad, consentimiento cuando aplique y enlace a politica.
- Revisar footer, navegacion y SEO para que las paginas legales sean encontrables.
- Eliminar claims legales falsos o absolutos como `100% GDPR compliant` si no estan respaldados.

## Contenido minimo de Politica de Privacidad
Debe cubrir, con placeholders claros si falta informacion real:
- Responsable o titular del sitio.
- Datos personales recogidos.
- Finalidades de tratamiento.
- Base legal.
- Conservacion/retencion.
- Destinatarios y encargados de tratamiento.
- Transferencias internacionales si existen.
- Derechos del usuario.
- Contacto para privacidad.
- Fecha de ultima actualizacion.

## Contenido minimo de Politica de Cookies
Debe cubrir:
- Que son las cookies.
- Que cookies se usan.
- Categorias: necesarias, analiticas, marketing, preferencias u otras.
- Como aceptar, rechazar o cambiar preferencias.
- Terceros que instalan cookies.
- Duracion aproximada.

## Mas alla de estos criterios
No hagas teatro legal. Si el proyecto no usa cookies no esenciales, dilo claramente y no inventes complejidad. Si usa herramientas de terceros, describe lo que realmente ocurre. La confianza se protege con honestidad, no con textos enormes copiados.

## Limites de seguridad
- No inventes datos del responsable, domicilio, CIF/NIF, emails, terceros o jurisdiccion.
- No des asesoramiento legal definitivo. Marca revision legal humana si hay venta regulada, salud, finanzas, menores, datos sensibles o tracking avanzado.
- No actives tracking por defecto si no es estrictamente necesario.
- No ocultes botones de rechazo ni uses dark patterns.

## Checks finales
- [ ] Footer enlaza a Politica de Privacidad.
- [ ] Footer enlaza a Politica de Cookies si aplica.
- [ ] Footer enlaza a Aviso Legal/Terminos si aplica.
- [ ] Banner permite aceptar, rechazar y configurar.
- [ ] Scripts no esenciales esperan consentimiento.
- [ ] Formularios enlazan politica y explican uso de datos.
- [ ] No quedan placeholders legales criticos sin marcar.
- [ ] Build/lint/test relevante pasa.

## Formato de entrega
Entrega resumen minimo:
- Paginas y componentes legales creados o corregidos.
- Cookies/terceros inventariados.
- Scripts bloqueados hasta consentimiento.
- Placeholders que requieren datos reales del cliente.
- Verificacion ejecutada.
