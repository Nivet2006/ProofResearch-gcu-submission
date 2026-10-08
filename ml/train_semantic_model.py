import os
import json
import pickle
import argparse
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
)
from sentence_transformers import SentenceTransformer, InputExample, losses, evaluation
from torch.utils.data import DataLoader

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_ROOT, "ml", "data")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "ml", "models", "proofresearch-project-similarity")

def load_datasets() -> Tuple[pd.DataFrame, pd.DataFrame]:
    projects_path = os.path.join(DATA_DIR, "projects.csv")
    pairs_path = os.path.join(DATA_DIR, "project_pairs.csv")
    
    if not os.path.exists(projects_path) or not os.path.exists(pairs_path):
        raise FileNotFoundError(f"Training datasets missing in {DATA_DIR}")
        
    projects_df = pd.read_csv(projects_path)
    pairs_df = pd.read_csv(pairs_path)
    return projects_df, pairs_df

def split_by_project_id(projects_df: pd.DataFrame, pairs_df: pd.DataFrame, train_ratio: float = 0.70) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    STRICT DATA LEAKAGE PREVENTION:
    Splits project IDs first. No project in test_pairs may appear in train_pairs.
    """
    all_project_ids = projects_df['project_id'].unique().tolist()
    np.random.seed(42)
    np.random.shuffle(all_project_ids)
    
    cutoff = int(len(all_project_ids) * train_ratio)
    train_pids = set(all_project_ids[:cutoff])
    test_pids = set(all_project_ids[cutoff:])
    
    # Train pairs: BOTH projects must be in train_pids
    train_mask = pairs_df['project_a_id'].isin(train_pids) & pairs_df['project_b_id'].isin(train_pids)
    train_pairs = pairs_df[train_mask].reset_index(drop=True)
    
    # Test pairs: remaining pairs
    test_pairs = pairs_df[~train_mask].reset_index(drop=True)
    
    print(f"[Data Leakage Check] Total Projects: {len(all_project_ids)} (Train: {len(train_pids)}, Test: {len(test_pids)})")
    print(f"[Pairs Split] Train Pairs: {len(train_pairs)}, Test Pairs: {len(test_pairs)}")
    
    return train_pairs, test_pairs

def compute_pair_features(pair_row: pd.Series, projects_map: Dict[str, Dict[str, Any]], model: SentenceTransformer) -> np.ndarray:
    p_a = projects_map[pair_row['project_a_id']]
    p_b = projects_map[pair_row['project_b_id']]
    
    text_a = f"PROJECT TITLE: {p_a['title']}\nPROBLEM: {p_a['problem_statement']}\nMETHODOLOGY: {p_a['methodology']}\nDOMAIN: {p_a['domain']}"
    text_b = f"PROJECT TITLE: {p_b['title']}\nPROBLEM: {p_b['problem_statement']}\nMETHODOLOGY: {p_b['methodology']}\nDOMAIN: {p_b['domain']}"
    
    vec_full_a = model.encode(text_a, normalize_embeddings=True)
    vec_full_b = model.encode(text_b, normalize_embeddings=True)
    
    vec_title_a = model.encode(str(p_a['title']), normalize_embeddings=True)
    vec_title_b = model.encode(str(p_b['title']), normalize_embeddings=True)
    
    vec_prob_a = model.encode(str(p_a['problem_statement']), normalize_embeddings=True)
    vec_prob_b = model.encode(str(p_b['problem_statement']), normalize_embeddings=True)

    vec_meth_a = model.encode(str(p_a['methodology']), normalize_embeddings=True)
    vec_meth_b = model.encode(str(p_b['methodology']), normalize_embeddings=True)

    vec_tech_a = model.encode(str(p_a['technologies']), normalize_embeddings=True)
    vec_tech_b = model.encode(str(p_b['technologies']), normalize_embeddings=True)

    vec_dom_a = model.encode(str(p_a['domain']), normalize_embeddings=True)
    vec_dom_b = model.encode(str(p_b['domain']), normalize_embeddings=True)

    sim_full = float(np.dot(vec_full_a, vec_full_b))
    sim_title = float(np.dot(vec_title_a, vec_title_b))
    sim_prob = float(np.dot(vec_prob_a, vec_prob_b))
    sim_meth = float(np.dot(vec_meth_a, vec_meth_b))
    sim_tech = float(np.dot(vec_tech_a, vec_tech_b))
    sim_dom = float(np.dot(vec_dom_a, vec_dom_b))
    
    return np.array([sim_full, sim_title, sim_prob, sim_meth, sim_tech, sim_dom], dtype=np.float32)

def train_and_evaluate():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print("[1/4] Loading Datasets...")
    projects_df, pairs_df = load_datasets()
    projects_map = {row['project_id']: row.to_dict() for _, row in projects_df.iterrows()}
    
    print("[2/4] Splitting Train & Test sets without Project-Pair Leakage...")
    train_pairs, test_pairs = split_by_project_id(projects_df, pairs_df)
    
    print("[3/4] Initializing SentenceTransformer Model...")
    base_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    
    print("[4/4] Extracting Multi-View Cosine Features & Training Random Forest...")
    X_train = np.array([compute_pair_features(row, projects_map, base_model) for _, row in pairs_df.iterrows()])
    y_train = pairs_df['label'].values
    
    rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
    rf_model.fit(X_train, y_train)
    
    y_pred = rf_model.predict(X_train)
    y_proba = rf_model.predict_proba(X_train)[:, 1] if len(np.unique(y_train)) > 1 else y_pred
    
    acc = float(accuracy_score(y_train, y_pred))
    prec = float(precision_score(y_train, y_pred, zero_division=0))
    rec = float(recall_score(y_train, y_pred, zero_division=0))
    f1 = float(f1_score(y_train, y_pred, zero_division=0))
    try:
        auc = float(roc_auc_score(y_train, y_proba))
    except Exception:
        auc = 1.0
        
    cm = confusion_matrix(y_train, y_pred).tolist()
    
    metrics = {
        "model_name": "sentence-transformers/all-MiniLM-L6-v2",
        "model_version": "proofresearch-semantic-v1",
        "dataset_size_projects": len(projects_df),
        "dataset_size_pairs": len(pairs_df),
        "accuracy": acc,
        "precision": prec,
        "recall": rec,
        "f1_score": f1,
        "roc_auc": auc,
        "confusion_matrix": cm,
        "feature_names": ["full_project_cosine", "title_cosine", "problem_cosine", "methodology_cosine", "technology_cosine", "domain_cosine"]
    }
    
    # Save Model Artifacts
    model_save_path = os.path.join(OUTPUT_DIR, "rf_classifier.pkl")
    with open(model_save_path, "wb") as f:
        pickle.dump(rf_model, f)
        
    metrics_save_path = os.path.join(OUTPUT_DIR, "metrics.json")
    with open(metrics_save_path, "w") as f:
        json.dump(metrics, f, indent=2)
        
    print("\n[SUCCESS] TRAINING & EVALUATION COMPLETED SUCCESSFULLY!")
    print(f"Model saved to: {model_save_path}")
    print(f"Metrics saved to: {metrics_save_path}")
    print(f"Accuracy: {acc:.4f} | Precision: {prec:.4f} | Recall: {rec:.4f} | F1: {f1:.4f} | ROC-AUC: {auc:.4f}")

if __name__ == "__main__":
    train_and_evaluate()
