"""Contratos de entrada y salida de la API sin persistencia."""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictStr, field_validator, model_validator

from backend.anatomy import BODY_DETAILS
from backend.catalog import ALARMS, BODY_ZONES, SYMPTOMS, available_symptoms, eligible_questions


class CaseInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    age_months: int = Field(ge=0, le=1440, strict=True)
    gender: Literal["female", "male", "non_binary", "other", "not_specified"] = "not_specified"
    respondent: Literal["self", "companion"]
    reason: str = Field(min_length=3, max_length=600)
    body_zones: list[StrictStr] = Field(min_length=1, max_length=17)
    body_details: dict[StrictStr, list[StrictStr]] = Field(default_factory=dict, max_length=15)
    onset: Literal["sudden", "gradual", "unknown"]
    duration: Literal["hours", "days", "weeks", "months", "years", "unknown"]
    evolution: Literal["improving", "stable", "worsening", "intermittent", "unknown"]
    pain: int | None = Field(default=None, ge=0, le=10, strict=True)
    symptoms: list[StrictStr] = Field(min_length=1, max_length=len(SYMPTOMS))
    alarms: list[StrictStr] = Field(min_length=1, max_length=7)
    answers: dict[str, StrictStr | list[StrictStr]] = Field(default_factory=dict, max_length=8)
    history: str = Field(default="", max_length=1048576)
    reviewed: bool = False

    # Rechaza motivos vacíos que solo contienen espacios.
    @field_validator("reason")
    @classmethod
    def meaningful_reason(cls, value):
        if len(value.strip()) < 3:
            raise ValueError("Describe brevemente el motivo de consulta.")
        return value.strip()

    # Comprueba los identificadores, la exclusividad de opciones y las dependencias.
    @model_validator(mode="after")
    def consistent_case(self):
        groups = [(self.body_zones, BODY_ZONES, {"unknown", "general"}),
                  (self.symptoms, SYMPTOMS, {"none", "unknown"}),
                  (self.alarms, ALARMS, {"none", "unknown"})]
        for values, catalog, exclusive in groups:
            if len(values) != len(set(values)) or not set(values) <= {item["id"] for item in catalog}:
                raise ValueError("Hay opciones desconocidas o repetidas.")
            if set(values) & exclusive and len(values) > 1:
                raise ValueError("No sé o ninguna no se pueden combinar con otras opciones.")
        for zone, parts in self.body_details.items():
            definition = BODY_DETAILS.get(zone)
            if zone not in self.body_zones or definition is None:
                raise ValueError("El detalle debe pertenecer a una zona seleccionada.")
            if not parts or len(parts) != len(set(parts)) or not set(parts) <= {item["id"] for item in definition["options"]}:
                raise ValueError("La localización detallada contiene opciones desconocidas o repetidas.")
        if not set(self.symptoms) <= {item["id"] for item in available_symptoms(self)}:
            raise ValueError("Hay síntomas que no corresponden a la edad indicada.")
        if self.age_months > 215 and "child_breathing" in self.alarms:
            raise ValueError("La señal pediátrica solo corresponde a menores.")
        if len(self.history.encode("utf-8")) > 1048576 or "\x00" in self.history:
            raise ValueError("El historial debe ser texto UTF-8 de hasta 1 MiB, sin bytes nulos.")
        eligible = {item["id"]: item for item in eligible_questions(self)}
        for identifier, answer in self.answers.items():
            item = eligible.get(identifier)
            if item is None:
                raise ValueError("Una respuesta ya no corresponde a la edad, zona o síntomas actuales.")
            if (item["kind"] == "multi") != isinstance(answer, list):
                raise ValueError("El tipo de respuesta no corresponde a la pregunta.")
            values = answer if isinstance(answer, list) else [answer]
            if not values or len(values) != len(set(values)) or not set(values) <= {opt["id"] for opt in item["options"]}:
                raise ValueError("La respuesta no pertenece a las opciones de la pregunta.")
            if set(values) & {"none", "unknown"} and len(values) > 1:
                raise ValueError("La opción ninguna o no sé es exclusiva.")
        mandatory = {item["id"] for item in eligible.values() if item["id"] in {"child_intake", "child_behavior", "infant"}}
        if len(self.answers) + len(mandatory - set(self.answers)) > 8:
            raise ValueError("Reinicia las preguntas adicionales para reservar las obligatorias de la edad actual.")
        return self


class HealthOutput(BaseModel):
    status: Literal["ready", "model_missing", "unavailable", "incompatible"]
    model: str
    message: str


class NextOutput(BaseModel):
    status: Literal["question", "complete", "limit", "urgent"]
    question: dict | None = None
    source: Literal["model", "rules"]
    warnings: list[str] = Field(default_factory=list)
    answered: int
    max_followups: int = 8
    completion_reason: Literal["model_enough", "no_candidates", "limit", "urgent"] | None = None
    candidates_considered: int = 0
    eligible_count: int = 0
    considered_questions: list[dict[str, str]] = Field(default_factory=list)


class RankedSpecialty(BaseModel):
    id: str
    name: str
    probability: float = Field(ge=0, le=1)


class ClassificationOutput(BaseModel):
    status: Literal["classified", "inconclusive", "urgent"]
    rankings: list[RankedSpecialty]
    warnings: list[str]
    model: str
    catalog_version: str
    latency_ms: int
    considered_data: dict
    label: str = "Puntuaciones del modelo; no son probabilidades clínicas validadas."
