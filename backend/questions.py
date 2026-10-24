"""Preguntas estructuradas y condiciones de utilidad para selección opcional por Tev."""
from backend.context import matches_answers, matches_parts

HANDS = ["left_hand", "right_hand"]
FEET = ["left_foot", "right_foot"]
ARMS = ["left_arm", "right_arm"]
LEGS = ["left_leg", "right_leg"]
BACK = ["upper_back", "lower_back"]
MOVEMENT = ["neck", *BACK, *HANDS, *FEET, *ARMS, *LEGS]
FINGERS = ["thumb", "index", "middle", "ring", "little"]


# Cada criterio explica la información que falta, en vez de competir solo con el enunciado.
def question(identifier, label, options, *, hint, zones=(), symptoms=(), parts=None,
             min_age_months=None, max_age_months=None, genders=(), requires_answers=None, answer_or_symptoms=False, skip_if_symptoms=(),
             onsets=(), durations=(), evolutions=(), skip_if_details=False, skip_if_parts=None, allow_unspecified_parts=False, priority=20, kind="single"):
    return {
        "id": identifier, "label": label, "kind": kind,
        "options": [{"id": key, "label": text} for key, text in options] + [{"id": "unknown", "label": "No sé"}],
        "zones": list(zones), "symptoms": list(symptoms), "parts": parts or {},
        "min_age_months": min_age_months, "max_age_months": max_age_months,
        "genders": list(genders), "requires_answers": requires_answers or {},
        "answer_or_symptoms": answer_or_symptoms, "skip_if_symptoms": list(skip_if_symptoms),
        "onsets": list(onsets), "durations": list(durations), "evolutions": list(evolutions),
        "allow_unspecified_parts": allow_unspecified_parts, "skip_if_details": skip_if_details, "skip_if_parts": skip_if_parts or {}, "priority": priority, "decision_hint": hint,
    }


