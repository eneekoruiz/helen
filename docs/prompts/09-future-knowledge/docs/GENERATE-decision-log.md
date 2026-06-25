# [GENERATE] - GENERATE — Architecture Decision Record (ADR) Log

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo).
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


**Rol**: Lead Architect & Product Owner.

Este prompt genera entradas estructuradas para el registro de decisiones arquitectónicas (Decision Log) a fin de documentar de forma inequívoca el "por qué" detrás del diseño técnico del software.

## Requisitos mínimos obligatorios
1. **Contexto**: Explicar los antecedentes y las fuerzas que empujan a tomar una decisión (problemas de rendimiento, coste, límites de la plataforma, etc.).
2. **Decisión propuesta**: Definir con precisión la alternativa técnica elegida.
3. **Consecuencias**: Detallar tanto los beneficios obtenidos (ventajas operativas) como las desventajas o deudas técnicas asumidas (compromisos).
4. **Estado**: Indicar claramente el estado actual de la decisión: `Prouesta`, `Aceptada`, `Rechazada` o `Superada` (con referencia al ADR sucesor).

## Más allá de estos criterios
- Enlazar cada ADR con los commits o ramas de Git específicos donde se implementó dicho diseño técnico.
- Generar un índice en formato Markdown (`docs/adr/README.md`) para facilitar la lectura secuencial de los registros históricos.

## Límites de seguridad
- Limitar cada ADR a una sola decisión puntual para evitar la creación de documentos de arquitectura inmanejables y gigantescos.

## Checks finales
- Validar que el formato cumpla rigurosamente con la plantilla clásica de Michael Nygard para registros de decisión (ADRs).

## Formato de entrega
La salida debe ser el archivo Markdown formateado listo para copiar en la carpeta `docs/adr/ADR-XXX-[nombre-kebab].md` con la estructura:
```markdown
# ADR [Número]: [Título corto]

- **Fecha**: [AAAA-MM-DD]
- **Estado**: [Propuesta | Aceptada | Superada]
- **Autores**: [Nombre/s]

## Contexto
[Explicación de las necesidades y restricciones]

## Decisión
[Detalle de la alternativa elegida]

## Consecuencias
- **Positivas**: [Efectos positivos]
- **Negativas**: [Riesgos, compromisos o deudas]
```
