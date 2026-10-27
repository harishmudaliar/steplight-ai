"""Local, deterministic retrieval over reviewed, non-diagnostic strategy records."""

from __future__ import annotations

import hashlib
import json
import math
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Any, Protocol

import faiss
import numpy as np


MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
MODEL_REVISION = "1110a243fdf4706b3f48f1d95db1a4f5529b4d41"
INDEX_FILENAME = "strategies.faiss"
MANIFEST_FILENAME = "manifest.json"
MAX_KB_BYTES = 1_000_000
MAX_INDEX_BYTES = 50_000_000
CAPACITIES = frozenset({"low", "medium", "high"})


class KnowledgeBaseError(ValueError):
    """The authored strategy corpus is missing, malformed, or unsafe to use."""


class StrategyIndexUnavailable(RuntimeError):
    """The local index has not been built yet."""


class StrategyIndexIntegrityError(RuntimeError):
    """The index manifest, corpus, or FAISS artifact do not match."""


class StrategyModelUnavailable(RuntimeError):
    """The pinned embedding model cannot be loaded locally."""


class TextEncoder(Protocol):
    def encode(self, texts: list[str]) -> np.ndarray:
        """Return one embedding vector per input string."""


@dataclass(frozen=True)
class StrategyMatch:
    strategy_id: str
    name: str
    use_case: str
    capacity_fit: tuple[str, ...]
    sample: str
    caution: str
    score: float


def _stable_numeric_id(strategy_id: str) -> int:
    """Derive a stable, positive FAISS int64 ID from the authored string ID."""
    return int.from_bytes(hashlib.sha256(strategy_id.encode("utf-8")).digest()[:8], "big") & ((1 << 63) - 1)


