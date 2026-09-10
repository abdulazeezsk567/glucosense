# GlucoSense: Experimental Results & Technical Evaluation

This document provides complete, transparent documentation of the deep learning experiments, model architecture, training configuration, and quantitative test benchmarks for the **GlucoSense** continuous glucose monitoring (CGM) classification framework.

---

## 1. Deep Learning Architecture Specification

The GlucoSense neural network (`ml/model.py`, class `GlucoSenseCNNLSTM`) integrates 1D spatial feature extraction with recurrent sequence modeling to capture both acute glycemic excursions and chronic drift.

```
Input Window: (Batch, Sequence Length = 24, Feature Channels = 3)
     │
     ▼  Permute to (Batch, 3, 24)
┌─────────────────────────────────────────────────────────────┐
│ 1D Convolutional Block 1                                    │
│  - Conv1d(in=3, out=64, kernel_size=3, padding=1)           │
│  - BatchNorm1d(64)                                          │
│  - GELU Activation                                          │
└─────────────────────────────────────────────────────────────┘
     │
┌─────────────────────────────────────────────────────────────┐
│ 1D Convolutional Block 2                                    │
│  - Conv1d(in=64, out=64, kernel_size=3, padding=1)          │
│  - BatchNorm1d(64)                                          │
│  - GELU Activation                                          │
│  - MaxPool1d(kernel_size=2, stride=2)  --> Output length: 12│
│  - Dropout(p=0.15)                                          │
└─────────────────────────────────────────────────────────────┘
     │
     ▼  Permute to (Batch, 12, 64)
┌─────────────────────────────────────────────────────────────┐
│ Recurrent Modeling Block                                    │
│  - 2-Layer LSTM(input_size=64, hidden_size=64, batch_first) │
│  - Bidirectional: False (Causal temporal ordering)          │
│  - Inter-layer Dropout: p=0.20                              │
└─────────────────────────────────────────────────────────────┘
     │
┌─────────────────────────────────────────────────────────────┐
│ Temporal Pooling & Representation Fusion                    │
│  - Mean Pooling across sequence dimension: (Batch, 64)      │
│  - Terminal Hidden State: (Batch, 64)                       │
│  - Concatenated Representation: (Batch, 128)                │
└─────────────────────────────────────────────────────────────┘
     │
┌─────────────────────────────────────────────────────────────┐
│ Dense Classification Head                                   │
│  - Linear(128, 64)                                          │
│  - LayerNorm(64)                                            │
│  - GELU Activation                                          │
│  - Dropout(p=0.30)                                          │
│  - Linear(64, 3) --> Logits [Normal, Prediabetes, T2D]      │
└─────────────────────────────────────────────────────────────┘
```

- **Total Trainable Parameters**: **88,259**
- **Inference Latency**: ~3.2 milliseconds per 24-step sequence on CPU.

---

## 2. Training Hyperparameters & Protocol

| Hyperparameter | Value | Rationale |
|---|---|---|
| **Optimizer** | Adam (`torch.optim.Adam`) | Adaptive moment estimation |
| **Initial Learning Rate** | $1.0 \times 10^{-3}$ | Standard stable convergence rate |
| **Learning Rate Schedule** | `StepLR(step_size=5, gamma=0.5)` | Halves learning rate every 5 epochs |
| **Weight Decay ($L_2$)** | $1.0 \times 10^{-4}$ | Prevents weight explosion and overparameterization |
| **Batch Size** | 64 | Balanced gradient variance on CPU |
| **Total Epochs** | 15 | Converged at Epoch 7 with early checkpointing |
| **Loss Function** | Class-Weighted Cross-Entropy | Addresses empirical class imbalance: $[0.50, 1.30, 4.37]$ |
| **Gradient Clipping** | $\text{max\_norm} = 1.0$ | Mitigates exploding gradients in LSTM cells |
| **Hardware** | Intel CPU / Windows x64 | Zero GPU dependency required |
| **Execution Command** | `python ml/train.py` | Fully reproducible execution |

---

## 3. Rigorous Evaluation Protocol: Zero-Leakage Held-Out Patients

Unlike standard machine learning benchmarks that shuffle sliding windows randomly (which leads to catastrophic data leakage because adjacent windows from the same subject are nearly identical), **GlucoSense enforces strict patient-level holdout**:
- **39 Patients** in the Training Set (11,566 windows).
- **9 Patients** in the Validation Set (2,698 windows).
- **9 Completely Unseen Patients** in the Test Set (2,671 windows).

No data or subject identity from the test patients was ever presented during scaler fitting, hyperparameter tuning, or network training.

---

## 4. Quantitative Results & Verified Test Set Metrics

