"""
GlucoSense: Scalable Training Pipeline for Large CGM Cohorts
Features:
- Enforces strict participant-level splitting and training-only feature standardization.
- Guarantees zero leakage of diagnostic biomarkers (HbA1c, FBG, BMI) into model features.
- Dynamic loss balancing (Inverse Class Frequency or Focal Loss) for imbalanced cohorts.
- Gradient clipping (max_norm=1.0) and validation macro-F1 checkpointing.
- Versioned checkpoint preservation: Never overwrites baseline checkpoints.
- Structured experiment logging with learning curve plots and machine-readable JSON metrics.
"""

import os
import sys
import json
import time
import random
import argparse
from typing import Dict, Any, Optional, Tuple
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader
from sklearn.metrics import accuracy_score, balanced_accuracy_score, precision_recall_fscore_support

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.model_scalable import GlucoSenseScalableCNNLSTM
from ml.data_loader_large import ScalableCGMDataset
from ml.adapters.hall_adapter import HallDatasetAdapter
from ml.adapters.generic_cgm_adapter import GenericCGMAdapter

MODELS_DIR = os.path.join(PROJECT_ROOT, "models")
RESULTS_DIR = os.path.join(PROJECT_ROOT, "results")


def set_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


class FocalLoss(nn.Module):
    """Focal loss for multi-class classification to focus on hard, sparse clinical examples."""
    def __init__(self, alpha: Optional[torch.Tensor] = None, gamma: float = 2.0):
        super(FocalLoss, self).__init__()
        self.alpha = alpha
        self.gamma = gamma

    def forward(self, inputs: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        ce_loss = nn.functional.cross_entropy(inputs, targets, weight=self.alpha, reduction="none")
        pt = torch.exp(-ce_loss)
        focal_loss = ((1.0 - pt) ** self.gamma) * ce_loss
        return focal_loss.mean()


def train_scalable_model(
    cohort_source: str = "hall",                 # "hall", or directory/file path for GenericCGMAdapter
    metadata_source: Optional[str] = None,
    experiment_name: str = "experiment_large_cohort",
    model_output_filename: str = "glucosense_large_cgm.pt",
    scaler_output_filename: str = "scaler_config_large.json",
    window_size: int = 24,                       # 24 steps = 2h, 288 steps = 24h
    stride: int = 6,                             # Window sliding stride
    include_imputed_channel: bool = False,
    epochs: int = 25,
    batch_size: int = 64,
    lr: float = 0.001,
    weight_decay: float = 1e-4,
    use_focal_loss: bool = False,
    bidirectional: bool = False,
    seed: int = 42,
    device: str = "cpu"
) -> Tuple[GlucoSenseScalableCNNLSTM, Dict[str, Any], int]:
    """
    Executes end-to-end reproducible training on large CGM cohorts.
    """
    set_seed(seed)
    exp_dir = os.path.join(RESULTS_DIR, "experiments", experiment_name)
    os.makedirs(exp_dir, exist_ok=True)
    os.makedirs(MODELS_DIR, exist_ok=True)

    # SAFETY CHECK: Ensure baseline model is never overwritten
    protected_checkpoints = ["glucosense_cnn_lstm.pt", "glucosense_5class_cnn_lstm.pt"]
    if model_output_filename in protected_checkpoints:
        raise ValueError(
            f"Cannot overwrite protected baseline checkpoint '{model_output_filename}'! "
            f"Please specify a distinct model filename (e.g. 'glucosense_large_cgm.pt')."
        )

    # 1. Ingest dataset using modular adapter
    print(f"\n[1/6] Ingesting cohort from '{cohort_source}'...")
    if cohort_source == "hall":
        adapter = HallDatasetAdapter()
    else:
        adapter = GenericCGMAdapter(
            telemetry_source=cohort_source,
            metadata_file=metadata_source,
            cohort_name=experiment_name
        )

    cohort_data = adapter.load_cohort()
    cohort_summary = cohort_data.summarize()
    print(f"Cohort Ingested: {cohort_summary['unique_subjects']} subjects, "
          f"{cohort_summary['total_episodes']} continuous episodes, "
          f"{cohort_summary['total_readings']:,} readings.")

    # 2. Extract sliding windows and enforce participant-level partitioning
    print(f"\n[2/6] Extracting sliding windows (L={window_size}, Stride={stride}) & partitioning...")
    ds_manager = ScalableCGMDataset(
        window_size=window_size,
        stride=stride,
        include_imputed_channel=include_imputed_channel,
        seed=seed
    )

    X_raw, y_raw, subjects_raw, meta_df = ds_manager.extract_windows_from_cohort(cohort_data)
    print(f"Total Extracted Windows: {len(X_raw):,} with shape {X_raw.shape}")

    # Participant-level split (70% train, 15% val, 15% test)
    splits = ds_manager.split_by_patient(X_raw, y_raw, subjects_raw, train_ratio=0.70, val_ratio=0.15, test_ratio=0.15)

    # Fit scaler strictly on training split
    scaled_splits = ds_manager.fit_and_apply_scaler(
        splits,
        class_mapping=cohort_data.class_mapping,
        display_class_mapping=cohort_data.display_class_mapping
    )

    scaler_path = os.path.join(MODELS_DIR, scaler_output_filename)
    split_cache_dir = os.path.join(exp_dir, "processed_splits")
    ds_manager.save_processed_splits(scaled_splits, meta_df, split_cache_dir, scaler_path)

    X_train, y_train, subjs_train = scaled_splits["train"]
    X_val, y_val, subjs_val = scaled_splits["val"]
    X_test, y_test, subjs_test = scaled_splits["test"]

    print(f"Train Partition: {len(X_train):,} windows across {len(np.unique(subjs_train))} patients")
    print(f"Val Partition:   {len(X_val):,} windows across {len(np.unique(subjs_val))} patients")
    print(f"Test Partition:  {len(X_test):,} windows across {len(np.unique(subjs_test))} patients (HELD OUT)")

    # 3. Compute class weights for loss balancing
    num_classes = len(cohort_data.display_class_mapping)
    class_counts = np.bincount(y_train, minlength=num_classes)
    total_samples = len(y_train)
    class_weights = total_samples / (float(num_classes) * np.maximum(class_counts, 1))
    weights_tensor = torch.tensor(class_weights, dtype=torch.float32).to(device)
    print(f"Train Class Distribution: {class_counts.tolist()}")
    print(f"Computed Class Weights:   {weights_tensor.cpu().numpy().round(3).tolist()}")

    # 4. Initialize DataLoaders
    train_ds = TensorDataset(torch.tensor(X_train, dtype=torch.float32), torch.tensor(y_train, dtype=torch.long))
    val_ds = TensorDataset(torch.tensor(X_val, dtype=torch.float32), torch.tensor(y_val, dtype=torch.long))
    test_ds = TensorDataset(torch.tensor(X_test, dtype=torch.float32), torch.tensor(y_test, dtype=torch.long))

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False)

    # 5. Initialize Scalable Model Architecture
    print(f"\n[3/6] Initializing GlucoSense Scalable CNN-LSTM...")
    model = GlucoSenseScalableCNNLSTM(
        in_channels=X_train.shape[-1],
        seq_length=window_size,
        conv_filters=64,
        lstm_hidden_size=64,
        lstm_num_layers=2,
        bidirectional=bidirectional,
        num_classes=num_classes
    ).to(device)

    arch_summary = model.get_architecture_summary()
    print(f"Model Parameters: {arch_summary['total_parameters']:,} trainable")

    criterion = FocalLoss(alpha=weights_tensor) if use_focal_loss else nn.CrossEntropyLoss(weight=weights_tensor)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="max", factor=0.5, patience=3)

    # 6. Training Loop
    print(f"\n[4/6] Executing Training Loop ({epochs} epochs)...")
    history = {
        "train_loss": [], "val_loss": [],
        "train_acc": [], "val_acc": [],
        "val_macro_f1": [], "val_balanced_acc": []
    }

    best_val_macro_f1 = -1.0
    best_epoch = -1
    best_model_path = os.path.join(MODELS_DIR, model_output_filename)
    start_time = time.time()

    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        t_preds, t_targets = [], []

        for b_x, b_y in train_loader:
            b_x, b_y = b_x.to(device), b_y.to(device)
            optimizer.zero_grad()
            logits = model(b_x)
            loss = criterion(logits, b_y)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

            running_loss += loss.item() * b_x.size(0)
            preds = torch.argmax(logits, dim=-1).cpu().numpy()
            t_preds.extend(preds)
            t_targets.extend(b_y.cpu().numpy())

        ep_train_loss = running_loss / len(train_loader.dataset)
        ep_train_acc = accuracy_score(t_targets, t_preds)

        # Validation Step
        model.eval()
        val_running_loss = 0.0
        v_preds, v_targets = [], []

        with torch.no_grad():
            for b_x, b_y in val_loader:
                b_x, b_y = b_x.to(device), b_y.to(device)
                logits = model(b_x)
                loss = criterion(logits, b_y)
                val_running_loss += loss.item() * b_x.size(0)
                preds = torch.argmax(logits, dim=-1).cpu().numpy()
                v_preds.extend(preds)
                v_targets.extend(b_y.cpu().numpy())

        ep_val_loss = val_running_loss / len(val_loader.dataset)
        ep_val_acc = accuracy_score(v_targets, v_preds)
        ep_val_bal_acc = balanced_accuracy_score(v_targets, v_preds)
        _, _, ep_val_macro_f1, _ = precision_recall_fscore_support(
            v_targets, v_preds, average="macro", zero_division=0
        )

        scheduler.step(ep_val_macro_f1)

        history["train_loss"].append(float(ep_train_loss))
        history["val_loss"].append(float(ep_val_loss))
        history["train_acc"].append(float(ep_train_acc))
        history["val_acc"].append(float(ep_val_acc))
        history["val_macro_f1"].append(float(ep_val_macro_f1))
        history["val_balanced_acc"].append(float(ep_val_bal_acc))

        print(
            f"Epoch {epoch:02d}/{epochs:02d} | "
            f"Train Loss: {ep_train_loss:.4f} Acc: {ep_train_acc*100:.1f}% | "
            f"Val Loss: {ep_val_loss:.4f} Acc: {ep_val_acc*100:.1f}% "
            f"BalAcc: {ep_val_bal_acc*100:.1f}% Macro-F1: {ep_val_macro_f1*100:.1f}%"
        )

        # Checkpoint strictly on validation macro-F1
        if ep_val_macro_f1 > best_val_macro_f1:
            best_val_macro_f1 = ep_val_macro_f1
            best_epoch = epoch
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_macro_f1": ep_val_macro_f1,
                "val_acc": ep_val_acc,
                "val_bal_acc": ep_val_bal_acc,
                "arch_summary": arch_summary,
                "experiment_name": experiment_name,
                "window_size": window_size,
                "stride": stride,
                "include_imputed_channel": include_imputed_channel
            }, best_model_path)

    total_time = time.time() - start_time
    print(f"\n[5/6] Training complete in {total_time:.1f}s. Best Epoch: {best_epoch} (Val Macro-F1: {best_val_macro_f1*100:.2f}%)")
    print(f"Saved checkpoint to: {best_model_path}")

    # Plot training history curves
    try:
        import matplotlib.pyplot as plt
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
        ax1.plot(history["train_loss"], label="Train Loss")
        ax1.plot(history["val_loss"], label="Val Loss")
        ax1.set_title(f"{experiment_name}: Loss Progression")
        ax1.set_xlabel("Epoch")
        ax1.set_ylabel("Loss")
        ax1.legend()

        ax2.plot(history["train_acc"], label="Train Acc")
        ax2.plot(history["val_acc"], label="Val Acc")
        ax2.plot(history["val_macro_f1"], label="Val Macro-F1")
        ax2.set_title(f"{experiment_name}: Accuracy & F1")
        ax2.set_xlabel("Epoch")
        ax2.set_ylabel("Score")
        ax2.legend()

        plt.tight_layout()
        curve_path = os.path.join(exp_dir, "training_curves.png")
        plt.savefig(curve_path, dpi=150)
        plt.close()
        print(f"Training curves saved to: {curve_path}")
    except Exception as e:
        print(f"Could not generate plot: {e}")

    # Persist experiment history JSON
    with open(os.path.join(exp_dir, "training_history.json"), "w") as f:
        json.dump(history, f, indent=2)

    return model, history, best_epoch


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GlucoSense Large Cohort Training")
    parser.add_argument("--cohort-source", type=str, default="hall", help="Cohort adapter source ('hall' or path)")
    parser.add_argument("--metadata-source", type=str, default=None, help="Optional path to metadata table")
    parser.add_argument("--experiment-name", type=str, default="experiment_large_cohort", help="Experiment name")
    parser.add_argument("--model-output", type=str, default="glucosense_large_cgm.pt", help="Checkpoint filename")
    parser.add_argument("--epochs", type=int, default=20, help="Epochs")
    parser.add_argument("--batch-size", type=int, default=64, help="Batch size")
    parser.add_argument("--window-size", type=int, default=24, help="Window size (steps)")
    parser.add_argument("--stride", type=int, default=6, help="Window stride (steps)")
    parser.add_argument("--lr", type=float, default=0.001, help="Learning rate")
    args = parser.parse_args()

    train_scalable_model(
        cohort_source=args.cohort_source,
        metadata_source=args.metadata_source,
        experiment_name=args.experiment_name,
        model_output_filename=args.model_output,
        epochs=args.epochs,
        batch_size=args.batch_size,
        window_size=args.window_size,
        stride=args.stride,
        lr=args.lr
    )
