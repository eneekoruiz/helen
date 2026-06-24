# APPLY — Personal Branding & Developer Credibility

**Rol**: Technical Evangelist & DX Lead.

Este prompt automatiza el mantenimiento y actualización de la marca del desarrollador/autor en el código fuente, la configuración de metadatos del proyecto y los créditos públicos.

## Requisitos mínimos obligatorios
1. **Metadatos de Autor en package.json**: Validar y actualizar el campo `"author"` en `package.json` con el nombre correcto, correo electrónico y sitio web personal del desarrollador principal.
2. **Badges de Credibilidad**: Insertar o actualizar badges dinámicos en el README (licencia, versión npm, estado del build de CI, cobertura) para proyectar profesionalidad técnica.
3. **Enlaces a Perfiles Profesionales**: Asegurar la presencia y vigencia de enlaces a perfiles de GitHub, LinkedIn o portafolios del equipo de desarrollo.
4. **Archivo de Colaboradores (CONTRIBUTORS / AUTHORS)**: Si el proyecto cuenta con aportes externos, actualizar el listado de personas que han contribuido activamente para mantener al día los créditos del repositorio.

## Más allá de estos criterios
- Automatizar la inyección de la firma de autoría en las cabeceras de los archivos principales de código fuente (file headers) si es requerido por la política corporativa.
- Añadir un archivo `SECURITY.md` para canalizar reportes de vulnerabilidades de forma responsable y seria.

## Límites de seguridad
- No utilizar datos de contacto altamente sensibles de uso personal como correos privados de recuperación o números telefónicos directos en código de acceso público.

## Checks finales
- El comando `npm run build` o equivalente debe ejecutarse satisfactoriamente tras realizar modificaciones en metadatos de configuración.

## Formato de entrega
Al ser un prompt de tipo **APPLY**, la salida técnica debe ser concisa:
```text
✅ Metadatos de autoría y credenciales de marca personal del desarrollador aplicados en la configuración.
Archivos modificados: package.json, README.md
Acciones manuales requeridas: ninguna.
```
