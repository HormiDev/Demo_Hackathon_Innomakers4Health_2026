"""Catálogo de demostración versionado; requiere revisión clínica antes de uso real."""

from backend.anatomy import BODY_DETAILS
from backend.context import matches_parts

CATALOG_VERSION = "1.3.0"

SPECIALTIES = [
    {"id": "cardiology", "name": "Cardiología", "criteria": "Heart, palpitations, cardiac symptoms"},
    {"id": "orthopedics", "name": "Traumatología", "criteria": "Bones, injuries, joints, mechanical pain"},
    {"id": "podiatry", "name": "Podología", "criteria": "Feet, nails, soles, gait-related foot problems"},
    {"id": "neurology", "name": "Neurología", "criteria": "Nerves, headache, sensation, movement"},
    {"id": "dermatology", "name": "Dermatología", "criteria": "Skin, rashes, hair, skin lesions"},
    {"id": "gastroenterology", "name": "Digestivo", "criteria": "Digestive tract, abdomen, bowel, liver"},
    {"id": "pulmonology", "name": "Neumología", "criteria": "Lungs, chronic cough, respiratory symptoms"},
    {"id": "ent", "name": "Otorrinolaringología", "criteria": "Ears, nose, throat, hearing"},
    {"id": "ophthalmology", "name": "Oftalmología", "criteria": "Eyes, sight, ocular discomfort"},
    {"id": "urology", "name": "Urología", "criteria": "Urinary tract, male reproductive symptoms"},
    {"id": "gynecology", "name": "Ginecología y Obstetricia", "criteria": "Gynecological, menstrual, pregnancy symptoms"},
    {"id": "endocrinology", "name": "Endocrinología", "criteria": "Hormones, thyroid, diabetes, metabolism"},
    {"id": "rheumatology", "name": "Reumatología", "criteria": "Inflammatory joints, autoimmune symptoms"},
    {"id": "nephrology", "name": "Nefrología", "criteria": "Kidney function, kidney disease"},
    {"id": "hematology", "name": "Hematología", "criteria": "Blood disorders, anemia, abnormal bleeding"},
    {"id": "allergology", "name": "Alergología", "criteria": "Allergies and recurrent allergic reactions"},
    {"id": "psychiatry", "name": "Psiquiatría", "criteria": "Mental health, mood, anxiety, behavior"},
    {"id": "surgery", "name": "Cirugía General", "criteria": "Hernias, masses, possible surgical conditions"},
    {"id": "internal_medicine", "name": "Medicina Interna", "criteria": "Complex adult multisystem complaints"},
    {"id": "pediatrics", "name": "Pediatría", "criteria": "General child or infant health, age-specific symptoms"},
    {"id": "primary_care", "name": "Atención Primaria", "criteria": "Primary care follow-up sufficient for this presentation"},
    {"id": "emergency", "name": "Urgencias", "criteria": "Possible acute emergency, immediate medical assessment"},
    {"id": "inconclusive", "name": "Sin orientación concluyente", "criteria": "Insufficient, contradictory or out-of-catalog information"},
]

BODY_ZONES = [
    {"id": "head", "label": "Cabeza y cara"},
    {"id": "neck", "label": "Cuello"},
    {"id": "chest", "label": "Pecho"},
    {"id": "abdomen", "label": "Abdomen"},
    {"id": "pelvis", "label": "Pelvis"},
    {"id": "upper_back", "label": "Espalda alta"},
    {"id": "lower_back", "label": "Espalda baja"},
    {"id": "left_arm", "label": "Brazo izquierdo"},
    {"id": "right_arm", "label": "Brazo derecho"},
    {"id": "left_hand", "label": "Mano izquierda"},
    {"id": "right_hand", "label": "Mano derecha"},
    {"id": "left_leg", "label": "Pierna izquierda"},
    {"id": "right_leg", "label": "Pierna derecha"},
    {"id": "left_foot", "label": "Pie izquierdo"},
    {"id": "right_foot", "label": "Pie derecho"},
    {"id": "general", "label": "General / sin una zona concreta"},
    {"id": "unknown", "label": "No sé localizarlo"},
]

# Agrupa regiones sin perder la lateralidad del mapa corporal.
ARMS = ["left_arm", "right_arm", "left_hand", "right_hand"]
LEGS = ["left_leg", "right_leg", "left_foot", "right_foot"]
FEET = ["left_foot", "right_foot"]
HANDS = ["left_hand", "right_hand"]
BACK = ["upper_back", "lower_back"]
MOVEMENT_ZONES = ["neck", *BACK, *ARMS, *LEGS]
DIGESTIVE_ZONES = ["abdomen", "pelvis"]
URINARY_ZONES = ["abdomen", "pelvis", "lower_back"]


