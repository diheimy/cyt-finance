"""Constrói o índice RAG (LlamaIndex) a partir dos livros em Storage/.

Uso (a partir da raiz do repo):
    STORAGE_DIR=$PWD/Storage HEALTH_INDEX_DIR=$PWD/apps/api/var/health_index \
        apps/api/.venv/bin/python apps/api/scripts/build_health_index.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.config import settings  # noqa: E402
from src.services.health.retriever import build_index  # noqa: E402

if __name__ == "__main__":
    n = build_index()
    print(f"Índice construído de {n} documento(s) de '{settings.storage_dir}' em '{settings.health_index_dir}'")
