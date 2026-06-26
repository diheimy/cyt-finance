"""Seed da base de conhecimento de educação financeira (RAG).

Uso (a partir de apps/api):
    .venv/bin/python scripts/seed_health_kb.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.services.health.embeddings import embed  # noqa: E402
from src.services.supabase_service import get_service_client  # noqa: E402

RULES: list[dict[str, object]] = [
    {"conteudo": "Reserva de emergência: tenha de 3 a 6 meses de despesas essenciais guardados com liquidez.", "tags": ["reserva", "emergencia"]},
    {"conteudo": "Regra 50/30/20: destine 50% da renda a necessidades, 30% a desejos e 20% a poupança e investimentos.", "tags": ["orcamento", "poupanca"]},
    {"conteudo": "O comprometimento com dívidas não deve ultrapassar 30% da renda mensal líquida.", "tags": ["dividas", "comprometimento"]},
    {"conteudo": "Mantenha a utilização do cartão de crédito abaixo de 30% do limite para preservar a saúde financeira.", "tags": ["cartao", "utilizacao"]},
    {"conteudo": "Uma taxa de poupança saudável é poupar ao menos 20% da renda mensal.", "tags": ["poupanca"]},
    {"conteudo": "Pague primeiro a si mesmo: automatize a poupança/investimento no início do mês.", "tags": ["poupanca", "habito"]},
    {"conteudo": "Quite primeiro as dívidas mais caras (rotativo do cartão e cheque especial), que têm juros altos.", "tags": ["dividas", "juros"]},
    {"conteudo": "Patrimônio líquido é a diferença entre ativos (investimentos) e passivos (dívidas); acompanhe sua tendência ao longo do tempo.", "tags": ["patrimonio"]},
    {"conteudo": "Resultado mensal negativo recorrente (gastar mais do que ganha) é um forte sinal de alerta financeiro.", "tags": ["fluxo", "alerta"]},
    {"conteudo": "Revise periodicamente gastos recorrentes e assinaturas para eliminar vazamentos no orçamento.", "tags": ["gastos", "recorrentes"]},
    {"conteudo": "Defina objetivos financeiros claros de curto, médio e longo prazo para orientar decisões de gasto e investimento.", "tags": ["objetivos"]},
    {"conteudo": "Diversifique os investimentos de acordo com seu perfil de risco e horizonte de tempo.", "tags": ["investimentos", "diversificacao"]},
]


def main() -> None:
    client = get_service_client()
    rows = [
        {"conteudo": r["conteudo"], "tags": r["tags"], "embedding": embed(str(r["conteudo"]))}
        for r in RULES
    ]
    # Limpa e re-seed (idempotente).
    client.table("health_kb").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    client.table("health_kb").insert(rows).execute()
    print(f"{len(rows)} regras inseridas na health_kb")


if __name__ == "__main__":
    main()
