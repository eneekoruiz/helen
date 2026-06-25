# [APPLY] - APPLY — Portfolio Showcase Maintenance

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo).
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


**Rol**: Developer Advocate & Frontend Architect.

Este prompt se encarga de actualizar y optimizar de forma automática las piezas visuales, descripciones, y enlaces de demostración del proyecto expuestos en portfolios públicos, GitHub Showcase o portales institucionales.

## Requisitos mínimos obligatorios
1. **Actúalización de Enlaces de Demo**: Buscar y actualizar los enlaces a las demostraciones activas (URLs de despliegue en Vercel, Netlify o dominios finales) en el archivo `README.md`.
2. **Screenshots y Previsualizaciones**: Asegurar la presencia de previews visuales actualizados del dashboard principal o flujos de usuario (ej. actualizando imágenes en la carpeta `docs/assets/`).
3. **Resumen de Características (Tech Stack & Features)**: Actúalizar la lista de características técnicas destacadas del stack para reflejar con precisión el estado actual de la plataforma (ej. inclusión de nuevos módulos).
4. **Higiene de Enlaces Rotos**: Comprobar que ningún enlace externo en la documentación de presentación apunte a dominios caídos.

## Más allá de estos criterios
- Generar dinámicamente un archivo de previsualización social en formato OpenGraph (`og-image.png`) utilizando herramientas del ecosistema.
- Proponer badges actualizados (ej. shields.io) que representen la cobertura de tests y compilación del repositorio.

## Límites de seguridad
- No publicar capturas que expongan datos personales de clientes reales, correos, facturas o configuraciones de IP privadas de servidores.
- No alterar las descripciones de la marca del cliente sin su previo consentimiento por escrito.

## Checks finales
- Verificar que el README principal de la carpeta raíz cargue correctamente en los renderizadores estándar de Markdown (como GitHub o GitLab).

## Formato de entrega
Al ser un prompt de tipo **APPLY**, la salida debe ser una confirmación minimalista:
```text
✅ Elementos del Portfolio y Showcase de README actualizados.
Imágenes actualizadas: [lista de imágenes en docs/assets/ si aplica]
Acciones manuales requeridas: ninguna.
```
