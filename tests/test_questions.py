"""Dependencias del cuestionario y libertad de Tev para terminar sin preguntar."""
import asyncio
import json
from pathlib import Path

import httpx
import pytest
from pydantic import ValidationError

from backend.anatomy import BODY_DETAILS
from backend.catalog import BODY_ZONES, SYMPTOMS, eligible_symptoms
from backend.engine import next_question
from backend.ollama import DecisionClient
from backend.questions import QUESTIONS, QUESTION_BY_ID, eligible_questions, question_candidates
from backend.schemas import CaseInput
from backend.settings import Settings


# Crea casos ficticios completos para ejercitar también la validación de ramas.
def case(**patch):
    data = json.loads((Path(__file__).resolve().parent.parent / "examples/adult.json").read_text())
    return CaseInput(**{**data, **patch})


def eligible(**patch):
    return {item["id"] for item in eligible_questions(case(**patch))}


# Las referencias deben corresponder al mapa y al catálogo compartidos.
def test_question_catalog_integrity():
    assert len(QUESTIONS) == len(QUESTION_BY_ID) >= 48
    points = {}
    for definition in BODY_DETAILS.values():
        points[definition["kind"]] = {item["id"] for item in definition["options"]}
    for item in [*QUESTIONS, *SYMPTOMS]:
        assert set(item["zones"]) <= {zone["id"] for zone in BODY_ZONES}
        for kind, identifiers in item.get("parts", {}).items():
            assert set(identifiers) <= points[kind]
    for item in QUESTIONS:
        assert item["decision_hint"]
        ids = [option["id"] for option in item["options"]]
        assert len(ids) == len(set(ids)) and "unknown" in ids
        assert set(item["symptoms"]) <= {symptom["id"] for symptom in SYMPTOMS}
        for parent, answers in item["requires_answers"].items():
            assert set(answers) <= {option["id"] for option in QUESTION_BY_ID[parent]["options"]}


# Una región concreta excluye preguntas de otras partes de esa misma región.
@pytest.mark.parametrize("zone,part,present,absent", [
    ("left_hand", "wrist", {"wrist_load", "hand_use"}, {"finger_motion", "heel_pattern", "foot"}),
    ("right_hand", "index", {"finger_motion"}, {"wrist_load", "hand_distribution"}),
    ("right_foot", "heel", {"heel_pattern"}, {"shoe_contact", "ankle_stability", "foot"}),
    ("left_foot", "ankle", {"ankle_stability"}, {"heel_pattern", "shoe_contact", "foot"}),
    ("left_arm", "shoulder", {"shoulder_context"}, {"elbow_use", "wrist_load"}),
    ("right_leg", "knee", {"knee_context"}, {"ankle_stability", "hip_motion"}),
    ("head", "right_eye", {"eye_context"}, {"eye_laterality", "ear_context", "head", "jaw_context"}),
    ("head", "left_ear", {"ear_context"}, {"eye_context", "jaw_context", "head"}),
    ("pelvis", "left_hip", {"hip_motion"}, {"menstrual_context", "genital_context"}),
])
def test_precise_questions(zone, part, present, absent):
    ids = eligible(body_zones=[zone], body_details={zone: [part]}, symptoms=["unknown"])
    assert present <= ids
    assert not absent & ids


# La ubicación puede ser opcional; un dato ya seleccionado no se pregunta de nuevo.
def test_unspecified_and_multiple_regions():
    assert "foot" in eligible()
    assert "heel_pattern" not in eligible()
    assert "foot" in eligible(body_zones=["left_foot", "right_foot"], body_details={"right_foot": ["heel"]})
    assert "eye_laterality" in eligible(body_zones=["left_hand", "head"], body_details={"left_hand": ["index"]}, symptoms=["vision"])


# Síntomas explícitos mantienen una rama aunque se hayan declarado desde otras zonas.
def test_declared_symptoms_override_gender_and_region_suggestions():
    assert "menstrual_context" not in eligible(gender="male", body_zones=["pelvis"])
    assert "menstrual_context" in eligible(gender="male", symptoms=["menstrual_changes"])
    assert "genital_context" not in eligible(gender="female", body_zones=["pelvis"])
    assert "genital_context" in eligible(gender="female", symptoms=["testicular_pain"])
    assert "menstrual_context" not in eligible(age_months=84, body_zones=["pelvis"])


