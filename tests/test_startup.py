"""Precarga de Tev durante el arranque con transportes HTTP aislados."""
import json

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.app import app
from backend.ollama import DecisionClient
from backend.settings import Settings


@pytest.mark.parametrize("keep_alive", ["1h", "2h"])
def test_model_is_loaded_before_serving_requests(monkeypatch, keep_alive):
    requests = []

    def transport(request):
        requests.append(request)
        payload = json.loads(request.content)
        assert request.url.path == "/v1/systemone"
        assert payload["model"] == "tev1:4b"
        assert payload["keep_alive"] == keep_alive
        assert payload["state"] == {"purpose": "Demo startup warmup"}
        return httpx.Response(200, json={"answers": {"warmup": {
            "choice": "warmup", "probabilities": {"warmup": 1, "other": 0},
        }}})

    adapter = DecisionClient(Settings(keep_alive=keep_alive), httpx.MockTransport(transport))
    monkeypatch.setattr("backend.app.get_client", lambda: adapter)
    with TestClient(app) as client:
        assert len(requests) == 1
        assert client.get("/api/catalog").status_code == 200
    assert len(requests) == 1


@pytest.mark.parametrize("failure", ["timeout", "connection", "missing", "invalid_response"])
def test_failed_warmup_keeps_demo_available(monkeypatch, caplog, failure):
    def transport(request):
        if failure == "timeout":
            raise httpx.ReadTimeout("private upstream details", request=request)
        if failure == "connection":
            raise httpx.ConnectError("private upstream details", request=request)
        if failure == "missing":
            return httpx.Response(404, json={"error": "private upstream details"})
        return httpx.Response(200, json={})

    adapter = DecisionClient(Settings(), httpx.MockTransport(transport))
    monkeypatch.setattr("backend.app.get_client", lambda: adapter)
    with TestClient(app) as client:
        assert client.get("/api/catalog").status_code == 200
    assert "No se pudo precargar" in caplog.text
    assert "private upstream details" not in caplog.text
