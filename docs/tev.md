# Integración con Tev local

[Volver al README](../README.md)

## Fuente e interfaz

Se utiliza la [API de decisión documentada por Ollama](https://ollama.com/library/tev1), mediante HTTPX directo. No se utiliza `/api/chat` ni se requiere otro modelo generativo. La disponibilidad se consulta con `/api/tags` y se exige capacidad `decision` para mostrar el estado listo.

Cada petición a `/v1/systemone` contiene `model`, `state`, `questions` y `keep_alive`. Se envía una pregunta de tipo `choice`: la siguiente pregunta útil o la especialidad más adecuada. Las instrucciones son fijas; motivo e historial se colocan en `state` como datos no confiables. Esta separación reduce la exposición a instrucciones incrustadas, pero no constituye una garantía contra inyección de prompts.

La respuesta debe incluir `answers.<identificador>.choice` y un objeto `probabilities` completo. Se rechazan valores no numéricos, booleanos, infinitos, negativos, superiores a uno, opciones faltantes o desconocidas y distribuciones cuya suma difiere de uno más de 0,002. El máximo debe ser coherente con la elección. Nunca se normalizan distribuciones ni se producen porcentajes de respaldo.

## Contexto sin truncamiento silencioso

El tokenizador oficial procede de `togethercomputer/Tev1-4B-experimental`, revisión `0b7becf017daa0e5eb222f8ce7483c8c8259c52f`. `scripts/prepare_tokenizer.py` descarga solo `tokenizer.json` durante la preparación y muestra su SHA-256. La imagen final no lo descarga en tiempo de ejecución.

La descarga y cualquier archivo ya existente deben coincidir con el SHA-256 `5f9e4d4901a92b997e463c1f46055088b6cca5ca61a6522d1b9f64c4bb81cb42`.

Se tokeniza la representación JSON de estado y preguntas, sin truncamiento, y se reservan 384 tokens para la plantilla y el formato de Ollama dentro de un presupuesto predeterminado de 2048. Es una comprobación conservadora del cliente: la plantilla final pertenece a Ollama. Si se cambia su formato o el tokenizador del modelo, debe repetirse la validación y ajustar el margen, sin asumir que el contexto máximo publicado implica buen rendimiento en historiales extensos.

Cuando se supera el presupuesto, el backend devuelve HTTP 413 antes de llamar al modelo. El historial completo permanece en el editor para que el médico lo abrevie conscientemente. El límite de archivo de 1 MiB es un límite de lectura, no una promesa de que ese tamaño quepa en Tev. No hay resumen automático ni recortes ocultos.

## Interpretación y funcionamiento

La clasificación compara conjuntamente 23 destinos, incluido «sin orientación concluyente». Los resultados expresan la preferencia del modelo condicionada a ese catálogo y a la información enviada. El campo `confidence` de Tev no se utiliza como certeza clínica.

La documentación del modelo lo identifica como experimental y señala límites en calibración, resistencia a instrucciones adversariales y evaluación de idiomas distintos del inglés. Esta demo mantiene instrucciones de selección en inglés y la información clínica en español; las pruebas de integración demuestran funcionamiento técnico, no rendimiento médico en español.

Para las preguntas a medida, las reglas del catálogo filtran primero la pertinencia. Se presentan como máximo doce candidatas con criterios de utilidad en inglés y la alternativa `enough`; el banco completo no ocupa el contexto. El estado conserva las etiquetas legibles del mapa y añade `body_detail_ids` para identificar los puntos sin traducir. Cada respuesta previa incluye identificador y enunciado. Tev decide si queda algún dato con valor para distinguir vías de derivación y puede terminar desde la primera selección. No se invalida su decisión de terminar por una cuota mínima o por su puntuación.

El timeout predeterminado es de 120 segundos por inferencia y `keep_alive` es de cinco minutos. La interfaz conserva el caso ante fallos y permite reintentar; abandonar un caso cancela la espera HTTP del navegador, aunque Ollama podría terminar trabajo ya iniciado. No se descargan pesos ni se cambia de modelo automáticamente.
