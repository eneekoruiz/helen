# Client Delivery Flow

## Objetivo

Preparar el proyecto para entrega a cliente, equipo o mantenedor sin conocimiento privado.

## Fase Ideal

Después de que el producto funcione y antes del handoff.

## Prompts Incluidos

1. `../steps/testing/fast-build-test-verification.md`
2. `../steps/delivery/client-delivery-readiness.md`
3. `../steps/security/security-hardening.md`
4. `../steps/github/github-repository-presentation-polish.md`
5. `../steps/release/release-notes-and-checklist.md`

## Checkpoints Entre Pasos

- Inicio: `../checkpoints/build-and-compile-checkpoint.md`
- Después de verification: `../checkpoints/test-suite-checkpoint.md`
- Después de security: `../checkpoints/security-risk-checkpoint.md`
- Final: `../checkpoints/release-readiness-checkpoint.md`

## Condiciones para Avanzar

- Setup y entrega son reproducibles.
- No hay secretos ni rutas privadas.
- Limitaciones están documentadas.
- El destinatario puede operar el proyecto.

## Cuándo Detenerse

- Falta información crítica de handoff.
- Hay credenciales expuestas.
- El proyecto no puede ejecutarse desde docs.
- El alcance de soporte no está claro.

## Qué Hacer si Falla Algo

Corregir docs/setup si es seguro. Si falta una decisión contractual o de owner, parar y pedir confirmación.

## Resumen Final

1. Paquete de entrega.
2. Checks.
3. Riesgos.
4. Instrucciones para receptor.
5. Sign-off recomendado.
