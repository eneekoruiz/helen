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
- Evidencia explicita antes de decidir: archivos leidos, contexto de negocio, supuestos y verificacion disponible.
- Bucle de reflexion acotado para tareas criticas: aplicar, auditar, re-aplicar solo si hay brechas materiales y verificar.
- Memoria persistente y obligatoria (escribir siempre en `.quality_audit_log.md` o artefacto equivalente) cuando el cambio afecte decisiones futuras, arquitectura, release, operaciones o calidad de prompts.
- Manejo de excepciones: parar ante riesgo destructivo, legal, privacidad, seguridad o falta de contexto esencial.

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
reflection_loop:
  mode: bounded
  max_material_retries: 2
  stop_when: success_criteria_met_or_no_material_gain
memory_target: .quality_audit_log.md # Cambiar si aplica otro artefacto persistente.
verification:
  - inspect_relevant_files
  - run_available_checks
---
```

## Protocolo agente obligatorio

Antes de modificar o generar, el agente debe declarar internamente su evidencia minima: superficie inspeccionada, criterios de exito, riesgos, supuestos y comandos de verificacion disponibles. Para trabajos de alto impacto, debe ejecutar el ciclo [APPLY/ANALYZE] -> [AUDIT] -> [RE-APPLY si aporta valor material] -> [VERIFY].

No se permite prometer perfeccion absoluta sin pruebas. La salida puede ser minimalista, pero la accion debe estar respaldada por evidencia y por una ruta de recuperacion si algo falla.

## Reglas de decision
- Si el prompt crea una pieza nueva, usa **GENERATE-**.
- Si mejora algo existente, usa **ENHANCE-**.
- Si solo observa, usa **AUDIT-**.
- Si arranca un proyecto o define base estrategica, usa **INIT-**.
- Si un prompt intenta hacer dos cosas incompatibles, dividelo.

## Anti-mediocridad
No aceptes prompts que pidan "mejorar el diseno" sin definir evidencia, limites y verificacion. No aceptes prompts que produzcan copy generico. No aceptes prompts que modifiquen codigo sin leer estructura, dependencias y contratos existentes.