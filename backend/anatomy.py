"""Localizaciones ilustrativas para precisar el mapa corporal, sin reglas diagnósticas."""


# Publica opciones y vistas para que la interfaz y la API compartan identificadores.
def detail(kind, options, views=("front", "back"), default_view="front"):
    return {"kind": kind, "views": list(views), "default_view": default_view,
            "options": [{"id": identifier, "label": label, "views": list(visible)}
                        for identifier, label, visible in options]}


BOTH = ("front", "back")
FRONT = ("front",)
BACK = ("back",)
HAND = detail("hand", [
    ("thumb", "Pulgar", BOTH), ("index", "Dedo índice", BOTH),
    ("middle", "Dedo corazón", BOTH), ("ring", "Dedo anular", BOTH),
    ("little", "Meñique", BOTH), ("palm", "Palma", FRONT),
    ("dorsum", "Dorso", BACK), ("wrist", "Muñeca", BOTH),
])
FOOT = detail("foot", [
    ("big_toe", "Dedo gordo", BOTH), ("other_toes", "Otros dedos", BOTH),
    ("forefoot", "Antepié", BOTH), ("midfoot", "Empeine", FRONT),
    ("arch", "Arco plantar", BACK), ("heel", "Talón", BOTH),
    ("ankle", "Tobillo", FRONT),
])
ARM = detail("arm", [
    ("shoulder", "Hombro", BOTH), ("upper_arm", "Brazo", BOTH),
    ("elbow", "Codo", BOTH), ("forearm", "Antebrazo", BOTH),
    ("wrist", "Muñeca", BOTH),
])
LEG = detail("leg", [
    ("thigh", "Muslo", FRONT), ("back_thigh", "Muslo posterior", BACK),
    ("knee", "Rodilla", FRONT), ("back_knee", "Detrás de la rodilla", BACK),
    ("shin", "Espinilla", FRONT), ("calf", "Pantorrilla", BACK),
    ("ankle", "Tobillo", BOTH),
])
BODY_DETAILS = {
    "left_hand": HAND, "right_hand": HAND, "left_foot": FOOT, "right_foot": FOOT,
    "left_arm": ARM, "right_arm": ARM, "left_leg": LEG, "right_leg": LEG,
    "head": detail("head", [
        ("scalp", "Cuero cabelludo", BOTH), ("forehead", "Frente", FRONT),
        ("right_eye", "Ojo derecho", FRONT), ("left_eye", "Ojo izquierdo", FRONT),
        ("right_ear", "Oído derecho", BOTH), ("left_ear", "Oído izquierdo", BOTH),
        ("nose", "Nariz", FRONT), ("jaw", "Boca y mandíbula", FRONT),
        ("back_of_head", "Nuca y parte posterior", BACK),
    ]),
    "neck": detail("neck", [
        ("center", "Parte anterior", FRONT), ("nape", "Nuca", BACK),
        ("right_side", "Lado derecho", BOTH), ("left_side", "Lado izquierdo", BOTH),
    ]),
    "chest": detail("chest", [
        ("upper_right", "Arriba a la derecha", FRONT), ("upper_left", "Arriba a la izquierda", FRONT),
        ("center", "Centro / esternón", FRONT),
        ("lower_right", "Abajo a la derecha", FRONT), ("lower_left", "Abajo a la izquierda", FRONT),
    ], FRONT),
    "abdomen": detail("abdomen", [
        ("upper_right", "Arriba a la derecha", FRONT), ("upper_center", "Arriba en el centro", FRONT),
        ("upper_left", "Arriba a la izquierda", FRONT), ("right_side", "Lado derecho", FRONT),
        ("center", "Alrededor del ombligo", FRONT), ("left_side", "Lado izquierdo", FRONT),
        ("lower_right", "Abajo a la derecha", FRONT), ("lower_center", "Abajo en el centro", FRONT),
        ("lower_left", "Abajo a la izquierda", FRONT),
    ], FRONT),
    "pelvis": detail("pelvis", [
        ("right_hip", "Cadera derecha", FRONT), ("left_hip", "Cadera izquierda", FRONT),
        ("right_groin", "Ingle derecha", FRONT), ("left_groin", "Ingle izquierda", FRONT),
        ("center", "Centro / pubis", FRONT),
    ], FRONT),
    "upper_back": detail("upper_back", [
        ("right_shoulder", "Hombro derecho", BACK), ("left_shoulder", "Hombro izquierdo", BACK),
        ("right_blade", "Omóplato derecho", BACK), ("left_blade", "Omóplato izquierdo", BACK),
        ("center", "Centro de la espalda", BACK),
    ], BACK, "back"),
    "lower_back": detail("lower_back", [
        ("right_side", "Lumbar derecha", BACK), ("left_side", "Lumbar izquierda", BACK),
        ("center", "Centro lumbar", BACK), ("sacrum", "Sacro / parte baja", BACK),
    ], BACK, "back"),
}
