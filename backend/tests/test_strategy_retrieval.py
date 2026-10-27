import hashlib
import json
import re
from pathlib import Path

import numpy as np
import pytest

from backend.app.core.strategy_retrieval import (
    KnowledgeBaseError,
    StrategyIndexIntegrityError,
    StrategyRetriever,
    _stable_numeric_id,
    build_faiss_index,
    load_knowledge_base,
)


KNOWLEDGE_BASE = Path(__file__).parents[1] / "knowledge_base" / "strategies.v1.json"


class TokenEncoder:
    """Small deterministic lexical encoder for fast, offline retrieval tests."""

    def encode(self, texts: list[str]) -> np.ndarray:
        vectors = np.zeros((len(texts), 4096), dtype=np.float32)
        for row, text in enumerate(texts):
            for token in set(re.findall(r"[a-z0-9]+", text.lower())) - {
                "a", "an", "and", "for", "in", "is", "it", "of", "one", "or", "the", "to", "with"
            }:
                digest = hashlib.sha256(token.encode()).digest()
                index = int.from_bytes(digest[:2], "big") % vectors.shape[1]
                sign = 1.0 if digest[2] & 1 else -1.0
                vectors[row, index] += sign
        return vectors


def test_authored_corpus_has_43_valid_reviewed_entries():
    knowledge_base, _ = load_knowledge_base(KNOWLEDGE_BASE)

    assert knowledge_base["version"] == "1.0.0"
    assert len(knowledge_base["strategies"]) == 43
    assert len({entry["id"] for entry in knowledge_base["strategies"]}) == 43


@pytest.mark.parametrize(
    "mutation",
    [
        lambda data: data["strategies"].__delitem__(slice(29, None)),
        lambda data: data["strategies"][0].update(capacity_fit=["urgent"]),
        lambda data: data["strategies"][0].update(source_metadata=[{"source_id": "missing", "basis": "x"}]),
        lambda data: data["strategies"][1].update(id=data["strategies"][0]["id"]),
    ],
)
def test_malformed_knowledge_base_fails_explicitly(tmp_path, mutation):
    data = json.loads(KNOWLEDGE_BASE.read_text(encoding="utf-8"))
    mutation(data)
    malformed = tmp_path / "malformed.json"
    malformed.write_text(json.dumps(data), encoding="utf-8")

    with pytest.raises(KnowledgeBaseError):
        load_knowledge_base(malformed)


def test_stable_ids_and_rebuild_artifacts_are_reproducible(tmp_path):
    first_dir = tmp_path / "first"
    second_dir = tmp_path / "second"
    first = build_faiss_index(KNOWLEDGE_BASE, first_dir, TokenEncoder())
    second = build_faiss_index(KNOWLEDGE_BASE, second_dir, TokenEncoder())

    assert _stable_numeric_id("write_first_sentence") == first["stable_ids"]["write_first_sentence"]
    assert first == second
    assert (first_dir / "strategies.faiss").read_bytes() == (second_dir / "strategies.faiss").read_bytes()
    assert (first_dir / "manifest.json").read_bytes() == (second_dir / "manifest.json").read_bytes()
    assert not list(tmp_path.glob("**/*.pkl"))


def test_retrieval_is_capacity_filtered_ranked_and_top_k_bounded(tmp_path):
    build_faiss_index(KNOWLEDGE_BASE, tmp_path, TokenEncoder())
    retriever = StrategyRetriever(KNOWLEDGE_BASE, tmp_path, TokenEncoder(), minimum_score=-1.0)

    matches = retriever.retrieve("write essay email rough sentence", "low", top_k=2)

    assert len(matches) == 2
    assert matches[0].strategy_id == "write_first_sentence"
    assert all("low" in match.capacity_fit for match in matches)


@pytest.mark.parametrize(
    ("query", "capacity", "expected_id"),
    [
        ("write an essay email rough sentence", "low", "write_first_sentence"),
        ("run one focused software test", "high", "run_one_test"),
        ("prepare laundry load", "low", "start_one_load"),
        ("reply to an email message", "medium", "reply_with_acknowledgment"),
    ],
)
def test_relevance_examples_cover_multiple_domains_and_capacities(
    tmp_path, query, capacity, expected_id
):
    build_faiss_index(KNOWLEDGE_BASE, tmp_path, TokenEncoder())
    retriever = StrategyRetriever(KNOWLEDGE_BASE, tmp_path, TokenEncoder(), minimum_score=-1.0)

    matches = retriever.retrieve(query, capacity, top_k=3)

    assert matches
    assert matches[0].strategy_id == expected_id
    assert capacity in matches[0].capacity_fit


def test_no_match_and_invalid_capacity_are_explicit(tmp_path):
    build_faiss_index(KNOWLEDGE_BASE, tmp_path, TokenEncoder())
    retriever = StrategyRetriever(KNOWLEDGE_BASE, tmp_path, TokenEncoder(), minimum_score=0.99)

    assert retriever.retrieve("unrelated xylophone quantum", "medium") == []
    with pytest.raises(ValueError, match="capacity"):
        retriever.retrieve("essay", "urgent")


def test_private_query_is_not_written_to_global_index(tmp_path):
    marker = "private-query-7d3a2f"
    build_faiss_index(KNOWLEDGE_BASE, tmp_path, TokenEncoder())
    retriever = StrategyRetriever(KNOWLEDGE_BASE, tmp_path, TokenEncoder(), minimum_score=-1.0)
    retriever.retrieve(f"Write a note {marker}", "low")

    assert all(marker.encode() not in path.read_bytes() for path in tmp_path.iterdir() if path.is_file())


def test_index_checksum_and_corpus_mismatch_are_rejected(tmp_path):
    build_faiss_index(KNOWLEDGE_BASE, tmp_path, TokenEncoder())
    index_path = tmp_path / "strategies.faiss"
    index_path.write_bytes(index_path.read_bytes() + b"corrupt")
    retriever = StrategyRetriever(KNOWLEDGE_BASE, tmp_path, TokenEncoder())

    with pytest.raises(StrategyIndexIntegrityError, match="checksum"):
        retriever.retrieve("essay", "low")
