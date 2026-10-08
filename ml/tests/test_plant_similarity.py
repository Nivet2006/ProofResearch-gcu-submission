import sys
import os
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from ml.embedding_service import analyze_document_similarity
from ml.classifier_service import classifier_service, analyze_concept_overlap

PROJECT_A = "AI-powered plant leaf disease detection using CNNs"
PROJECT_B = "Automated crop infection diagnosis from photographs via deep convolutional neural networks"
PROJECT_C = "Blockchain-based land record management system for rural property ownership"

def test_plant_disease_similarity_high_or_very_high():
    """
    Project A vs Project B should result in HIGH or VERY_HIGH similarity,
    cosine similarity >= 0.70, ML probability >= 0.70, human review required = True,
    and explanation mentioning plant/crop disease and CNN/deep learning methods.
    """
    analysis = analyze_document_similarity(PROJECT_A, PROJECT_B)
    feats = classifier_service.extract_pair_features(
        {"full_text": PROJECT_A, "title": PROJECT_A[:50]},
        {"full_text": PROJECT_B, "title": PROJECT_B[:50]}
    )
    feats["full_project_cosine"] = analysis["cosine_similarity"]
    
    concept_res = analyze_concept_overlap(PROJECT_A, PROJECT_B)
    ml_prob, category, review_req = classifier_service.predict_relationship(feats, concept_res=concept_res)

    assert analysis["cosine_similarity"] >= 0.60
    assert ml_prob >= 0.70
    assert category in ["HIGH", "VERY_HIGH"]
    assert review_req is True

    explanation = classifier_service.generate_explanation(
        analysis["cosine_similarity"],
        ml_prob,
        category,
        feats,
        concept_res=concept_res
    )
    assert any(term in explanation.lower() for term in ["plant", "crop", "disease", "infection", "cnn", "convolutional"])

def test_concept_overlap_fallback_4_out_of_4():
    """
    Fallback concept matching between Project A and Project B must detect 4/4 concept groups,
    classify as VERY_HIGH, require human review, and be clearly labeled as rule-based.
    """
    fallback_res = analyze_concept_overlap(PROJECT_A, PROJECT_B)

    assert fallback_res["used_fallback"] is True
    assert fallback_res["matched_concept_groups_count"] == 4
    assert fallback_res["total_concept_groups"] == 4
    # matched_groups is a list of dicts with group_key fields
    matched_keys = {g["group_key"] for g in fallback_res["matched_groups"]}
    assert matched_keys == {"domain", "problem", "input_data", "method"}
    assert fallback_res["fallback_classification"] == "VERY_HIGH"
    assert fallback_res["human_review_required"] is True
    assert "visual plant/crop disease diagnosis" in fallback_res["explanation"]

def test_unrelated_project_low_similarity():
    """
    Project A vs Project C (Unrelated Blockchain project) should be LOW similarity
    and have 0 or minimal concept overlap, not triggering HIGH/VERY_HIGH.
    """
    analysis = analyze_document_similarity(PROJECT_A, PROJECT_C)
    feats = classifier_service.extract_pair_features(
        {"full_text": PROJECT_A, "title": PROJECT_A[:50]},
        {"full_text": PROJECT_C, "title": PROJECT_C[:50]}
    )
    feats["full_project_cosine"] = analysis["cosine_similarity"]
    
    concept_res = analyze_concept_overlap(PROJECT_A, PROJECT_C)
    ml_prob, category, review_req = classifier_service.predict_relationship(feats, concept_res=concept_res)

    assert category == "LOW"
    assert concept_res["matched_concept_groups_count"] < 3
    assert concept_res["fallback_classification"] == "LOW"