# Define sugerencias de presentación; la zona o el género no descartan otros síntomas.
def symptom(identifier, label, *, zones=None, general=False, min_age_months=None,
            max_age_months=None, preferred_genders=None, onsets=None, durations=None, parts=None):
    return {"id": identifier, "label": label, "zones": zones or [], "general": general,
            "min_age_months": min_age_months, "max_age_months": max_age_months,
            "preferred_genders": preferred_genders or [], "onsets": onsets or [],
            "durations": durations or [], "parts": parts or {}}


SYMPTOMS = [
    symptom("fever", "Fiebre", general=True),
    symptom("fatigue", "Cansancio", general=True, min_age_months=24),
    symptom("rash", "Erupción o picor", general=True),
    symptom("cough", "Tos", zones=["head", "neck", "chest", "upper_back"], general=True),
    symptom("breathlessness", "Falta de aire", zones=["chest", "upper_back"], general=True),
    symptom("palpitations", "Palpitaciones", zones=["chest"], general=True),
    symptom("nausea", "Náuseas o vómitos", zones=["head", *DIGESTIVE_ZONES], general=True),
    symptom("bowel", "Cambios intestinales", zones=DIGESTIVE_ZONES, general=True),
    symptom("urinary", "Molestias al orinar", zones=URINARY_ZONES, general=True),
    symptom("numbness", "Hormigueo", zones=MOVEMENT_ZONES, general=True, min_age_months=24),
    symptom("dizziness", "Mareo", zones=["head", "neck", "chest"], general=True, min_age_months=24),
    symptom("mood", "Cambios de ánimo", zones=["head"], general=True, min_age_months=72),
    symptom("vision", "Molestias visuales", zones=["head"], general=True, min_age_months=24),
    symptom("hearing", "Molestias de oído", zones=["head", "neck"], general=True),
    symptom("swelling", "Hinchazón", zones=MOVEMENT_ZONES),
    symptom("redness", "Enrojecimiento", zones=MOVEMENT_ZONES),
    symptom("movement_limit", "Cuesta mover la zona", zones=MOVEMENT_ZONES),
    symptom("weakness", "Pérdida de fuerza", zones=MOVEMENT_ZONES, min_age_months=24),
    symptom("bruising", "Moratón tras un golpe", zones=MOVEMENT_ZONES,
            onsets=["sudden", "unknown"], durations=["hours", "days", "weeks", "unknown"]),
    symptom("stiffness", "Rigidez al despertar", zones=MOVEMENT_ZONES,
            min_age_months=24, durations=["weeks", "months", "years", "unknown"]),
    symptom("wound", "Herida o rozadura", zones=[*ARMS, *LEGS]),
    symptom("nail_change", "Cambios en las uñas", zones=[*HANDS, *FEET]),
    symptom("heel_pain", "Molestia en el talón", zones=FEET, min_age_months=12),
    symptom("walking_difficulty", "Cuesta caminar", zones=LEGS, min_age_months=12),
    symptom("cramps", "Calambres", zones=LEGS, min_age_months=24),
    symptom("radiating_pain", "Dolor hacia una pierna", zones=BACK, min_age_months=24),
    symptom("headache", "Dolor de cabeza", zones=["head", "neck"], min_age_months=24),
    symptom("nasal_congestion", "Congestión nasal", zones=["head", "neck"]),
    symptom("throat_pain", "Dolor de garganta", zones=["head", "neck"]),
    symptom("light_sensitivity", "Molesta la luz", zones=["head"], min_age_months=24),
    symptom("eye_redness", "Ojos rojos", zones=["head"]),
    symptom("ear_ringing", "Zumbidos en el oído", zones=["head"], min_age_months=24),
    symptom("wheeze", "Silbidos al respirar", zones=["chest", "upper_back"]),
    symptom("sputum", "Tos con mucosidad", zones=["chest", "upper_back"]),
    symptom("reflux", "Ardor o acidez", zones=["chest", "abdomen"], min_age_months=72),
    symptom("bloating", "Vientre hinchado", zones=DIGESTIVE_ZONES),
    symptom("diarrhea", "Diarrea", zones=DIGESTIVE_ZONES),
    symptom("constipation", "Estreñimiento", zones=DIGESTIVE_ZONES),
    symptom("appetite_loss", "Menos apetito", zones=DIGESTIVE_ZONES),
    symptom("urinary_frequency", "Orina más a menudo", zones=URINARY_ZONES),
    symptom("urinary_leak", "Escapes de orina", zones=URINARY_ZONES, min_age_months=60),
    symptom("menstrual_changes", "Cambios en la regla", zones=DIGESTIVE_ZONES,
            min_age_months=96, preferred_genders=["female"]),
    symptom("missed_period", "Retraso de la regla", zones=DIGESTIVE_ZONES,
            min_age_months=96, preferred_genders=["female"]),
    symptom("vaginal_discharge", "Flujo vaginal distinto", zones=["pelvis"],
            preferred_genders=["female"]),
    symptom("testicular_pain", "Molestia testicular", zones=["pelvis"], preferred_genders=["male"]),
    symptom("testicular_swelling", "Hinchazón testicular", zones=["pelvis"], preferred_genders=["male"]),
    symptom("finger_locking", "Se atasca un dedo", zones=HANDS, min_age_months=24, parts={"hand": ["thumb", "index", "middle", "ring", "little"]}),
    symptom("finger_numbness", "Dedos dormidos", zones=HANDS, min_age_months=24, parts={"hand": ["thumb", "index", "middle", "ring", "little"]}),
    symptom("grip_difficulty", "Cuesta agarrar", zones=HANDS, min_age_months=24),
    symptom("wrist_clicks", "Chasquidos de muñeca", zones=[*HANDS, *ARMS], min_age_months=24, parts={"hand": ["wrist"], "arm": ["wrist"]}),
    symptom("thumb_movement_pain", "Molesta mover el pulgar", zones=HANDS, min_age_months=24, parts={"hand": ["thumb"]}),
    symptom("night_hand_tingling", "Hormigueo nocturno", zones=HANDS, min_age_months=24),
    symptom("nail_fold_redness", "Rojez junto a la uña", zones=[*HANDS, *FEET], parts={"hand": ["thumb", "index", "middle", "ring", "little"], "foot": ["big_toe", "other_toes"]}),
    symptom("first_steps_pain", "Duelen los primeros pasos", zones=FEET, min_age_months=12, parts={"foot": ["heel", "arch"]}),
    symptom("hard_skin", "Durezas o callos", zones=FEET, parts={"foot": ["big_toe", "other_toes", "forefoot", "heel"]}),
    symptom("shoe_pressure", "Molesta el calzado", zones=FEET, min_age_months=12, parts={"foot": ["big_toe", "other_toes", "forefoot", "midfoot"]}),
    symptom("foot_burning", "Ardor en la planta", zones=FEET, min_age_months=24, parts={"foot": ["arch", "forefoot", "heel"]}),
    symptom("ankle_instability", "Tobillo inestable", zones=[*FEET, *LEGS], min_age_months=12, parts={"foot": ["ankle"], "leg": ["ankle"]}),
    symptom("knee_locking", "Se bloquea la rodilla", zones=LEGS, min_age_months=24, parts={"leg": ["knee", "back_knee"]}),
    symptom("eye_tearing", "Lagrimeo", zones=["head"], parts={"head": ["right_eye", "left_eye"]}),
    symptom("eye_discharge", "Secreción del ojo", zones=["head"], parts={"head": ["right_eye", "left_eye"]}),
    symptom("eye_grit", "Arenilla en el ojo", zones=["head"], min_age_months=24, parts={"head": ["right_eye", "left_eye"]}),
    symptom("hearing_loss", "Oigo menos", zones=["head"], parts={"head": ["right_ear", "left_ear"]}),
    symptom("ear_discharge", "Líquido del oído", zones=["head"], parts={"head": ["right_ear", "left_ear"]}),
    symptom("jaw_chewing", "Molesta al masticar", zones=["head"], min_age_months=24, parts={"head": ["jaw"]}),
    symptom("tooth_sensitivity", "Sensibilidad dental", zones=["head"], min_age_months=24, parts={"head": ["jaw"]}),
    symptom("scalp_lesion", "Lesión en el cuero cabelludo", zones=["head"], parts={"head": ["scalp"]}),
    symptom("nasal_discharge", "Mucosidad nasal", zones=["head"], parts={"head": ["nose"]}),
    symptom("infant_feeding", "Menos tomas", general=True, max_age_months=23),
    symptom("wet_diapers", "Menos pañales mojados", zones=URINARY_ZONES, general=True, max_age_months=23),
    symptom("child_irritability", "Llanto o irritabilidad", general=True, max_age_months=71),
    symptom("child_inactive", "Menos activo", general=True, max_age_months=215),
    symptom("child_limb_use", "No usa bien la zona", zones=MOVEMENT_ZONES, max_age_months=71),
    symptom("none", "Ninguno de estos", general=True),
    symptom("unknown", "No sé", general=True),
]


