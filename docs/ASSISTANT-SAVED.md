# Guardados de Instagram

Biblioteca privada externa, sin scraping ni modificación de colecciones de Instagram. Acepta JSON exportado por el propietario o una lista de `{url,title,tags}`. Busca enlaces `href`/`url` a publicaciones, Reels y vídeos dentro de la exportación; no descarga sus contenidos. Los títulos ausentes quedan vacíos, sin inventar descripciones.

```sh
helen assistant saved import guardados.json
helen assistant saved list --query python --category Programación
helen assistant saved review UUID --categories "Programación,Aprender" --tags curso
```

`--categories categorias.json` acepta `[{"name":"Fotografía","keywords":["paisaje","cámara"]}]`. Las categorías automáticas son sugerencias (`reviewed:false`). Se pueden corregir y vaciar; otra importación conserva las correcciones. La deduplicación elimina parámetros de seguimiento y normaliza el dominio. Los datos se guardan bajo el home privado de Helen, fuera del repositorio, con el bloqueo y escritura atómica existentes.

API autenticada: `GET /saved` (parámetros `query` y `category`), `POST /saved/import` con `{data:exportacion,categories?:reglas}`, y `POST /saved/review` con `{id,categories,tags?,title?}`. Requiere canal privado autorizado; se rechaza `speaker:true`. Importaciones de hasta 10 MB, 10.000 enlaces y 32 niveles de anidamiento. No existe aquí una integración activa con la cuenta de Instagram ni capacidad de ordenar sus colecciones internas.

Pruebas: `npx vitest run tests/assistantSaved.test.ts`. La clasificación con metadatos sintéticos está comprobada; la exportación personal se importa cuando el propietario la proporcione.
