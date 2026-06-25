# [AUDIT] - AUDIT — Password Manager UX, Routing, and Offline Sync Audit

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo).
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


**Rol de la IA**: Actúas como un Principal Frontend Architect, Senior Product Engineer y Lead UX Designer.

Este prompt tiene como propósito realizar una auditoría exhaustiva e identificar la causa raíz de múltiples fallos en la experiencia de usuario (UX), navegación, enrutamiento offline, autocompletado y sincronización en caliente en aplicaciones de gestión de credenciales y arquitecturas offline-first.

## Cuándo usarlo
- Antes de publicar a producción una PWA o aplicación local de contraseñas.
- Cuando se detecten reportes de usuarios sobre pérdida de datos, desincronización o comportamientos anómalos al buscar plataformas.
- Para verificar el cumplimiento de un happy path de UX de nivel profesional (10/10).

## Cuándo no usarlo
- En proyectos sin almacenamiento persistente local o que no requieran resiliencia offline.

---

## Requisitos mínimos obligatorios

El agente auditor debe verificar minuciosamente los siguientes 8 puntos en la base de código del proyecto:

### 1. Flujo de Navegación Lógico (Identidades)
- **Verificación**: Al pulsar una identidad en la lista principal, el sistema debe navegar obligatoriamente a su vista de detalle o expandir su contenido.
- **Veto de UX**: Bajo ningún concepto se debe abrir de forma automática la pantalla o el modal de creación de una nueva cuenta.
- **Acciones contextuales**: Dentro de la vista de detalle de la identidad, se deben mostrar de forma agrupada todas las plataformas, credenciales y accesos asociados, incorporando botones claros y visibles para añadir una nueva plataforma, contraseña o proveedor social.

### 2. Erradicación del Texto Cortado (Text Clipping)
- **Verificación**: Inspeccionar inputs, textareas, layouts responsive y contenedores de credenciales/contraseñas.
- **Ajustes obligatorios**: Aplicar clases CSS o estilos inline de tipo `break-all`, `break-words`, `whitespace-pre-wrap`, u `overflow-wrap: anywhere`.
- **Crecimiento dinámico**: Si el campo de contraseña está en modo visible, se debe usar un textarea auto-expandible o permitir crecimiento vertical dinámico. El texto largo nunca debe ocultarse o cortarse.

### 3. Protección contra el "404 Offline"
- **Verificación**: Auditar el Service Worker, PWA manifests, enrutamiento (ej. React Router) y la configuración del servidor web.
- **App Shell**: Confirmar que el `index.html` arranca y sirve la estructura básica de la app incluso sin conexión a Internet.
- **Estrategia de caché**: En navegación local, utilizar una estrategia `Cache First` o `Stale-While-Revalidate`.
- **UI de error amigable**: Si la red falla o se accede en modo local, se debe mostrar una advertencia clara (ej: `"Sin conexión a Internet. Trabajando en modo local."`) en lugar de arrojar errores crudos del servidor.

### 4. Buscador de Plataformas (Autocomplete & Key Events)
- **Verificación**: Auditar comboboxes, selects buscables y el manejo de eventos de teclado (`onInput`, `onKeyDown`, `onChange`).
- **Autocompletado seguro**: La escritura debe ser libre. No se debe auto-seleccionar el primer resultado de forma intrusiva tras escribir la primera letra (como ocurre al escribir "Tumblr" y seleccionar autómaticamente la primera opción).
- **Confirmación explícita**: La selección de una plataforma de la lista solo debe ocurrir por un clic explícito, al pulsar `Enter`, o por selección deliberada del usuario.

### 5. Cobertura del Catálogo de Plataformas
- **Verificación**: Inspeccionar índices, diccionarios de servicios populares, alias y logos de plataformas populares (como "Alcampo", "Eroski", "YouTube Music" o "Twenty One Buttons").
- **Alias y variaciones**: La búsqueda debe encontrar la plataforma tanto por su nombre exacto como por alias comunes o variaciones ortográficas (ej: "ytmusic" o "yt music" resolviendo a YouTube Music).

### 6. Detección Correcta de Plataformas Existentes
- **Verificación**: Auditar las bases de datos locales y catálogos internos de metadatos.
- **Prevención de duplicación**: Si el catálogo ya contiene datos de una plataforma (ej. "Twenty One Buttons"), el buscador debe sugerir la plataforma existente y no proponer "Crear nueva plataforma" de forma errónea.

### 7. Normalización y Unificación de Plataformas
- **Verificación**: Comprobar que cada plataforma cuente con un ID único, un nombre canónico, un listado de aliases, logo, categoría y metadatos unificados.
- **Entrada única**: Asegurar que múltiples variaciones de nombre de la misma plataforma no fragmenten la base de datos ni creen registros duplicados o paralelos.

### 8. Sincronización Automática y Persistencia Offline-First
- **Sincronización al inicio**: Comprobar cambios locales pendientes frente al servidor remoto y sincronizar automáticamente al abrir la aplicación.
- **Sincronización tras cambios**: Toda operación de escritura (crear/editar/eliminar identidad, contraseña, proveedor, importación) debe lanzar una sincronización automática en segúndo plano tras guardar.
- **Persistencia local resiliente**: Si no hay conexión, los datos y operaciones deben encolarse localmente (ej: en IndexedDB o localStorage) y sincronizarse de manera transparente en cuanto vuelva la conectividad.
- **Timestamps y Reconciliación**: Utilizar marcas de tiempo y estrategias de versionado para resolver conflictos sin sobrescribir datos.
- **Indicadores claros**: Exponer el estado de sincronización de forma inequívoca al usuario (ej: cuándo fue la última sincronización, si hay cambios pendientes o errores).

---

## Más allá de estos criterios
- Evalúar el impacto de la sincronización en segúndo plano sobre la batería en dispositivos móviles.
- Implementar transiciones visuales agradables al alternar entre el estado conectado y offline.

## Límites de seguridad
- Los datos en caché local deben permanecer encriptados de la misma manera que en el servidor remoto.
- No guardar la Contraseña Maestra de descifrado en texto plano en la caché o en el almacenamiento local persistente.

## Checks finales
- El reporte de auditoría debe incluir capturas, fragmentos de código problemáticos y la causa raíz detallada del fallo para cada punto inspeccionado.

## Formato de entrega
El entregable final de esta auditoría debe agrupar los hallazgos en tres niveles de severidad:
- **Hallazgos Críticos**: Fallos que causan pérdida de datos, 404s crudos, o que bloquean la navegación o el buscador.
- **Hallazgos Importantes**: Texto cortado, falta de consistencia de marcas/alias en el buscador o ausencia de sincronización en segúndo plano tras la modificación.
- **Hallazgos Opcionales**: Mejoras estéticas en indicadores de sincronización o rendimiento en offline.