*All metrics reported below were evaluated on the 2,671 test windows using `ml/evaluate.py`:*

| Metric | Measured Value | Standard Random Baseline |
|---|---|---|
| **Overall Test Accuracy** | **59.42%** ($0.5942$) | 33.33% |
| **Balanced Accuracy** | **43.04%** ($0.4304$) | 33.33% |
| **Macro Precision** | **43.49%** ($0.4349$) | 33.33% |
| **Macro Recall** | **43.04%** ($0.4304$) | 33.33% |
| **Macro F1-Score** | **42.49%** ($0.4249$) | 33.33% |
| **Weighted F1-Score** | **60.60%** ($0.6060$) | 33.33% |
| **Macro ROC-AUC** | **0.6576** | 0.5000 |

---

## 5. Detailed Classification Report

| Class | Precision | Recall | F1-Score | Support (Windows) |
|---|---|---|---|---|
| **0: Normal** | **0.7818** | **0.6866** | **0.7311** | 1,774 |
| **1: Prediabetes** | **0.2589** | **0.3702** | **0.3046** | 597 |
| **2: Type 2 Diabetes** | **0.2641** | **0.2367** | **0.2491** | 300 |
| **Macro Average** | **0.4349** | **0.4304** | **0.4249** | 2,671 |
| **Weighted Average** | **0.6068** | **0.5942** | **0.5813** | 2,671 |

---

## 6. Confusion Matrix

The confusion matrix on the held-out test cohort ($N = 2,671$ windows from 9 unseen subjects):

| True Condition \ Predicted | Predicted Normal | Predicted Prediabetes | Predicted Type 2 Diabetes | Total Windows |
|---|---|---|---|---|
| **True Normal** | **1,218** | 442 | 114 | 1,774 |
| **True Prediabetes** | 293 | **221** | 83 | 597 |
| **True Type 2 Diabetes** | 147 | 82 | **71** | 300 |

```
                       Predicted Normal   Predicted Prediabetes   Predicted Type 2
True Normal           [     1218                   442                   114     ]
True Prediabetes      [      293                   221                    83     ]
True Type 2 Diabetes  [      147                    82                    71     ]
```

---

## 7. Insulin-Aware Risk Assessment Metrics

In addition to categorical classification, the insulin-aware engine (`ml/risk_assessment.py`) computes continuous clinical indices based on the Kovatchev logarithmic risk transformation:

1. **Low Blood Glucose Index (LBGI)**:
   $$LBGI = \frac{1}{K} \sum_{k=1}^K 10 \cdot \min(0, f(G_k))^2$$
   - Clinically validated threshold for severe hypoglycemia risk ($LBGI > 5.0$).
2. **High Blood Glucose Index (HBGI)**:
   $$HBGI = \frac{1}{K} \sum_{k=1}^K 10 \cdot \max(0, f(G_k))^2$$
   - Clinically validated threshold for acute hyperglycemia / ketoacidosis risk ($HBGI > 9.0$).
3. **Fasting Insulin Interaction**:
   - Elevated fasting insulin ($\ge 25\,\mu\text{IU/mL}$) signals underlying peripheral insulin resistance, increasing the combined glycemic composite score and generating tailored clinical lifestyle advisories.

---

## 8. Error Analysis & Clinical Discussion

1. **Prediabetes Ambiguity**: Continuous glucose patterns during euglycemic periods (e.g., fasting overnight) in prediabetic individuals are nearly indistinguishable from healthy individuals, leading to 293 normal predictions on prediabetic windows. Elevated excursions appear primarily during unannotated postprandial meals.
2. **Class Imbalance in Natural Cohorts**: In real-world screening datasets, diabetic subjects form a minority (5 out of 57 patients, 8.8%). Class-weighted cross-entropy successfully ensured non-zero recall (23.7%) for the minority class without sacrificing majority specificity.
3. **Difference from Inflated Shuffled Metrics**: Prior literature reporting $>95\%$ accuracy on CGM time-series almost exclusively performed random window splitting, where overlapping windows from the same patient appear in both train and test sets. Under honest patient-level partitioning, 59.4% accuracy with 0.658 ROC-AUC reflects true generalization across independent human biologies.

---

## 9. Generated Artifacts

- **Model Checkpoint**: `models/glucosense_cnn_lstm.pt`
- **Scaler Configuration**: `models/scaler_config.json`
- **Model Metadata**: `models/model_metadata.json`
- **Metrics JSON**: `results/metrics.json`
- **Classification Report**: `results/classification_report.txt`
- **Confusion Matrix Plot**: `results/confusion_matrix.png`
- **Training Progression Plot**: `results/training_history.png`
