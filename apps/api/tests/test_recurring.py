"""Testes do serviço de materialização de recorrentes.

Usa um fake Supabase client em memória — não requer Supabase local rodando.
Cobre idempotência, limite de parcelas, filtro data_inicio e erros não-fatais.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.services.recurring_service import materialize_due


# ─── Fake client em memória (table API) ─────────────────────────────────────


class FakeQuery:
    def __init__(self, table: "FakeTable"):
        self.table = table
        self.filters: list[tuple[str, str, Any]] = []
        self._select_cols = "*"
        self._count_mode: str | None = None

    def select(self, cols: str = "*", count: str | None = None) -> "FakeQuery":
        self._select_cols = cols
        self._count_mode = count
        return self

    def eq(self, col: str, value: Any) -> "FakeQuery":
        self.filters.append(("eq", col, value))
        return self

    def lte(self, col: str, value: Any) -> "FakeQuery":
        self.filters.append(("lte", col, value))
        return self

    def update(self, patch: dict) -> "FakeUpdate":
        return FakeUpdate(self.table, patch)

    def insert(self, row: dict) -> "FakeInsert":
        return FakeInsert(self.table, row)

    def _filter(self, rows: list[dict]) -> list[dict]:
        out = rows
        for op, col, val in self.filters:
            if op == "eq":
                out = [r for r in out if r.get(col) == val]
            elif op == "lte":
                out = [r for r in out if r.get(col) is not None and r.get(col) <= val]
        return out

    def execute(self) -> Any:
        rows = self._filter(self.table.rows)
        if self._count_mode == "exact":

            class R:
                data = rows
                count = len(rows)

            return R()

        class R:
            data = rows

        return R()


class FakeUpdate:
    def __init__(self, table: "FakeTable", patch: dict):
        self.table = table
        self.patch = patch
        self.filters: list[tuple[str, str, Any]] = []

    def eq(self, col: str, val: Any) -> "FakeUpdate":
        self.filters.append(("eq", col, val))
        return self

    def execute(self) -> Any:
        for row in self.table.rows:
            if all(row.get(c) == v for _, c, v in self.filters):
                row.update(self.patch)

        class R:
            data = None

        return R()


class FakeInsert:
    def __init__(self, table: "FakeTable", row: dict):
        self.table = table
        self.row = row

    def execute(self) -> Any:
        new_row = {**self.row, "id": str(uuid4())}
        self.table.rows.append(new_row)

        class R:
            data = [new_row]

        return R()


class FakeTable:
    def __init__(self, rows: list[dict] | None = None):
        self.rows = rows or []

    def select(self, cols: str = "*", count: str | None = None) -> FakeQuery:
        return FakeQuery(self).select(cols, count)

    def eq(self, col: str, val: Any) -> FakeQuery:
        return FakeQuery(self).eq(col, val)

    def lte(self, col: str, val: Any) -> FakeQuery:
        return FakeQuery(self).lte(col, val)

    def update(self, patch: dict) -> FakeUpdate:
        return FakeUpdate(self, patch)

    def insert(self, row: dict) -> FakeInsert:
        return FakeInsert(self, row)


class FakeClient:
    def __init__(self, recurring: list[dict], transactions: list[dict] | None = None):
        self._tables = {
            "recurring": FakeTable(recurring),
            "transactions": FakeTable(transactions or []),
        }

    def table(self, name: str) -> FakeTable:
        return self._tables[name]


# ─── Fixtures ───────────────────────────────────────────────────────────────


def _rule(**overrides: Any) -> dict:
    base = {
        "id": str(uuid4()),
        "workspace_id": str(uuid4()),
        "tipo": "gasto",
        "valor": 150.00,
        "descricao": "Aluguel",
        "categoria_id": None,
        "data_inicio": "2026-01-01",
        "limite_parcelas": 0,
        "parcelas_materializadas": 0,
        "ativo": True,
        "created_by": str(uuid4()),
        "created_at": "2026-01-01T00:00:00Z",
    }
    base.update(overrides)
    return base


# ─── Testes ────────────────────────────────────────────────────────────────


def test_materializes_active_rule_once() -> None:
    client = FakeClient([_rule()])
    result = materialize_due(client, today=date(2026, 4, 20))
    assert result["materialized_count"] == 1
    assert result["skipped_count"] == 0
    assert client.table("transactions").rows[0]["data"] == "2026-04-20"
    assert client.table("recurring").rows[0]["parcelas_materializadas"] == 1


def test_is_idempotent_same_day() -> None:
    rule = _rule()
    client = FakeClient(
        recurring=[rule],
        transactions=[
            {
                "id": str(uuid4()),
                "recurring_id": rule["id"],
                "data": "2026-04-20",
            }
        ],
    )
    result = materialize_due(client, today=date(2026, 4, 20))
    assert result["materialized_count"] == 0
    assert result["skipped_count"] == 1


def test_skips_inactive_rule() -> None:
    client = FakeClient([_rule(ativo=False)])
    result = materialize_due(client, today=date(2026, 4, 20))
    assert result["materialized_count"] == 0
    assert len(client.table("transactions").rows) == 0


def test_skips_rule_with_data_inicio_in_future() -> None:
    future = (date(2026, 4, 20) + timedelta(days=10)).isoformat()
    client = FakeClient([_rule(data_inicio=future)])
    result = materialize_due(client, today=date(2026, 4, 20))
    assert result["materialized_count"] == 0


def test_respects_limite_parcelas() -> None:
    client = FakeClient([_rule(limite_parcelas=3, parcelas_materializadas=3)])
    result = materialize_due(client, today=date(2026, 4, 20))
    assert result["materialized_count"] == 0
    assert result["skipped_count"] == 1


def test_materializes_under_limite() -> None:
    client = FakeClient([_rule(limite_parcelas=3, parcelas_materializadas=2)])
    result = materialize_due(client, today=date(2026, 4, 20))
    assert result["materialized_count"] == 1
    assert client.table("recurring").rows[0]["parcelas_materializadas"] == 3


def test_multiple_rules_independent() -> None:
    r1 = _rule(descricao="Aluguel")
    r2 = _rule(descricao="Internet", ativo=False)
    r3 = _rule(descricao="Netflix")
    client = FakeClient([r1, r2, r3])
    result = materialize_due(client, today=date(2026, 4, 20))
    assert result["materialized_count"] == 2  # r1 e r3
    assert result["skipped_count"] == 0  # r2 nem aparece (filtro ativo=true)


# ─── Teste HTTP: router /recurring/tick ─────────────────────────────────────


def test_tick_endpoint_requires_cron_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CRON_SECRET", "s3cr3t")
    # Recarrega settings
    from src.config import Settings
    from src import deps as deps_mod

    deps_mod.settings = Settings()

    client = TestClient(app)
    r = client.post("/recurring/tick")
    assert r.status_code == 422  # header obrigatório ausente (fastapi 422)


def test_tick_endpoint_rejects_wrong_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CRON_SECRET", "s3cr3t")
    from src.config import Settings
    from src import deps as deps_mod

    deps_mod.settings = Settings()

    client = TestClient(app)
    r = client.post("/recurring/tick", headers={"X-Cron-Secret": "wrong"})
    assert r.status_code == 403
    assert r.json()["detail"] == "invalid_cron_secret"
