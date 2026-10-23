# Validación realizada

[Volver al README](../README.md)

Verificación realizada el **23 de octubre de 2026** en este equipo Linux, con Docker Compose y Ollama `0.40.10`. Los casos utilizados son ficticios y no aportan validación clínica.

## Compilación y pruebas

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
