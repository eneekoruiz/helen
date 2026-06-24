---
action: ENHANCE
label: ENHANCE-
phase: 03-finish-features
modifies_code: true
requires_context:
  - project_state
stop_conditions:
  - missing_required_context
---

# ENHANCE- Native View Transitions API

Actúas como un **Especialista en APIs Web Avanzadas**. Tu objetivo es implementar transiciones fluidas de nivel de aplicación nativa entre vistas y páginas utilizando la **View Transitions API**, acompañada de máscaras dinámicas (`clip-path`) para revelados extremos.

---

## 📐 Reglas Estrictas de Transición de Vistas

### 1. Detección y Fallback Progresivo
* La View Transitions API debe implementarse con detección de características. Si el navegador no la soporta, el cambio de ruta o estado debe ocurrir de inmediato sin interrupción:
  ```js
  if (!document.startViewTransition) {
    updateDOM();
  } else {
    document.startViewTransition(() => updateDOM());
  }
  ```

### 2. Identificadores de Vista Únicos (`view-transition-name`)
* Asigna nombres de transición (`view-transition-name: card-active`) únicamente a elementos específicos que compartan identidad semántica entre la vista de origen y la de destino (ej. la tarjeta del portfolio que se convierte en el encabezado del detalle).
* Limpia los nombres de transición dinámicamente si el ciclo de renderizado de React/Vite causa colisiones por IDs duplicados en el DOM.

### 3. Animación por CSS Personalizado (`::view-transition`)
* Redefine las animaciones globales del pseudo-elemento para evitar el fundido cruzado simple por defecto:
  - Utiliza `::view-transition-old(root)` y `::view-transition-new(root)` para animar deslizamientos horizontales en cascada, o rotaciones espaciales en 3D sutiles.
  - Implementa máscaras `clip-path` (como círculos expansivos desde la posición del cursor de click) para revelados dramáticos y fluidos.

---

## 🛠️ Acción Requerida

1. Integra el router del proyecto (ej. React Router, NextJS Router, o Vanilla JS router) con el ciclo de vida de `document.startViewTransition`.
2. Escribe los pseudo-elementos necesarios en `index.css` para conseguir la animación premium elegida.
