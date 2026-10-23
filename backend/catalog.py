"""Catálogo de demostración versionado; requiere revisión clínica antes de uso real."""

CATALOG_VERSION = "1.0.0"

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

SYMPTOMS = [
    {"id": "fever", "label": "Fiebre"},
    {"id": "cough", "label": "Tos"},
    {"id": "breathlessness", "label": "Falta de aire"},
    {"id": "palpitations", "label": "Palpitaciones"},
    {"id": "nausea", "label": "Náuseas o vómitos"},
    {"id": "bowel", "label": "Cambios intestinales"},
    {"id": "urinary", "label": "Molestias al orinar"},
    {"id": "rash", "label": "Erupción o picor"},
    {"id": "numbness", "label": "Hormigueo"},
    {"id": "dizziness", "label": "Mareo"},
    {"id": "fatigue", "label": "Cansancio"},
    {"id": "mood", "label": "Cambios de ánimo"},
    {"id": "vision", "label": "Molestias visuales"},
    {"id": "hearing", "label": "Molestias de oído"},
    {"id": "none", "label": "Ninguno de estos"},
    {"id": "unknown", "label": "No sé"},
]

ALARMS = [
    {"id": "severe_breathing", "label": "Dificultad intensa para respirar o para hablar por falta de aire"},
    {"id": "chest_pressure", "label": "Opresión intensa en el pecho"},
    {"id": "unresponsive", "label": "Pérdida de conocimiento, confusión repentina o no responde como habitualmente"},
    {"id": "blue_skin", "label": "Labios o piel azulados, grisáceos o muy pálidos"},
    {"id": "child_breathing", "label": "El menor hace mucho esfuerzo al respirar o se le hunden las costillas", "max_age_months": 215},
    {"id": "none", "label": "Ninguna de estas señales"},
    {"id": "unknown", "label": "No sé valorarlo"},
]

# Construye una pregunta con sus opciones y condiciones explícitas de elegibilidad.
def question(identifier, label, options, *, zones=None, symptoms=None, max_age_months=None, kind="single"):
    return {
        "id": identifier, "label": label, "kind": kind,
        "options": [{"id": key, "label": text} for key, text in options] + [{"id": "unknown", "label": "No sé"}],
        "zones": zones or [], "symptoms": symptoms or [], "max_age_months": max_age_months,
    }

QUESTIONS = [
    question("injury", "¿Hubo un golpe, caída o esfuerzo antes de la molestia?", [("yes", "Sí"), ("no", "No")]),
    question("activity", "¿Cuánto limita tus actividades habituales?", [("none", "Nada"), ("some", "Un poco"), ("much", "Mucho"), ("unable", "No puedo realizarlas")]),
    question("previous", "¿Te había ocurrido antes?", [("never", "Es la primera vez"), ("similar", "Sí, de forma parecida"), ("different", "Sí, pero ahora es diferente")]),
    question("conditions", "¿Hay antecedentes relevantes?", [("heart", "Cardíacos"), ("lung", "Respiratorios"), ("diabetes", "Diabetes"), ("kidney", "Renales"), ("allergy", "Alergias"), ("none", "Ninguno conocido")], kind="multi"),
    question("medication", "¿Se ha tomado alguna medida o tratamiento para esta molestia?", [("none", "No"), ("helped", "Sí, y ha mejorado"), ("unchanged", "Sí, sin mejoría"), ("worse", "Sí, y ha empeorado")]),
    question("foot", "¿Dónde está la principal molestia del pie?", [("sole", "Planta o talón"), ("nail", "Uñas"), ("toes", "Dedos"), ("ankle", "Tobillo"), ("whole", "Todo el pie")], zones=["left_foot", "right_foot"]),
    question("joint", "¿La molestia cambia al mover o apoyar la zona?", [("movement", "Empeora con el movimiento"), ("rest", "También molesta en reposo"), ("stiffness", "Hay rigidez al despertar"), ("no", "No cambia")], zones=["left_arm", "right_arm", "left_leg", "right_leg", "lower_back", "upper_back", "left_hand", "right_hand"]),
    question("chest", "¿En qué situación aparece la molestia del pecho?", [("effort", "Con el esfuerzo"), ("rest", "En reposo"), ("breathing", "Al respirar o toser"), ("touch", "Al tocar o mover la zona")], zones=["chest"], symptoms=["palpitations"]),
    question("digestion", "¿La molestia se relaciona con comer o ir al baño?", [("food", "Con las comidas"), ("bowel", "Con las deposiciones"), ("urine", "Con la micción"), ("none", "No encuentro relación")], zones=["abdomen", "pelvis"], symptoms=["nausea", "bowel", "urinary"]),
    question("head", "¿Qué acompaña a la molestia de cabeza o cara?", [("light", "Molestia con la luz"), ("nose", "Congestión nasal"), ("ear", "Dolor de oído"), ("vision", "Cambios en la visión"), ("none", "Nada de lo anterior")], zones=["head"], kind="multi"),
    question("skin", "¿Cómo es el cambio en la piel?", [("itch", "Picor"), ("red", "Enrojecimiento"), ("lesion", "Lesión localizada"), ("swelling", "Hinchazón")], symptoms=["rash"]),
    question("breathing", "¿Cuándo aparece la tos o la falta de aire?", [("activity", "Con actividad"), ("night", "Por la noche"), ("all_day", "A lo largo del día"), ("exposure", "Tras una exposición concreta")], symptoms=["cough", "breathlessness"]),
    question("child_intake", "¿Cómo está comiendo o bebiendo el menor?", [("normal", "Como habitualmente"), ("less", "Menos de lo habitual"), ("unable", "Casi no puede comer o beber")], max_age_months=215),
    question("child_behavior", "¿Cómo se encuentra el menor entre los episodios?", [("normal", "Activo como habitualmente"), ("tired", "Más decaído"), ("irritable", "Más irritable")], max_age_months=215),
    question("infant", "¿Han cambiado las tomas o los pañales mojados?", [("normal", "Sin cambios"), ("feeding", "Menos tomas"), ("diapers", "Menos pañales mojados"), ("both", "Ambas cosas")], max_age_months=23),
]

QUESTION_BY_ID = {item["id"]: item for item in QUESTIONS}

# Selecciona preguntas pertinentes por edad y por las zonas o síntomas declarados.
def eligible_questions(case):
    result = []
    for item in QUESTIONS:
        if item["max_age_months"] is not None and case.age_months > item["max_age_months"]:
            continue
        conditional = item["zones"] or item["symptoms"]
        if conditional and not (set(item["zones"]) & set(case.body_zones) or set(item["symptoms"]) & set(case.symptoms)):
            continue
        result.append(item)
    return result

# Expone los catálogos sin añadir información ni estado de pacientes.
def public_catalog():
    return {"version": CATALOG_VERSION, "specialties": SPECIALTIES, "body_zones": BODY_ZONES,
            "symptoms": SYMPTOMS, "alarms": ALARMS, "questions": QUESTIONS, "max_followups": 8}
