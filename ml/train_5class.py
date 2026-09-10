"""
GlucoSense: Training Pipeline for 5-Class Diabetes Classification
Matches Table II Hyperparameters from Conference Paper:
- CNN Filters: 32, 64
- Kernel Size: 3
- Activation: ReLU
- LSTM Units: 128
- Batch Size: 32
- Optimizer: Adam
- Loss Function: Categorical Cross-Entropy
- Target Classes: Type 1, Type 2, Type 3c, Gestational, Prediabetes
"""

import os
import json
import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score, precision_score, recall_score

import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.model import GlucoSenseCNNLSTM
from ml.dataset_5class import CLASSES_5
PROCESSED_DIR = os.path.join(PROJECT_ROOT, "data", "processed")
MODELS_DIR = os.path.join(PROJECT_ROOT, "models")
RESULTS_DIR = os.path.join(PROJECT_ROOT, "results")


def train_5class_model(epochs: int = 30, batch_size: int = 32, lr: float = 0.001, seed: int = 42):
    torch.manual_seed(seed)
    np.random.seed(seed)

    # 1. Load data
    train_data = np.load(os.path.join(PROCESSED_DIR, "5class_train.npz"))
    val_data = np.load(os.path.join(PROCESSED_DIR, "5class_val.npz"))
    test_data = np.load(os.path.join(PROCESSED_DIR, "5class_test.npz"))

    train_X, train_y = torch.tensor(train_data["X"], dtype=torch.float32), torch.tensor(train_data["y"], dtype=torch.long)
    val_X, val_y = torch.tensor(val_data["X"], dtype=torch.float32), torch.tensor(val_data["y"], dtype=torch.long)
    test_X, test_y = torch.tensor(test_data["X"], dtype=torch.float32), torch.tensor(test_data["y"], dtype=torch.long)

    train_loader = DataLoader(TensorDataset(train_X, train_y), batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(TensorDataset(val_X, val_y), batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(TensorDataset(test_X, test_y), batch_size=batch_size, shuffle=False)

    # 2. Instantiate Model conforming to Paper Table II
    model = GlucoSenseCNNLSTM(
        in_channels=3,
        seq_length=24,
        conv_filters=64,
        conv_kernel_size=3,
        lstm_hidden_size=128,
        lstm_num_layers=2,
        lstm_dropout=0.2,
        dense_units=64,
        dropout_rate=0.25,
        num_classes=5
    )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=4)

    best_val_loss = float("inf")
    best_weights_path = os.path.join(MODELS_DIR, "glucosense_5class_cnn_lstm.pt")
    
    history = {"train_loss": [], "val_loss": [], "val_acc": []}

    print(f"Starting 5-Class CNN-LSTM Training on {device}...")
    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        for X_batch, y_batch in train_loader:
            X_batch, y_batch = X_batch.to(device), y_batch.to(device)
            optimizer.zero_grad()
            logits = model(X_batch)
            loss = criterion(logits, y_batch)
            loss.backward()
            optimizer.step()
            running_loss += loss.item() * len(y_batch)

        epoch_train_loss = running_loss / len(train_X)

        # Validation
        model.eval()
        val_loss = 0.0
        val_correct = 0
        with torch.no_grad():
            for X_val, y_val in val_loader:
                X_val, y_val = X_val.to(device), y_val.to(device)
                logits = model(X_val)
                loss = criterion(logits, y_val)
                val_loss += loss.item() * len(y_val)
                preds = torch.argmax(logits, dim=-1)
                val_correct += (preds == y_val).sum().item()

        epoch_val_loss = val_loss / len(val_X)
        epoch_val_acc = val_correct / len(val_X)

        scheduler.step(epoch_val_loss)

        history["train_loss"].append(epoch_train_loss)
        history["val_loss"].append(epoch_val_loss)
        history["val_acc"].append(epoch_val_acc)

        if epoch_val_loss < best_val_loss:
            best_val_loss = epoch_val_loss
            torch.save(model.state_dict(), best_weights_path)
            mark = " [Best Saved]"
        else:
            mark = ""

        if epoch % 5 == 0 or epoch == epochs:
            print(f"Epoch {epoch:02d}/{epochs} | Train Loss: {epoch_train_loss:.4f} | Val Loss: {epoch_val_loss:.4f} | Val Acc: {epoch_val_acc*100:.2f}%{mark}")

    # 3. Final Test Evaluation on Best Weights
    model.load_state_dict(torch.load(best_weights_path))
    model.eval()

    all_preds = []
    all_targets = []
    with torch.no_grad():
        for X_test, y_test in test_loader:
            X_test = X_test.to(device)
            logits = model(X_test)
            preds = torch.argmax(logits, dim=-1).cpu().numpy()
            all_preds.extend(preds)
            all_targets.extend(y_test.numpy())

    all_preds = np.array(all_preds)
    all_targets = np.array(all_targets)

    test_acc = accuracy_score(all_targets, all_preds)
    test_prec = precision_score(all_targets, all_preds, average="macro")
    test_rec = recall_score(all_targets, all_preds, average="macro")
    test_f1 = f1_score(all_targets, all_preds, average="macro")
    cm = confusion_matrix(all_targets, all_preds)

    print(f"\n==========================================")
    print(f"5-CLASS CNN-LSTM EVALUATION RESULTS:")
    print(f"Accuracy:  {test_acc * 100:.2f}%")
    print(f"Precision: {test_prec * 100:.2f}%")
    print(f"Recall:    {test_rec * 100:.2f}%")
    print(f"F1-Score:  {test_f1 * 100:.2f}%")
    print(f"==========================================")

    # Save metrics JSON
    metrics_summary = {
        "model_name": "GlucoSense-5Class-CNNLSTM",
        "num_classes": 5,
        "classes": CLASSES_5,
        "test_accuracy": round(float(test_acc), 4),
        "test_precision": round(float(test_prec), 4),
        "test_recall": round(float(test_rec), 4),
        "test_macro_f1": round(float(test_f1), 4),
        "confusion_matrix": cm.tolist()
    }
    with open(os.path.join(RESULTS_DIR, "5class_metrics.json"), "w") as f:
        json.dump(metrics_summary, f, indent=2)

    # Save metadata JSON
    with open(os.path.join(MODELS_DIR, "5class_model_metadata.json"), "w") as f:
        json.dump(metrics_summary, f, indent=2)

    # Plot and save confusion matrix
    fig, ax = plt.subplots(figsize=(8, 6))
    im = ax.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    ax.figure.colorbar(im, ax=ax)
    ax.set(
        xticks=np.arange(cm.shape[1]),
        yticks=np.arange(cm.shape[0]),
        xticklabels=["T1D", "T2D", "T3c", "GDM", "Pre"],
        yticklabels=["T1D", "T2D", "T3c", "GDM", "Pre"],
        title="5-Class Diabetes Classification Confusion Matrix",
        ylabel="True Condition",
        xlabel="Predicted Condition"
    )
    thresh = cm.max() / 2.
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, format(cm[i, j], 'd'),
                    ha="center", va="center",
                    color="white" if cm[i, j] > thresh else "black")
    fig.tight_layout()
    plt.savefig(os.path.join(RESULTS_DIR, "5class_confusion_matrix.png"), dpi=150)
    plt.close()
    print("5-Class Confusion Matrix plot saved to results/5class_confusion_matrix.png")


if __name__ == "__main__":
    train_5class_model(epochs=30)
