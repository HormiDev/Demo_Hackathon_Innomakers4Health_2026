"""API stateless y entrega del frontend compilado en el mismo origen."""
from pathlib import Path
from time import perf_counter

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.catalog import public_catalog
from backend.engine import classify_case, next_question
from backend.ollama import DecisionClient, ServiceError
from backend.schemas import CaseInput, ClassificationOutput, HealthOutput, NextOutput
from backend.settings import Settings

settings = Settings()
app = FastAPI(title="Deriva · API local", version="1.0.0", docs_url=None, redoc_url=None, openapi_url="/api/openapi.json")


# Crea un adaptador sin guardar entradas ni resultados de consultas anteriores.
def get_client():
    return DecisionClient(settings)


# Limita el cuerpo antes de validarlo y evita el almacenamiento en caché del navegador.
@app.middleware("http")
async def privacy_and_size(request: Request, call_next):
    if request.method == "POST":
        chunks, size = [], 0
        async for chunk in request.stream():
            size += len(chunk)
            if size > 1_200_000:
                return JSONResponse(status_code=413, content={"error": {"code": "request_too_large", "message": "La petición supera el tamaño permitido."}}, headers={"Cache-Control": "no-store"})
            chunks.append(chunk)
        request._body = b"".join(chunks)
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    return response


# Convierte los errores del servicio en mensajes seguros y recuperables.
@app.exception_handler(ServiceError)
async def service_error(_request: Request, exc: ServiceError):
    return JSONResponse(status_code=exc.status, content={"error": {"code": exc.code, "message": exc.message}})


# Omite cuerpos y valores de paciente de los errores de validación.
@app.exception_handler(RequestValidationError)
async def validation_error(_request: Request, exc: RequestValidationError):
    fields = [".".join(str(part) for part in item["loc"]) for item in exc.errors()]
    return JSONResponse(status_code=422, content={"error": {"code": "invalid_case", "message": "Revisa los campos y sus opciones.", "fields": fields}})


# Informa sobre Ollama sin ejecutar inferencia ni devolver información clínica.
@app.get("/api/health", response_model=HealthOutput)
async def health(client: DecisionClient = Depends(get_client)):
    return await client.health()


# Publica las preguntas, zonas y especialidades de esta versión.
@app.get("/api/catalog")
def catalog():
    return public_catalog()


# Obtiene una pregunta pertinente o indica que el caso puede pasar a revisión.
@app.post("/api/next-question", response_model=NextOutput)
async def next_route(case: CaseInput, client: DecisionClient = Depends(get_client)):
    return await next_question(case, client)


# Devuelve destinos ordenados y la latencia observada de la operación.
@app.post("/api/classify", response_model=ClassificationOutput)
async def classify(case: CaseInput, client: DecisionClient = Depends(get_client)):
    start = perf_counter()
    result = await classify_case(case, client)
    result["latency_ms"] = round((perf_counter() - start) * 1000)
    return result


# Evita que las rutas de API desconocidas terminen sirviendo la página HTML.
@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
def unknown_api(path: str):
    return JSONResponse(status_code=404, content={"error": {"code": "not_found", "message": "Ruta de API desconocida."}})


if Path(settings.static_path).is_dir():
    app.mount("/", StaticFiles(directory=settings.static_path, html=True), name="frontend")
