# [AUDIT] - GitHub Repository Audit and Polish

## Nivel 0 y Mente Abierta (Hacia el Nivel 100)
- **Nivel 0**: Se asume como conocimiento mínimo indispensable la excelencia absoluta en el campo (código limpio, "Skill de UI UX PRO MAX", accesibilidad y rendimiento óptimo).
- **Mente Abierta**: Se prohíbe limitar el desarrollo a lo estrictamente pedido. Se exige proactividad extrema: si existe una tecnología más moderna, un enfoque más óptimo o mejores recursos disponibles, deben proponerse y aplicarse sin dudarlo para alcanzar el Nivel 100 de calidad.


**Intención**: AUDIT (No modificar código, buscar problemas) / APPLY (Modificaciones si son seguras, salida mínima)

## Objetivo

Asegurar que el repositorio de GitHub sea legible, creíble, descubrible, ordenado y apto para ser compartido públicamente sin caer en exageraciones.

## Fase Ideal

Al finalizar el desarrollo y preparación de documentación (Final Audit).

## Criterios de Evalúación y Polish

1. **README y About Box**:
   - Confirmar descripción concisa, temas (topics) relevantes de descubrimiento, licencia MIT (o la correspondiente) e imágenes de capturas.
2. **Metadata e Indexación**:
   - Ajustar el título, URL de demostración en vivo (Live Demo) y descripción del repositorio en el panel derecho de GitHub.
3. **Limpieza e Higiene**:
   - Revisar `.gitignore`, excluir notas personales, credenciales y evitar rastreo de archivos temporales.
4. **Visual y Capturas**:
   - Asegurar que el Social Preview Card y los esquemas sean legibles y no engañosos.

## Checkpoints Requeridos

- **Higiene**: Cargar [lint-and-typecheck-checkpoint.md](file:///c:/Users/User/Desktop/PROYECTOS/helen/docs/prompts/02-building/checkpoint/audit-lint-and-typecheck-checkpoint.md).

## Condiciones de Fallo Automático

- Presencia de secretos, tokens o credenciales en el historial o archivos activos.
- El README describe características inexistentes o setup roto.
- Badges rotos, placeholders o enlaces caídos en el documento principal.

## Formato de Entrega

Si se aplican cambios de presentación o metadatos locales (APPLY):
```text
✅ Presentación de GitHub pulida. / [o] ⚠️ Completado con advertencias.

Cambios aplicados:
- [Breve lista de 1-3 viñetas con parches en README, configuración o licencias aplicados]

Acciones manuales necesarias:
- [Ej: Actúalizar la descripción o social preview en la UI web de GitHub]
```

Si se ejecuta una auditoría de repositorio (AUDIT):
1. Repository status map (About, topics, tags).
2. Blocking issues and credibility risks (classified by severity: Críticos, Importantes, Opcionales).
3. Recommended improvements.
4. Verdict: `PASS`, `PASS WITH CAVEATS`, or `FAIL`.
5. Statement: confirms if the repository is star/showcase-ready.
