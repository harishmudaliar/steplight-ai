"""Command-line builder for the reviewed local strategy FAISS index."""

from __future__ import annotations

import argparse
from pathlib import Path

from backend.app.config import settings
from backend.app.core.strategy_retrieval import SentenceTransformerEncoder, build_faiss_index


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the local Steplight strategy retrieval index.")
    parser.add_argument("--knowledge-base", type=Path, default=settings.STRATEGY_KB_PATH)
    parser.add_argument("--index-dir", type=Path, default=settings.STRATEGY_INDEX_DIR)
    arguments = parser.parse_args()

    manifest = build_faiss_index(
        arguments.knowledge_base,
        arguments.index_dir,
        SentenceTransformerEncoder(local_files_only=False),
    )
    print(
        f"Built {manifest['record_count']} strategy vectors "
        f"(version {manifest['knowledge_base_version']}, "
        f"dimension {manifest['embedding_dimension']}) at {arguments.index_dir}."
    )


if __name__ == "__main__":
    main()