# La precisión modifica sugerencias; las opciones fuera del foco siguen siendo declarables.
FOCAL_SYMPTOMS = {
    "nail_change": {"hand": ["thumb", "index", "middle", "ring", "little"], "foot": ["big_toe", "other_toes"]},
    "heel_pain": {"foot": ["heel", "arch"]},
    "vision": {"head": ["right_eye", "left_eye"]},
    "eye_redness": {"head": ["right_eye", "left_eye"]},
    "hearing": {"head": ["right_ear", "left_ear"]},
    "ear_ringing": {"head": ["right_ear", "left_ear"]},
    "nasal_congestion": {"head": ["nose"]},
    "menstrual_changes": {"abdomen": ["lower_right", "lower_center", "lower_left"], "pelvis": ["center"]},
    "missed_period": {"abdomen": ["lower_right", "lower_center", "lower_left"], "pelvis": ["center"]},
    "vaginal_discharge": {"pelvis": ["center", "right_groin", "left_groin"]},
    "testicular_pain": {"pelvis": ["center", "right_groin", "left_groin"]},
    "testicular_swelling": {"pelvis": ["center", "right_groin", "left_groin"]},
}
for _symptom in SYMPTOMS:
    if _symptom["id"] in FOCAL_SYMPTOMS:
        _symptom["parts"] = FOCAL_SYMPTOMS[_symptom["id"]]


