"""Descarga solo el tokenizador público durante preparación/compilación, nunca pesos."""
import hashlib
import urllib.request
from pathlib import Path

REVISION = "0b7becf017daa0e5eb222f8ce7483c8c8259c52f"
EXPECTED_SHA256 = "5f9e4d4901a92b997e463c1f46055088b6cca5ca61a6522d1b9f64c4bb81cb42"
URL = f"https://huggingface.co/togethercomputer/Tev1-4B-experimental/resolve/{REVISION}/tokenizer.json"
DESTINATION = Path(__file__).resolve().parent.parent / "backend/data/tokenizer.json"


# Prepara el recurso de tokenización fijado a una revisión oficial e inmutable.
def main():
    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    if not DESTINATION.exists():
        with urllib.request.urlopen(URL, timeout=120) as response:
            content = response.read(40_000_001)
        if len(content) > 40_000_000:
            raise ValueError("Tokenizador demasiado grande")
        if hashlib.sha256(content).hexdigest() != EXPECTED_SHA256:
            raise ValueError("El tokenizador no coincide con el SHA-256 esperado")
        temporary = DESTINATION.with_suffix(".tmp")
        temporary.write_bytes(content)
        temporary.replace(DESTINATION)
    digest = hashlib.sha256(DESTINATION.read_bytes()).hexdigest()
    if digest != EXPECTED_SHA256:
        raise ValueError("El tokenizador existente no coincide con la revisión fijada")
    print(f"Tokenizador preparado: {digest}")


if __name__ == "__main__":
    main()
