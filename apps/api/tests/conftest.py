"""
Fixtures de teste — incluindo dois clientes Supabase autenticados como usuários
distintos para validar isolamento RLS cross-workspace.

Pré-requisito: `supabase start` rodando localmente com migrations aplicadas.
Variáveis lidas do ambiente:
  - SUPABASE_URL (ex: http://localhost:54321)
  - SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY
"""

from __future__ import annotations

import os
import uuid
from dataclasses import dataclass

import pytest
from supabase import Client, create_client


def _required(name: str) -> str:
    v = os.environ.get(name)
    if not v:
        pytest.skip(f"{name} não definida — pulando testes que dependem do Supabase local")
    return v


@dataclass
class TestUser:
    client: Client
    user_id: str
    email: str


def _make_user(
    url: str, anon_key: str, service_client: Client, label: str
) -> TestUser:
    email = f"test-{label}-{uuid.uuid4().hex[:8]}@example.com"
    password = "Sup3rSecret!123"
    service_client.auth.admin.create_user(
        {"email": email, "password": password, "email_confirm": True}
    )
    client = create_client(url, anon_key)
    session = client.auth.sign_in_with_password({"email": email, "password": password})
    assert session.user is not None
    return TestUser(client=client, user_id=session.user.id, email=email)


@pytest.fixture(scope="session")
def supabase_env() -> dict[str, str]:
    return {
        "url": _required("SUPABASE_URL"),
        "anon": _required("SUPABASE_ANON_KEY"),
        "service": _required("SUPABASE_SERVICE_ROLE_KEY"),
    }


@pytest.fixture
def service_client(supabase_env: dict[str, str]) -> Client:
    return create_client(supabase_env["url"], supabase_env["service"])


@pytest.fixture
def user_a(supabase_env: dict[str, str], service_client: Client) -> TestUser:
    return _make_user(supabase_env["url"], supabase_env["anon"], service_client, "a")


@pytest.fixture
def user_b(supabase_env: dict[str, str], service_client: Client) -> TestUser:
    return _make_user(supabase_env["url"], supabase_env["anon"], service_client, "b")


@pytest.fixture
def workspace_a(user_a: TestUser) -> str:
    res = (
        user_a.client.table("workspaces")
        .insert({"nome": "Workspace A", "owner_id": user_a.user_id})
        .execute()
    )
    return res.data[0]["id"]
