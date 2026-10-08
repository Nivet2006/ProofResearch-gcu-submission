import hashlib
import re
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from sentence_transformers import SentenceTransformer

# 1. Load SentenceTransformer ONCE at startup into memory
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
MODEL_VERSION = "proofresearch-semantic-v1"
EMBEDDING_DIM = 384

print(f"[ML Engine] Loading model '{MODEL_NAME}' into memory...")
model = SentenceTransformer(MODEL_NAME)
print(f"[ML Engine] Model '{MODEL_NAME}' successfully loaded into memory (Dimension: {EMBEDDING_DIM}).")

# In-memory Embedding LRU Cache keyed by (SHA256_hash, MODEL_VERSION)
_EMBEDDING_CACHE: Dict[str, np.ndarray] = {}

def get_content_hash(text: str) -> str:
    """Compute SHA-256 hash of text for caching and integrity tracking."""
    return hashlib.sha256(text.strip().encode('utf-8')).hexdigest()

def get_text_embedding(text: str) -> np.ndarray:
    """
    Generate normalized 384-dimensional embedding for text.
    Uses in-memory cache to prevent re-encoding duplicate texts.
    """
    if not text or not text.strip():
        return np.zeros(EMBEDDING_DIM, dtype=np.float32)
    
    text_hash = get_content_hash(text)
    cache_key = f"{text_hash}_{MODEL_VERSION}"
    
    if cache_key in _EMBEDDING_CACHE:
        return _EMBEDDING_CACHE[cache_key]
    
    # Generate normalized embedding (dot product equals cosine similarity)
    vec = model.encode(text, normalize_embeddings=True)
    vec = np.asarray(vec, dtype=np.float32)
    
    _EMBEDDING_CACHE[cache_key] = vec
    return vec

def calculate_cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """
    Compute exact mathematical cosine similarity:
    (A · B) / (||A|| ||B||)
    """
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    dot_product = np.dot(vec1, vec2)
    sim = float(dot_product / (norm1 * norm2))
    return float(np.clip(sim, -1.0, 1.0))

def build_structured_representation(project: Dict[str, Any]) -> str:
    """
    Construct canonical multi-view semantic representation from project fields.
    """
    title = project.get("title", "").strip()
    problem = project.get("problem_statement", "").strip()
    summary = project.get("public_summary", project.get("description", "")).strip()
    methodology = project.get("methodology", "").strip()
    technologies = project.get("technologies", "").strip()
    domain = project.get("domain", "").strip()
    research_area = project.get("research_area", "").strip()
    skills = project.get("skills", "")
    if isinstance(skills, list):
        skills = ", ".join(skills)
    
    canonical = (
        f"PROJECT TITLE: {title}\n"
        f"PROBLEM: {problem}\n"
        f"SUMMARY: {summary}\n"
        f"METHODOLOGY: {methodology}\n"
        f"TECHNOLOGIES: {technologies}\n"
        f"DOMAIN: {domain}\n"
        f"RESEARCH AREA: {research_area}\n"
        f"SKILLS: {skills}"
    )
    return canonical.strip()

def extract_chunks(text: str, chunk_size_words: int = 350, overlap_words: int = 50) -> List[str]:
    """
    Chunk long documents (~300-500 words with ~50 word overlap) to prevent model truncation.
    """
    words = text.split()
    if len(words) <= chunk_size_words:
        return [text]
    
    chunks = []
    step = chunk_size_words - overlap_words
    for i in range(0, len(words), step):
        chunk = " ".join(words[i : i + chunk_size_words])
        chunks.append(chunk)
        if i + chunk_size_words >= len(words):
            break
    return chunks

def analyze_document_similarity(text_a: str, text_b: str) -> Dict[str, Any]:
    """
    Perform complete multi-view & chunked cosine similarity analysis between two texts.
    """
    hash_a = get_content_hash(text_a)
    hash_b = get_content_hash(text_b)
    
    # 1. Full Document Embedding
    chunks_a = extract_chunks(text_a)
    chunks_b = extract_chunks(text_b)
    
    embeddings_a = [get_text_embedding(c) for c in chunks_a]
    embeddings_b = [get_text_embedding(c) for c in chunks_b]
    
    # Mean document embedding (normalized)
    doc_vec_a = np.mean(embeddings_a, axis=0)
    doc_vec_a = doc_vec_a / (np.linalg.norm(doc_vec_a) + 1e-9)
    
    doc_vec_b = np.mean(embeddings_b, axis=0)
    doc_vec_b = doc_vec_b / (np.linalg.norm(doc_vec_b) + 1e-9)
    
    cosine_sim = calculate_cosine_similarity(doc_vec_a, doc_vec_b)
    cosine_percentage = float(round(max(0.0, cosine_sim) * 100.0, 2))
    
    # Chunk-level similarity analysis
    chunk_sims = []
    for vec1 in embeddings_a:
        for vec2 in embeddings_b:
            chunk_sims.append(calculate_cosine_similarity(vec1, vec2))
            
    max_chunk_sim = float(max(chunk_sims)) if chunk_sims else cosine_sim
    avg_chunk_sim = float(np.mean(chunk_sims)) if chunk_sims else cosine_sim
    
    return {
        "text_a_hash": hash_a,
        "text_b_hash": hash_b,
        "model_name": MODEL_NAME,
        "model_version": MODEL_VERSION,
        "embedding_dimension": EMBEDDING_DIM,
        "cosine_similarity": float(round(cosine_sim, 4)),
        "cosine_percentage": cosine_percentage,
        "max_chunk_similarity": float(round(max_chunk_sim, 4)),
        "avg_chunk_similarity": float(round(avg_chunk_sim, 4)),
        "chunks_a_count": len(chunks_a),
        "chunks_b_count": len(chunks_b)
    }
