"""Auditoría reproducible con Tev real y casos ficticios; no valida eficacia clínica."""
import argparse
from collections import Counter
from copy import deepcopy
from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path
from statistics import median
from time import perf_counter
from urllib.error import HTTPError
from urllib.request import ProxyHandler, Request, build_opener

ROOT = Path(__file__).resolve().parent.parent
GENDERS = ["female", "male", "non_binary", "other", "not_specified"]


# Mantiene activas las comprobaciones también al ejecutar Python con optimizaciones.
def require(condition, message):
    if not condition:
        raise ValueError(message)


# Usa exclusivamente los casos sintéticos del repositorio, sin leer datos de pacientes.
def load_cases():
    return json.loads((ROOT / "examples/quality_cases.json").read_text())


class API:
    # Permite repetir la auditoría contra otra instancia sin depender de proxies de entorno.
    def __init__(self, base_url):
        self.base_url = base_url.rstrip("/")
        self.opener = build_opener(ProxyHandler({}))

    # Incluye comprobaciones negativas del contrato sin ocultar los fallos esperados.
    def request(self, path, data=None, expected_status=200):
        body = json.dumps(data).encode() if data is not None else None
        request = Request(f"{self.base_url}/api/{path}", data=body, headers={"Content-Type": "application/json"})
        try:
            with self.opener.open(request, timeout=180) as response:
                status, payload = response.status, json.load(response)
        except HTTPError as exc:
            status, payload = exc.code, json.load(exc)
        require(status == expected_status, f"HTTP {status}: {payload.get('error', {}).get('code', 'unexpected_response')}")
        return payload


# Comprueba el catálogo completo, el orden y los valores reales, sin normalizarlos.
def validate_result(result, case, catalog):
    urgent = bool(set(case["alarms"]) - {"none", "unknown"})
    require(result["status"] == "urgent" if urgent else result["status"] in {"classified", "inconclusive"}, "Estado inesperado")
    require(result["considered_data"] == {key: value for key, value in case.items() if key != "reviewed"}, "El resultado no conserva el caso revisado")
    rows = result["rankings"]
    if urgent:
        require(rows == [] and bool(result["warnings"]), "Una alarma debe priorizar valoración sin porcentajes")
        return
    require(len(rows) == len(catalog["specialties"]), "Faltan destinos")
    require({row["id"] for row in rows} == {item["id"] for item in catalog["specialties"]}, "Destinos repetidos o ajenos al catálogo")
    values = [row["probability"] for row in rows]
    require(all(type(value) in {float, int} and math.isfinite(value) and 0 <= value <= 1 for value in values), "Porcentaje inválido")
    require(values == sorted(values, reverse=True), "Destinos desordenados")
    require(abs(sum(values) - 1) <= .002, "La suma de porcentajes no es válida")
    unclear = rows[0]["id"] == "inconclusive" or values[0] < .35 or values[0] - values[1] + 1e-12 < .05
    require((result["status"] == "inconclusive") == unclear, "El estado no refleja los criterios de presentación")
    if unclear:
        require(any("No se ha encontrado un resultado claro" in warning for warning in result["warnings"]), "Falta aviso de resultado no concluyente")
    if case["alarms"] == ["unknown"]:
        require(any("No se han podido valorar" in warning for warning in result["warnings"]), "Falta aviso de alarmas desconocidas")
    require("gender" in result.get("model_input_exclusions", []), "No se declara la exclusión de género de la puntuación")


