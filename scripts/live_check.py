"""Comprobación real de la integración con casos exclusivamente ficticios."""
import json
import os
from pathlib import Path
from time import perf_counter
from urllib.error import HTTPError
from urllib.request import Request, urlopen

BASE_URL = os.getenv("LIVE_BASE_URL", f"http://127.0.0.1:{os.getenv('APP_PORT', '8080')}")
ROOT = Path(__file__).resolve().parent.parent


# Envía una petición local y muestra solo errores controlados del servidor.
def request(path, data=None):
    body = json.dumps(data).encode() if data is not None else None
    req = Request(f"{BASE_URL}/api/{path}", data=body, headers={"Content-Type": "application/json"})
    try:
        with urlopen(req, timeout=180) as response:
            return json.load(response)
    except HTTPError as exc:
        raise RuntimeError(exc.read().decode()) from exc


# Recorre preguntas y clasificación sin afirmar corrección clínica del resultado.
def run_case(filename):
    case = json.loads((ROOT / "examples" / filename).read_text())
    started = perf_counter()
    for _ in range(10):
        response = request("next-question", case)
        if response["status"] != "question":
            break
        question = response["question"]
        assert question["id"] not in case["answers"], "Pregunta repetida"
        # Las respuestas desconocidas evitan añadir hechos clínicos inventados al caso.
        case["answers"][question["id"]] = ["unknown"] if question["kind"] == "multi" else "unknown"
    case["reviewed"] = True
    result = request("classify", case)
    values = [item["probability"] for item in result["rankings"]]
    assert len(values) == 23 and values == sorted(values, reverse=True)
    assert abs(sum(values) - 1) < 0.002
    return {"case": filename, "questions": len(case["answers"]), "status": result["status"],
            "top": result["rankings"][:3], "classification_ms": result["latency_ms"],
            "total_ms": round((perf_counter() - started) * 1000)}


# Verifica la disponibilidad y publica métricas de los dos recorridos ficticios.
def main():
    health = request("health")
    if health["status"] != "ready":
        raise RuntimeError(health["message"])
    results = [run_case("adult.json"), run_case("pediatric.json")]
    print(json.dumps({"model": health["model"], "clinical_validation": False, "cases": results}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
