# Privacidad y ciclo de vida del caso

[Volver al README](../README.md)

- El navegador mantiene las respuestas, el historial y los resultados en memoria de React. No se usa `localStorage`, `sessionStorage`, IndexedDB, cookies ni service workers.
- El backend recibe el caso completo por petición y lo entrega al Ollama local cuando procede. No hay base de datos, archivos de casos, analítica ni transmisión a proveedores externos en el flujo de consulta.
- Todas las respuestas de la aplicación usan `Cache-Control: no-store`. Los recursos visuales y las fuentes son locales; no se necesitan CDNs.
- Los archivos TXT y Markdown se leen en el navegador. Se valida extensión, tamaño, UTF-8 y ausencia de bytes nulos. El contenido se trata como texto plano, nunca como HTML ejecutable.
- Recargar, cerrar o borrar el caso elimina su estado de la aplicación. Esto no garantiza un borrado forense de la memoria del sistema operativo, de procesos externos ni del historial de descarga del navegador.
- El usuario puede descargar o imprimir un resumen. Esas copias quedan bajo su control y no desaparecen al borrar el caso de la web.

## Logs y servicios locales

El arranque desactiva el registro de accesos de Uvicorn y el código no registra cuerpos clínicos. Los errores públicos son controlados y omiten los valores de entrada. La configuración de logs, cachés y memoria del Ollama que administra el usuario es independiente; debe revisarse antes de usar datos personales.

La compilación descarga paquetes y un tokenizador público, sin enviar datos clínicos. Una vez construida la imagen, el flujo ordinario solo conecta navegador, backend y Ollama locales.

## Límite del modo médico

El selector de modo y la casilla de revisión no autentican a un profesional ni proporcionan control de acceso. Solo representan el recorrido de una demo. La API exige confirmación de revisión como condición de flujo, pero un cliente puede establecer ese booleano.

Para un piloto con datos reales harían falta identidad, autorización, evaluación clínica, gestión de consentimientos o base legal, controles de conservación y revisión de seguridad y privacidad. Esta versión está diseñada para casos ficticios y no incluye esas funciones.
