"""
GlucoSense: Patient-Level & Window-Level Dual Evaluation Engine
Evaluates trained models on held-out test subjects, providing:
1. Standard window-level metrics (Accuracy, Balanced Acc, Macro/Weighted F1, ROC-AUC).
2. Clinically realistic patient-level metrics (aggregates all windows per subject via soft/hard voting).
3. Patient-by-patient diagnostic breakdown and uncertainty calibration.
"""

import os
import sys
import json
from typing import Dict, Any, Optional, List
import numpy as np
import torch
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report,
    roc_auc_score
)

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.model_scalable import GlucoSenseScalableCNNLSTM
from ml.model import GlucoSenseCNNLSTM

MODELS_DIR = os.path.join(PROJECT_ROOT, "models")
RESULTS_DIR = os.path.join(PROJECT_ROOT, "results")


def evaluate_cohort_patient_level(
    splits_dir: str,
    checkpoint_path: str,
    scaler_path: Optional[str] = None,
    output_dir: Optional[str] = None,
    device: str = "cpu"
) -> Dict[str, Any]:
    """
    Performs comprehensive window-level and patient-level evaluation on the held-out test split.
    """
    if output_dir is None:
        output_dir = RESULTS_DIR
    os.makedirs(output_dir, exist_ok=True)

    # 1. Load test data
    x_path = os.path.join(splits_dir, "X_test.npy")
    y_path = os.path.join(splits_dir, "y_test.npy")
    subjs_path = os.path.join(splits_dir, "subjects_test.npy")

    if not (os.path.exists(x_path) and os.path.exists(y_path) and os.path.exists(subjs_path)):
        raise FileNotFoundError(f"Missing test split arrays in '{splits_dir}'. Ensure dataset was preprocessed.")

    X_test = np.load(x_path)
    y_test = np.load(y_path)
    subjects_test = np.load(subjs_path)

    # Load scaler/class mappings if available
    class_names = ["Normal", "Prediabetes", "Type 2 Diabetes"]
    if scaler_path and os.path.exists(scaler_path):
        with open(scaler_path, "r") as f:
            sc_cfg = json.load(f)
            d_map = sc_cfg.get("display_class_mapping", {})
            if d_map:
                class_names = [d_map.get(str(i), f"Class {i}") for i in range(len(d_map))]

    print(f"\n================ HELD-OUT TEST EVALUATION ================")
    print(f"Test Set: {len(y_test):,} windows across {len(np.unique(subjects_test))} held-out patients")
    print(f"Classes:  {class_names}")

    # 2. Load model
    checkpoint = torch.load(checkpoint_path, map_location=device)
    arch = checkpoint.get("arch_summary", {})

    in_ch = arch.get("in_channels", X_test.shape[-1])
    seq_len = arch.get("seq_length", X_test.shape[1])
    n_classes = arch.get("num_classes", len(class_names))

    # Initialize model architecture (supports scalable or standard)
    if "GlucoSense-Scalable" in arch.get("model_name", ""):
        model = GlucoSenseScalableCNNLSTM(
            in_channels=in_ch,
            seq_length=seq_len,
            conv_filters=arch.get("conv_filters", 64),
            lstm_hidden_size=arch.get("lstm_hidden_size", 64),
            bidirectional=arch.get("bidirectional", False),
            num_classes=n_classes
        ).to(device)
    else:
        model = GlucoSenseCNNLSTM(
            in_channels=in_ch,
            seq_length=seq_len,
            conv_filters=arch.get("conv_filters", 64),
            lstm_hidden_size=arch.get("lstm_hidden_size", 64),
            num_classes=n_classes
        ).to(device)

    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    # 3. Predict on all test windows
    test_tensor = torch.tensor(X_test, dtype=torch.float32).to(device)
    with torch.no_grad():
        logits = model(test_tensor)
        probs = torch.softmax(logits, dim=-1).cpu().numpy()
        w_preds = np.argmax(probs, axis=1)

    # 4. Window-Level Metrics
    w_acc = float(accuracy_score(y_test, w_preds))
    w_bal_acc = float(balanced_accuracy_score(y_test, w_preds))
    w_p_macro, w_r_macro, w_f1_macro, _ = precision_recall_fscore_support(
        y_test, w_preds, average="macro", zero_division=0
    )
    w_p_weighted, w_r_weighted, w_f1_weighted, _ = precision_recall_fscore_support(
        y_test, w_preds, average="weighted", zero_division=0
    )

    try:
        w_roc_auc_macro = float(roc_auc_score(y_test, probs, multi_class="ovr", average="macro"))
    except Exception:
        w_roc_auc_macro = None

    w_cm = confusion_matrix(y_test, w_preds, labels=list(range(n_classes)))

    # 5. Patient-Level Aggregation (Clinical Consensus via Soft & Hard Voting)
    unique_subjs = np.unique(subjects_test)
    patient_records = []
    p_true_list = []
    p_soft_pred_list = []
    p_hard_pred_list = []

    for sid in unique_subjs:
        s_mask = subjects_test == sid
        s_probs = probs[s_mask]
        s_w_preds = w_preds[s_mask]
        s_true_labels = y_test[s_mask]

        # Ground truth for patient (dominant label across windows)
        vals, counts = np.unique(s_true_labels, return_counts=True)
        true_patient_label = int(vals[np.argmax(counts)])

        # Soft voting: mean probability vector across all windows for this subject
        mean_prob = np.mean(s_probs, axis=0)
        soft_pred_label = int(np.argmax(mean_prob))
        confidence = float(mean_prob[soft_pred_label])

        # Hard voting: mode of predicted window classes
        h_vals, h_counts = np.unique(s_w_preds, return_counts=True)
        hard_pred_label = int(h_vals[np.argmax(h_counts)])

        p_true_list.append(true_patient_label)
        p_soft_pred_list.append(soft_pred_label)
        p_hard_pred_list.append(hard_pred_label)

        patient_records.append({
            "subject_id": str(sid),
            "total_windows": int(np.sum(s_mask)),
            "true_diagnosis": class_names[true_patient_label] if true_patient_label < len(class_names) else str(true_patient_label),
            "soft_vote_prediction": class_names[soft_pred_label] if soft_pred_label < len(class_names) else str(soft_pred_label),
            "hard_vote_prediction": class_names[hard_pred_label] if hard_pred_label < len(class_names) else str(hard_pred_label),
            "prediction_confidence": round(confidence, 4),
            "mean_class_probabilities": [round(float(p), 4) for p in mean_prob],
            "correct": bool(soft_pred_label == true_patient_label)
        })

    # Patient-Level Metrics
    p_true = np.array(p_true_list)
    p_pred = np.array(p_soft_pred_list)

    p_acc = float(accuracy_score(p_true, p_pred))
    p_bal_acc = float(balanced_accuracy_score(p_true, p_pred))
    p_p_macro, p_r_macro, p_f1_macro, _ = precision_recall_fscore_support(
        p_true, p_pred, average="macro", zero_division=0
    )
    p_cm = confusion_matrix(p_true, p_pred, labels=list(range(n_classes)))

    # 6. Report Compilation
    report_dict = {
        "evaluation_dataset_path": splits_dir,
        "checkpoint_path": checkpoint_path,
        "total_test_windows": int(len(y_test)),
        "total_test_patients": int(len(unique_subjs)),
        "class_names": class_names,
        "window_level_metrics": {
            "accuracy": round(w_acc, 4),
            "balanced_accuracy": round(w_bal_acc, 4),
            "macro_precision": round(float(w_p_macro), 4),
            "macro_recall": round(float(w_r_macro), 4),
            "macro_f1": round(float(w_f1_macro), 4),
            "weighted_f1": round(float(w_f1_weighted), 4),
            "roc_auc_macro": round(w_roc_auc_macro, 4) if w_roc_auc_macro is not None else None,
            "confusion_matrix": w_cm.tolist()
        },
        "patient_level_metrics": {
            "accuracy": round(p_acc, 4),
            "balanced_accuracy": round(p_bal_acc, 4),
            "macro_precision": round(float(p_p_macro), 4),
            "macro_recall": round(float(p_r_macro), 4),
            "macro_f1": round(float(p_f1_macro), 4),
            "confusion_matrix": p_cm.tolist()
        },
        "patient_breakdown": patient_records
    }

    # Print summary
    print(f"\n--- WINDOW-LEVEL METRICS ({len(y_test)} windows) ---")
    print(f"Accuracy:          {w_acc * 100:.2f}%")
    print(f"Balanced Accuracy: {w_bal_acc * 100:.2f}%")
    print(f"Macro F1-Score:    {w_f1_macro * 100:.2f}%")
    print(f"Weighted F1-Score: {w_f1_weighted * 100:.2f}%")

    print(f"\n--- PATIENT-LEVEL METRICS ({len(unique_subjs)} patients) ---")
    print(f"Patient Accuracy:          {p_acc * 100:.2f}% ({int(np.sum(p_true == p_pred))}/{len(unique_subjs)} correct)")
    print(f"Patient Balanced Accuracy: {p_bal_acc * 100:.2f}%")
    print(f"Patient Macro F1-Score:    {p_f1_macro * 100:.2f}%")

    print("\nPatient-by-Patient Breakdown:")
    for r in patient_records:
        mark = "[PASS]" if r["correct"] else "[FAIL]"
        print(f"  {mark} {r['subject_id']:<15} | True: {r['true_diagnosis']:<15} | "
              f"Pred: {r['soft_vote_prediction']:<15} | Conf: {r['prediction_confidence']*100:.1f}% "
              f"({r['total_windows']} windows)")

    # Save metrics JSON
    metrics_path = os.path.join(output_dir, "patient_level_metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(report_dict, f, indent=2)
    print(f"\n[SAVED] Comprehensive patient metrics saved to: {metrics_path}")

    return report_dict


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="GlucoSense Patient-Level Evaluation")
    parser.add_argument("--splits-dir", type=str, default=os.path.join(PROJECT_ROOT, "data", "processed"))
    parser.add_argument("--checkpoint", type=str, default=os.path.join(MODELS_DIR, "glucosense_cnn_lstm.pt"))
    parser.add_argument("--scaler", type=str, default=os.path.join(MODELS_DIR, "scaler_config.json"))
    args = parser.parse_args()

    evaluate_cohort_patient_level(args.splits_dir, args.checkpoint, args.scaler)