QUESTIONS = [
    question("injury", "¿Hubo un golpe, caída o esfuerzo antes de la molestia?", [("yes", "Sí"), ("no", "No")], zones=[*MOVEMENT, "head"], priority=12,
             hint="Ask about an unreported injury or repetitive load if this could distinguish traumatic from non-traumatic referral. Skip if already stated."),
    question("activity", "¿Cuánto limita tus actividades habituales?", [("none", "Nada"), ("some", "Un poco"), ("much", "Mucho"), ("unable", "No puedo realizarlas")], priority=10,
             hint="Ask about functional limitation if its missing degree could change referral or physician assessment priority."),
    question("previous", "¿Te había ocurrido antes?", [("never", "Es la primera vez"), ("similar", "Sí, de forma parecida"), ("different", "Sí, pero ahora es diferente")], priority=8,
             hint="Ask about previous episodes if recurrence would meaningfully distinguish referral pathways. Skip if already described."),
    question("conditions", "¿Hay antecedentes relevantes?", [("heart", "Cardíacos"), ("lung", "Respiratorios"), ("diabetes", "Diabetes"), ("kidney", "Renales"), ("allergy", "Alergias"), ("none", "Ninguno conocido")], kind="multi", priority=8,
             hint="Ask about relevant medical background only if absent from the history and likely to change referral."),
    question("medication", "¿Se ha tomado alguna medida o tratamiento para esta molestia?", [("none", "No"), ("helped", "Sí, y ha mejorado"), ("unchanged", "Sí, sin mejoría"), ("worse", "Sí, y ha empeorado")], priority=6,
             hint="Ask about response to measures already tried only if this missing information could affect referral."),
    question("foot", "¿Dónde está la principal molestia del pie?", [("sole", "Planta o talón"), ("nail", "Uñas"), ("toes", "Dedos"), ("ankle", "Tobillo"), ("whole", "Todo el pie")], zones=FEET, skip_if_details=True, priority=40,
             hint="Clarify an unspecified foot location to distinguish toe/nail, plantar and ankle complaints. Never repeat a location already described."),
    question("joint", "¿La molestia cambia al mover o apoyar la zona?", [("movement", "Empeora con el movimiento"), ("rest", "También molesta en reposo"), ("stiffness", "Hay rigidez al despertar"), ("no", "No cambia")], zones=MOVEMENT, priority=22,
             hint="Ask about movement, loading or rest when the missing pattern may distinguish mechanical from inflammatory or nerve-related assessment."),
    question("chest", "¿En qué situación aparece la molestia del pecho?", [("effort", "Con el esfuerzo"), ("rest", "En reposo"), ("breathing", "Al respirar o toser"), ("touch", "Al tocar o mover la zona")], zones=["chest"], symptoms=["palpitations"], priority=32,
             hint="Clarify the context of chest symptoms if effort, breathing or touch could distinguish cardiac, respiratory and musculoskeletal referral."),
    question("digestion", "¿La molestia se relaciona con comer o ir al baño?", [("food", "Con las comidas"), ("bowel", "Con las deposiciones"), ("urine", "Con la micción"), ("none", "No encuentro relación")], zones=["abdomen", "pelvis"], symptoms=["nausea", "bowel", "urinary"], priority=28,
             hint="Clarify a missing relation to food, bowel movements or urination to distinguish digestive and urinary assessment."),
    question("head", "¿Qué acompaña a la molestia de cabeza o cara?", [("light", "Molestia con la luz"), ("nose", "Congestión nasal"), ("ear", "Dolor de oído"), ("vision", "Cambios en la visión"), ("none", "Nada de lo anterior")], zones=["head"], kind="multi", skip_if_parts={"head": ["right_eye", "left_eye", "right_ear", "left_ear", "nose", "jaw"]}, priority=20,
             hint="Clarify unreported associated head symptoms when eye, ear, nasal or neurological assessment remains uncertain. Do not repeat reported symptoms."),
    question("skin", "¿Cómo es el cambio en la piel?", [("itch", "Picor"), ("red", "Enrojecimiento"), ("lesion", "Lesión localizada"), ("swelling", "Hinchazón")], symptoms=["rash", "redness", "wound", "scalp_lesion"], priority=35,
             hint="Characterize an unexplained skin change to distinguish skin disease, local injury and swelling."),
    question("breathing", "¿Cuándo aparece la tos o la falta de aire?", [("activity", "Con actividad"), ("night", "Por la noche"), ("all_day", "A lo largo del día"), ("exposure", "Tras una exposición concreta")], symptoms=["cough", "breathlessness", "wheeze", "sputum"], priority=34,
             hint="Clarify the missing timing or trigger of respiratory symptoms when it could change respiratory or allergy referral."),
    question("urinary_detail", "¿Qué cambio notas al orinar?", [("burning", "Escozor"), ("frequent", "Más veces"), ("leak", "Escapes"), ("other", "Otro cambio")], symptoms=["urinary", "urinary_frequency", "urinary_leak"], skip_if_symptoms=["urinary_frequency", "urinary_leak"], priority=36,
             hint="Distinguish burning, frequency and leakage when the reported urinary complaint is not yet characterized."),
    question("bowel_detail", "¿Qué cambio notas al ir al baño?", [("loose", "Heces líquidas"), ("hard", "Heces duras o cuesta evacuar"), ("frequency", "Ha cambiado la frecuencia"), ("other", "Otro cambio")], symptoms=["bowel", "diarrhea", "constipation"], skip_if_symptoms=["diarrhea", "constipation"], priority=30,
             hint="Clarify an unspecified bowel change; skip if diarrhea or constipation already describes it adequately."),
    question("nail_detail", "¿Qué cambio observas en las uñas?", [("color", "Color o grosor"), ("edge", "Molestia en el borde"), ("injury", "Golpe o rotura"), ("other", "Otro cambio")], symptoms=["nail_change", "nail_fold_redness"], priority=42,
             hint="Characterize nail changes to distinguish nail-edge problems, injury and skin/nail assessment."),
    question("hand_use", "¿Qué gesto hace que notes más la molestia de la mano?", [("grip", "Agarrar o apretar"), ("fine", "Escribir o usar los dedos"), ("rest", "También en reposo"), ("none", "No cambia con el uso")], zones=HANDS, priority=32,
             hint="Ask which hand task provokes symptoms if the missing pattern could distinguish tendon/joint, nerve or other hand assessment."),
    question("hand_sensation", "¿La mano o los dedos se duermen o pierden fuerza?", [("numb", "Se duermen u hormiguean"), ("weak", "Noto menos fuerza"), ("both", "Ambas cosas"), ("no", "No")], zones=HANDS, symptoms=["finger_numbness", "night_hand_tingling", "grip_difficulty"], priority=34,
             hint="Clarify whether hand discomfort includes altered sensation or weakness when nerve-related versus mechanical referral is unresolved."),
    question("hand_pattern", "¿Cuándo se duermen o molestan más los dedos?", [("night", "Por la noche o al despertar"), ("use", "Al usar la mano"), ("constant", "De forma continua"), ("variable", "No hay un patrón")], zones=HANDS, requires_answers={"hand_sensation": ["numb", "both"]}, symptoms=["finger_numbness"], answer_or_symptoms=True, skip_if_symptoms=["night_hand_tingling"], priority=55,
             hint="After reported hand tingling, determine its missing timing if useful for nerve versus load-related assessment."),
    question("finger_motion", "¿Qué ocurre al doblar o estirar el dedo?", [("pain", "Duele al moverlo"), ("locks", "Se atasca o bloquea"), ("limited", "No lo muevo bien"), ("no", "Se mueve con normalidad")], zones=HANDS, parts={"hand": FINGERS}, symptoms=["finger_locking", "thumb_movement_pain"], skip_if_symptoms=["finger_locking"], priority=44,
             hint="Clarify finger motion or locking at the selected digit when this could distinguish tendon/joint from skin or nerve assessment."),
    question("finger_locking", "¿Cómo se comporta el bloqueo del dedo?", [("morning", "Sobre todo al despertar"), ("grip", "Al agarrar cosas"), ("stuck", "Queda bloqueado"), ("variable", "Va cambiando")], zones=HANDS, requires_answers={"finger_motion": ["locks"]}, symptoms=["finger_locking"], answer_or_symptoms=True, priority=56,
             hint="Characterize a confirmed locking finger only if the pattern is still missing and matters for hand assessment."),
    question("wrist_load", "¿Con qué movimiento notas más la muñeca?", [("bend", "Al doblarla"), ("turn", "Al girar"), ("support", "Al apoyarme sobre la mano"), ("rest", "También en reposo")], zones=[*HANDS, *ARMS], parts={"hand": ["wrist"], "arm": ["wrist"]}, symptoms=["wrist_clicks"], priority=45,
             hint="Clarify the provoking movement at a selected wrist to distinguish load-related joint/tendon from other assessment."),
    question("hand_distribution", "¿Dónde notas el hormigueo de la mano?", [("thumb_side", "Pulgar, índice o corazón"), ("little_side", "Anular o meñique"), ("whole", "Toda la mano"), ("variable", "Cambia de zona")], zones=HANDS, symptoms=["finger_numbness", "night_hand_tingling"], parts={"hand": ["palm", "dorsum", "wrist"]}, requires_answers={"hand_sensation": ["numb", "both"]}, answer_or_symptoms=True, skip_if_parts={"hand": FINGERS}, priority=42,
             hint="Clarify an unspecified hand sensory distribution only when hand nerve-related assessment remains a plausible alternative."),
    question("foot_load", "¿Cómo cambia la molestia del pie al caminar o descansar?", [("load", "Empeora al caminar"), ("first", "Más en los primeros pasos"), ("rest", "También en reposo"), ("none", "No cambia")], zones=FEET, skip_if_symptoms=["first_steps_pain"], priority=32,
             hint="Clarify an unreported load-versus-rest foot pattern when it could distinguish mechanical plantar pain from other referral."),
    question("heel_pattern", "¿Cuándo notas más el talón o el arco del pie?", [("first", "En los primeros pasos"), ("standing", "Tras estar de pie"), ("sport", "Después de actividad"), ("rest", "También en reposo")], zones=FEET, parts={"foot": ["heel", "arch"]}, symptoms=["heel_pain", "first_steps_pain"], skip_if_symptoms=["first_steps_pain"], priority=44,
             hint="Clarify the missing timing of selected heel/arch discomfort if it helps distinguish plantar loading from other assessment."),
    question("shoe_contact", "¿La molestia de los dedos cambia con el calzado o el roce?", [("shoe", "Empeora con el calzado"), ("touch", "Duele al rozar o tocar"), ("barefoot", "También sin calzado"), ("no", "No encuentro relación")], zones=FEET, parts={"foot": ["big_toe", "other_toes", "forefoot"]}, symptoms=["shoe_pressure", "hard_skin"], skip_if_symptoms=["shoe_pressure"], priority=43,
             hint="Clarify contact or footwear pressure at selected toes/forefoot to distinguish skin/nail pressure from joint or nerve assessment."),
    question("ankle_stability", "¿El tobillo falla, se tuerce o limita el apoyo?", [("unstable", "Lo noto inestable"), ("load", "Me cuesta apoyar"), ("movement", "Limita al moverlo"), ("no", "No")], zones=[*FEET, *LEGS], parts={"foot": ["ankle"], "leg": ["ankle"]}, symptoms=["ankle_instability"], priority=44,
             hint="Clarify selected ankle stability and support if useful for joint/injury versus other referral."),
    question("knee_context", "¿Qué actividad hace que notes más la rodilla?", [("stairs", "Escaleras o cuclillas"), ("walk", "Caminar o correr"), ("rest", "Reposo o al despertar"), ("none", "No cambia")], zones=LEGS, parts={"leg": ["knee", "back_knee"]}, symptoms=["knee_locking"], priority=43,
             hint="Clarify a selected knee activity pattern when mechanical versus other assessment is unresolved."),
    question("shoulder_context", "¿Qué movimiento hace que notes más el hombro?", [("raise", "Levantar el brazo"), ("behind", "Llevarlo detrás"), ("rest", "También en reposo"), ("none", "No cambia")], zones=ARMS, parts={"arm": ["shoulder"]}, priority=43,
             hint="Clarify selected shoulder movement limitation if it could change joint/tendon versus other referral."),
    question("elbow_use", "¿Qué gesto hace que notes más el codo?", [("grip", "Agarrar o apretar"), ("bend", "Doblar o estirar"), ("support", "Apoyar el codo"), ("none", "No cambia")], zones=ARMS, parts={"arm": ["elbow"]}, priority=43,
             hint="Clarify the missing provoking task at a selected elbow when it matters for musculoskeletal assessment."),
    question("back_radiation", "¿La molestia de espalda se extiende a otra zona?", [("leg", "Hacia una pierna"), ("arm", "Hacia un brazo"), ("local", "Se queda en la espalda"), ("variable", "Cambia de zona")], zones=BACK, symptoms=["radiating_pain"], priority=34,
             hint="Clarify unreported radiation from the back to distinguish local mechanical from nerve-related assessment."),
    question("back_posture", "¿Con qué postura notas más la espalda?", [("sitting", "Sentado"), ("bend", "Al inclinarme o levantar peso"), ("standing", "De pie"), ("rest", "También en reposo")], zones=BACK, priority=28,
             hint="Ask about an unknown posture-related back pattern only if it can help referral assessment."),
    question("neck_radiation", "¿La molestia del cuello se extiende al hombro o al brazo?", [("shoulder", "Hacia el hombro"), ("arm", "Hacia el brazo o mano"), ("local", "Se queda en el cuello"), ("variable", "Cambia de zona")], zones=["neck"], priority=32,
             hint="Clarify a missing neck radiation pattern to distinguish local neck from upper-limb nerve assessment."),
    question("eye_context", "¿Qué notas principalmente en el ojo?", [("itch", "Picor o escozor"), ("surface", "Sensación de arenilla"), ("vision", "Cambios al ver"), ("pain", "Dolor más profundo")], zones=["head"], parts={"head": ["right_eye", "left_eye"]}, symptoms=["vision", "eye_redness", "eye_tearing", "eye_discharge", "eye_grit"], priority=45,
             hint="Characterize an incompletely described eye complaint when surface irritation versus visual assessment remains unclear."),
    question("eye_laterality", "¿La molestia afecta a un ojo o a los dos?", [("right", "Solo al derecho"), ("left", "Solo al izquierdo"), ("both", "A los dos"), ("variable", "Va cambiando")], symptoms=["vision", "eye_redness", "eye_tearing", "eye_discharge"], skip_if_parts={"head": ["right_eye", "left_eye"]}, priority=35,
             hint="Clarify eye laterality only when it has not already been selected or stated and could affect assessment."),
    question("ear_context", "¿Qué notas principalmente en el oído?", [("pain", "Dolor"), ("blocked", "Taponamiento o menos audición"), ("noise", "Zumbidos"), ("fluid", "Salida de líquido")], zones=["head"], parts={"head": ["right_ear", "left_ear"]}, symptoms=["hearing", "ear_ringing", "hearing_loss", "ear_discharge"], priority=45,
             hint="Characterize an unspecified ear complaint when pain, hearing change or discharge could change assessment."),
    question("jaw_context", "¿La molestia cambia al masticar, abrir la boca o con frío y calor?", [("chew", "Al masticar o abrir"), ("temperature", "Con frío o calor"), ("touch", "Al tocar un diente o encía"), ("no", "No cambia")], zones=["head"], parts={"head": ["jaw"]}, symptoms=["jaw_chewing", "tooth_sensitivity"], priority=45,
             hint="Clarify jaw versus dental triggers when the selected mouth/jaw complaint could lead to different professional assessment."),
    question("head_pattern", "¿Cómo se presenta la molestia de cabeza?", [("episodes", "En episodios"), ("constant", "Continua"), ("pressure", "Como presión"), ("activity", "Con alguna actividad")], zones=["head"], parts={"head": ["forehead", "scalp", "back_of_head"]}, symptoms=["headache"], priority=34,
             hint="Clarify a missing head pain pattern if it can distinguish neurological from other head assessment."),
    question("nasal_context", "¿La molestia nasal se acompaña de congestión, estornudos o picor?", [("blocked", "Sobre todo congestión"), ("sneeze", "Estornudos o picor"), ("discharge", "Mucosidad"), ("no", "No")], zones=["head"], parts={"head": ["nose"]}, symptoms=["nasal_congestion", "nasal_discharge"], priority=40,
             hint="Clarify an unspecified nasal pattern if allergy versus ENT assessment remains uncertain."),
    question("abdominal_pattern", "¿Cómo se comporta la molestia del abdomen?", [("cramps", "Va y viene como retortijones"), ("burning", "Es más bien ardor"), ("bloating", "Predomina la hinchazón"), ("steady", "Es continua")], zones=["abdomen"], priority=30,
             hint="Clarify a missing abdominal symptom pattern when it could distinguish digestive from other assessment."),
    question("upper_abdomen_food", "¿La molestia de la parte alta del abdomen cambia con las comidas?", [("after", "Aparece después"), ("empty", "Con el estómago vacío"), ("lying", "Más al tumbarme"), ("no", "No encuentro relación")], zones=["abdomen"], parts={"abdomen": ["upper_right", "upper_center", "upper_left"]}, symptoms=["reflux"], priority=42,
             hint="Clarify a missing meal or lying-down relation at the upper abdomen when it can help digestive versus other assessment."),
    question("pelvic_context", "¿Qué situación se relaciona más con la molestia pélvica?", [("urine", "Orinar"), ("bowel", "Ir al baño"), ("movement", "Moverme o caminar"), ("none", "No encuentro relación")], zones=["pelvis"], priority=30,
             hint="Clarify an unknown pelvic trigger to distinguish urinary, bowel and movement-related assessment."),
    question("hip_motion", "¿Con qué gesto notas más la cadera o la ingle?", [("walk", "Caminar o subir escaleras"), ("rotate", "Girar la pierna"), ("sit", "Sentarme o levantarme"), ("rest", "También en reposo")], zones=["pelvis"], parts={"pelvis": ["right_hip", "left_hip", "right_groin", "left_groin"]}, priority=44,
             hint="Clarify a selected hip/groin movement pattern when musculoskeletal versus other referral is uncertain."),
    question("menstrual_context", "¿La molestia guarda relación con el ciclo menstrual?", [("during", "Durante la regla"), ("before", "Antes de la regla"), ("independent", "No encuentro relación"), ("not_applicable", "No se aplica a mi caso")], zones=["abdomen", "pelvis"], parts={"abdomen": ["lower_right", "lower_center", "lower_left"], "pelvis": ["center"]}, symptoms=["menstrual_changes", "missed_period"], genders=["female"], allow_unspecified_parts=True, min_age_months=96, priority=38,
             hint="Clarify an unknown menstrual relation only when applicable to the reported context and useful for gynecological versus other assessment."),
    question("genital_context", "¿Qué predomina en la molestia testicular?", [("pain", "Dolor"), ("swelling", "Hinchazón"), ("touch", "Molestia al tocar o con el roce"), ("variable", "Va cambiando"), ("not_applicable", "No se aplica a mi caso")], zones=["pelvis"], parts={"pelvis": ["center", "right_groin", "left_groin"]}, symptoms=["testicular_pain", "testicular_swelling"], genders=["male"], allow_unspecified_parts=True, priority=38,
             hint="Clarify an incompletely described testicular complaint only if applicable and useful for professional assessment."),
    question("skin_spread", "¿El cambio en la piel está localizado o aparece en más zonas?", [("local", "Solo en ese punto"), ("several", "En varias zonas"), ("spreading", "Se está extendiendo"), ("variable", "Aparece y desaparece")], symptoms=["rash", "redness", "scalp_lesion"], requires_answers={"skin": ["itch", "red", "lesion"]}, answer_or_symptoms=True, priority=50,
             hint="After a reported skin change, clarify its missing distribution if it would alter skin or other assessment."),
    question("child_intake", "¿Cómo está comiendo o bebiendo el menor?", [("normal", "Como habitualmente"), ("less", "Menos de lo habitual"), ("unable", "Casi no puede comer o beber")], max_age_months=215,
             hint="Pediatric intake context for professional review."),
    question("child_behavior", "¿Cómo se encuentra el menor entre los episodios?", [("normal", "Activo como habitualmente"), ("tired", "Más decaído"), ("irritable", "Más irritable")], max_age_months=215,
             hint="Pediatric behavior context for professional review."),
    question("infant", "¿Han cambiado las tomas o los pañales mojados?", [("normal", "Sin cambios"), ("feeding", "Menos tomas"), ("diapers", "Menos pañales mojados"), ("both", "Ambas cosas")], max_age_months=23,
             hint="Infant feeding and wet-diaper context for professional review."),
]
QUESTION_BY_ID = {item["id"]: item for item in QUESTIONS}


