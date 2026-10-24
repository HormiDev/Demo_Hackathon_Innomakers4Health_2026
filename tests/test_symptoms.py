"""Reglas de presentación del catálogo; no validan rendimiento clínico."""
from types import SimpleNamespace

import pytest

from backend.catalog import BODY_ZONES, SYMPTOMS, available_symptoms, eligible_symptoms


# Construye un contexto sin depender de la validación de respuestas del formulario.
def profile(**patch):
    return SimpleNamespace(**{
        "age_months": 420, "gender": "not_specified", "body_zones": ["right_foot"],
        "onset": "gradual", "duration": "weeks", **patch,
    })


# Obtiene identificadores sugeridos para comparar perfiles completos.
def suggestions(**patch):
    return {item["id"] for item in eligible_symptoms(profile(**patch))}


# Detecta referencias rotas o identificadores duplicados al ampliar el catálogo.
def test_symptom_catalog_integrity():
    assert len(SYMPTOMS) >= 50
    assert len(SYMPTOMS) == len({item["id"] for item in SYMPTOMS})
    zone_ids = {item["id"] for item in BODY_ZONES}
    assert all(set(item["zones"]) <= zone_ids for item in SYMPTOMS)


# Sustituye opciones de otros sistemas por síntomas propios de cada región.
@pytest.mark.parametrize("zones,present,absent", [
    (["right_foot"], {"heel_pain", "nail_change", "walking_difficulty"}, {"vision", "cough", "menstrual_changes"}),
    (["head"], {"headache", "vision", "hearing"}, {"heel_pain", "urinary"}),
    (["chest"], {"cough", "palpitations", "wheeze"}, {"heel_pain", "menstrual_changes"}),
    (["abdomen"], {"bloating", "diarrhea", "constipation"}, {"nail_change", "vision"}),
])
def test_regional_profiles(zones, present, absent):
    ids = suggestions(body_zones=zones)
    assert present <= ids
    assert not ids & absent
    assert {"fever", "none", "unknown"} <= ids


# Combina las zonas sin duplicados y ofrece un perfil general cuando no se localiza.
def test_multiple_and_unknown_zones():
    assert {"heel_pain", "headache"} <= suggestions(body_zones=["right_foot", "head"])
    general = suggestions(body_zones=["unknown"])
    assert {"fever", "cough", "urinary", "none", "unknown"} <= general
    assert "heel_pain" not in general


# Varía la prioridad por género sin impedir declarar síntomas íntimos manualmente.
@pytest.mark.parametrize("gender", ["female", "male", "non_binary", "other", "not_specified"])
def test_gender_is_a_suggestion_not_an_anatomy_restriction(gender):
    case = profile(gender=gender, body_zones=["pelvis"])
    ids = {item["id"] for item in eligible_symptoms(case)}
    available = {item["id"] for item in available_symptoms(case)}
    assert {"menstrual_changes", "testicular_pain"} <= available
    assert ("menstrual_changes" in ids) == (gender != "male")
    assert ("testicular_pain" in ids) == (gender != "female")


# Evita opciones de lactantes en adultos y las adapta en los límites de edad.
def test_age_profiles():
    infant = suggestions(age_months=4)
    assert {"infant_feeding", "child_irritability", "child_inactive"} <= infant
    assert not infant & {"mood", "menstrual_changes", "walking_difficulty"}
    assert "infant_feeding" in suggestions(age_months=23)
    assert "infant_feeding" not in suggestions(age_months=24)
    assert "child_irritability" not in suggestions(age_months=72)
    assert "child_inactive" not in suggestions(age_months=216)


# Adapta sugerencias temporales sin ocultar esas opciones en la lista adicional.
def test_time_context():
    acute = profile(onset="sudden", duration="hours")
    chronic = profile(onset="gradual", duration="months")
    assert "bruising" in {item["id"] for item in eligible_symptoms(acute)}
    assert "stiffness" not in {item["id"] for item in eligible_symptoms(acute)}
    assert "stiffness" in {item["id"] for item in eligible_symptoms(chronic)}
    assert "bruising" not in {item["id"] for item in eligible_symptoms(chronic)}
    assert {"bruising", "stiffness"} <= {item["id"] for item in available_symptoms(chronic)}
