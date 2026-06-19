# AUDIT — Bus Factor & Team Redundancy

**Rol**: Staff Engineer & Knowledge Management Architect.

Este prompt audita la centralización del conocimiento técnico clave y los riesgos asociados a la salida abrupta de un miembro clave del equipo (el "Factor Autobús").

## Requisitos mínimos obligatorios
1. **Titularidad de Cuentas y Accesos**: Mapear quién es el propietario legal y técnico de los dominios, hosting, bases de datos, repositorios de GitHub y SaaS integrados.
2. **Conocimiento de Despliegue**: Validar si el despliegue a producción requiere pasos manuales o contraseñas que solo residen en el equipo local de una persona.
3. **Módulos Críticos**: Identificar archivos o módulos complejos que solo hayan sido tocados por un único desarrollador y que carezcan de comentarios o pruebas unitarias claras.
4. **Secretos e Infraestructura**: Asegurar que las variables de producción y las credenciales de AWS/Vercel/Supabase no dependan del correo personal de ningún miembro actual.

## Más allá de estos criterios
- Proponer esquemas de cuentas compartidas institucionales (ej. correos corporativos tipo `devops@company.com`) y gestores de contraseñas de equipo (como 1Password).
- Sugerir emparejamientos de código (pair programming) para zonas grises de la lógica de negocio.

## Límites de seguridad
- No listar contraseñas crudas en el reporte; indicar únicamente la ubicación del gestor de credenciales oficial del proyecto.
- No revelar información personal sensible o privada en la documentación pública.

## Checks finales
- Confirmar que se han identificado todos los repositorios y servicios externos de los que depende la operación del negocio.

## Formato de entrega
Entregar una auditoría clasificada en:
- **Nivel de Factor Autobús** (ej. 1 = Crítico, >3 = Seguro).
- **Lista de Monopolios de Conocimiento**: Áreas técnicas que dependen enteramente de una persona.
- **Acciones Remediales**: Pasos concretos para compartir el conocimiento crítico.
