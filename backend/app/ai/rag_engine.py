import os
import logging
from typing import List, Tuple
from pathlib import Path

logger = logging.getLogger("pulsequeue")

_index = None
_chunks = []
_embedder = None

def _get_embedder():
    global _embedder
    if _embedder is None:
        try:
            from sentence_transformers import SentenceTransformer
            _embedder = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("Embedding model loaded")
        except Exception as e:
            logger.warning(f"Embedding model failed: {e}")
            _embedder = None
    return _embedder

def load_documents(docs_path: str) -> List[str]:
    docs = []
    path = Path(docs_path)
    if not path.exists():
        logger.warning(f"RAG docs path not found: {docs_path}")
        return docs
    for f in path.glob("*.txt"):
        try:
            docs.append(f.read_text(encoding="utf-8"))
        except Exception as e:
            logger.warning(f"Failed to read {f}: {e}")
    return docs

def chunk_documents(docs: List[str], chunk_size: int = 500, overlap: int = 50) -> List[dict]:
    chunks = []
    for doc in docs:
        words = doc.split()
        step = chunk_size - overlap
        for i in range(0, max(1, len(words) - overlap), step):
            chunk_words = words[i:i + chunk_size]
            chunks.append({"text": " ".join(chunk_words), "source": f"doc_{len(chunks)}"})
    return chunks

def build_index(chunks: List[dict]) -> bool:
    global _index, _chunks
    embedder = _get_embedder()
    if not embedder or not chunks:
        return False
    try:
        import faiss
        import numpy as np
        texts = [c["text"] for c in chunks]
        embeddings = embedder.encode(texts, batch_size=16, show_progress_bar=False)
        dim = embeddings.shape[1]
        _index = faiss.IndexFlatIP(dim)
        faiss.normalize_L2(embeddings)
        _index.add(embeddings.astype("float32"))
        _chunks = chunks
        logger.info(f"FAISS index built with {len(chunks)} chunks")
        return True
    except Exception as e:
        logger.error(f"FAISS index build failed: {e}")
        return False

def retrieve_context(query: str, k: int = 3) -> Tuple[str, List[str]]:
    global _index, _chunks
    embedder = _get_embedder()
    if not embedder or _index is None or not _chunks:
        return "", []
    try:
        import faiss
        import numpy as np
        q_emb = embedder.encode([query])
        faiss.normalize_L2(q_emb)
        distances, indices = _index.search(q_emb.astype("float32"), k)
        results = []
        sources = []
        for idx in indices[0]:
            if 0 <= idx < len(_chunks):
                results.append(_chunks[idx]["text"])
                sources.append(_chunks[idx]["source"])
        context = "\n\n".join(results[:k])
        return context, sources
    except Exception as e:
        logger.error(f"RAG retrieval failed: {e}")
        return "", []

async def init_rag(docs_path: str):
    docs = load_documents(docs_path)
    if docs:
        chunks = chunk_documents(docs)
        build_index(chunks)
    else:
        logger.warning("No RAG documents found. Running without RAG context.")
