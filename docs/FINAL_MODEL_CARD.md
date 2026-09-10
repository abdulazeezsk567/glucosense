# GlucoSense Final Model Card: 1D CNN-LSTM Glycemic Risk Classifier

**Model Name**: GlucoSense Combined 1D CNN-LSTM  
**Version**: 1.0.0 (Research Milestone Baseline)  
**Checkpoint Path**: `models/combined_cnn_lstm.pt` (also referenced as `glucosense_combined_cnn_lstm.pt`)  
**Scaler Path**: `models/combined_scaler.json`  
**License**: Research & Academic Non-Commercial Use Only  
**Release Date**: September 2026  

---

## 1. Intended Use
* **Primary Objective**: Algorithmic research prototype evaluating the feasibility of multi-class glycemic-risk classification directly from continuous glucose monitoring (CGM) telemetry.
* **Intended Users**: Computational biology researchers, machine learning scientists, and biomedical informaticians exploring time-series physiological signal processing.
* **Operating Domain**: Retrospective research datasets with 24-hour CGM monitoring sequences sampled at 5-minute intervals.

---

## 2. Prohibited & Unsupported Uses

> [!CRITICAL]
> **PROHIBITED USES (STRICT MEDICAL SAFETY BOUNDARIES)**:
> - **DO NOT USE FOR CLINICAL DIAGNOSIS**: GlucoSense is NOT cleared by the FDA, CE-MDR, or any medical device regulatory agency. It must never replace standard clinical diagnostic methods (laboratory venous $\text{HbA}_{1\text{c}}$, Fasting Plasma Glucose, or Oral Glucose Tolerance Tests).
> - **DO NOT USE FOR INSULIN DOSING OR TREATMENT ADJUSTMENT**: Predictions must NEVER guide insulin administration, sulfonylurea dosing, or any medical treatment decision.
> - **DO NOT USE FOR ACUTE EMERGENCY DETECTION**: The model is NOT an acute hypoglycemia or ketoacidosis alarm system. It does not predict acute adverse events.
> - **DO NOT USE ON NON-ADULT OR PREGNANT POPULATIONS**: Training cohorts were restricted to non-pregnant adults. Performance on pediatric populations or gestational diabetes is untested and unverified.

---

## 3. Input Requirements & Telemetry Specifications
* **Input Tensor Dimension**: `[Batch Size, 2 Channels, 288 Time Steps]`
* **Channel 0**: Interstitial glucose concentration, normalized using training-only statistics ($\mu = 127.3\text{ mg/dL}, \sigma = 38.6\text{ mg/dL}$):
  $$z_t = \frac{G_t - \mu_{\text{train}}}{\sigma_{\text{train}}}$$
* **Channel 1**: First-order rate of change ($\Delta G / \Delta t$ in $\text{mg/dL/min}$):
  $$\Delta G_t = \frac{G_t - G_{t-1}}{5.0}$$
* **Sequence Horizon**: Exactly 288 consecutive readings representing a contiguous 24-hour window ($24\text{ h} \times 12\text{ readings/h}$).
* **Sampling Interval**: Exactly 5 minutes ($\Delta t = 300\text{ seconds}$).
* **Completeness Threshold**: $\ge 80\%$ valid readings ($\ge 230$ readings). Maximum permitted missing gap for cubic-spline interpolation is 30 minutes.
* **Strict Biomarker Exclusion**: No laboratory biomarkers ($\text{HbA}_{1\text{c}}$, fasting glucose), demographic variables (age, sex, BMI), or clinical histories are permitted as inputs.

---

## 4. Output Classes & Decision Logic
The model outputs calibrated softmax probabilities across 3 mutually exclusive categories:
1. **Class 0: Normal / Healthy Glucose Tolerance**
2. **Class 1: Prediabetes / Impaired Fasting Glucose / Impaired Glucose Tolerance**
3. **Class 2: Type 2 Diabetes Mellitus (T2D)**

*Decision Rule*: Argmax classification:
$$\hat{y} = \arg\max_{c \in \{0, 1, 2\}} P(Y=c \mid \mathbf{x})$$
A patient-level prediction is computed by aggregating probabilities across all valid 24-hour windows for that individual (mean probability pooling or majority vote).

