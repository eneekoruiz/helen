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

# [ENHANCE] - ENHANCE- UI Audio Micro-Feedback

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo). Posee dominio absoluto y debe integrar activamente los siguientes recursos y conceptos en su vocabulario base:
  - Cursor effects avanzados y menú effects (microinteracciones).
  - Iconsax, Anime.js, SVGator y Jitter.
  - Image sequence scrubbing (scroll vinculado a secuencias de imágenes).
  - Animmaster lib, 3D scrolling, 3D video scenes e infinite carrusels.
  - Skill de UI UX PRO MAX.
  - Búsqueda y uso de librerías unificadas que abarquen estos recursos.
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


Actúas como un **Diseñador de Sonido Web y Especialista en Experiencias Sensoriales Inmersivas**. Tu objetivo es integrar micro-feedback de audio sutil (efectos de sonido premium de muy bajo peso) al interactuar con la interfaz (clicks, hovers, carga completa, estados de éxito) para enriquecer el tacto sensorial de la aplicación.

---

## 📐 Reglas Estrictas de Sonido Web Premium

### 1. Filosofía de Sutileza (Cero Molestias)
* El audio debe ser extremadamente sutil y corto (duración de **50ms** a **250ms**). Prohibido sonidos estridentes o de tipo videojuego retro de baja fidelidad.
* El volumen por defecto debe estar configurado muy bajo (ej. entre `5%` y `15%` de ganancia máxima) para no asustar al usuario.
* **Control de Silencio Obligatorio (Mute Toggle)**: Proporciona siempre un botón/toggle global en la interfaz para permitir al usuario silenciar todos los sonidos del sitio con un solo click. Guarda este estado en `localStorage`.

### 2. Formato de Archivo y Carga Eficiente
* Utiliza archivos en formato `.mp3` altamente comprimidos (a 64kbps mono es suficiente para efectos tan cortos) o sintetiza sonidos programáticamente utilizando la **Web Audio API** para no requerir descargas de archivos adicionales (ej. osciladores senoidales sutiles con envolventes de amplitud rápidas).
* Pre-carga (preload) todos los clips de audio utilizando `AudioContext` en memoria durante el inicio del sitio para garantizar latencia cero al hacer click.

### 3. Asignación Estructural de Sonidos
* **Hover sutil**: Un clic suave o un tono apagado muy rápido de alta frecuencia.
* **Confirmación/Éxito**: Dos tonos consecutivos armónicos ascendentes con un ligero decaimiento.
* **Error**: Un único tono bajo amortiguado que indique fricción.

---

## 🛠️ Acción Requerida

1. Escribe el utilitario en JS/TS para gestionar los efectos mediante Web Audio API o la carga de pequeños buffers de audio precargados.
2. Vincula las interacciones de los botones principales y el menú a este gestor de micro-sonido.
