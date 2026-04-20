"""Renderiza relatório em PDF via Jinja2 + WeasyPrint."""

from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"

_env = Environment(
    loader=FileSystemLoader(str(TEMPLATE_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
    trim_blocks=True,
    lstrip_blocks=True,
)

_MESES_PT = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
]


def _money(v: float | int | str) -> str:
    n = float(v)
    s = f"{n:,.2f}"
    s = s.replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$ {s}"


def _date_br(iso: str | date) -> str:
    if isinstance(iso, date):
        return iso.strftime("%d/%m/%Y")
    return date.fromisoformat(iso).strftime("%d/%m/%Y")


def _month_br(iso: str | date) -> str:
    d = iso if isinstance(iso, date) else date.fromisoformat(iso)
    return f"{_MESES_PT[d.month - 1]} de {d.year}"


_env.filters["money"] = _money
_env.filters["date_br"] = _date_br
_env.filters["month_br"] = _month_br


def render_pdf(data: dict[str, Any]) -> bytes:
    """Renderiza HTML e converte para PDF. Lazy-import de WeasyPrint para permitir
    testar a geração de HTML isoladamente (sem libs nativas)."""
    html = render_html(data)
    from weasyprint import HTML  # noqa: WPS433 — import tardio intencional

    return HTML(string=html, base_url=str(TEMPLATE_DIR)).write_pdf()


def render_html(data: dict[str, Any]) -> str:
    template = _env.get_template("report.html.j2")
    return template.render(**data)