---

## 5. Model Architecture & Specifications
* **Neural Network Family**: 1D Convolutional Neural Network + Bidirectional/Stacked Long Short-Term Memory (1D CNN-LSTM).
* **Layer Composition**:
  * Conv1D Block 1: 64 filters, kernel size 3, padding 1, BatchNorm1d, ReLU.
  * Conv1D Block 2: 64 filters, kernel size 3, padding 1, BatchNorm1d, ReLU.
  * Temporal Max Pooling: Kernel size 2, stride 2 (compresses temporal length from 288 to 144).
  * Recurrent Layer: 2-layer stacked LSTM, hidden dimension 64, dropout 0.2.
  * Temporal Fusion: Concatenation of terminal hidden state $[64]$ and global average pooled hidden states $[64]$ $\rightarrow$ $[128]$.
  * Dense Projection Head: Fully connected layer $(128 \rightarrow 64)$, ReLU, Dropout (0.3).
  * Classification Head: Linear output layer $(64 \rightarrow 3)$.
* **Total Parameters**: **88,325** (88,067 trainable parameters).

---

## 6. Training & Evaluation Datasets
* **Training Datasets**:
  1. **Hall et al. (PLoS Biology 2018)**: 57 participants, Dexcom G4 Platinum, 303 windows.
  2. **CGMacros (PhysioNet 2025)**: 45 participants, Dexcom G6 Pro, 403 windows.
  3. **Combined Cohort**: 102 total participants (53 Normal, 30 Prediabetes, 19 T2D), 706 windows.
* **Evaluation Sets**:
  * Stratified participant-level holdout ($N=16$ test participants: 9 Normal, 4 Prediabetes, 3 T2D; 102 test windows).
  * Cross-cohort zero-shot holdouts (Hall $\rightarrow$ CGMacros and CGMacros $\rightarrow$ Hall).

---

## 7. Performance Highlights
* **Combined Test Patient Accuracy**: **68.75%** (11/16)
* **Combined Test Patient Balanced Accuracy**: **64.81%**
* **Combined Test Patient Macro-F1**: **0.6317**
* **Per-Class Sensitivity (Recall)**:
  * Normal: **77.8%** (7/9)
  * Prediabetes: **50.0%** (2/4)
  * Type 2 Diabetes: **66.7%** (2/3)
* **Per-Class Precision**:
  * Normal: **87.5%** (7/8)
  * Prediabetes: **66.7%** (2/3)
  * Type 2 Diabetes: **40.0%** (2/5)

---

## 8. Known Limitations & Failure Modes
1. **Severe Cohort Size Constraints**: The combined training set contains only 19 T2D participants. The holdout test set contains only 3 T2D individuals. Statistical confidence intervals are wide.
2. **Prediabetes $\leftrightarrow$ T2D Boundary Shift**: Patients with impaired glucose tolerance experiencing significant postprandial glycemic excursions are frequently misclassified as T2D (3 false-positive T2D classifications in the test set).
3. **Sensor Generation Distribution Shift**: Significant distribution shift exists between older fingerstick-calibrated sensors (Dexcom G4) and factory-calibrated devices (Dexcom G6). A model trained exclusively on one hardware platform degrades sharply on another.
4. **Behavioral & Pharmacological Confounding**: Glycemic plateaus are heavily modulated by diet, acute exercise, and antihyperglycemic medications (e.g., metformin, SGLT2 inhibitors). A T2D patient with excellent glycemic control may produce CGM traces indistinguishable from healthy individuals.
5. **No Completed External Validation**: Validation on the independent primary-care MOBILE cohort ($N=175$) could not be completed due to controlled-access legal DUA requirements.

---

## 9. Safety Disclaimer

> **"The current evidence supports GlucoSense as a research prototype demonstrating feasibility of CGM-based glycemic-risk classification. The evidence is insufficient to support clinical diagnostic use."**

---

## 10. METRIC SOURCE OF TRUTH

Every quantitative benchmark associated with this model and its cross-cohort evaluations is grounded in reproducible filesystem artifacts:

