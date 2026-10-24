"""Condiciones estructuradas compartidas por las sugerencias y las preguntas."""
from backend.anatomy import BODY_DETAILS


# Compara el punto concreto con cada región, sin inferir datos que no se hayan indicado.
def matches_parts(parts_by_kind, case, zones=(), allow_unspecified=True):
    if not parts_by_kind:
        return True
    details = getattr(case, "body_details", {})
    for zone in case.body_zones:
        if zones and zone not in zones:
            continue
        kind = BODY_DETAILS.get(zone, {}).get("kind")
        if kind not in parts_by_kind:
            continue
        selected = details.get(zone, [])
        if not selected and allow_unspecified:
            return True
        if set(selected) & set(parts_by_kind[kind]):
            return True
    return False


# Exige respuestas previas concretas para habilitar una rama del cuestionario.
def matches_answers(required, answers):
    for identifier, allowed in required.items():
        value = answers.get(identifier)
        values = value if isinstance(value, list) else [value]
        if not set(values) & set(allowed):
            return False
    return True
