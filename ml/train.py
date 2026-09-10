"""
GlucoSense: Reproducible Training Pipeline for CNN-LSTM
Trains the multi-class diabetes classification model on patient-level split CGM data.
Reference: "A Unified Deep Learning Framework for Multi-Class Diabetes Classification
and Insulin-Aware Glycemic Risk Assessment Using CGM Data"
"""

import os
import json
import time
import random
import argparse
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader
import sys
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from sklearn.metrics import accuracy_score, balanced_accuracy_score, precision_recall_fscore_support
from ml.model import GlucoSenseCNNLSTM

PROCESSED_DATA_DIR = os.path.join(PROJECT_ROOT, "data", "processed")
MODELS_DIR = os.path.join(PROJECT_ROOT, "models")
RESULTS_DIR = os.path.join(PROJECT_ROOT, "results")


def set_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def load_split(split_name: str):
    X = np.load(os.path.join(PROCESSED_DATA_DIR, f"X_{split_name}.npy"))
    y = np.load(os.path.join(PROCESSED_DATA_DIR, f"y_{split_name}.npy"))
    subjs = np.load(os.path.join(PROCESSED_DATA_DIR, f"subjects_{split_name}.npy"))
    return X, y, subjs


def train_model(
    epochs: int = 25,
    batch_size: int = 64,
    lr: float = 0.001,
    weight_decay: float = 1e-4,
    seed: int = 42,
    device: str = "cpu"
):
    set_seed(seed)
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(RESULTS_DIR, exist_ok=True)

    print(f"[1/5] Loading patient-partitioned datasets from {PROCESSED_DATA_DIR}...")
    X_train, y_train, subjs_train = load_split("train")
    X_val, y_val, subjs_val = load_split("val")
    X_test, y_test, subjs_test = load_split("test")

    print(f"Train set: {X_train.shape[0]} windows from {len(np.unique(subjs_train))} patients")
    print(f"Val set:   {X_val.shape[0]} windows from {len(np.unique(subjs_val))} patients")
    print(f"Test set:  {X_test.shape[0]} windows from {len(np.unique(subjs_test))} patients")

    # Calculate class weights for imbalanced clinical distribution
    class_counts = np.bincount(y_train, minlength=3)
    total_samples = len(y_train)
    # Inverse frequency weighting
    class_weights = total_samples / (3.0 * np.maximum(class_counts, 1))
    class_weights_tensor = torch.tensor(class_weights, dtype=torch.float32).to(device)
    print(f"Training Class distribution: {class_counts}")
    print(f"Inverse Class Weights: {class_weights_tensor.cpu().numpy().round(3)}")

    # PyTorch DataLoaders
    train_ds = TensorDataset(torch.tensor(X_train, dtype=torch.float32), torch.tensor(y_train, dtype=torch.long))
    val_ds = TensorDataset(torch.tensor(X_val, dtype=torch.float32), torch.tensor(y_val, dtype=torch.long))
    test_ds = TensorDataset(torch.tensor(X_test, dtype=torch.float32), torch.tensor(y_test, dtype=torch.long))

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False)

    # Initialize model
    print("\n[2/5] Initializing GlucoSense CNN-LSTM Architecture...")
    model = GlucoSenseCNNLSTM(
        in_channels=X_train.shape[-1],
        seq_length=X_train.shape[1],
        conv_filters=64,
        lstm_hidden_size=64,
        lstm_num_layers=2,
        num_classes=3
    ).to(device)

    arch_summary = model.get_architecture_summary()
    print(f"Model Parameters: {arch_summary['total_parameters']:,} trainable")

    criterion = nn.CrossEntropyLoss(weight=class_weights_tensor)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="max", factor=0.5, patience=3)

    # Training Loop
    print("\n[3/5] Starting Training Loop...")
    history = {
        "train_loss": [], "val_loss": [],
        "train_acc": [], "val_acc": [],
        "val_macro_f1": [], "val_balanced_acc": []
    }

    best_val_macro_f1 = -1.0
    best_epoch = -1
    best_model_path = os.path.join(MODELS_DIR, "glucosense_cnn_lstm.pt")
    start_time = time.time()

    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        train_preds, train_targets = [], []

        for batch_x, batch_y in train_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            optimizer.zero_grad()
            logits = model(batch_x)
            loss = criterion(logits, batch_y)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

            running_loss += loss.item() * batch_x.size(0)
            preds = torch.argmax(logits, dim=-1).cpu().numpy()
            train_preds.extend(preds)
            train_targets.extend(batch_y.cpu().numpy())

        epoch_train_loss = running_loss / len(train_loader.dataset)
        epoch_train_acc = accuracy_score(train_targets, train_preds)

        # Validation
        model.eval()
        val_running_loss = 0.0
        val_preds, val_targets = [], []

        with torch.no_grad():
            for batch_x, batch_y in val_loader:
                batch_x, batch_y = batch_x.to(device), batch_y.to(device)
                logits = model(batch_x)
                loss = criterion(logits, batch_y)
                val_running_loss += loss.item() * batch_x.size(0)
                preds = torch.argmax(logits, dim=-1).cpu().numpy()
                val_preds.extend(preds)
                val_targets.extend(batch_y.cpu().numpy())

        epoch_val_loss = val_running_loss / len(val_loader.dataset)
        epoch_val_acc = accuracy_score(val_targets, val_preds)
        epoch_val_bal_acc = balanced_accuracy_score(val_targets, val_preds)
        _, _, epoch_val_macro_f1, _ = precision_recall_fscore_support(
            val_targets, val_preds, average="macro", zero_division=0
        )

        scheduler.step(epoch_val_macro_f1)

        history["train_loss"].append(float(epoch_train_loss))
        history["val_loss"].append(float(epoch_val_loss))
        history["train_acc"].append(float(epoch_train_acc))
        history["val_acc"].append(float(epoch_val_acc))
        history["val_macro_f1"].append(float(epoch_val_macro_f1))
        history["val_balanced_acc"].append(float(epoch_val_bal_acc))

        print(
            f"Epoch {epoch:02d}/{epochs:02d} | "
            f"Train Loss: {epoch_train_loss:.4f} Acc: {epoch_train_acc*100:.1f}% | "
            f"Val Loss: {epoch_val_loss:.4f} Acc: {epoch_val_acc*100:.1f}% "
            f"BalAcc: {epoch_val_bal_acc*100:.1f}% Macro-F1: {epoch_val_macro_f1*100:.1f}%"
        )

        # Checkpoint best model on validation macro-F1
        if epoch_val_macro_f1 > best_val_macro_f1:
            best_val_macro_f1 = epoch_val_macro_f1
            best_epoch = epoch
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_macro_f1": epoch_val_macro_f1,
                "val_acc": epoch_val_acc,
                "val_bal_acc": epoch_val_bal_acc,
                "arch_summary": arch_summary
            }, best_model_path)

    training_duration_s = time.time() - start_time
    print(f"\n[SUCCESS] Training completed in {training_duration_s:.1f}s")
    print(f"Best Checkpoint at Epoch {best_epoch:02d} (Val Macro-F1: {best_val_macro_f1*100:.2f}%) saved to {best_model_path}")

    # Load best checkpoint for final test set evaluation
    checkpoint = torch.load(best_model_path, map_location=device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    # Plot and save training history
    try:
        import matplotlib.pyplot as plt
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
        ax1.plot(history["train_loss"], label="Train Loss")
        ax1.plot(history["val_loss"], label="Val Loss")
        ax1.set_title("Cross-Entropy Loss")
        ax1.set_xlabel("Epoch")
        ax1.set_ylabel("Loss")
        ax1.legend()

        ax2.plot(history["train_acc"], label="Train Accuracy")
        ax2.plot(history["val_acc"], label="Val Accuracy")
        ax2.plot(history["val_macro_f1"], label="Val Macro-F1")
        ax2.set_title("Metrics Progression")
        ax2.set_xlabel("Epoch")
        ax2.set_ylabel("Score")
        ax2.legend()

        plt.tight_layout()
        history_plot_path = os.path.join(RESULTS_DIR, "training_history.png")
        plt.savefig(history_plot_path, dpi=150)
        plt.close()
        print(f"[SAVED] Training curves saved to {history_plot_path}")
    except Exception as e:
        print(f"[WARNING] Could not save training history plot: {e}")

    # Save training history JSON
    with open(os.path.join(RESULTS_DIR, "training_history.json"), "w") as f:
        json.dump(history, f, indent=2)

    return model, history, best_epoch


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train GlucoSense CNN-LSTM")
    parser.add_argument("--epochs", type=int, default=25, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=64, help="Batch size")
    parser.add_argument("--lr", type=float, default=0.001, help="Learning rate")
    args = parser.parse_args()

    train_model(epochs=args.epochs, batch_size=args.batch_size, lr=args.lr)