# Una rama depende de lo contestado; no basta con elegir una mano.
def test_answer_driven_branches_and_stale_answers():
    hand = {"body_zones": ["left_hand"], "body_details": {"left_hand": ["index"]}}
    assert "finger_locking" not in eligible(**hand)
    assert "finger_locking" in eligible(**hand, answers={"finger_motion": "locks"})
    assert "hand_pattern" in eligible(**hand, answers={"hand_sensation": "numb"})
    assert "hand_pattern" not in eligible(**hand, answers={"hand_sensation": "weak"})
    assert "skin_spread" not in eligible(symptoms=["wound"])
    assert "skin_spread" in eligible(symptoms=["wound"], answers={"skin": "lesion"})
    with pytest.raises(ValidationError):
        case(**hand, answers={"hand_sensation": "no", "hand_pattern": "night"})


# La información ya estructurada elimina repeticiones antes de consultar al modelo.
@pytest.mark.parametrize("symptom,excluded,included", [
    ("first_steps_pain", {"heel_pattern", "foot_load"}, set()),
    ("finger_locking", {"finger_motion"}, {"finger_locking"}),
    ("night_hand_tingling", {"hand_pattern"}, {"hand_distribution"}),
    ("urinary_frequency", {"urinary_detail"}, set()),
    ("diarrhea", {"bowel_detail"}, set()),
])
def test_known_symptoms_do_not_get_repeated(symptom, excluded, included):
    ids = eligible(symptoms=[symptom])
    assert not excluded & ids
    assert included <= ids


# Contrasta el conjunto propuesto al modelo, no un diagnóstico simulado.
@pytest.mark.parametrize("selection", ["enough", "wrist_load"])
def test_tev_can_stop_with_zero_questions_or_select_one(selection):
    data = case(body_zones=["left_hand"], body_details={"left_hand": ["wrist"]}, symptoms=["unknown"])
    captured = {}

    def transport(request):
        payload = json.loads(request.content)
        captured.update(payload)
        criteria = payload["questions"]["next"]["criteria"]
        return httpx.Response(200, json={"answers": {"next": {"choice": selection,
            "probabilities": {key: int(key == selection) for key in criteria}}}})

    result = asyncio.run(next_question(data, DecisionClient(Settings(), httpx.MockTransport(transport))))
    criteria = captured["questions"]["next"]["criteria"]
    assert "finger_motion" not in criteria and "wrist_load" in criteria and "enough" in criteria
    assert len(criteria) <= 13
    assert criteria["wrist_load"] == QUESTION_BY_ID["wrist_load"]["decision_hint"]
    assert captured["state"]["body_detail_ids"] == {"left_hand": ["wrist"]}
    assert result["candidates_considered"] == len(result["considered_questions"]) == len(criteria) - 1
    assert result["answered"] == 0
    assert result["status"] == ("complete" if selection == "enough" else "question")
    assert result["completion_reason"] == ("model_enough" if selection == "enough" else None)
    assert (result["question"] is None) == (selection == "enough")


# Una selección contestada desaparece del siguiente conjunto.
def test_shortlist_excludes_answered_questions():
    data = case(body_zones=["left_hand"], body_details={"left_hand": ["wrist"]}, answers={"wrist_load": "bend"})
    assert "wrist_load" not in {item["id"] for item in question_candidates(data)}


# Los mismos detalles que activan preguntas también cambian las sugerencias de síntomas.
@pytest.mark.parametrize("zone,part,present,absent", [
    ("left_hand", "wrist", {"wrist_clicks"}, {"finger_locking", "nail_change"}),
    ("left_hand", "index", {"finger_locking", "finger_numbness", "nail_change"}, {"wrist_clicks"}),
    ("right_foot", "heel", {"first_steps_pain", "heel_pain"}, {"nail_change", "shoe_pressure"}),
    ("head", "left_eye", {"eye_grit", "eye_tearing"}, {"ear_discharge", "nasal_discharge"}),
])
def test_precise_symptom_suggestions(zone, part, present, absent):
    ids = {item["id"] for item in eligible_symptoms(case(body_zones=[zone], body_details={zone: [part]}))}
    assert present <= ids
    assert not absent & ids
