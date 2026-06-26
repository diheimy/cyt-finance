from typing import Any

from src.services.health.embeddings import embed


def retrieve_rules(client: Any, query: str, k: int = 4) -> list[str]:
    """Recupera as regras de educação financeira mais relevantes via pgvector."""
    vec = embed(query)
    res = client.rpc("match_health_kb", {"query_embedding": vec, "match_count": k}).execute()
    return [row["conteudo"] for row in (res.data or [])]
