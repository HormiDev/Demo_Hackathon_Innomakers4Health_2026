# Resolución de problemas

[Volver al README](../README.md)

| Síntoma | Comprobación y solución |
| --- | --- |
| Disco lleno durante la compilación | Consulta `df -h .`. Libera espacio bajo tu criterio; la aplicación no elimina modelos ni recursos ajenos. `make fclean` solo limpia sus contenedores e imágenes etiquetadas. |
| Docker deniega acceso al socket | Comprueba tu acceso a Docker según la configuración del equipo. No abras permisos globales al socket. |
| Puerto web ocupado | Cambia `APP_PORT` en `.env`, ejecuta `make up` y abre el nuevo puerto. |
| No conecta con Ollama | Comprueba `curl http://127.0.0.1:11434/api/tags` y `OLLAMA_BASE_URL`. El Compose utiliza la red del anfitrión Linux. |
| Modelo ausente | Instala por tu cuenta el modelo y comprueba que su nombre coincide exactamente con `OLLAMA_MODEL`. Pulsa el botón de comprobación en la interfaz. |
| Modelo incompatible o endpoint inexistente | Usa una versión de Ollama que admita modelos de decisión y `/v1/systemone`, con un modelo que declare `decision`. No sirve sustituirlo silenciosamente por un modelo de chat. |
| Falta el tokenizador | Reconstruye la imagen con `make build`. En desarrollo ejecuta `python scripts/prepare_tokenizer.py`. |
| Contexto demasiado extenso | Abrevia motivo e historial en revisión. Conserva los antecedentes relevantes; el contenido no se recorta automáticamente. |
| Timeout del modelo | Reintenta cuando Ollama esté disponible. Si es necesario, aumenta `OLLAMA_TIMEOUT_SECONDS` y recrea el servicio. |
| Falta información pediátrica | Vuelve a síntomas y continúa las preguntas obligatorias para la edad indicada. |
| Datos inválidos al cambiar respuestas | Utiliza la interfaz para actualizar dependencias. Los clientes de API deben eliminar respuestas que ya no son elegibles. |
| Archivo de historial rechazado | Usa `.txt` o `.md` UTF-8 de hasta 1 MiB, sin bytes nulos. No se admiten documentos binarios ni OCR. |
| La web perdió los datos al recargar | Es el comportamiento previsto: no hay persistencia. Descarga un resumen antes si quieres conservarlo. |

Consulta `/api/health` para el estado del modelo, `docker compose ps` para el contenedor y `make logs` para problemas de arranque. No pegues información clínica real en incidencias ni logs de depuración.