| Evaluation Tier / Benchmark | Model Checkpoint | Scaler File | Primary Result Artifact | Sample Protocol | Verified Metrics Summary |
|:---|:---|:---|:---|:---|:---|
| **Combined Overall Test ($N=16$)** | `models/combined_cnn_lstm.pt` (Epoch 31) | `models/combined_scaler.json` | `results/cross_cohort/combined_cohort_results.json` | Stratified holdout (9 Norm, 4 Pre, 3 T2D), 102 24h windows ($T=288$), soft voting | Patient Acc: **68.75%** (11/16), Bal Acc: **64.81%**, Macro-F1: **0.6317**, Norm Recall: **77.8%** (7/9), Pre Recall: **50.0%** (2/4), T2D Recall: **66.7%** (2/3), T2D Precision: **40.0%** (2/5) |
| **Combined (Hall Test Subset, $N=9$)** | `models/combined_cnn_lstm.pt` | `models/combined_scaler.json` | `results/cross_cohort/combined_cohort_results.json` | Hall holdout test (6 Norm, 2 Pre, 1 T2D), 39 24h windows | Patient Acc: **88.89%** (8/9), Bal Acc: **66.67%**, Macro-F1: **0.6410**, T2D Recall: **0.0%** (0/1) |
| **Combined (CGMacros Test Subset, $N=7$)** | `models/combined_cnn_lstm.pt` | `models/combined_scaler.json` | `results/cross_cohort/combined_cohort_results.json` | CGMacros holdout test (3 Norm, 2 Pre, 2 T2D), 63 24h windows | Patient Acc: **42.86%** (3/7), Bal Acc: **44.44%**, Macro-F1: **0.3571**, T2D Recall: **100.0%** (2/2), T2D Precision: **40.0%** (2/5) |
| **CGMacros Standalone Holdout Test** | `models/cgmacros_cnn_lstm_A.pt` (Epoch 18) | `models/cgmacros_scaler.json` | `results/cgmacros/experiment_A_metrics.json` | CGMacros holdout test ($N=7$: 3 Norm, 2 Pre, 2 T2D), 63 24h windows | Patient Acc: **42.86%** (3/7), Bal Acc: **44.44%**, Macro-F1: **0.3571**, T2D Recall: **100.0%** (2/2), T2D Precision: **40.0%** (2/5) |
| **Cross-Cohort Exp A (CGM $\to$ Hall)** | `models/cgmacros_cnn_lstm_A.pt` | `models/cgmacros_scaler.json` | `results/cross_cohort/cross_cohort_A_cgmacros_to_hall.json` | Zero-shot on Hall test ($N=9$: 6 Norm, 2 Pre, 1 T2D), 39 24h windows | Patient Acc: **88.89%** (8/9), Bal Acc: **66.67%**, Macro-F1: **0.6410**, T2D Recall: **0.0%** (0/1), Window Acc: **82.05%** |
| **Cross-Cohort Exp B (Hall $\to$ CGM)** | `models/hall_cnn_lstm_288.pt` | `models/hall_scaler_288.json` | `results/cross_cohort/cross_cohort_B_hall_to_cgmacros.json` | Zero-shot on CGMacros test ($N=7$: 3 Norm, 2 Pre, 2 T2D), 63 24h windows | Patient Acc: **42.86%** (3/7), Bal Acc: **44.44%**, Macro-F1: **0.3333**, T2D Recall: **100.0%** (2/2), T2D Precision: **33.33%** (2/6) |
| **Hall Standalone Baseline (2h Windows)** | `models/glucosense_cnn_lstm.pt` | Train split fitted | `results/patient_level_metrics.json` | Hall holdout test ($N=9$: 6 Norm, 2 Pre, 1 T2D), 2,671 2h windows | Patient Acc: **77.78%** (7/9), Bal Acc: **50.00%**, Macro-F1: **0.5079**, T2D Recall: **0.0%** (0/1) |
| **MOBILE External Validation Attempt** | `models/combined_cnn_lstm.pt` | `models/combined_scaler.json` | `results/mobile_external_validation.json` | $N=175$ trial cohort, $N=0$ locally acquired traces | **Decision D: Insufficient usable data** (Zero fabricated traces) |

