import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml.embedding_service import analyze_document_similarity
from ml.classifier_service import classifier_service, analyze_concept_overlap


DEMO_A = "AI-powered plant leaf disease detection using CNNs"
DEMO_B = "Automated crop infection diagnosis from photographs via deep convolutional neural networks"

CATEGORY_COLORS = {
    "VERY_HIGH": "\033[91m",   # Red
    "HIGH":      "\033[93m",   # Yellow
    "MODERATE":  "\033[94m",   # Blue
    "LOW":       "\033[92m",   # Green
}
RESET = "\033[0m"
BOLD  = "\033[1m"
DIM   = "\033[2m"
CYAN  = "\033[96m"
AMBER = "\033[33m"

def print_bar(value: float, width: int = 30) -> str:
    filled = int(value * width)
    bar = "█" * filled + "░" * (width - filled)
    return f"[{bar}] {value * 100:.1f}%"

def run_analysis(text_a: str, text_b: str):
    print(f"\n{BOLD}{CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")
    print(f"{BOLD}  ProofResearch — ML Semantic Similarity Engine{RESET}")
    print(f"{DIM}  sentence-transformers/all-MiniLM-L6-v2 · 384-D embeddings{RESET}")
    print(f"{BOLD}{CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}\n")
    print(f"{BOLD}  Text A:{RESET} {text_a}")
    print(f"{BOLD}  Text B:{RESET} {text_b}")
    print()

    # ── ML Model Analysis ──
    print(f"{BOLD}  {CYAN}[ 1 / 2 ]  ML Model Result{RESET}")
    print(f"  {DIM}Running embedding & cosine similarity...{RESET}")

    try:
        analysis = analyze_document_similarity(text_a, text_b)
        feats = classifier_service.extract_pair_features(
            {"full_text": text_a, "title": text_a[:60]},
            {"full_text": text_b, "title": text_b[:60]}
        )
        feats["full_project_cosine"] = analysis["cosine_similarity"]
        concept_res = analyze_concept_overlap(text_a, text_b)
        ml_prob, category, review_req = classifier_service.predict_relationship(feats, concept_res=concept_res)
        ml_explanation = classifier_service.generate_explanation(
            analysis["cosine_similarity"], ml_prob, category, feats, concept_res=concept_res
        )
        ml_ok = True
    except Exception as e:
        print(f"  {AMBER}⚠ ML model unavailable: {e}{RESET}")
        ml_ok = False
        analysis = None
        ml_prob, category, review_req = 0.0, "UNKNOWN", False
        ml_explanation = "ML model unavailable."

    if ml_ok:
        col = CATEGORY_COLORS.get(category, "")
        print(f"\n  Model       : {analysis['model_name']} (v{analysis['model_version']})")
        print(f"  Embed Dim   : {analysis['embedding_dimension']}D")
        print(f"  Cosine Sim  : {print_bar(analysis['cosine_similarity'])}  (raw: {analysis['cosine_similarity']:.4f})")
        print(f"  ML Prob     : {print_bar(ml_prob)}  (raw: {ml_prob:.4f})")
        print(f"  Class.      : {col}{BOLD}{category}{RESET}")
        print(f"  Review Req  : {'⚠ YES — Human review required' if review_req else '✓ Not required'}")
        print(f"  Explanation : {DIM}{ml_explanation}{RESET}")
        print(f"\n  Execution Status : {BOLD}Primary ML model completed successfully.{RESET}\n")
    else:
        print(f"\n  Execution Status : {AMBER}ML model result was unavailable or inconclusive.{RESET}")
        print(f"  {DIM}Rule-based semantic fallback was used for transparent verification.{RESET}\n")

    # ── Concept Fallback ──
    print(f"{BOLD}  {CYAN}[ 2 / 2 ]  Fallback Reasoning  {DIM}(Rule-based semantic fallback){RESET}")
    fb = analyze_concept_overlap(text_a, text_b)
    matched = fb["matched_concept_groups_count"]
    total   = fb["total_concept_groups"]
    fb_cat  = fb["fallback_classification"]
    col_fb  = CATEGORY_COLORS.get(fb_cat, "")

    print(f"\n  Concept Groups Matched : {BOLD}{matched}/{total}{RESET}")
    print()

    for group_key in ["domain", "problem", "input_data", "method"]:
        match = next((m for m in fb["matched_groups"] if m.get("group_key") == group_key), None)
        label = {
            "domain":     "Domain     (plant/crop/agriculture)",
            "problem":    "Problem    (disease/infection/diagnosis)",
            "input_data": "Input Data (photographs/images/leaf)",
            "method":     "Method     (CNN/deep learning)",
        }[group_key]
        if match:
            a_terms = ", ".join(match.get("terms_in_ref", []))
            b_terms = ", ".join(match.get("terms_in_sub", []))
            print(f"  ✓ {BOLD}{label}{RESET}")
            print(f"      A: \033[92m{a_terms}{RESET}")
            print(f"      B: \033[94m{b_terms}{RESET}")
        else:
            print(f"  ✗ {DIM}{label}  — no match{RESET}")

    print()
    print(f"  Fallback Class. : {col_fb}{BOLD}{fb_cat}{RESET}")
    print(f"  Review Required : {'⚠ YES — Review Required' if fb['human_review_required'] else '✓ Not required'}")
    print(f"  Explanation     : {DIM}{fb['explanation']}{RESET}")
    print(f"\n{BOLD}{CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}\n")


def main():
    print(f"\n{BOLD}ProofResearch — Interactive Semantic Similarity CLI{RESET}")
    print(f"{DIM}Enter two project descriptions to compare. Press Enter to use the Plant Disease CNN demo.{RESET}\n")

    text_a = input(f"  {BOLD}Text A{RESET} (or Enter for demo): ").strip()
    if not text_a:
        text_a = DEMO_A
        print(f"  → Using demo: {DIM}{text_a}{RESET}")

    text_b = input(f"  {BOLD}Text B{RESET} (or Enter for demo): ").strip()
    if not text_b:
        text_b = DEMO_B
        print(f"  → Using demo: {DIM}{text_b}{RESET}")

    run_analysis(text_a, text_b)

    while True:
        again = input("Run another comparison? (y/n): ").strip().lower()
        if again == "y":
            print()
            text_a = input(f"  {BOLD}Text A:{RESET} ").strip()
            text_b = input(f"  {BOLD}Text B:{RESET} ").strip()
            if text_a and text_b:
                run_analysis(text_a, text_b)
        else:
            break


if __name__ == "__main__":
    main()