# Descarta ramas ajenas al contexto o ya precisadas, conservando declaraciones explícitas.
def eligible_questions(case):
    result = []
    for item in QUESTIONS:
        if item["min_age_months"] is not None and case.age_months < item["min_age_months"]:
            continue
        if item["max_age_months"] is not None and case.age_months > item["max_age_months"]:
            continue
        symptom_match = bool(set(item["symptoms"]) & set(case.symptoms))
        zone_match = bool(set(item["zones"]) & set(case.body_zones))
        part_match = bool(item["parts"]) and matches_parts(item["parts"], case, item["zones"], item["allow_unspecified_parts"])
        answer_match = bool(item["requires_answers"]) and matches_answers(item["requires_answers"], case.answers)
        if (item["zones"] or item["symptoms"] or item["parts"]) and not (symptom_match or zone_match or part_match or answer_match):
            continue
        if item["parts"] and not (part_match or symptom_match or answer_match):
            continue
        if item["genders"] and case.gender in {"female", "male"} and case.gender not in item["genders"] and not symptom_match:
            continue
        scoped = set(item["zones"] or case.body_zones) & set(case.body_zones)
        if item["skip_if_details"] and scoped and all(case.body_details.get(zone) for zone in scoped):
            continue
        if item["skip_if_parts"] and matches_parts(item["skip_if_parts"], case, allow_unspecified=False):
            continue
        if item["onsets"] and case.onset not in item["onsets"]:
            continue
        if item["durations"] and case.duration not in item["durations"]:
            continue
        if item["evolutions"] and case.evolution not in item["evolutions"]:
            continue
        if set(item["skip_if_symptoms"]) & set(case.symptoms):
            continue
        if not matches_answers(item["requires_answers"], case.answers) and not (item["answer_or_symptoms"] and symptom_match):
            continue
        result.append(item)
    return result


# Acota las candidatas a la ventana corta de Tev, priorizando puntos y síntomas declarados.
def question_candidates(case, limit=12):
    remaining = [item for item in eligible_questions(case) if item["id"] not in case.answers]
    # Mantiene primero las ramas sustentadas en síntomas, puntos o respuestas reales.
    def relevance(item):
        return (item["priority"]
                + 15 * bool(set(item["symptoms"]) & set(case.symptoms))
                + 10 * bool(item["parts"] and matches_parts(item["parts"], case, item["zones"], False))
                + 10 * bool(item["requires_answers"]))
    return sorted(remaining, key=relevance, reverse=True)[:limit]
