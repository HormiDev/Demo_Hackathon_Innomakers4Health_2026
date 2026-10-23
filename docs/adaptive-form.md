# Formulario adaptativo

[Volver al README](../README.md)

## Recorrido

1. **Paciente:** edad en años o meses, quién responde y motivo de consulta.
2. **Molestia:** zonas, dolor, comienzo, duración y evolución.
3. **Síntomas:** opciones asociadas y señales de alarma estructuradas.
4. **Preguntas a medida:** reglas pediátricas y selección de Tev entre preguntas elegibles.
5. **Revisión:** edición del motivo, resumen, historial opcional y confirmación médica.
6. **Orientación:** clasificación completa, advertencias, impresión y descarga.

El formulario utiliza lenguaje sencillo en ambos modos; la vista médica añade la confirmación profesional. El paciente o acompañante puede entregar el mismo navegador al médico. No existe entrega entre dispositivos ni sesión compartida remota.

## Mapa corporal y dolor

El SVG incluye frente y espalda. Las letras I/D indican el lado del paciente, que cambia de posición visual al girar la figura. Los pies, manos, brazos y piernas distinguen ambos lados. Se pueden seleccionar varias regiones; la lista de botones equivale a la selección visual. Las regiones funcionan con Enter y espacio y anuncian su estado con `aria-checked`.

La escala de dolor contiene once botones (0–10) y una alternativa «no sé valorarlo». El valor desconocido es `null`, distinto de cero.

## Motor de preguntas

Las condiciones se definen en `backend/catalog.py`, versión `1.0.0`. Una pregunta puede limitarse por edad y activarse por alguna zona o síntoma. Las preguntas generales no requieren coincidencias.

Antes de consultar a Tev, el servidor comprueba las alarmas. En menores de 216 meses exige preguntas sobre ingesta y comportamiento; por debajo de 24 meses añade tomas y pañales. Después ofrece al modelo todas las preguntas pertinentes aún no respondidas y una opción `enough`.

Tev selecciona una opción; no escribe preguntas libres ni decide sus posibles respuestas. El servidor devuelve la pregunta del catálogo, evitando cambios de formato o preguntas inventadas. Se termina cuando el modelo selecciona `enough`, no quedan candidatas o se alcanzan ocho respuestas. Alcanzar el límite genera una advertencia de suficiencia pendiente.

La decisión `enough` indica que el modelo permite pasar a revisión, no que exista información clínicamente suficiente. Un médico puede revisar lo recogido incluso si falla la inferencia; la clasificación exige siempre mínimos válidos y las preguntas pediátricas obligatorias.

## Modificaciones y extensiones

Cambiar la edad reinicia las preguntas adicionales, para que los mínimos pediátricos tengan espacio dentro del máximo de ocho. Cambiar zona o síntomas elimina las respuestas cuyas condiciones dejan de cumplirse. Toda edición revoca la revisión y el resultado anterior. Para repetir la adaptación, vuelve al bloque de síntomas y continúa con el caso actualizado.

Añadir preguntas requiere opciones estructuradas, condiciones explícitas, un comentario descriptivo de cualquier nueva función y pruebas de las dependencias. Añadir destinos requiere mantener una clasificación conjunta con entre 2 y 24 opciones y revisar el presupuesto de contexto.
