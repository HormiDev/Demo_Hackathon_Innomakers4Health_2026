# Contrato de API

[Volver al README](../README.md)

Especificación OpenAPI: `http://localhost:8080/api/openapi.json`. Se puede importar en un cliente de API local. Todas las respuestas incluyen `Cache-Control: no-store`.

## Rutas

| Método y ruta | Entrada | Salida |
| --- | --- | --- |
| `GET /api/health` | Ninguna | `status`, `model`, `message` |
| `GET /api/catalog` | Ninguna | Versión, destinos, zonas, síntomas con reglas de sugerencia, alarmas, preguntas y límite |
| `POST /api/next-question` | Caso completo | Estado, pregunta o `null`, origen, advertencias y número respondido |
| `POST /api/classify` | Caso completo con `reviewed: true` | Estado, destinos ordenados, advertencias, modelo, versión, latencia y datos considerados |

## Entrada de caso

Ejemplo válido: [adult.json](../examples/adult.json). El caso pediátrico está en [pediatric.json](../examples/pediatric.json).

| Campo | Tipo y restricciones |
| --- | --- |
| `age_months` | Entero estricto, 0–1440; evita ambigüedad en edades de lactantes |
| `gender` | Opcional: `female`, `male`, `non_binary`, `other`, `not_specified` (por defecto); género declarado, no sexo biológico |
| `respondent` | `self` o `companion` |
| `reason` | Texto de 3–600 caracteres, con contenido no vacío |
| `body_zones` | Lista no vacía de identificadores de `/api/catalog` |
| `body_details` | Opcional, por defecto `{}`: objeto de zona seleccionada a lista no vacía de puntos del catálogo `body_details`; no admite duplicados ni puntos de otra zona |
| `onset` | `sudden`, `gradual`, `unknown` |
| `duration` | `hours`, `days`, `weeks`, `months`, `years`, `unknown` |
| `evolution` | `improving`, `stable`, `worsening`, `intermittent`, `unknown` |
| `pain` | Entero estricto 0–10 o `null` si no se sabe valorar |
| `symptoms`, `alarms` | Listas no vacías de opciones del catálogo |
| `answers` | Hasta ocho pares de identificador y opción; lista de opciones para preguntas múltiples |
| `history` | Texto UTF-8, hasta 1 MiB; el presupuesto de inferencia es más pequeño |
| `reviewed` | Booleano; obligatorio `true` para clasificar |

No se aceptan campos adicionales. Las opciones excluyentes (`none`, `unknown`; también `general` en zonas) no se pueden combinar. Se rechazan duplicados, opciones inexistentes y respuestas de ramas que ya no se aplican.

## Respuestas

`health.status`: `ready`, `model_missing`, `unavailable` o `incompatible`. La ruta devuelve HTTP 200 también cuando el modelo no está listo para que la interfaz pueda mostrar el estado.

`next-question.status`: `question`, `complete`, `limit` o `urgent`. `source` distingue `rules` y `model`. Una pregunta contiene `id`, `label`, `kind`, `options` y condiciones del catálogo.

`completion_reason` distingue `model_enough`, `no_candidates`, `limit` y `urgent`; es `null` mientras se pregunta. `candidates_considered` cuenta las candidatas de la última selección de Tev y `eligible_count` las elegibles pendientes antes de acotar. `considered_questions` contiene sus pares `id`/`label`, con un máximo de doce. Estos campos permiten explicar la finalización incluso con cero respuestas, sin inferir un fallo del cuestionario. Las reglas pediátricas y de alarma no hacen una selección con Tev.

Las preguntas publican `parts` por tipo de ampliación, límites de edad, `genders`, contexto temporal, `requires_answers`, `answer_or_symptoms`, exclusiones por síntomas o puntos ya descritos y `decision_hint`. Las condiciones se aplican antes de presentar candidatas; el criterio de utilidad permite al modelo elegir una pregunta o `enough`. `genders` no invalida un síntoma íntimo explícito de otra familia. Una respuesta que pierde su dependencia se rechaza con 422.

`classify.status`: `classified`, `inconclusive` o `urgent`. Cada elemento de `rankings` contiene `id`, `name` y `probability` entre 0 y 1. El navegador multiplica por 100 para mostrar los porcentajes: las cinco primeras opciones aparecen directamente y las restantes se agrupan en «Otros» con su suma y un detalle expandible. Esto se aplica también a resultados `inconclusive`, sin descartar puntuaciones por su valor. La API, la descarga y la impresión conservan todos los destinos. La demo marca como no concluyente una primera opción `inconclusive`, un máximo inferior al 35 % o una diferencia inferior a 5 puntos porcentuales entre las dos primeras opciones; estos criterios de presentación no tienen validación clínica. `latency_ms` mide la operación de clasificación. En `urgent` por reglas, `rankings` es una lista vacía: no se atribuyen porcentajes al modelo.

`considered_data` conserva el caso recogido y revisado. `model_input_exclusions` declara los campos que no se transmiten para puntuar destinos: actualmente `["gender"]` en respuestas del modelo. El género declarado adapta el formulario, pero no identifica la anatomía clínica; la clasificación utiliza los síntomas y localizaciones explícitos independientemente de ese campo. No se ocultan ni eliminan esos datos del resumen o informe. Las respuestas urgentes por reglas no invocan al modelo y devuelven una lista de exclusiones vacía.

## Errores

```json
{"error":{"code":"context_too_long","message":"El contexto supera el presupuesto de Tev..."}}
```

| HTTP | Ejemplos de código | Acción |
| --- | --- | --- |
| 413 | `request_too_large`, `context_too_long` | Reducir el contenido en el editor |
| 422 | `invalid_case`, `review_required`, `pediatric_questions_required` | Corregir datos o completar revisión |
| 502 | `invalid_model_response` | Revisar la API del modelo y reintentar |
| 503 | `model_unavailable`, `model_rejected`, `tokenizer_missing` | Comprobar instalación y conectividad |
| 504 | `model_timeout` | Reintentar o ajustar el tiempo límite |

Los errores de validación incluyen nombres de campos, sin reflejar valores ni cuerpos del caso. No se devuelven errores crudos de Ollama al navegador. Las rutas `/api` inexistentes devuelven JSON 404.

## Reglas de sugerencia de síntomas

Cada opción de `catalog.symptoms` incluye `zones`, `parts`, `general`, `min_age_months`, `max_age_months`, `preferred_genders`, `onsets` y `durations`. Las listas vacías y edades `null` no restringen esa dimensión. `parts` relaciona un tipo de ampliación con puntos, por ejemplo `{"hand": ["wrist"]}`; sin detalle seleccionado se conserva el perfil regional. `preferred_genders` prioriza la lista principal; no impide añadir otras opciones. El frontend interpreta estos metadatos sin peticiones de inferencia. La API valida edad, identificadores y exclusividad, pero acepta síntomas declarados manualmente de otro punto, zona o familia íntima. La cantidad máxima de síntomas es el tamaño del catálogo; no se mantiene el antiguo límite de 16.

## Localización detallada

`GET /api/catalog` publica `body_details`, un objeto por región con `kind`, vistas `front`/`back`, `default_view` y opciones con `id`, `label` y `views`. Por ejemplo, un caso puede incluir `"body_zones": ["left_hand"]` y `"body_details": {"left_hand": ["index", "wrist"]}`. La API valida los puntos y exige que su región esté seleccionada; `general` y `unknown` no tienen ampliación. No es obligatorio precisar ninguna región. La clasificación devuelve el detalle original en `considered_data`; el estado enviado al modelo utiliza los nombres legibles de la zona y sus puntos.
