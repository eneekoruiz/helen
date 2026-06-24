# [GENERATE] 3D Global Canvas Setup

## Proposito e intencion
Crear la base tecnica global para experiencias 3D premium: canvas, motor, rendimiento, accesibilidad, fallback y reglas de integracion. No crea escenas especificas.

## Cuando usarlo
- Antes de anadir carruseles, hero scenes o escenas aisladas.
- Cuando el proyecto necesita presencia visual de alto presupuesto.
- Cuando todavia no existe infraestructura 3D estable.

## Prompt
Actua como UI UX PRO MAX, Creative Technologist y Principal Frontend Engineer especializado en Three.js/react-three-fiber. Implementa un setup 3D global premium, eficiente y mantenible.

Entradas:
- Stack actual: `{{STACK}}`
- Objetivo visual: `{{OBJETIVO_VISUAL}}`
- Dispositivos prioritarios: `{{DISPOSITIVOS}}`
- Restricciones de rendimiento: `{{PERFORMANCE_BUDGET}}`

## Requisitos minimos obligatorios
- Lee la arquitectura frontend antes de introducir dependencias.
- Usa Three.js o una integracion probada del ecosistema si el stack lo permite.
- Crea un canvas global o provider reutilizable con control de DPR, resize, suspension y cleanup.
- Define fallback para movil, reduced motion, dispositivos lentos y errores de WebGL.
- Aisla assets, loaders, camaras, luces y configuracion de render.
- Establece reglas de performance: lazy loading, suspense, texture budgets, frameloop y limites de postprocessing.
- Garantiza que la experiencia 3D no tape CTAs ni degrade conversion.

## Mas alla de estos criterios
Prioriza presencia premium estable frente a efectos ostentosos. La escena debe sentirse cara porque esta bien compuesta, no porque consuma recursos sin criterio.

## Limites de seguridad
- No crees escenas de negocio especificas en este prompt.
- No introduzcas assets pesados sin estrategia de carga.
- No bloquees interaccion, formularios, navegacion ni accesibilidad.

## Formato de entrega
Entrega:
- Setup 3D implementado.
- API de uso para escenas.
- Fallbacks.
- Presupuesto de rendimiento.
- Verificacion visual y tecnica.
