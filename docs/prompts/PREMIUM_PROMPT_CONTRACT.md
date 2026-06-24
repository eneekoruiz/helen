# Premium Prompt Contract

Este contrato es obligatorio para cualquier prompt nuevo o modificado en HELEN.

## Regla central
HELEN no produce paginas web estandar. Produce activos digitales orientados a venta, confianza y percepcion premium. Cada prompt debe empujar al agente hacia criterio profesional, no hacia volumen de texto.

## Etiquetas canonicas visibles
Usa siempre etiquetas visibles en mayuscula:

- **INIT-**: inicializa ADN de negocio, arquitectura base o scaffold desde cero.
- **GENERATE-**: crea piezas nuevas en un proyecto ya iniciado.
- **ENHANCE-**: mejora piezas existentes con restricciones de no-rotura.
- **AUDIT-**: analiza sin modificar archivos.

Los prefijos legacy `apply-`, `plan-` y `research-` pueden existir por compatibilidad, pero deben mapearse mentalmente a estas etiquetas canonicas.

## Calidad obligatoria
Todo prompt debe exigir:

- Cero rastro de IA en copy, estructura o decisiones visuales.
- Conversion antes que decoracion.
- Tono humano, profesional, especifico y sin claims inventados.
- Restricciones explicitas de seguridad y no-rotura.
- Output acorde a la accion: breve para cambios, severo para auditorias, operativo para inicializacion.
- Criterio premium: micro-interacciones sutiles, jerarquia clara, responsive real y detalle visual con intencion.

## Metadatos obligatorios
Todo prompt atomico en una fase debe empezar con frontmatter YAML:

```yaml
---
action: GENERATE
label: GENERATE-
phase: 03-finish-features
modifies_code: true
requires_context:
  - project_state
  - business_goal
stop_conditions:
  - missing_required_context
  - unsafe_to_continue
---
```

## Reglas de decision
- Si el prompt crea una pieza nueva, usa **GENERATE-**.
- Si mejora algo existente, usa **ENHANCE-**.
- Si solo observa, usa **AUDIT-**.
- Si arranca un proyecto o define base estrategica, usa **INIT-**.
- Si un prompt intenta hacer dos cosas incompatibles, dividelo.

## Anti-mediocridad
No aceptes prompts que pidan "mejorar el diseno" sin definir evidencia, limites y verificacion. No aceptes prompts que produzcan copy generico. No aceptes prompts que modifiquen codigo sin leer estructura, dependencias y contratos existentes.
