# Fase 1: Start Project (Inicio de Proyecto)

**Objetivo de la fase**: 
Establecer las bases metodológicas, analizar riesgos iniciales, evaluar la arquitectura técnica de partida, identificar puntos ciegos y posicionar el proyecto estratégicamente frente a alternativas/competidores antes de escribir código masivamente.

**Cuándo se utiliza**:
- Al inicio de un nuevo desarrollo.
- Al heredar o retomar un repositorio existente cuyo estado es incierto o desordenado.
- Antes de planificar el roadmap de desarrollo para las siguientes semanas.

**Qué problemas resuelve**:
- Falta de dirección técnica clara o arquitectura inadecuada al inicio.
- Riesgos ocultos y deuda técnica temprana no detectados.
- Desarrollo reactivo de features irrelevantes por falta de benchmarking competitivo.
- Dificultades o fricción para incorporar a nuevos desarrolladores (onboarding).

---

## Diferencia Operativa de Etiquetas

- **INIT**: úsalo cuando no existe base suficiente; define negocio, scaffold y reglas premium.
- **AUDIT**: úsalo para observar mercado, riesgos o arquitectura sin modificar archivos.
- **GENERATE**: úsalo cuando el análisis ya existe y toca construir algo nuevo.
- **ENHANCE**: en esta fase solo aplica si ya hay una base existente que deba mejorarse sin romperla.

## Prompts Incluidos en esta Fase

| Prompt / Flow | Intención | Propósito / Cuándo usarlo | Frecuencia |
|---|---|---|---|
| [init-master-business-core.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/01-start-project/init-master-business-core.md) | **INIT** | Inyectar ADN de negocio, tono premium y arquitectura de conversión antes del scaffold. | Alta (Cada proyecto nuevo) |
| [init-architecture-and-scaffold.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/01-start-project/init-architecture-and-scaffold.md) | **INIT** | Convertir el briefing en estructura visual, layout base, tokens y sistema inicial UI UX PRO MAX. | Alta (Cada proyecto nuevo) |
| [audit-competitor-analysis.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/01-start-project/audit-competitor-analysis.md) | **AUDIT** | Escanear competidores para extraer UX, CRO, flujos, trust signals y gaps accionables. | Media |
| [generate-competitive-cloning.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/01-start-project/generate-competitive-cloning.md) | **GENERATE** | Implementar funcionalidades competitivas faltantes en nuestro stack, mejoradas y sin copiar marca. | Media |
| [initial-project-risk-scan.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/01-start-project/initial-project-risk-scan.md) | **AUDIT** | Diagnóstico rápido y ligero de riesgos de build, UX, docs y seguridad. | Alta (Cada inicio de iteración amplia) |
| [methodology-and-blind-spots-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/01-start-project/methodology-and-blind-spots-audit.md) | **AUDIT** | Detectar qué partes del ciclo de vida o de la estructura no estamos viendo. | Media (Una vez por sprint largo) |
| [architecture-operations-and-risk-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/01-start-project/architecture-operations-and-risk-audit.md) | **AUDIT** | Evaluar la solidez de límites, dependencias y modularidad. | Media |
| [developer-onboarding-audit.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/01-start-project/developer-onboarding-audit.md) | **AUDIT** | Analizar la fricción del setup del repositorio para un nuevo colaborador. | Baja |
| [competitive-benchmark.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/01-start-project/competitive-benchmark.md) | **REPORT** | Comparar features y UX frente a alternativas para encontrar oportunidades premium. | Media |
| [roadmap-roi-prioritization.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/01-start-project/roadmap-roi-prioritization.md) | **PLAN** | Priorizar tareas por valor de usuario, ROI y esfuerzo estimado. | Alta |
| [market-analysis-flow.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/01-start-project/market-analysis-flow.md) | **PLAN flow** | Flujo ejecutable que conecta el benchmarking con la priorización del roadmap. | Baja |

---

## Checklist de Transición: ¿Ya estoy preparado para pasar a la siguiente fase?

Antes de pasar a la fase de **Building (02-building)**, asegúrate de responder afirmativamente a las siguientes preguntas:

- [ ] ¿He identificado los riesgos técnicos iniciales y sé cómo mitigarlos?
- [ ] ¿Está clara la arquitectura y la modularidad de base?
- [ ] ¿Tengo una lista priorizada de funcionalidades y quick wins en un roadmap?
- [ ] ¿El setup del repositorio es reproducible por cualquier colaborador sin fricción crítica?

**Siguiente Fase**:
Si la respuesta es **Sí** a todas las anteriores, estás listo para entrar en la fase **[02-building](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/README.md)**.