# Comprueba la edad para opciones adicionales, sin inferir anatomía por el género.
def available_symptoms(case):
    return [item for item in SYMPTOMS
            if (item["min_age_months"] is None or case.age_months >= item["min_age_months"])
            and (item["max_age_months"] is None or case.age_months <= item["max_age_months"])]


# Selecciona sugerencias por zona, edad, género declarado y evolución temporal.
def eligible_symptoms(case):
    broad = bool(set(case.body_zones) & {"general", "unknown"})
    result = []
    for item in available_symptoms(case):
        if item["zones"] and not ((broad and item["general"]) or set(item["zones"]) & set(case.body_zones)):
            continue
        if not matches_parts(item["parts"], case, item["zones"]):
            continue
        if item["onsets"] and case.onset not in item["onsets"]:
            continue
        if item["durations"] and case.duration not in item["durations"]:
            continue
        if item["preferred_genders"] and case.gender in {"male", "female"} and case.gender not in item["preferred_genders"]:
            continue
        result.append(item)
    # Prioriza opciones específicas de la zona y de contexto íntimo antes de las generales.
    return sorted(result, key=lambda item: (not bool(item["preferred_genders"]), not bool(item["parts"] and matches_parts(item["parts"], case, item["zones"], False)), len(item["zones"]) or 999))

ALARMS = [
    {"id": "severe_breathing", "label": "Dificultad intensa para respirar o para hablar por falta de aire"},
    {"id": "chest_pressure", "label": "Opresión intensa en el pecho"},
    {"id": "unresponsive", "label": "Pérdida de conocimiento, confusión repentina o no responde como habitualmente"},
    {"id": "blue_skin", "label": "Labios o piel azulados, grisáceos o muy pálidos"},
    {"id": "child_breathing", "label": "El menor hace mucho esfuerzo al respirar o se le hunden las costillas", "max_age_months": 215},
    {"id": "none", "label": "Ninguna de estas señales"},
    {"id": "unknown", "label": "No sé valorarlo"},
]

# Conserva los nombres públicos del catálogo al separar el banco de preguntas.
from backend.questions import QUESTIONS, QUESTION_BY_ID, eligible_questions

# Expone los catálogos sin añadir información ni estado de pacientes.
def public_catalog():
    return {"version": CATALOG_VERSION, "specialties": SPECIALTIES, "body_zones": BODY_ZONES,
            "body_details": BODY_DETAILS, "symptoms": SYMPTOMS, "alarms": ALARMS, "questions": QUESTIONS, "max_followups": 8}
