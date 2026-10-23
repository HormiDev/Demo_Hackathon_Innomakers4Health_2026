"""Adaptador estricto de la API de decisión local de Ollama."""
import json
import math
from functools import lru_cache

import httpx
from tokenizers import Tokenizer

from backend.settings import Settings


class ServiceError(Exception):
    # Guarda solo mensajes controlados, sin incluir entradas clínicas ni respuestas crudas.
    def __init__(self, code: str, message: str, status: int = 503):
        self.code, self.message, self.status = code, message, status
        super().__init__(message)


# Reutiliza únicamente el tokenizador público, sin almacenar estados clínicos.
@lru_cache(maxsize=2)
def load_tokenizer(path: str):
    try:
        tokenizer = Tokenizer.from_file(path)
        tokenizer.no_truncation()
        return tokenizer
    except Exception as exc:
        raise ServiceError("tokenizer_missing", "Falta el tokenizador local. Ejecuta make build o el script de preparación.") from exc


class DecisionClient:
    # Permite inyectar un transporte HTTP para probar fallos sin simular resultados en la app.
    def __init__(self, settings: Settings, transport=None):
        self.settings = settings
        self.transport = transport

    # Devuelve un cliente sin proxies de entorno y con un tiempo límite explícito.
    def http(self, timeout=None):
        return httpx.AsyncClient(base_url=self.settings.ollama_url, timeout=timeout or self.settings.timeout,
                                transport=self.transport, trust_env=False)

    # Comprueba que el modelo instalado ofrece capacidad de decisión.
    async def health(self):
        try:
            async with self.http(timeout=4) as client:
                response = await client.get("/api/tags")
                response.raise_for_status()
                models = response.json()["models"]
                model = next((item for item in models if item.get("name") == self.settings.model or item.get("model") == self.settings.model), None)
                if model is None:
                    return {"status": "model_missing", "model": self.settings.model, "message": "El modelo configurado no está instalado en Ollama."}
                if "decision" not in model.get("capabilities", []):
                    return {"status": "incompatible", "model": self.settings.model, "message": "El modelo no declara capacidad de decisión. Comprueba Tev y la versión de Ollama."}
                return {"status": "ready", "model": self.settings.model, "message": "Modelo local disponible"}
        except (httpx.HTTPError, ValueError, KeyError, TypeError, AttributeError):
            return {"status": "unavailable", "model": self.settings.model, "message": "No se puede conectar con el Ollama local."}

    # Rechaza contexto excesivo antes de transmitirlo, reservando margen para la plantilla.
    def check_context(self, state, questions):
        text = json.dumps({"state": state, "questions": questions}, ensure_ascii=False)
        tokens = len(load_tokenizer(self.settings.tokenizer_path).encode(text, add_special_tokens=False).ids)
        if tokens + 384 > self.settings.context_tokens:
            raise ServiceError("context_too_long", "El contexto supera el presupuesto de Tev. Abrevia el historial o el motivo en el editor; no se ha recortado ni enviado el contenido.", 413)
        if len(text.encode("utf-8")) > 60_000:
            raise ServiceError("context_too_long", "Abrevia el contexto antes de continuar.", 413)

    # Envía una pregunta choice y conserva intactas las probabilidades de Ollama.
    async def choose(self, state, identifier, instructions, criteria):
        if not 2 <= len(criteria) <= 24:
            raise ServiceError("invalid_catalog", "El catálogo de opciones no es compatible.", 500)
        questions = {identifier: {"type": "choice", "instructions": instructions, "criteria": criteria}}
        self.check_context(state, questions)
        payload = {"model": self.settings.model, "state": state, "questions": questions, "keep_alive": "5m"}
        try:
            async with self.http() as client:
                response = await client.post("/v1/systemone", json=payload)
                response.raise_for_status()
                answer = response.json()["answers"][identifier]
                return validate_answer(answer, criteria)
        except httpx.TimeoutException as exc:
            raise ServiceError("model_timeout", "Tev ha tardado demasiado. Puedes reintentar sin perder el formulario.", 504) from exc
        except httpx.HTTPStatusError as exc:
            code = exc.response.status_code
            message = "No está disponible el modelo o el endpoint /v1/systemone. Comprueba Ollama y tev1:4b." if code == 404 else "Ollama ha rechazado la petición. Revisa su estado y el tamaño del contexto."
            raise ServiceError("model_rejected", message) from exc
        except httpx.HTTPError as exc:
            raise ServiceError("model_unavailable", "No se puede conectar con Ollama. El formulario se conserva para reintentar.") from exc
        except (ValueError, KeyError, TypeError) as exc:
            raise ServiceError("invalid_model_response", "Tev devolvió una respuesta inválida. No se han generado porcentajes.", 502) from exc


# Exige opciones completas y probabilidades finitas, sin normalizarlas ni inventarlas.
def validate_answer(answer, criteria):
    if not isinstance(answer, dict) or answer.get("choice") not in criteria:
        raise ValueError("Invalid choice")
    probabilities = answer.get("probabilities")
    if not isinstance(probabilities, dict) or set(probabilities) != set(criteria):
        raise ValueError("Missing probabilities")
    for value in probabilities.values():
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 <= value <= 1:
            raise ValueError("Invalid probability")
    if not math.isclose(sum(probabilities.values()), 1.0, abs_tol=0.002):
        raise ValueError("Invalid total")
    if probabilities[answer["choice"]] + 0.002 < max(probabilities.values()):
        raise ValueError("Inconsistent choice")
    return answer

