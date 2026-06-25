# [AUDIT] - AUDIT — Legacy Resistance & Upgradeability

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo).
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


**Rol**: Staff Engineer & Legacy Mitigation Expert.

Este prompt audita la resistencia de la base de código frente a futuras actualizaciones de librerías, dependencias obsoletas y deudas técnicas que dificulten su mantenimiento en los próximos años.

## Requisitos mínimos obligatorios
1. **Versiones obsoletas**: Verificar qué dependencias directas en `package.json` están desactualizadas (ej. con más de 2 versiones principales por detrás de la estable).
2. **Uso de APIs obsoletas**: Escanear advertencias del linter y llamadas a funciones declaradas como deprecated en las librerías Core (React, Vite, Node, TypeScript).
3. **Código espagueti o monolítico**: Localizar componentes o módulos sobredimensionados difíciles de desacoplar o probar unitariamente.
4. **Resistencia a migraciones**: Analizar si las integraciones Core están tan fuertemente ligadas al framework que cambiarlo requiera reescribir todo el backend/frontend.

## Más allá de estos criterios
- Proponer una estrategia de actualización progresiva (roadmap de dependencias) para los próximos 12 meses.
- Estimar el esfuerzo de refactorización (horas/hombre) para eliminar la deuda técnica localizada.

## Límites de seguridad
- No proponer refactorizaciones masivas sin antes contar con tests automatizados robustos que verifiquen el comportamiento de la zona afectada.

## Checks finales
- Asegurar que el reporte ordene la deuda técnica por retorno de inversión (ROI) de la refactorización sugerida.

## Formato de entrega
El veredicto final debe estructurarse bajo:
- **Calificación de Upgradeability**: Puntuación cualitativa (ej. Sólida, Frágil, Crítica).
- **Zonas de Deuda Técnica Alta**: Lista de módulos que ralentizan el desarrollo.
- **Plan de Mitigación Recomendado**: Acciones cronológicas sugeridas.
