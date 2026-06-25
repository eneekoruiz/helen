# [GENERATE] - Clonacion Competitiva

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo).
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


## Proposito e intención
Tomar un analisis competitivo previo y construir en nuestro stack las funcionalidades que faltan, mejorandolas con criterio propio. Es pragmatico, directo a implementacion.

## Cuando usarlo
- Después de `audit-competitor-analysis.md`.
- Cuando ya existe un proyecto iniciado.
- Cuando la oportunidad competitiva esta validada y toca convertirla en producto.

## Prompt
Actúa como Principal Product Engineer y CRO Implementer. Usa el analisis competitivo como input, selecciona las funcionalidades con mayor impacto y construyelas en el stack actual mejorando UX, claridad, rendimiento y mantenibilidad.

Entradas:
- Analisis competitivo: `{{ANALISIS_COMPETITIVO}}`
- Stack y estructura actual: `{{STACK_ESTRUCTURA}}`
- Funcionalidades objetivo: `{{FUNCIONALIDADES_OBJETIVO}}`
- Restricciones de marca: `{{RESTRICCIONES_MARCA}}`

## Requisitos minimos obligatorios
- Lee la estructura del proyecto antes de editar.
- Implementa solo funcionalidades con impacto claro en conversion o confianza.
- Mejora el patron del competidor: menos pasos, mejor copy, mejor estado responsive, mejor accesibilidad.
- Integra con componentes, estilos y convenciones existentes.
- Anade estados de carga, error, vacío y exito si la funcionalidad los requiere.
- Verifica build, lint o test relevante si el entorno lo permite.

## Mas alla de estos criterios
Si el analisis pide una feature que suena util pero no encaja con el flujo de venta, reduce su alcance o conviertela en un experimento mas pequeno. No confundas paridad competitiva con ventaja competitiva.

## Limites de seguridad
- No copies marcas, textos propietarios, assets protegidos ni estructuras identicas.
- No rompas rutas, tracking, formularios ni CMS existentes.
- No introduzcas librerías pesadas sin justificar el coste.

## Formato de entrega
Entrega cambios aplicados y un resumen minimo:
- Funcionalidades implementadas.
- Archivos tocados.
- Verificacion ejecutada.
