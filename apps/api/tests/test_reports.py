"""Testes do endpoint POST /reports/pdf.

Cobre:
  - Validação do request (período inválido)
  - Autenticação (JWT inválido)
  - Rejeição de não-membro do workspace
  - Geração de HTML (sem rodar WeasyPrint — evita libs nativas em CI rápida)
"""

from __future__ import annotations

from datetime import date
from unittest.mock import patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from jose import jwt

from src.config import Settings
from src import deps as deps_mod
from src.main import app


def _make_jwt(sub: str, secret: str) -> str:
    return jwt.encode({"sub": sub, "aud": "authenticated"}, secret, algorithm="HS256")


@pytest.fixture(autouse=True)
def _configure_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "test-secret-32chars-min-for-hs256-ok")
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "fake-service-role-key")
    deps_mod.settings = Settings()


def test_pdf_requires_auth_header() -> None:
    client = TestClient(app)
    r = client.post("/reports/pdf", json={
        "workspace_id": str(uuid4()),
        "periodo_inicio": "2026-04-01",
        "periodo_fim": "2026-04-30"
    })
    assert r.status_code == 422  # Authorization header missing


def test_pdf_rejects_invalid_jwt() -> None:
    client = TestClient(app)
    r = client.post(
        "/reports/pdf",
        headers={"Authorization": "Bearer invalid-token"},
        json={
            "workspace_id": str(uuid4()),
            "periodo_inicio": "2026-04-01",
            "periodo_fim": "2026-04-30"
        }
    )
    assert r.status_code == 401


def test_pdf_rejects_period_inverted() -> None:
    token = _make_jwt(str(uuid4()), "test-secret-32chars-min-for-hs256-ok")
    client = TestClient(app)
    r = client.post(
        "/reports/pdf",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "workspace_id": str(uuid4()),
            "periodo_inicio": "2026-04-30",
            "periodo_fim": "2026-04-01"
        }
    )
    assert r.status_code == 422


def test_pdf_rejects_non_member() -> None:
    user_id = str(uuid4())
    token = _make_jwt(user_id, "test-secret-32chars-min-for-hs256-ok")

    with patch("src.routers.reports.get_service_client") as m_client, \
         patch("src.routers.reports.is_member", return_value=False):
        m_client.return_value = object()
        client = TestClient(app)
        r = client.post(
            "/reports/pdf",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "workspace_id": str(uuid4()),
                "periodo_inicio": "2026-04-01",
                "periodo_fim": "2026-04-30"
            }
        )
        assert r.status_code == 403
        assert r.json()["detail"] == "not_a_member"


# ─── Teste do template Jinja (sem WeasyPrint) ─────────────────────────────

def test_html_render_contains_key_fields() -> None:
    from src.services.pdf_service import render_html

    data = {
        "workspace": {"id": str(uuid4()), "nome": "Família Silva"},
        "periodo_inicio": date(2026, 4, 1),
        "periodo_fim": date(2026, 4, 30),
        "transacoes": [
            {
                "id": str(uuid4()),
                "tipo": "gasto",
                "valor": 1200.50,
                "descricao": "Mercado",
                "data": "2026-04-10",
                "paga": True,
                "parcela_atual": 1,
                "parcelas_total": 1,
                "categoria": {"nome": "Alimentação", "cor": "#f59e0b"},
                "cartao": None,
            }
        ],
        "investimentos": [],
        "auditoria": [],
        "summary": {
            "entradas": 5000.00,
            "saidas": 1200.50,
            "resultado": 3799.50,
            "total_investimentos": 0.00,
        },
        "categorias": [
            {"nome": "Alimentação", "valor": 1200.50, "cor": "#f59e0b"}
        ],
    }
    html = render_html(data)
    assert "Família Silva" in html
    assert "01/04/2026" in html
    assert "30/04/2026" in html
    assert "Mercado" in html
    assert "R$ 5.000,00" in html
    assert "R$ 1.200,50" in html
    assert "Alimentação" in html


def test_money_filter_formats_br() -> None:
    from src.services.pdf_service import _money

    assert _money(1234.5) == "R$ 1.234,50"
    assert _money(0) == "R$ 0,00"
    assert _money(99.99) == "R$ 99,99"
