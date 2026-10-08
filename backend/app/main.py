import os
import sys
import uuid
import hashlib
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from ml.embedding_service import (
    MODEL_NAME, MODEL_VERSION, EMBEDDING_DIM,
    get_text_embedding, calculate_cosine_similarity,
    analyze_document_similarity, get_content_hash, build_structured_representation
)
from ml.classifier_service import classifier_service
from backend.app.services.document_parser import extract_text_from_file

app = FastAPI(
    title="ProofResearch ML Semantic Project Similarity & Integrity API",
    version="1.0.0",
    description="384-Dimensional Transformer Semantic Similarity Engine using sentence-transformers/all-MiniLM-L6-v2"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REQUEST / RESPONSE SCHEMAS ---
class SimilarityAnalyzeRequest(BaseModel):
    reference_text: str = Field(..., description="Reference project description or text")
    submission_text: str = Field(..., description="Target submission description or text")
    project_id: Optional[str] = None
    submission_id: Optional[str] = None

class ProjectSearchRequest(BaseModel):
    project_id: Optional[str] = None
    title: str
    problem_statement: Optional[str] = ""
    description: Optional[str] = ""
    candidate_projects: List[Dict[str, Any]] = []

@app.get("/health")
@app.get("/similarity/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "ProofResearch ML Semantic Similarity Engine",
        "model": MODEL_NAME,
        "model_version": MODEL_VERSION,
        "embedding_dimension": EMBEDDING_DIM,
        "in_memory": True
    }

@app.get("/similarity/model")
def get_model_info():
    return {
        "model_name": MODEL_NAME,
        "model_version": MODEL_VERSION,
        "embedding_dimension": EMBEDDING_DIM,
        "categories": {
            "LOW": "0 - 39%",
            "MODERATE": "40 - 69%",
            "HIGH": "70 - 84%",
            "VERY_HIGH": "85 - 100%"
        },
        "scoring_architecture": "384-D Cosine Similarity + Random Forest Supervised Ranking Ensemble"
    }

from ml.classifier_service import classifier_service, analyze_concept_overlap

@app.post("/similarity/analyze")
def analyze_similarity(req: SimilarityAnalyzeRequest):
    if not req.reference_text.strip() or not req.submission_text.strip():
        raise HTTPException(status_code=400, detail="reference_text and submission_text must not be empty.")
    
    # 1. Generate 384-D Embeddings & Cosine Similarity
    analysis = analyze_document_similarity(req.reference_text, req.submission_text)
    
    # 2. Extract multi-view features for ML ranking layer
    proj_a = {"full_text": req.reference_text, "title": req.reference_text[:100]}
    proj_b = {"full_text": req.submission_text, "title": req.submission_text[:100]}
    features = classifier_service.extract_pair_features(proj_a, proj_b)
    
    # Override full_project_cosine with overall document cosine
    features["full_project_cosine"] = analysis["cosine_similarity"]
    
    # 3. Predict ML Probability & Relationship Category
    ml_prob, classification, review_required = classifier_service.predict_relationship(features, req.reference_text, req.submission_text)
    concept_reasoning = analyze_concept_overlap(req.reference_text, req.submission_text)
    
    analysis_id = str(uuid.uuid4())
    ref_embed_hash = get_content_hash(str(get_text_embedding(req.reference_text)[:10].tolist()))
    sub_embed_hash = get_content_hash(str(get_text_embedding(req.submission_text)[:10].tolist()))

    return {
        "analysis_id": analysis_id,
        "project_id": req.project_id,
        "submission_id": req.submission_id,
        "status_summary": "Primary ML model completed successfully.",
        "model": {
            "name": MODEL_NAME,
            "version": MODEL_VERSION,
            "embedding_dimension": EMBEDDING_DIM
        },
        "similarity": {
            "cosine": analysis["cosine_similarity"],
            "percentage": analysis["cosine_percentage"],
            "max_chunk_similarity": analysis["max_chunk_similarity"],
            "avg_chunk_similarity": analysis["avg_chunk_similarity"]
        },
        "machine_learning": {
            "relationship_probability": ml_prob,
            "probability_percentage": float(round(ml_prob * 100.0, 2)),
            "multi_view_features": features
        },
        "classification": classification,
        "review": {
            "required": review_required,
            "status": "PENDING"
        },
        "content_hashes": {
            "reference_text_hash": analysis["text_a_hash"],
            "submission_text_hash": analysis["text_b_hash"],
            "reference_embedding_hash": ref_embed_hash,
            "submission_embedding_hash": sub_embed_hash
        },
        "fallback_reasoning": concept_reasoning,
        "explanation": f"High semantic relationship detected across 384-dimensional vector space ({analysis['cosine_percentage']}% cosine alignment, {float(round(ml_prob * 100.0, 2))}% ML probability) even if surface wording differs."
    }

@app.post("/similarity/analyze-upload")
async def analyze_upload(
    reference_text: str = Form(...),
    file: UploadFile = File(...)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file has no filename.")
        
    content_bytes = await file.read()
    try:
        extracted_text, file_type = extract_text_from_file(content_bytes, file.filename)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
        
    req = SimilarityAnalyzeRequest(reference_text=reference_text, submission_text=extracted_text)
    res = analyze_similarity(req)
    res["file_metadata"] = {
        "filename": file.filename,
        "file_type": file_type,
        "extracted_character_count": len(extracted_text)
    }
    return res

@app.post("/similarity/find-similar-projects")
def find_similar_projects(req: ProjectSearchRequest):
    if not req.candidate_projects:
        return {"query_project": req.title, "matches": []}
        
    query_text = build_structured_representation({
        "title": req.title,
        "problem_statement": req.problem_statement,
        "description": req.description
    })
    query_vec = get_text_embedding(query_text)
    
    results = []
    for cand in req.candidate_projects:
        cand_text = build_structured_representation(cand)
        cand_vec = get_text_embedding(cand_text)
        
        cosine_sim = calculate_cosine_similarity(query_vec, cand_vec)
        cosine_pct = float(round(max(0.0, cosine_sim) * 100.0, 2))
        
        feats = classifier_service.extract_pair_features(
            {"full_text": query_text, "title": req.title},
            {"full_text": cand_text, "title": cand.get("title", "")}
        )
        ml_prob, category, review_req = classifier_service.predict_relationship(feats)
        
        results.append({
            "project_id": cand.get("project_id", cand.get("id")),
            "title": cand.get("title"),
            "domain": cand.get("domain", "General Research"),
            "cosine_similarity": float(round(cosine_sim, 4)),
            "cosine_percentage": cosine_pct,
            "ml_probability": ml_prob,
            "ml_percentage": float(round(ml_prob * 100.0, 2)),
            "classification": category,
            "multi_view_alignment": {
                "problem_alignment": float(round(feats["problem_cosine"] * 100.0, 1)),
                "methodology_alignment": float(round(feats["methodology_cosine"] * 100.0, 1)),
                "technology_alignment": float(round(feats["technology_cosine"] * 100.0, 1)),
                "domain_alignment": float(round(feats["domain_cosine"] * 100.0, 1))
            }
        })
        
    results.sort(key=lambda x: x["cosine_similarity"], reverse=True)
    return {
        "query_title": req.title,
        "total_candidates_analyzed": len(req.candidate_projects),
        "matches": results
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
