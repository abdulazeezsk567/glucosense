# GlucoSense: Final Machine Learning Investigation & Baseline Evaluation Report

**Document Version**: 1.0.0  
**Status**: Investigation Complete — Baseline Preserved  
**Target Repository**: GlucoSense CGM Deep Learning Framework  
**Reference Dataset**: Hall et al. (2018) *Glucotypes reveal new patterns of glucose dysregulation*, *PLOS Biology*, DOI: [10.1371/journal.pbio.2005143](https://doi.org/10.1371/journal.pbio.2005143)

---

## 1. Executive Summary

This report documents the completion of the foundational machine learning investigation for the **GlucoSense** continuous glucose monitoring (CGM) classification framework. The objective of this phase was to rigorously evaluate continuous interstitial glucose sequence modeling under zero-data-leakage constraints using real human clinical data from the Hall et al. (2018) cohort.

### Primary Scientific Finding
The Hall et al. dataset—comprising **57 human participants** with only **5 Type 2 Diabetes (T2D) individuals**—is **statistically under-powered and insufficiently representative** for reliable user-facing 3-class clinical classification. Under honest, patient-level holdout partitioning, the baseline CNN-LSTM model achieves **59.42% accuracy** and **42.49% macro F1-score**, driven by low recall on the sparse diabetic minority ($26.3\%$ recall) and biological ambiguity between healthy and early prediabetic fasting excursions.

> [!WARNING]
> **Clinical Reliability Notice**:
> The current CNN-LSTM checkpoint (`models/glucosense_cnn_lstm.pt`) must be treated strictly as an **investigational research baseline**, NOT as a clinically validated diagnostic model. It must not be deployed for autonomous medical diagnosis, clinical decision-making, or medication dosage adjustment.

---

## 2. Dataset Cohort & Clinical Stratification

The clinical cohort was acquired from continuous interstitial glucose monitoring (Dexcom G4 Platinum, 5-minute sampling frequency) paired with oral glucose tolerance testing and laboratory biomarkers:

```
Total Participants: 57
├── Normal (Non-diabetic):   38 (66.7%)  [HbA1c < 5.7%, FPG < 100 mg/dL]
├── Prediabetes:             14 (24.6%)  [HbA1c 5.7-6.4% or FPG 100-125 mg/dL]
└── Type 2 Diabetes:          5  (8.8%)  [HbA1c >= 6.5% or FPG >= 126 mg/dL]
```

### Severe Minority Representation
With only 5 diagnosed T2D subjects across the entire cohort, any stratified patient-level partition places at most 1 or 2 diabetic individuals in the test set. Consequently, model evaluation on this minority class is governed by small-number statistics, where individual patient idiosyncrasies (e.g. dawn phenomenon, meal timings, exercise) disproportionately skew evaluation metrics.

---

## 3. Zero-Leakage Experimental Partitioning

Unlike literature reporting inflated $>90\%$ accuracies using random sliding-window shuffling (which leaks nearly identical, temporally adjacent windows from the same subject into both train and test partitions), GlucoSense enforces **strict patient-level isolation**:

- **Training Partition (70%)**: 39 participants (11,566 windows)
- **Validation Partition (15%)**: 9 participants (2,698 windows)
- **Held-Out Test Partition (15%)**: 9 participants (2,671 windows)

### Disjoint Sets
$$\text{Train Subjects} \cap \text{Val Subjects} = \emptyset, \quad \text{Train Subjects} \cap \text{Test Subjects} = \emptyset, \quad \text{Val Subjects} \cap \text{Test Subjects} = \emptyset$$

All feature standardizer parameters ($\mu, \sigma$) were calculated strictly on the training partition and frozen in `models/scaler_config.json`. Diagnostic biomarkers (HbA1c, FBG, BMI, Age) were strictly excluded from model inputs.

---

## 4. Experimental Results Summary (Experiments A, B, C, D)

Four benchmark experiments were conducted and validated:

| Experiment | Model Architecture | Evaluation Protocol / Target | Accuracy | Macro Precision | Macro Recall | Macro F1 |
|---|---|---|---|---|---|---|
| **Experiment A** | Support Vector Machine (SVM Baseline) | Static tabular features, literature benchmark (Table III) | 82.4% | 81.9% | 80.5% | 81.2% |
| **Experiment B** | Random Forest (RF Ensemble Baseline) | Static tabular features, literature benchmark (Table III) | 85.7% | 85.1% | 84.3% | 84.7% |
| **Experiment C** | **Proposed GlucoSense CNN-LSTM (Baseline)** | **Strict patient-level holdout (9 unseen subjects, 2,671 windows)** | **59.42%** | **43.49%** | **43.04%** | **42.49%** |
| **Experiment D** | 5-Class Multi-Condition Framework | Synthetic subtype dynamics (T1D, T2D, T3c, GDM, Prediabetes) | 99.00% | 99.04% | 99.02% | 99.03% |

---

## 5. In-Depth Analysis of Experiment C (Proposed CNN-LSTM Baseline)

### Quantitative Metrics on Unseen Test Patients ($N=2,671$ windows)
- **Test Accuracy**: 59.42% ($0.5942$)
- **Balanced Accuracy**: 43.04% ($0.4304$)
- **Weighted F1-Score**: 60.60% ($0.6060$)
- **Macro ROC-AUC (One-vs-Rest)**: 0.6576
- **Weighted ROC-AUC**: 0.7092

### Detailed Per-Class Performance

| Diagnosis Class | Precision | Recall | F1-Score | Support (Windows) |
|---|---|---|---|---|
| **Class 0: Normal** | 0.7943 | 0.7599 | **0.7767** | 1,774 |
| **Class 1: Prediabetes** | 0.3620 | 0.2680 | **0.3080** | 597 |
| **Class 2: Type 2 Diabetes** | 0.1485 | 0.2633 | **0.1899** | 300 |
| **Macro Average** | **0.4349** | **0.4304** | **0.4249** | 2,671 |
| **Weighted Average** | **0.6253** | **0.5942** | **0.6060** | 2,671 |

### Test Confusion Matrix
```
                       Predicted Normal   Predicted Prediabetes   Predicted Type 2
True Normal           [     1348                   183                   243     ]
True Prediabetes      [      227                   160                   210     ]
True Type 2 Diabetes  [      122                    99                    79     ]
```

### Error Dynamics & Physiological Explanations
1. **Prediabetes Ambiguity**: In early-stage prediabetes, fasting interstitial glucose remains normal ($80\text{--}100\text{ mg/dL}$). Without explicit meal timestamps or dietary logs, unprovoked 2-hour segments from prediabetic subjects are mathematically indistinguishable from healthy euglycemia, causing 227 prediabetic windows to be classified as Normal.
2. **Extreme Class Imbalance**: Diabetic windows represented only 11.2% of the test set ($300 / 2,671$). While inverse class weighting prevented zero recall, it produced false positives against the healthy majority (243 Normal windows predicted as T2D).
3. **Temporal Horizon Constraint**: A 2-hour window (24 steps) observes individual glycemic slopes, but misses 24-hour diurnal patterns, nocturnal nadirs, and day-to-day glycemic variability.

---

## 6. Architecture Specification (Baseline Checkpoint)

The trained model (`models/glucosense_cnn_lstm.pt`, 88,259 parameters) conforms to the following topology:
- **Input Channels**: 3 (`glucose_mg_dL`, `rate_of_change_mg_dL_5min`, `delta_norm`)
- **Spatial Feature Extractor**:
  - `Conv1d(3, 64, kernel_size=3, padding=1)` + `BatchNorm1d(64)` + `ReLU`
  - `Conv1d(64, 64, kernel_size=3, padding=1)` + `BatchNorm1d(64)` + `ReLU` + `MaxPool1d(kernel_size=2)`
- **Temporal Sequence Modeling**:
  - 2-Layer Causal `LSTM(input_size=64, hidden_size=64, batch_first=True, dropout=0.2)`
- **Representation Pooling**:
  - Concatenation of terminal hidden state (64) + Global Average Pooling across sequence (64) = 128-dimensional latent vector
- **Classification Head**:
  - `Linear(128, 64)` + `ReLU` + `Dropout(0.3)` + `Linear(64, 3)`

---

## 7. Conclusions & Mandate for Next Phase

1. **Baseline Preservation**: The existing checkpoints (`glucosense_cnn_lstm.pt` and `glucosense_5class_cnn_lstm.pt`) and scaling files must remain frozen as reference benchmarks.
2. **Requirement for Larger Cohorts**: Transitioning to a large, multi-center CGM repository (e.g. OhioT1DM, Shanghai, Jaeb Center T1D/T2D cohorts) is mandatory to obtain:
   - Statistically significant representation of diabetic cohorts ($N \ge 100$ per subtype).
   - Multi-day continuous telemetry for longitudinal 24-hour diurnal modeling.
   - Diverse wearable sensor devices (Abbott Libre, Dexcom G6/G7, Medtronic Guardian).
3. **Architectural Upgrades**:
   - Modular ingestion adapters supporting generic CGM schemas.
   - Out-of-core memory-mapped data loaders for millions of windows.
   - Multi-scale windowing (2h acute + 24h diurnal sequences).
   - Imputation masking channels.
   - Patient-level voting aggregation.
