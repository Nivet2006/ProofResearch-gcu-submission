import os
import sys
import json
import re
import numpy as np
import pandas as pd

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from typing import Dict, List, Any
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sentence_transformers import SentenceTransformer
from ml.classifier_service import classifier_service

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_ROOT, "ml", "data")

def jaccard_similarity(text_a: str, text_b: str) -> float:
    tokens_a = set(re.findall(r'\w+', text_a.lower()))
    tokens_b = set(re.findall(r'\w+', text_b.lower()))
    if not tokens_a or not tokens_b:
        return 0.0
    intersection = tokens_a.intersection(tokens_b)
    union = tokens_a.union(tokens_b)
    return len(intersection) / len(union)

def run_evaluation_benchmark():
    projects_df = pd.read_csv(os.path.join(DATA_DIR, "projects.csv"))
    pairs_df = pd.read_csv(os.path.join(DATA_DIR, "project_pairs.csv"))
    projects_map = {row['project_id']: row.to_dict() for _, row in projects_df.iterrows()}
    
    y_true = pairs_df['label'].values
    
    # 1. Baseline: Old Keyword / Jaccard Token Similarity
    jaccard_preds = []
    for _, row in pairs_df.iterrows():
        p_a = projects_map[row['project_a_id']]
        p_b = projects_map[row['project_b_id']]
        text_a = f"{p_a['title']} {p_a['description']}"
        text_b = f"{p_b['title']} {p_b['description']}"
        sim = jaccard_similarity(text_a, text_b)
        jaccard_preds.append(1 if sim >= 0.25 else 0)
        
    # 2. Base MiniLM Cosine Similarity
    minilm_preds = []
    minilm_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    for _, row in pairs_df.iterrows():
        p_a = projects_map[row['project_a_id']]
        p_b = projects_map[row['project_b_id']]
        text_a = f"{p_a['title']} {p_a['problem_statement']} {p_a['methodology']}"
        text_b = f"{p_b['title']} {p_b['problem_statement']} {p_b['methodology']}"
        vec_a = minilm_model.encode(text_a, normalize_embeddings=True)
        vec_b = minilm_model.encode(text_b, normalize_embeddings=True)
        sim = float(np.dot(vec_a, vec_b))
        minilm_preds.append(1 if sim >= 0.70 else 0)
        
    # 3. MiniLM + Random Forest Classifier (Multi-View Ensemble)
    rf_preds = []
    for _, row in pairs_df.iterrows():
        p_a = projects_map[row['project_a_id']]
        p_b = projects_map[row['project_b_id']]
        feats = classifier_service.extract_pair_features(p_a, p_b)
        prob, cat, rev = classifier_service.predict_relationship(feats)
        rf_preds.append(1 if prob >= 0.70 else 0)
        
    # Compute Metrics
    results = [
        {
            "Method": "Old Token / Jaccard Similarity",
            "Accuracy": accuracy_score(y_true, jaccard_preds),
            "Precision": precision_score(y_true, jaccard_preds, zero_division=0),
            "Recall": recall_score(y_true, jaccard_preds, zero_division=0),
            "F1_Score": f1_score(y_true, jaccard_preds, zero_division=0)
        },
        {
            "Method": "Base MiniLM Cosine Similarity",
            "Accuracy": accuracy_score(y_true, minilm_preds),
            "Precision": precision_score(y_true, minilm_preds, zero_division=0),
            "Recall": recall_score(y_true, minilm_preds, zero_division=0),
            "F1_Score": f1_score(y_true, minilm_preds, zero_division=0)
        },
        {
            "Method": "MiniLM + Random Forest Classifier",
            "Accuracy": accuracy_score(y_true, rf_preds),
            "Precision": precision_score(y_true, rf_preds, zero_division=0),
            "Recall": recall_score(y_true, rf_preds, zero_division=0),
            "F1_Score": f1_score(y_true, rf_preds, zero_division=0)
        }
    ]
    
    results_df = pd.DataFrame(results)
    print("\n=== SEMANTIC SIMILARITY METHOD COMPARISON BENCHMARK ===")
    print(results_df.to_string(index=False))
    return results

if __name__ == "__main__":
    import re
    run_evaluation_benchmark()
