# Contrato de API

[Volver al README](../README.md)

Especificación OpenAPI: `http://localhost:8080/api/openapi.json`. Se puede importar en un cliente de API local. Todas las respuestas incluyen `Cache-Control: no-store`.

## Rutas

| Método y ruta | Entrada | Salida |
| --- | --- | --- |
| `GET /api/health` | Ninguna | `status`, `model`, `message` |
| `GET /api/catalog` | Ninguna | Versión, destinos, zonas, síntomas, alarmas, preguntas y límite |
| `POST /api/next-question` | Caso completo | Estado, pregunta o `null`, origen, advertencias y número respondido |
| `POST /api/classify` | Caso completo con `reviewed: true` | Estado, destinos ordenados, advertencias, modelo, versión, latencia y datos considerados |

## Entrada de caso

Ejemplo válido: [adult.json](../examples/adult.json). El caso pediátrico está en [pediatric.json](../examples/pediatric.json).

| Campo | Tipo y restricciones |
| --- | --- |
| `age_months` | Entero estricto, 0–1440; evita ambigüedad en edades de lactantes |
| `respondent` | `self` o `companion` |
| `reason` | Texto de 3–600 caracteres, con contenido no vacío |
| `body_zones` | Lista no vacía de identificadores de `/api/catalog` |
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

`classify.status`: `classified`, `inconclusive` o `urgent`. Cada elemento de `rankings` contiene `id`, `name` y `probability` entre 0 y 1. El navegador multiplica por 100 para mostrar porcentajes. `latency_ms` mide la operación de clasificación. En `urgent` por reglas, `rankings` es una lista vacía: no se atribuyen porcentajes al modelo.

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
