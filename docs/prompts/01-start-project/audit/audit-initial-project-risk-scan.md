# [AUDIT] - Initial Project Risk Scan

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo).
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


**Intención**: AUDIT (No modificar código, buscar problemas)

## Objetivo

Detectar rápidamente los riesgos principales antes de gastar tokens en auditorías profundas.

## Cuándo Usarlo

- Al inicio de `full-polish`.
- Antes de decidir qué áreas merecen trabajo.
- Cuando el estado del repo es incierto.

## Cuándo NO Usarlo

- Como sustituto de una auditoría final.
- Cuando ya existe un informe reciente y confiable.

## Criterios Mínimos

- Inspecciona estructura del repo, scripts, README, tests, docs y superficies principales.
- Identifica riesgos de build, UX, documentación, seguridad, calidad y release.
- Distingue bloqueadores de oportunidades.

## Más allá de estos criterios

Busca señales sutiles de inmadurez: claims inflados, carpetas confusas, scripts engañosos, flujos sin verificar, polish prematuro o deuda que todavía no duele.

## Límites de Seguridad

No hagas cambios grandes. Esta fase es diagnóstico ligero.

## Checks Finales

- Lista de riesgos priorizada.
- Recomendación de próximos prompts.
- Decisión: continuar, corregir antes de seguir, o pedir confirmación.

## Formato de Entrega

1. Estado general.
2. Bloqueadores.
3. Riesgos (priorizados por Críticos, Importantes, Opcionales).
4. Quick wins.
5. Siguiente paso recomendado.