def _sha256(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def load_knowledge_base(path: Path) -> tuple[dict[str, Any], bytes]:
    try:
        raw = path.read_bytes()
    except OSError as exc:
        raise KnowledgeBaseError(f"Could not read strategy knowledge base at {path}.") from exc
    if len(raw) > MAX_KB_BYTES:
        raise KnowledgeBaseError("Strategy knowledge base exceeds the 1 MB safety limit.")
    try:
        data = json.loads(raw)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise KnowledgeBaseError("Strategy knowledge base must be valid UTF-8 JSON.") from exc
    if not isinstance(data, dict) or not isinstance(data.get("version"), str):
        raise KnowledgeBaseError("Strategy knowledge base requires a string version.")
    sources = data.get("sources")
    strategies = data.get("strategies")
    if not isinstance(sources, list) or not isinstance(strategies, list):
        raise KnowledgeBaseError("Strategy knowledge base requires sources and strategies arrays.")
    if not 30 <= len(strategies) <= 50:
        raise KnowledgeBaseError("Strategy knowledge base must contain 30 to 50 reviewed records.")

    source_ids: set[str] = set()
    for source in sources:
        if not isinstance(source, dict) or not isinstance(source.get("id"), str):
            raise KnowledgeBaseError("Every source requires a string id.")
        if source["id"] in source_ids:
            raise KnowledgeBaseError(f"Duplicate source id: {source['id']}.")
        for key in ("title", "publisher", "reference", "note"):
            if not isinstance(source.get(key), str) or not source[key].strip():
                raise KnowledgeBaseError(f"Source {source['id']} requires non-empty {key}.")
        source_ids.add(source["id"])

    ids: set[str] = set()
    numeric_ids: set[int] = set()
    required_text = ("name", "use_case", "sample", "caution")
    for entry in strategies:
        if not isinstance(entry, dict) or not isinstance(entry.get("id"), str):
            raise KnowledgeBaseError("Every strategy requires a stable string id.")
        strategy_id = entry["id"]
        if not strategy_id or strategy_id in ids:
            raise KnowledgeBaseError(f"Missing or duplicate strategy id: {strategy_id!r}.")
        ids.add(strategy_id)
        numeric_id = _stable_numeric_id(strategy_id)
        if numeric_id in numeric_ids:
            raise KnowledgeBaseError("Stable FAISS id collision in strategy knowledge base.")
        numeric_ids.add(numeric_id)
        for key in required_text:
            value = entry.get(key)
            if not isinstance(value, str) or not value.strip() or len(value) > 2000:
                raise KnowledgeBaseError(f"Strategy {strategy_id} requires valid {key} text.")
        fits = entry.get("capacity_fit")
        if (
            not isinstance(fits, list)
            or not fits
            or any(not isinstance(capacity, str) or capacity not in CAPACITIES for capacity in fits)
        ):
            raise KnowledgeBaseError(f"Strategy {strategy_id} has invalid capacity_fit.")
        metadata = entry.get("source_metadata")
        if not isinstance(metadata, list) or not metadata:
            raise KnowledgeBaseError(f"Strategy {strategy_id} requires source metadata.")
        for item in metadata:
            if (
                not isinstance(item, dict)
                or not isinstance(item.get("source_id"), str)
                or item["source_id"] not in source_ids
                or not isinstance(item.get("basis"), str)
                or not item["basis"].strip()
            ):
                raise KnowledgeBaseError(f"Strategy {strategy_id} has invalid source metadata.")
        review = entry.get("content_review")
        if (
            not isinstance(review, dict)
            or not isinstance(review.get("reviewer"), str)
            or not review["reviewer"].strip()
            or review.get("reviewed_on") != "2026-10-24"
            or not isinstance(review.get("checks"), list)
            or not {"non_diagnostic", "optional", "single_action", "capacity_fit"}.issubset(review["checks"])
        ):
            raise KnowledgeBaseError(f"Strategy {strategy_id} is missing required content-review metadata.")
    return data, raw


def _embedding_matrix(encoder: TextEncoder, texts: list[str]) -> np.ndarray:
    vectors = np.asarray(encoder.encode(texts), dtype=np.float32)
    if vectors.ndim != 2 or vectors.shape[0] != len(texts) or vectors.shape[1] < 1:
        raise ValueError("Embedding model returned a matrix with an invalid shape.")
    if not np.isfinite(vectors).all():
        raise ValueError("Embedding model returned a non-finite value.")
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    if (norms == 0).any():
        raise ValueError("Embedding model returned a zero-length vector.")
    return np.ascontiguousarray(vectors / norms, dtype=np.float32)


def _embedding_text(entry: dict[str, Any]) -> str:
    return " ".join(
        (
            entry["name"],
            entry["use_case"],
            " ".join(entry["capacity_fit"]),
            entry["sample"],
            entry["caution"],
        )
    )


def _stable_id_mapping(strategies: list[dict[str, Any]]) -> dict[str, int]:
    return {entry["id"]: _stable_numeric_id(entry["id"]) for entry in strategies}


def build_faiss_index(
    knowledge_base_path: Path,
    index_dir: Path,
    encoder: TextEncoder,
) -> dict[str, Any]:
    """Build normalized cosine retrieval artifacts without pickle serialization."""
    knowledge_base, kb_bytes = load_knowledge_base(knowledge_base_path)
    strategies: list[dict[str, Any]] = knowledge_base["strategies"]
    id_mapping = _stable_id_mapping(strategies)
    vectors = _embedding_matrix(encoder, [_embedding_text(entry) for entry in strategies])

    index = faiss.IndexIDMap2(faiss.IndexFlatIP(vectors.shape[1]))
    ids = np.asarray([id_mapping[entry["id"]] for entry in strategies], dtype=np.int64)
    index.add_with_ids(vectors, ids)

    index_dir.mkdir(parents=True, exist_ok=True)
    index_path = index_dir / INDEX_FILENAME
    manifest_path = index_dir / MANIFEST_FILENAME
    temporary_index = index_dir / f"{INDEX_FILENAME}.tmp"
    faiss.write_index(index, str(temporary_index))
    index_bytes = temporary_index.read_bytes()
    temporary_index.replace(index_path)
    manifest = {
        "schema_version": 1,
        "knowledge_base_version": knowledge_base["version"],
        "knowledge_base_sha256": _sha256(kb_bytes),
        "embedding_model": MODEL_ID,
        "embedding_revision": MODEL_REVISION,
        "embedding_dimension": int(vectors.shape[1]),
        "record_count": len(strategies),
        "stable_ids": id_mapping,
        "index_file": INDEX_FILENAME,
        "index_sha256": _sha256(index_bytes),
        "similarity": "cosine_similarity_via_normalized_inner_product",
    }
    temporary_manifest = index_dir / f"{MANIFEST_FILENAME}.tmp"
    temporary_manifest.write_text(
        json.dumps(manifest, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary_manifest.replace(manifest_path)
    return manifest


class SentenceTransformerEncoder:
    """Lazy CPU encoder pinned to an immutable Hugging Face model revision."""

    def __init__(self, local_files_only: bool = False) -> None:
        self.local_files_only = local_files_only
        self._model: Any | None = None
        self._model_lock = Lock()

    def encode(self, texts: list[str]) -> np.ndarray:
        if self._model is None:
            with self._model_lock:
                if self._model is None:
                    try:
                        from sentence_transformers import SentenceTransformer
                    except ImportError as exc:
                        raise StrategyModelUnavailable(
                            "Install backend/requirements-rag.txt to enable local strategy embeddings."
                        ) from exc
                    try:
                        self._model = SentenceTransformer(
                            MODEL_ID,
                            revision=MODEL_REVISION,
                            device="cpu",
                            local_files_only=self.local_files_only,
                        )
                    except (OSError, RuntimeError) as exc:
                        raise StrategyModelUnavailable(
                            "The pinned local embedding model is unavailable. Run the documented model/index setup."
                        ) from exc
        try:
            return np.asarray(
                self._model.encode(
                    texts,
                    convert_to_numpy=True,
                    normalize_embeddings=False,
                    show_progress_bar=False,
                ),
                dtype=np.float32,
            )
        except (OSError, RuntimeError, ValueError) as exc:
            raise StrategyModelUnavailable("Local strategy embedding failed.") from exc


class StrategyRetriever:
    def __init__(
        self,
        knowledge_base_path: Path,
        index_dir: Path,
        encoder: TextEncoder | None = None,
        minimum_score: float = 0.28,
    ) -> None:
        if not math.isfinite(minimum_score) or not -1.0 <= minimum_score <= 1.0:
            raise ValueError("minimum_score must be a finite cosine threshold between -1 and 1.")
        self.knowledge_base_path = knowledge_base_path
        self.index_dir = index_dir
        self.encoder = encoder or SentenceTransformerEncoder(local_files_only=True)
        self.minimum_score = minimum_score
        self._loaded_index: Any | None = None
        self._entries: dict[int, dict[str, Any]] | None = None
        self._dimension: int | None = None

    def _load_index(self) -> None:
        if self._loaded_index is not None:
            return
        knowledge_base, kb_bytes = load_knowledge_base(self.knowledge_base_path)
        manifest_path = self.index_dir / MANIFEST_FILENAME
        index_path = self.index_dir / INDEX_FILENAME
        if not manifest_path.is_file() or not index_path.is_file():
            raise StrategyIndexUnavailable(
                f"Local strategy index is missing at {self.index_dir}; rebuild it with the documented command."
            )
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise StrategyIndexIntegrityError("Strategy index manifest is unreadable or malformed.") from exc
        if not isinstance(manifest, dict):
            raise StrategyIndexIntegrityError("Strategy index manifest must be a JSON object.")
        expected_ids = _stable_id_mapping(knowledge_base["strategies"])
        if (
            manifest.get("schema_version") != 1
            or manifest.get("knowledge_base_version") != knowledge_base["version"]
            or manifest.get("knowledge_base_sha256") != _sha256(kb_bytes)
            or manifest.get("embedding_model") != MODEL_ID
            or manifest.get("embedding_revision") != MODEL_REVISION
            or manifest.get("record_count") != len(expected_ids)
            or manifest.get("stable_ids") != expected_ids
            or manifest.get("index_file") != INDEX_FILENAME
            or manifest.get("similarity") != "cosine_similarity_via_normalized_inner_product"
        ):
            raise StrategyIndexIntegrityError(
                "Strategy index manifest does not match the current corpus or pinned model."
            )
        try:
            if index_path.stat().st_size > MAX_INDEX_BYTES:
                raise StrategyIndexIntegrityError("Strategy index exceeds the 50 MB safety limit.")
            index_bytes = index_path.read_bytes()
        except StrategyIndexIntegrityError:
            raise
        except OSError as exc:
            raise StrategyIndexUnavailable("Could not read local strategy index.") from exc
        dimension = manifest.get("embedding_dimension")
        if (
            len(index_bytes) > MAX_INDEX_BYTES
            or not isinstance(dimension, int)
            or not 1 <= dimension <= 4096
            or manifest.get("index_sha256") != _sha256(index_bytes)
        ):
            raise StrategyIndexIntegrityError("Strategy index checksum, size, or dimension is invalid.")
        try:
            index = faiss.read_index(str(index_path))
        except RuntimeError as exc:
            raise StrategyIndexIntegrityError("FAISS could not read the generated index artifact.") from exc
        if (
            not isinstance(index, faiss.IndexIDMap2)
            or index.d != dimension
            or index.ntotal != len(expected_ids)
        ):
            raise StrategyIndexIntegrityError("FAISS index type or dimensions do not match the manifest.")
        stored_ids = set(int(value) for value in faiss.vector_to_array(index.id_map))
        if stored_ids != set(expected_ids.values()):
            raise StrategyIndexIntegrityError("FAISS stable IDs do not match the authored records.")
        self._loaded_index = index
        self._dimension = dimension
        self._entries = {
            expected_ids[entry["id"]]: entry for entry in knowledge_base["strategies"]
        }

    def retrieve(self, query_text: str, capacity: str, top_k: int = 3) -> list[StrategyMatch]:
        if capacity not in CAPACITIES:
            raise ValueError("capacity must be low, medium, or high.")
        if not 1 <= top_k <= 10:
            raise ValueError("top_k must be between 1 and 10.")
        if not isinstance(query_text, str) or not query_text.strip():
            return []
        self._load_index()
        assert self._loaded_index is not None and self._entries is not None
        query = _embedding_matrix(self.encoder, [query_text])
        if query.shape[1] != self._dimension:
            raise StrategyIndexIntegrityError("Query embedding dimension differs from the built FAISS index.")
        scores, result_ids = self._loaded_index.search(query, self._loaded_index.ntotal)
        candidates: list[StrategyMatch] = []
        for score, numeric_id in zip(scores[0], result_ids[0]):
            if numeric_id < 0:
                continue
            entry = self._entries[int(numeric_id)]
            if capacity not in entry["capacity_fit"] or float(score) < self.minimum_score:
                continue
            candidates.append(
                StrategyMatch(
                    strategy_id=entry["id"],
                    name=entry["name"],
                    use_case=entry["use_case"],
                    capacity_fit=tuple(entry["capacity_fit"]),
                    sample=entry["sample"],
                    caution=entry["caution"],
                    score=float(score),
                )
            )
        candidates.sort(key=lambda item: (-item.score, _stable_numeric_id(item.strategy_id)))
        return candidates[:top_k]
