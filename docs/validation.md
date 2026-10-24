# Validación realizada

[Volver al README](../README.md)

Verificación realizada el **23 de octubre de 2026** en este equipo Linux, con Docker Compose y Ollama `0.40.10`. Los casos utilizados son ficticios y no aportan validación clínica.

## Revisión del cuestionario, 24 de octubre de 2026

Catálogo `1.3.0`: 48 preguntas y 75 síntomas. Se verifican filtros por puntos del mapa, edad, género con prioridad de síntomas explícitos, datos ya recogidos y respuestas encadenadas. Se conservan los mínimos pediátricos y la posibilidad de que Tev termine sin ninguna pregunta discrecional.

- Backend: 100 pruebas superadas, incluidas dependencias anatómicas y elección explícita de `enough` desde cero respuestas.
- Frontend: 14 pruebas unitarias superadas y compilación TypeScript/Vite correcta.
- Chrome: 28 recorridos superados en escritorio y móvil; cuatro omisiones previstas de comprobaciones exclusivas de escritorio. La selección del modelo se intercepta en estos recorridos para comprobar de forma reproducible preguntas encadenadas y cierre sin preguntas.

Auditoría adicional con el Tev instalado, sin interceptar la inferencia, usando casos ficticios:

| Contexto | Observación |
| --- | --- |
| Mano izquierda, muñeca seleccionada y motivo poco preciso | Antes terminaba con `enough`; tras la revisión pregunta por el gesto que provoca la molestia (`hand_use`) |
| Cabeza, frente seleccionada y contexto escaso | Selecciona una pregunta de síntomas acompañantes (`head`) |
| Talón derecho, primeros pasos, relación con reposo y actividad, antecedentes y medidas ya descritos | Termina con `enough` desde cero preguntas; se valoran seis candidatas |
| Índice izquierdo, bloqueo ya marcado en síntomas | No vuelve a preguntar si se bloquea; el filtro excluye `finger_motion` y Tev pregunta por el uso de la mano |

Estas ejecuciones demuestran que ambos recorridos son posibles; no son una evaluación clínica ni garantizan que Tev elija siempre la mejor pregunta. El texto libre puede interpretarse de manera imperfecta. Los criterios de utilidad y la lista corta no alteran las probabilidades ni imponen una pregunta para completar la demo.

## Presentación de la demo, 24 de octubre de 2026

La limpieza posterior de presentación se comprueba con el proyecto de escritorio del navegador configurado a 1366×768, además de los casos explícitos de 1280×720 y 1920×1080 y la variante móvil de 390×844. Las comprobaciones incluyen tamaño mínimo de los textos del modelo, rol y etiquetas, ausencia de desplazamiento en los primeros formularios y resultado principal visible sin desplazar en el recorrido estándar de escritorio. El historial opcional se abre explícitamente en el recorrido de carga de archivos.

Resultado de esta revisión: compilación correcta, 14 pruebas unitarias y 28 recorridos de navegador superados; cuatro omisiones previstas de comprobaciones de escritorio en el proyecto móvil. La inspección visual adicional con un caso ficticio de muñeca no necesita desplazamiento en paciente, molestia, síntomas, revisión médica ni resultados a 1280×720 y 1366×768 con los detalles opcionales cerrados.

## Compilación y pruebas iniciales (23 de octubre)

| Comprobación | Resultado |
| --- | --- |
| Compilación TypeScript y Vite | Correcta, también dentro de Docker |
| Imagen multietapa y arranque Compose | Correctos; contenedor saludable |
| Backend aislado | 34 pruebas superadas |
| Frontend unitario | 6 pruebas superadas |
| Navegador Chrome, escritorio y móvil | 4 recorridos superados |
| Ollama local | `tev1:4b`, capacidad `decision`, estado `ready` |
| Peticiones externas desde la interfaz | Ninguna observada durante la inspección |
| Comentarios de funciones Python y enlaces Markdown locales | Comprobados |

Los recorridos de navegador cubren mapa frontal/posterior y selección por teclado, cuestionario, carga real de Markdown, revisión obligatoria, lista de 23 destinos, descarga, borrado, prioridad de alarmas y pérdida intencional de datos al recargar. La inferencia se intercepta solo en esas pruebas de interfaz; la comprobación siguiente utiliza el modelo real.

Las pruebas del backend emiten una advertencia de obsolescencia de una API interna de AnyIO utilizada por Starlette TestClient. No se observaron fallos de ejecución.

## Comprobación real con Tev

Ejecución de `scripts/live_check.py` contra la aplicación en **http://localhost:8180**. Se utilizó 8180 porque 8080 estaba ocupado por otro servicio. El puerto de distribución sigue siendo configurable y su valor predeterminado es 8080.

| Caso ficticio | Preguntas adicionales | Primeros destinos observados | Clasificación | Recorrido completo |
| --- | --- | --- | --- | --- |
| Adulto, dolor en la planta del pie | 0; Tev eligió información suficiente | Podología 98,30 %; Traumatología 1,18 %; Atención Primaria 0,23 % | 386 ms | 13.426 ms |
| Menor, tos y congestión | 2 obligatorias por edad | Neumología 49,41 %; Pediatría 44,86 %; Otorrinolaringología 5,56 % | 494 ms | 781 ms |

Ambas respuestas contienen 23 probabilidades finitas, ordenadas y con suma aproximadamente igual a uno. El tiempo del recorrido incluye todas las peticiones y puede incluir carga del modelo; no es un benchmark de rendimiento ni una garantía de latencia. En estas ejecuciones, Tev no pidió preguntas discrecionales después de los mínimos.

Los valores son observaciones técnicas, no resultados clínicos esperados. En particular, la distribución del caso pediátrico no demuestra que esa derivación sea adecuada. No se calibraron ni modificaron los porcentajes para hacerlos coincidir con una expectativa.

## Límites de esta verificación

No se ha evaluado precisión clínica, calibración, sensibilidad de alarmas, resistencia completa a inyección de instrucciones, sesgos ni comportamiento con pacientes reales. El selector de modo médico no es autenticación. El cuestionario y el catálogo requieren revisión del hospital antes de cualquier piloto asistencial.
