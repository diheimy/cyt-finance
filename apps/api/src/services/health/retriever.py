"""RAG sobre os livros de educação financeira em Storage/, via LlamaIndex.

- Ingestão/índice: `build_index()` lê Storage/ (PDF/EPUB), gera embeddings locais
  (multilingual-e5-small) e persiste o índice em disco (`settings.health_index_dir`).
- Recuperação: `retrieve_rules(query, k)` carrega o índice e devolve os trechos
  mais relevantes. Nenhum LLM é usado aqui (só embeddings) — a análise fica no agente.
"""

from functools import lru_cache
from pathlib import Path

from src.config import settings


def _configure() -> None:
    from llama_index.core import Settings
    from llama_index.embeddings.huggingface import HuggingFaceEmbedding

    Settings.embed_model = HuggingFaceEmbedding(model_name=settings.embed_model)
    Settings.llm = None  # evita qualquer chamada acidental a LLM (default OpenAI)


def build_index() -> int:
    """(Re)constrói o índice a partir de Storage/. Retorna o nº de documentos lidos."""
    from llama_index.core import SimpleDirectoryReader, VectorStoreIndex

    _configure()
    docs = SimpleDirectoryReader(settings.storage_dir).load_data()
    index = VectorStoreIndex.from_documents(docs, show_progress=True)
    Path(settings.health_index_dir).mkdir(parents=True, exist_ok=True)
    index.storage_context.persist(persist_dir=settings.health_index_dir)
    return len(docs)


@lru_cache(maxsize=1)
def _load_index():  # type: ignore[no-untyped-def]
    from llama_index.core import StorageContext, load_index_from_storage

    _configure()
    sc = StorageContext.from_defaults(persist_dir=settings.health_index_dir)
    return load_index_from_storage(sc)


def retrieve_rules(query: str, k: int = 4) -> list[str]:
    if not Path(settings.health_index_dir).exists():
        return []
    retriever = _load_index().as_retriever(similarity_top_k=k)
    nodes = retriever.retrieve(query)
    return [n.node.get_content() for n in nodes]
