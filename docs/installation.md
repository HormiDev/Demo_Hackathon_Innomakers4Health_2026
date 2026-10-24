# Instalación y configuración

[Volver al README](../README.md)

## Ejecución con Docker

1. Comprueba `docker info`, `docker compose version`, `make --version` y el espacio con `df -h .`.
2. Comprueba que tu Ollama contiene `tev1:4b` y declara capacidad `decision`: `curl http://127.0.0.1:11434/api/tags`.
3. Ejecuta `cp .env.example .env` y ajusta los valores si procede.
4. Ejecuta `make up` y abre `http://localhost:8080`, o `http://IP_DEL_EQUIPO:8080` desde otro dispositivo de la red.

Docker construye el frontend en Node 22 y lo incorpora a una imagen Python 3.12 con FastAPI. Solo descarga el tokenizador de Tev, fijado a una revisión oficial; los pesos se mantienen en el Ollama que administra el usuario.

Compose utiliza `network_mode: host`, adecuado para este equipo Linux. Así, `127.0.0.1:11434` dentro del contenedor es el Ollama del anfitrión. El proceso web escucha en `0.0.0.0`, como usuario sin privilegios, con sistema de archivos de solo lectura. Para acceder desde la red utiliza la IP del equipo (puedes consultarla con `hostname -I`) y el puerto `APP_PORT`. Ollama sigue escuchando en su dirección local.

## Variables

| Variable | Valor predeterminado | Uso |
| --- | --- | --- |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Servicio de inferencia local |
| `OLLAMA_MODEL` | `tev1:4b` | Nombre exacto del modelo de decisión instalado |
| `OLLAMA_TIMEOUT_SECONDS` | `120` | Límite de cada petición de inferencia |
| `MODEL_CONTEXT_TOKENS` | `2048` | Presupuesto conservador, incluido margen de plantilla |
| `APP_PORT` | `8080` | Puerto web accesible desde la red |

`TOKENIZER_PATH` y `STATIC_PATH` son ajustes del proceso Python para desarrollo o empaquetado; normalmente no necesitan cambios. Después de modificar `.env`, ejecuta `make up` para recrear el servicio. `make restart` reinicia el contenedor con su configuración existente.

## Makefile

| Objetivo | Operación |
| --- | --- |
| `all`, `up` | Compilar y arrancar en segundo plano |
| `build` | Compilar la imagen de aplicación |
| `down`, `clean` | Detener y eliminar contenedores del proyecto |
| `restart` | Reiniciar el servicio |
| `logs` | Seguir los últimos logs |
| `test` | Construir y ejecutar pruebas aisladas de ambos subsistemas |
| `test-live` | Ejecutar los casos ficticios contra la aplicación arrancada |
| `fclean` | Limpiar contenedores y las tres imágenes etiquetadas del proyecto |
| `re` | Ejecutar `fclean` y volver a construir y arrancar |
| `help` | Mostrar la ayuda |

La limpieza no elimina modelos de Ollama, imágenes ajenas, cachés globales ni archivos del usuario. No hay volúmenes con datos de pacientes.

## Desarrollo sin Docker

Requisitos: Node 22.12 o posterior compatible, npm y Python 3.12 con soporte para entornos virtuales.

```sh
python3 -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements-dev.txt
python scripts/prepare_tokenizer.py
cd frontend
npm ci
npm run build
cd ..
uvicorn backend.app:app --host 0.0.0.0 --port 8080 --no-access-log
```

Para recarga del frontend, ejecuta `npm run dev` en otra terminal dentro de `frontend/`. Vite escucha en `0.0.0.0` y permite acceder mediante `http://IP_DEL_EQUIPO:5173`; reenviará `/api` al backend en el puerto 8080. El entorno Vite es solo de desarrollo; la imagen final entrega los recursos desde FastAPI.
