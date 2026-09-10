"""
GlucoSense: Model Evaluation and Performance Verification
Computes exact test-set metrics, confusion matrix, ROC-AUC,
and generates machine-readable metadata.
Reference: "A Unified Deep Learning Framework for Multi-Class Diabetes Classification
and Insulin-Aware Glycemic Risk Assessment Using CGM Data"
"""

import os
import json
import numpy as np
import torch
import matplotlib.pyplot as plt
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report,
    roc_auc_score
)
import sys
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.model import GlucoSenseCNNLSTM

PROCESSED_DATA_DIR = os.path.join(PROJECT_ROOT, "data", "processed")
MODELS_DIR = os.path.join(PROJECT_ROOT, "models")
RESULTS_DIR = os.path.join(PROJECT_ROOT, "results")

CLASS_NAMES = ["Normal", "Prediabetes", "Type 2 Diabetes"]


def evaluate_test_set(checkpoint_path: str = None, device: str = "cpu"):
    if checkpoint_path is None:
        checkpoint_path = os.path.join(MODELS_DIR, "glucosense_cnn_lstm.pt")

    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"Model checkpoint not found at {checkpoint_path}. Train the model first.")

    os.makedirs(RESULTS_DIR, exist_ok=True)

    # 1. Load test split
    X_test = np.load(os.path.join(PROCESSED_DATA_DIR, "X_test.npy"))
    y_test = np.load(os.path.join(PROCESSED_DATA_DIR, "y_test.npy"))
    subjects_test = np.load(os.path.join(PROCESSED_DATA_DIR, "subjects_test.npy"))

    print(f"\n================ TEST SET EVALUATION ================")
    print(f"Test Set Size: {len(y_test)} windows across {len(np.unique(subjects_test))} held-out patients")
    print(f"Class Distribution: {np.bincount(y_test, minlength=3)} [Normal, Prediabetes, Type 2]")

    # 2. Load trained model
    checkpoint = torch.load(checkpoint_path, map_location=device)
    arch_summary = checkpoint.get("arch_summary", {})
    model = GlucoSenseCNNLSTM(
        in_channels=arch_summary.get("in_channels", 3),
        seq_length=arch_summary.get("seq_length", 24),
        conv_filters=arch_summary.get("conv_filters", 64),
        lstm_hidden_size=arch_summary.get("lstm_hidden_size", 64),
        num_classes=arch_summary.get("num_classes", 3)
    ).to(device)

    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    # 3. Predict on Test Set
    test_tensor = torch.tensor(X_test, dtype=torch.float32).to(device)
    with torch.no_grad():
        logits = model(test_tensor)
        probs = torch.softmax(logits, dim=-1).cpu().numpy()
        preds = np.argmax(probs, axis=1)

    # 4. Compute Comprehensive Metrics
    acc = float(accuracy_score(y_test, preds))
    bal_acc = float(balanced_accuracy_score(y_test, preds))
    precision_macro, recall_macro, f1_macro, _ = precision_recall_fscore_support(
        y_test, preds, average="macro", zero_division=0
    )
    precision_weighted, recall_weighted, f1_weighted, _ = precision_recall_fscore_support(
        y_test, preds, average="weighted", zero_division=0
    )

    # Per-class metrics
    p_per_class, r_per_class, f1_per_class, support_per_class = precision_recall_fscore_support(
        y_test, preds, average=None, zero_division=0
    )

    # Multi-class ROC-AUC (One-vs-Rest)
    try:
        roc_auc_macro = float(roc_auc_score(y_test, probs, multi_class="ovr", average="macro"))
        roc_auc_weighted = float(roc_auc_score(y_test, probs, multi_class="ovr", average="weighted"))
    except Exception as e:
        roc_auc_macro = None
        roc_auc_weighted = None

    cm = confusion_matrix(y_test, preds, labels=[0, 1, 2])
    report_str = classification_report(y_test, preds, target_names=CLASS_NAMES, zero_division=0)

    # 5. Print Output
    print("\n--- ACTUAL MEASURED TEST RESULTS ---")
    print(f"Overall Accuracy:       {acc * 100:.2f}%")
    print(f"Balanced Accuracy:      {bal_acc * 100:.2f}%")
    print(f"Macro Precision:        {precision_macro * 100:.2f}%")
    print(f"Macro Recall:           {recall_macro * 100:.2f}%")
    print(f"Macro F1-Score:         {f1_macro * 100:.2f}%")
    print(f"Weighted F1-Score:      {f1_weighted * 100:.2f}%")
    if roc_auc_macro is not None:
        print(f"Macro ROC-AUC:          {roc_auc_macro:.4f}")
    print("\nClassification Report:\n" + report_str)
    print("Confusion Matrix:\n", cm)
    print("====================================================\n")

    # 6. Save Confusion Matrix Plot
    cm_plot_path = os.path.join(RESULTS_DIR, "confusion_matrix.png")
    fig, ax = plt.subplots(figsize=(6, 5))
    im = ax.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)
    ax.figure.colorbar(im, ax=ax)
    ax.set(
        xticks=np.arange(cm.shape[1]),
        yticks=np.arange(cm.shape[0]),
        xticklabels=CLASS_NAMES,
        yticklabels=CLASS_NAMES,
        title="Test Set Confusion Matrix (Patient-Level Split)",
        ylabel="True Diagnosis",
        xlabel="Predicted Diagnosis"
    )
    plt.setp(ax.get_xticklabels(), rotation=30, ha="right", rotation_mode="anchor")
    thresh = cm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, format(cm[i, j], "d"),
                    ha="center", va="center",
                    color="white" if cm[i, j] > thresh else "black")
    fig.tight_layout()
    plt.savefig(cm_plot_path, dpi=150)
    plt.close()
    print(f"[SAVED] Confusion matrix plot saved to {cm_plot_path}")

    # 7. Save Classification Report Text
    report_path = os.path.join(RESULTS_DIR, "classification_report.txt")
    with open(report_path, "w") as f:
        f.write("GLUCOSENSE CNN-LSTM EVALUATION REPORT\n")
        f.write("=" * 50 + "\n")
        f.write(f"Evaluation Dataset: Hall et al. (2018) Held-out Patient Test Split\n")
        f.write(f"Number of Test Windows: {len(y_test)}\n")
        f.write(f"Number of Test Patients: {len(np.unique(subjects_test))}\n\n")
        f.write(report_str + "\n\n")
        f.write(f"Confusion Matrix (Rows=True, Cols=Pred):\n{cm}\n")
    print(f"[SAVED] Classification report text saved to {report_path}")

    # 8. Save Machine-Readable Metrics JSON
    metrics_dict = {
        "evaluation_timestamp": np.datetime64("now").astype(str),
        "dataset_name": "Hall et al. (2018) Clinical CGM Dataset (PLOS Biology)",
        "dataset_doi": "10.1371/journal.pbio.2005143",
        "split_strategy": "Patient-Level Stratified Partition (Zero Data Leakage)",
        "num_test_windows": int(len(y_test)),
        "num_test_patients": int(len(np.unique(subjects_test))),
        "accuracy": acc,
        "balanced_accuracy": bal_acc,
        "macro_precision": float(precision_macro),
        "macro_recall": float(recall_macro),
        "macro_f1": float(f1_macro),
        "weighted_f1": float(f1_weighted),
        "roc_auc_macro": roc_auc_macro,
        "roc_auc_weighted": roc_auc_weighted,
        "confusion_matrix": cm.tolist(),
        "classes": {
            CLASS_NAMES[i]: {
                "precision": float(p_per_class[i]),
                "recall": float(r_per_class[i]),
                "f1": float(f1_per_class[i]),
                "support": int(support_per_class[i])
            }
            for i in range(3)
        }
    }

    metrics_path = os.path.join(RESULTS_DIR, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics_dict, f, indent=2)
    print(f"[SAVED] Machine-readable metrics saved to {metrics_path}")

    # 9. Save Formal Model Metadata
    metadata = {
        "model_name": "GlucoSense-CNN-LSTM",
        "version": "1.0.0",
        "framework": "PyTorch",
        "input_shape": [1, int(arch_summary.get("seq_length", 24)), int(arch_summary.get("in_channels", 3))],
        "features": ["glucose_mg_dL", "rate_of_change_mg_dL_5min", "delta_norm"],
        "num_classes": 3,
        "classes": CLASS_NAMES,
        "training_dataset": "Hall et al. (2018) PLOS Biology 10.1371/journal.pbio.2005143",
        "training_patients": 39,
        "test_patients": int(len(np.unique(subjects_test))),
        "test_accuracy": acc,
        "test_macro_f1": float(f1_macro),
        "test_balanced_accuracy": bal_acc,
        "best_checkpoint_epoch": int(checkpoint.get("epoch", -1)),
        "total_parameters": int(arch_summary.get("total_parameters", 0))
    }

    metadata_path = os.path.join(MODELS_DIR, "model_metadata.json")
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"[SAVED] Model metadata saved to {metadata_path}")

    return metrics_dict


if __name__ == "__main__":
    evaluate_test_set()
