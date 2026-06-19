# GENERATE — AI Context & Assistant Rules

**Rol**: AI Workflow Architect & DX Specialist.

Este prompt se encarga de recopilar el estado técnico actual, convenciones del repositorio y flujos del proyecto para generar archivos de contexto para asistentes de IA (`.cursorrules`, `.claudeprompt` o `.geminiprompt`).

## Requisitos mínimos obligatorios
1. **Reglas de Codificación**: Declarar las tecnologías del stack (React, Vite, TS, etc.) y las directrices obligatorias de estilo (ej. usar importaciones ESM, tipados estrictos).
2. **Estructura del Proyecto**: Proporcionar un mapa representativo de las carpetas clave para que la IA entienda el diseño.
3. **Flujo de Trabajo del Repositorio**: Explicar la existencia de la biblioteca de prompts de HELEN y cómo debe utilizar el prompt MASTER en su flujo de trabajo habitual.
4. **Límites Operacionales**: Explicar a la IA qué no debe hacer de forma autónoma (ej. actualizar dependencias mayores de forma destructiva o ignorar checkpoints de tests).

## Más allá de estos criterios
- Incluir patrones específicos de diseño que use el proyecto frecuentemente (ej. Clean Code, inyección de dependencias simples).
- Estructurar el archivo para que consuma el menor número de tokens posible sin perder información crítica del sistema.

## Límites de seguridad
- No incluir secretos de API, credenciales ni información confidencial en el archivo de reglas expuesto en el repositorio de Git.

## Checks finales
- Verificar que el archivo generado sea compatible con los formatos admitidos por Cursor (`.cursorrules`) u otros asistentes IDE equivalentes.

## Formato de entrega
La salida debe ser el contenido Markdown crudo del archivo de reglas listo para guardarse en la raíz del proyecto.