# Recorre preguntas con respuestas de la ficha o No sé; nunca inventa hechos para mejorar un resultado.
def run_case(api, catalog, base, scenario, repetition):
    case = {**deepcopy(base), **deepcopy(scenario["patch"]), "answers": {}}
    record = {"id": scenario["id"], "repetition": repetition, "questions": [], "technical_errors": [], "review_notes": []}
    started = perf_counter()
    try:
        for _ in range(catalog["max_followups"] + 1):
            response = api.request("next-question", case)
            if response["status"] != "question":
                break
            question = response["question"]
            identifier = question["id"]
            require(identifier not in case["answers"], "Pregunta repetida")
            require(identifier not in scenario["forbidden_questions"], "Pregunta ajena o dato ya precisado")
            require(question == next(item for item in catalog["questions"] if item["id"] == identifier), "Pregunta distinta del catálogo")
            if response["source"] == "model":
                require(identifier in {item["id"] for item in response["considered_questions"]}, "Tev eligió fuera de las candidatas declaradas")
            record["questions"].append(identifier)
            unknown = ["unknown"] if question["kind"] == "multi" else "unknown"
            case["answers"][identifier] = scenario["answers"].get(identifier, unknown)
        else:
            raise ValueError("El cuestionario no termina en el límite")
        record["completion"] = response["status"]
        require(len(case["answers"]) <= catalog["max_followups"], "Exceso de preguntas")
        urgent = bool(set(case["alarms"]) - {"none", "unknown"})
        if urgent:
            require(response["status"] == "urgent" and response["source"] == "rules" and not record["questions"], "La alarma no tiene prioridad")
        else:
            require(response["status"] in {"complete", "limit"}, "Salida de cuestionario inesperada")
            required = ["child_intake", "child_behavior"] if case["age_months"] < 216 else []
            if case["age_months"] < 24:
                required.append("infant")
            require(record["questions"][:len(required)] == required, "Faltan mínimos pediátricos previos a Tev")
        case["reviewed"] = True
        result = api.request("classify", case)
        validate_result(result, case, catalog)
        record.update(status=result["status"], rankings=result["rankings"], warnings=result["warnings"], classification_ms=result["latency_ms"])
        top = {item["id"] for item in result["rankings"][:3]}
        if scenario["review_destinations"] and not top.intersection(scenario["review_destinations"]):
            record["review_notes"].append("Revisar los tres primeros destinos frente a la sonda ilustrativa; no es un fallo de contrato ni una etiqueta clínica.")
    except (ValueError, KeyError, StopIteration, OSError) as exc:
        record["technical_errors"].append(str(exc))
    record["total_ms"] = round((perf_counter() - started) * 1000)
    return record


# Cambia solo el género para observar sensibilidad, conservando todos los síntomas y respuestas.
def gender_probe(api, catalog, fixture):
    scenario = next(item for item in fixture["cases"] if item["id"] == "menstrual_genero_hombre")
    case = {**deepcopy(fixture["base"]), **scenario["patch"], "answers": {"abdominal_pattern": "cramps"}, "reviewed": True}
    rows = []
    for gender in GENDERS:
        candidate = {**case, "gender": gender}
        result = api.request("classify", candidate)
        validate_result(result, candidate, catalog)
        rows.append({"gender": gender, "status": result["status"], "rankings": result["rankings"]})
    by_id = [{item["id"]: item["probability"] for item in row["rankings"]} for row in rows]
    spread = max(max(item[key] for item in by_id) - min(item[key] for item in by_id) for key in by_id[0])
    return {"cases": rows, "different_winners": len({row["rankings"][0]["id"] for row in rows}), "max_probability_spread": spread}


# Informa de variaciones sin confundir repetibilidad o afinidad temática con validez clínica.
def summarize(records):
    groups = {}
    for record in records:
        groups.setdefault(record["id"], []).append(record)
    variations = []
    for identifier, rows in groups.items():
        outcomes = {(row.get("status"), tuple(row["questions"]), (row.get("rankings") or [{}])[0].get("id")) for row in rows}
        if len(outcomes) > 1:
            variations.append(identifier)
    return {"runs": len(records), "failed_runs": sum(bool(row["technical_errors"]) for row in records),
            "status_counts": dict(Counter(row.get("status", "error") for row in records)),
            "review_notes": sum(len(row["review_notes"]) for row in records), "varying_cases": variations,
            "median_total_ms": median(row["total_ms"] for row in records)}


# La ejecución termina con error ante fallos técnicos; las observaciones cualitativas se conservan aparte.
def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=os.getenv("LIVE_BASE_URL", f"http://127.0.0.1:{os.getenv('APP_PORT', '8080')}"))
    parser.add_argument("--repeat", type=int, choices=range(1, 6), default=1)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    api = API(args.base_url)
    health, catalog, fixture = api.request("health"), api.request("catalog"), load_cases()
    require(health["status"] == "ready", "Tev no está disponible")
    require(api.request("classify", fixture["base"], expected_status=422)["error"]["code"] == "review_required", "Se permite clasificar sin revisión")
    records = []
    for repetition in range(1, args.repeat + 1):
        for scenario in fixture["cases"]:
            record = run_case(api, catalog, fixture["base"], scenario, repetition)
            records.append(record)
            print(json.dumps({"case": record["id"], "run": repetition, "questions": record["questions"], "status": record.get("status"), "errors": record["technical_errors"]}, ensure_ascii=False), flush=True)
    report = {"timestamp_utc": datetime.now(timezone.utc).isoformat(), "clinical_validation": False,
              "model": health["model"], "catalog_version": catalog["version"], "summary": summarize(records), "cases": records,
              "gender_probe": gender_probe(api, catalog, fixture)}
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"summary": report["summary"], "gender_probe": {key: value for key, value in report["gender_probe"].items() if key != "cases"}}, ensure_ascii=False), flush=True)
    return int(report["summary"]["failed_runs"] > 0)


if __name__ == "__main__":
    raise SystemExit(main())
