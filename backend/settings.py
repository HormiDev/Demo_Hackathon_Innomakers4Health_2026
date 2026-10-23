"""Configuración local explícita; nunca descarga pesos ni modifica Ollama."""
import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    ollama_url: str = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
    model: str = os.getenv("OLLAMA_MODEL", "tev1:4b")
    timeout: float = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "120"))
    context_tokens: int = int(os.getenv("MODEL_CONTEXT_TOKENS", "2048"))
    tokenizer_path: str = os.getenv("TOKENIZER_PATH", str(Path(__file__).parent / "data/tokenizer.json"))
    static_path: str = os.getenv("STATIC_PATH", str(Path(__file__).parent.parent / "frontend/dist"))

