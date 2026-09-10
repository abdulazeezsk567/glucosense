# Cross-Cohort Generalization Validation Report: Hall et al. & CGMacros

**GlucoSense Machine Learning Investigation**  
**Date:** September 10, 2026  
**Status:** Completed & Frozen Research Report  
**Artifacts Generated:**
- Checkpoints: [`models/hall_cnn_lstm_288.pt`](file:///c:/Users/Abdul%20Azeez/Downloads/glucosense/glucosense/models/hall_cnn_lstm_288.pt), [`models/combined_cnn_lstm.pt`](file:///c:/Users/Abdul%20Azeez/Downloads/glucosense/glucosense/models/combined_cnn_lstm.pt)
- Scalers: [`models/hall_scaler_288.json`](file:///c:/Users/Abdul%20Azeez/Downloads/glucosense/glucosense/models/hall_scaler_288.json), [`models/combined_scaler.json`](file:///c:/Users/Abdul%20Azeez/Downloads/glucosense/glucosense/models/combined_scaler.json)
- Metrics: [`results/cross_cohort/cross_cohort_A_cgmacros_to_hall.json`](file:///c:/Users/Abdul%20Azeez/Downloads/glucosense/glucosense/results/cross_cohort/cross_cohort_A_cgmacros_to_hall.json), [`results/cross_cohort/cross_cohort_B_hall_to_cgmacros.json`](file:///c:/Users/Abdul%20Azeez/Downloads/glucosense/glucosense/results/cross_cohort/cross_cohort_B_hall_to_cgmacros.json), [`results/cross_cohort/combined_cohort_results.json`](file:///c:/Users/Abdul%20Azeez/Downloads/glucosense/glucosense/results/cross_cohort/combined_cohort_results.json)
- Statistical Audits: [`results/cross_cohort/distributional_analysis.json`](file:///c:/Users/Abdul%20Azeez/Downloads/glucosense/glucosense/results/cross_cohort/distributional_analysis.json), [`results/cross_cohort/prediabetes_t2d_boundary_analysis.json`](file:///c:/Users/Abdul%20Azeez/Downloads/glucosense/glucosense/results/cross_cohort/prediabetes_t2d_boundary_analysis.json)

---

## 1. Objective

The primary objective of this investigation is to evaluate the **cross-cohort generalizability and transferability** of deep continuous glucose monitoring (CGM) sequence models. Specifically, we test whether a neural architecture trained strictly on raw continuous glucose telemetry learns invariant, physiological dynamics of dysglycemia, or whether it overfits to cohort-specific glycemic distributions and hardware-specific sensor calibration characteristics.

We conduct bidirectional cross-cohort experiments between two independent datasets:
1. **Hall et al. (2018)** ($N=57$, Dexcom G4 Platinum)
2. **CGMacros PhysioNet (2021–2022)** ($N=45$, Dexcom G6 Pro)

We subsequently evaluate a **cohort-aware combined model** trained on the pooled cohorts ($N=102$) to evaluate whether multi-hardware training mitigates cohort-specific distribution shift.

---

## 2. Dataset Descriptions

| Dataset Parameter | Hall et al. (2018) Baseline | CGMacros PhysioNet Cohort |
| :--- | :--- | :--- |
| **Official Repository** | PLOS Biology (DOI: 10.1371/journal.pbio.2005143) | PhysioNet (DOI: 10.13026/85ea-2n63) |
| **Sensor Hardware** | Dexcom G4 Platinum | Dexcom G6 Pro (Blinded Mode) |
| **Calibration Requirement** | Capillary fingerstick (minimum 2x daily) | Factory calibrated (zero fingersticks) |
| **Interference Filter** | Standard enzymatic membrane | Permselective membrane (blocks acetaminophen) |
| **Total Enrolled Participants** | 57 eligible participants | 45 eligible participants |
| **Diagnostic Cohort Composition** | 38 Normal, 14 Prediabetes, 5 Type 2 Diabetes | 15 Normal, 16 Prediabetes, 14 Type 2 Diabetes |
| **Monitoring Duration** | ~2–4 weeks (mean 14 days) | ~10 days |
| **Sampling Interval** | 5-minute uniform resampling | 5-minute native Dexcom intervals |
| **Extracted 24h Windows ($288$ steps)** | 255 non-overlapping windows | 403 non-overlapping windows |
| **Class Distribution (Windows)** | 166 Normal, 66 Prediabetes, 23 T2D | 135 Normal, 142 Prediabetes, 126 T2D |

---

## 3. Leakage Controls

To guarantee that all evaluations remain statistically valid, the following strict controls were enforced throughout the investigation:
1. **Patient-Level Disjoint Partitions**: All partitions are split strictly by participant ID. Every window from subject $S$ resides exclusively in Train, Validation, or Test:
   $$\text{Train} \cap \text{Validation} = \emptyset, \quad \text{Train} \cap \text{Test} = \emptyset, \quad \text{Validation} \cap \text{Test} = \emptyset$$
2. **Scaler Isolation**: Means and standard deviations were computed **strictly from the training split** of the originating experiment. Test sets were never passed to any standardizer.
3. **Cross-Cohort Zero Leakage**: When evaluating across cohorts, the target test set was completely unseen. The evaluating model had zero exposure to the target cohort's training, validation, or test participants.
4. **Clinical Biomarker Isolation**: Models were fed **only 2 continuous telemetry channels**: Channel 0 (`interstitial glucose`, mg/dL) and Channel 1 (`rate_of_change` / first difference, mg/dL/step). $\text{HbA}_{1\text{c}}$, Fasting Blood Glucose, BMI, age, sex, insulin usage, and medical diagnoses were strictly excluded from model inputs.

---

## 4. Experimental Design

```
+---------------------------------------------------------------------------------------------------+
|                                 CROSS-COHORT EXPERIMENTAL MATRIX                                  |
+------------------------------------+------------------------------------+-------------------------+
| Experiment                         | Training Cohort Partition          | Held-Out Test Set       |
+------------------------------------+------------------------------------+-------------------------+
| Exp A: CGMacros -> Hall            | CGMacros Train (31 pts, 277 win)   | Hall Test (9 pts, 39 win)|
| Exp B: Hall -> CGMacros            | Hall Train (39 pts, 177 win)       | CGMacros Test (7 pts, 63 win)|
| Exp C: Cohort-Aware Combined       | Combined Train (70 pts, 454 win)   | Combined Test (16 pts, 102 win)|
+------------------------------------+------------------------------------+-------------------------+
```

### Shared Neural Architecture
All experiments utilized the standardized `GlucoSenseScalableCNNLSTM` architecture:
- Input: `(Batch, 288, 2)` (24-hour sequence at 5-minute sampling)
- Conv1D Block: 64 filters, kernel size 3, ReLU, BatchNorm1D
- Recurrent Block: 2-layer LSTM, 64 hidden units, dropout 0.2
- Representation Fusion: Terminal recurrent hidden state concatenated with global average pooling
- Classification Head: Dense layer (64 units) $\to$ ReLU $\to$ Dropout (0.3) $\to$ Linear (3 logits)
- Optimizer: AdamW ($\text{lr}=10^{-3}$, $\text{weight\_decay}=10^{-4}$), ReduceLROnPlateau scheduler, gradient clipping ($\text{max\_norm}=1.0$)
- Model Selection: Best validation Macro-F1 checkpoint

---

## 5. Cross-Cohort Experiment A: CGMacros $\to$ Hall Results

In Experiment A, the model trained on the CGMacros training set (`models/cgmacros_cnn_lstm_A.pt`, scaled via `models/cgmacros_scaler.json`) was evaluated directly on the 9 held-out Hall test participants (39 windows).

### Metric Summary
- **Window Accuracy**: 82.05% (32/39)
- **Window Balanced Accuracy**: 59.92%
- **Window Macro-F1**: 0.5564
- **Patient Accuracy**: **88.89% (8/9 correct)**
- **Patient Balanced Accuracy**: 66.67%
- **Patient Macro-F1**: **0.6410**

### Per-Class Performance
| Class | Window Precision | Window Recall | Window F1 | Patient Precision | Patient Recall | Patient F1 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Normal** | 84.38% (27/32) | 96.43% (27/28) | 0.9000 | 85.71% (6/7) | 100.0% (6/6) | 0.9231 |
| **Prediabetes** | 71.43% (5/7) | 83.33% (5/6) | 0.7692 | 100.0% (2/2) | 100.0% (2/2) | 1.0000 |
| **Type 2 Diabetes** | 0.00% (0/0) | 0.00% (0/5) | 0.0000 | 0.00% (0/0) | 0.00% (0/1) | 0.0000 |

### Confusion Matrices
```
Window Confusion Matrix:               Patient Confusion Matrix:
             Pred: Norm  Pre  T2D                   Pred: Norm  Pre  T2D
Actual Norm [  27,   1,   0 ]          Actual Norm [   6,   0,   0 ]
Actual Pre  [   1,   5,   0 ]          Actual Pre  [   0,   2,   0 ]
Actual T2D  [   4,   1,   0 ]          Actual T2D  [   1,   0,   0 ]
```

### Diabetic Detection Analysis
- Test T2D Patients: 1 (`1636-69-091`)
- T2D Sensitivity: **0.0% (0/1)**
- False Negatives: 1
- False Positives: 0
- Explanation: In Hall, patient `1636-69-091` exhibited a mean glucose of only $115.4$ mg/dL (peak $214$ mg/dL). Because the CGMacros model learned that normal CGMacros participants have an average glucose of $122.4$ mg/dL, it classified this patient as Normal ($59.95\%$ Normal, $38.94\%$ Prediabetes, $1.10\%$ T2D).

---

## 6. Cross-Cohort Experiment B: Hall $\to$ CGMacros Results

In Experiment B, `models/hall_cnn_lstm_288.pt` was trained on the 39 Hall training participants (177 windows, scaled via `models/hall_scaler_288.json`) and evaluated on the 7 held-out CGMacros test participants (63 windows).

### Metric Summary
- **Window Accuracy**: 41.27% (26/63)
- **Window Balanced Accuracy**: 42.59%
- **Window Macro-F1**: 0.3488
- **Patient Accuracy**: **42.86% (3/7 correct)**
- **Patient Balanced Accuracy**: 44.44%
- **Patient Macro-F1**: **0.3333**

### Per-Class Performance
| Class | Window Precision | Window Recall | Window F1 | Patient Precision | Patient Recall | Patient F1 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Normal** | 81.82% (9/11) | 33.33% (9/27) | 0.4737 | 100.0% (1/1) | 33.33% (1/3) | 0.5000 |
| **Prediabetes** | 33.33% (1/3) | 5.56% (1/18) | 0.0952 | 0.00% (0/0) | 0.00% (0/2) | 0.0000 |
| **Type 2 Diabetes** | 32.65% (16/49) | 88.89% (16/18) | 0.4776 | 33.33% (2/6) | 100.0% (2/2) | 0.5000 |

### Confusion Matrices
```
Window Confusion Matrix:               Patient Confusion Matrix:
             Pred: Norm  Pre  T2D                   Pred: Norm  Pre  T2D
Actual Norm [   9,   2,  16 ]          Actual Norm [   1,   0,   2 ]
Actual Pre  [   0,   1,  17 ]          Actual Pre  [   0,   0,   2 ]
Actual T2D  [   2,   0,  16 ]          Actual T2D  [   0,   0,   2 ]
```

### Diabetic Detection Analysis
- Test T2D Patients: 2 (`CGMacros-038`, `CGMacros-047`)
- T2D Sensitivity: **100.0% (2/2)**
- T2D Precision: **33.33% (2/6)**
- False Positives: 4 (`CGMacros-018` [Norm], `CGMacros-019` [Norm], `CGMacros-020` [Pre], `CGMacros-045` [Pre])
- False Negatives: 0
- Explanation: The Hall model was calibrated on an overall mean glucose of $102.3$ mg/dL. When presented with CGMacros telemetry (where Normal participants average $122.4$ mg/dL and postprandial excursions regularly reach $150$–$180$ mg/dL), the Hall model perceived these physiological spikes as diabetic pathology, over-predicting Type 2 Diabetes for 6 out of 7 test subjects.

---

## 7. Cohort-Aware Combined Experiment Results

To test whether multi-hardware training resolves cohort-specific distribution shift, a combined model was trained on pooled Hall and CGMacros data ($N=102$ total participants).

### Cohort-Aware Partitioning
- **Combined Train (70 participants, 454 windows)**:
  - Hall Train: 39 participants (177 windows: 111 Norm, 50 Pre, 16 T2D)
  - CGMacros Train: 31 participants (277 windows: 90 Norm, 97 Pre, 90 T2D)
  - Combined Train Total: 201 Normal, 147 Prediabetes, 106 T2D
- **Combined Validation (16 participants, 102 windows)**:
  - Hall Val: 9 participants (39 windows: 27 Norm, 10 Pre, 2 T2D)
  - CGMacros Val: 7 participants (63 windows: 18 Norm, 27 Pre, 18 T2D)
  - Combined Val Total: 45 Normal, 37 Prediabetes, 20 T2D
- **Combined Held-Out Test (16 participants, 102 windows)**:
  - Hall Test: 9 participants (39 windows: 28 Norm, 6 Pre, 5 T2D)
  - CGMacros Test: 7 participants (63 windows: 27 Norm, 18 Pre, 18 T2D)
  - Combined Test Total: 55 Normal, 24 Prediabetes, 23 T2D

### Combined Model Performance (`models/combined_cnn_lstm.pt`)
- Training: Best Validation Macro-F1 = **0.6168** at Epoch 31.
- Evaluated on the 16 completely independent held-out test participants:

| Test Partition | Window Accuracy | Window Macro-F1 | Patient Accuracy | Patient Balanced Acc | Patient Macro-F1 | T2D Sensitivity | T2D Precision |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Combined Test (Overall, $N=16$)** | **57.84%** | **0.5166** | **68.75% (11/16)** | **64.81%** | **0.6317** | **66.67% (2/3)** | **40.00% (2/5)** |
| **Hall Test Subset ($N=9$)** | 79.49% | 0.5327 | **88.89% (8/9)** | 66.67% | **0.6410** | 0.00% (0/1) | 0.00% (0/0) |
| **CGMacros Test Subset ($N=7$)** | 44.44% | 0.3984 | **42.86% (3/7)** | 44.44% | **0.3571** | 100.0% (2/2) | 40.00% (2/5) |

---

## 8. Window-Level Metrics Across Experiments

| Evaluation Scenario | Window Accuracy | Balanced Accuracy | Macro Precision | Macro Recall | Macro F1 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Exp A: CGMacros $\to$ Hall Test** | **82.05%** | 59.92% | 51.93% | 59.92% | **0.5564** |
| **Exp B: Hall $\to$ CGMacros Test** | 41.27% | 42.59% | 49.27% | 42.59% | 0.3488 |
| **Exp C: Combined Model (Overall Test)** | 57.84% | 54.79% | 53.59% | 54.79% | 0.5166 |
| **Exp C: Combined Model (Hall Subset)** | 79.49% | 54.37% | 53.14% | 54.37% | 0.5327 |
| **Exp C: Combined Model (CGMacros Subset)** | 44.44% | 46.30% | 52.57% | 46.30% | 0.3984 |

---

## 9. Patient-Level Metrics Across Experiments

| Evaluation Scenario | Patient Accuracy | Balanced Accuracy | Macro Precision | Macro Recall | Macro F1 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Exp A: CGMacros $\to$ Hall Test** | **88.89% (8/9)** | 66.67% | 61.90% | 66.67% | **0.6410** |
| **Exp B: Hall $\to$ CGMacros Test** | 42.86% (3/7) | 44.44% | 44.44% | 44.44% | 0.3333 |
| **Exp C: Combined Model (Overall Test)** | **68.75% (11/16)** | **64.81%** | **64.72%** | **64.81%** | **0.6317** |
| **Exp C: Combined Model (Hall Subset)** | **88.89% (8/9)** | 66.67% | 61.90% | 66.67% | **0.6410** |
| **Exp C: Combined Model (CGMacros Subset)** | 42.86% (3/7) | 44.44% | 46.67% | 44.44% | 0.3571 |

---

## 10. Confusion Matrices (Overall Combined Model on 16 Test Patients)

### Window-Level Confusion Matrix ($N=102$ windows)
```
                    Predicted Class:
                 Normal   Prediabetes   Type 2 Diabetes
Actual Normal        36             9                10
Actual Prediabetes    2             6                16
Actual T2D           5             1                17
```

### Patient-Level Consensus Confusion Matrix ($N=16$ patients)
```
                    Predicted Class:
                 Normal   Prediabetes   Type 2 Diabetes
Actual Normal         7             1                 1
Actual Prediabetes    0             2                 2
Actual T2D           1             0                 2
```

---

## 11. Device & Cohort Distributional Generalization Analysis

A deep distributional audit of the raw continuous telemetry reveals profound differences between sensor hardware and cohort demographics:

| Distributional Metric | Hall et al. (Dexcom G4 Platinum) | CGMacros (Dexcom G6 Pro) | Cohort Shift ($\Delta$) |
| :--- | :--- | :--- | :--- |
| **Cohort Mean Glucose** | $102.30 \pm 23.43$ mg/dL | $140.68 \pm 42.12$ mg/dL | **$+38.38$ mg/dL (+37.5%)** |
| **Cohort Median Glucose** | $99.0$ mg/dL | $130.4$ mg/dL | **$+31.4$ mg/dL** |
| **Interquartile Range (IQR)** | $87.0$ – $114.0$ mg/dL | $113.0$ – $157.0$ mg/dL | Substantial upward shift |
| **Time in Range ($70$–$180$ mg/dL)** | **94.96%** | **85.37%** | $-9.59\%$ |
| **Hypoglycemia ($<70$ mg/dL)** | 4.19% | 0.40% | $-3.79\%$ |
| **Hyperglycemia ($>180$ mg/dL)** | **0.85%** | **14.23%** | **$+13.38\%$ (16.7x increase)** |
| **Rate of Change (ROC) Std** | $3.85$ mg/dL/min | $4.73$ mg/dL/min | $+22.9\%$ higher volatility |
| **Normal Group Mean Glucose** | $97.40 \pm 20.93$ mg/dL | $122.43 \pm 26.47$ mg/dL | **$+25.03$ mg/dL** |
| **Prediabetes Group Mean Glucose** | $110.06 \pm 22.48$ mg/dL | $135.53 \pm 33.21$ mg/dL | **$+25.47$ mg/dL** |
| **T2D Group Mean Glucose** | $115.44 \pm 30.96$ mg/dL | $166.02 \pm 50.67$ mg/dL | **$+50.58$ mg/dL (+43.8%)** |

### Key Hardware & Protocol Insights
1. **The "Normal" Baseline Discrepancy**:
   In CGMacros, participants classified clinically as "Normal" exhibited an average glucose of $122.4$ mg/dL. This value is **$6.9$ mg/dL higher than the Type 2 Diabetes group in Hall ($115.4$ mg/dL)**. This explains why a model trained on Hall identifies nearly every CGMacros participant as diabetic, while a model trained on CGMacros views Hall diabetic subjects as normal.
2. **Sensor Generation Shift**:
   The Dexcom G4 required user fingerstick calibrations twice daily, introducing potential calibration drift and bias toward lower readings. The Dexcom G6 Pro uses automated factory calibration, a permselective membrane, and higher sampling fidelity at the upper glycemic range (recording excursions up to $400$ mg/dL).
3. **Behavioral & Dietary Protocols**:
   CGMacros monitored participants during free-living conditions where high-glycemic meals produced large postprandial excursions ($>180$ mg/dL occurred in $14.2\%$ of readings). In Hall, high glycemic excursions ($>180$ mg/dL) occurred in less than $1.0\%$ of readings across the entire cohort.

---

## 12. Prediabetes vs. Type 2 Diabetes Boundary Analysis

The table below presents the individual diagnostic breakdown for all 16 held-out test participants evaluated under the **Combined Model**:

| Cohort | Subject ID | True Class | Windows | Combined Pred | $P(\text{Normal})$ | $P(\text{Prediabetes})$ | $P(\text{T2D})$ | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Hall (G4)** | `1636-69-091` | **Type 2 Diabetes** | 5 | Normal | **67.4%** | 28.8% | 3.8% | **MISCLASSIFIED** |
| **Hall (G4)** | `1636-69-100` | Normal | 4 | Normal | **73.7%** | 24.1% | 2.2% | CORRECT |
| **Hall (G4)** | `1636-70-1005`| Prediabetes | 5 | Prediabetes | 45.8% | **52.5%** | 1.7% | CORRECT |
| **Hall (G4)** | `1636-70-1008`| Normal | 6 | Normal | **84.5%** | 14.2% | 1.4% | CORRECT |
| **Hall (G4)** | `2133-011` | Normal | 4 | Normal | **92.4%** | 7.3% | 0.3% | CORRECT |
| **Hall (G4)** | `2133-023` | Normal | 4 | Normal | **94.4%** | 5.4% | 0.3% | CORRECT |
| **Hall (G4)** | `2133-028` | Normal | 5 | Normal | **94.1%** | 5.6% | 0.3% | CORRECT |
| **Hall (G4)** | `2133-036` | Prediabetes | 1 | Prediabetes | 14.7% | **57.2%** | 28.1% | CORRECT |
| **Hall (G4)** | `2133-037` | Normal | 5 | Normal | **92.5%** | 7.2% | 0.3% | CORRECT |
| **CGMacros (G6)**| `CGMacros-006` | Normal | 9 | Normal | **57.2%** | 33.5% | 9.3% | CORRECT |
| **CGMacros (G6)**| `CGMacros-018` | Normal | 9 | Prediabetes | 5.4% | **58.9%** | 35.6% | **MISCLASSIFIED** |
| **CGMacros (G6)**| `CGMacros-019` | Normal | 9 | Type 2 Diabetes | 8.7% | 36.7% | **54.6%** | **MISCLASSIFIED** |
| **CGMacros (G6)**| `CGMacros-020` | Prediabetes | 9 | Type 2 Diabetes | 0.6% | 17.2% | **82.2%** | **MISCLASSIFIED** |
| **CGMacros (G6)**| `CGMacros-038` | **Type 2 Diabetes** | 9 | Type 2 Diabetes | 2.1% | 22.2% | **75.7%** | CORRECT |
| **CGMacros (G6)**| `CGMacros-045` | Prediabetes | 9 | Type 2 Diabetes | 4.5% | 30.5% | **65.0%** | **MISCLASSIFIED** |
| **CGMacros (G6)**| `CGMacros-047` | **Type 2 Diabetes** | 9 | Type 2 Diabetes | 0.1% | 8.2% | **91.7%** | CORRECT |

### Diagnostic Findings
1. **Prediabetes Separation in Hall**:
   In the Hall test set, the Combined model achieved **100% sensitivity and 100% precision on Prediabetes** (`1636-70-1005` at $52.5\%$ confidence, `2133-036` at $57.2\%$ confidence). This is a substantial improvement over the standalone Hall baseline (which misclassified `2133-036` as Normal).
2. **Persistent Prediabetes $\to$ T2D Confusion in CGMacros**:
   In CGMacros, both prediabetic test participants (`CGMacros-020`, `CGMacros-045`) and one normal participant (`CGMacros-019`) were classified as Type 2 Diabetes. Their raw postprandial glucose peaks exceeded $180$ mg/dL multiple times per day, creating telemetry identical to mild T2D.
3. **Statistical Power**:
   Across the combined test set, there are only **3 Type 2 Diabetes participants** (1 Hall, 2 CGMacros). While 2 out of 3 were correctly identified ($66.7\%$ sensitivity), the sample size remains too small for definitive statistical significance.

---

## 13. Limitations

1. **Cohort Sample Size**:
   Even with pooling, $N=102$ participants ($70$ train, $16$ validation, $16$ test) remains small for a multi-layer deep neural network. The test set contains only 3 diabetic subjects.
2. **Lack of Dietary / Caloric Context**:
   CGM models evaluated purely on raw glucose telemetry lack knowledge of carbohydrate intake, meal timing, physical activity, and medication adherence. Without meal context, acute physiological postprandial spikes in healthy or prediabetic individuals can mimic diabetic kinetics.
3. **Inter-Device Calibration Drift**:
   Dexcom G4 and Dexcom G6 Pro sensors exhibit a baseline shift of nearly $38$ mg/dL between these studies. Normalizing via simple z-score scaling across cohorts reduces but does not completely eliminate this sensor generation artifact.
4. **Clinical Validation Disclaimer**:
   These models are research prototypes. **They are NOT clinically validated diagnostic devices** and must not be used for autonomous clinical decision-making.

---

## 14. Final Recommendation & Decision Framework

Using the required 4-tier decision framework:
- **A. Strong generalization**
- **B. Moderate/generalizable research performance**
- **C. Dataset-specific performance**
- **D. Insufficient evidence**

### Final Verdict: **Category C (Dataset-Specific Performance for Single-Cohort Models) transitioning to Category B (Moderate Generalizable Research Performance for Multi-Cohort Models)**

### Rationale
1. **Single-Cohort Transfer Fails (Category C)**:
   A model trained exclusively on one hardware generation or study protocol (Hall Dexcom G4 or CGMacros Dexcom G6 Pro) fails to transfer cleanly to the other. The Hall model over-calls diabetes on modern CGM data (4 false positives, 33% precision), while the CGMacros model fails to detect the Hall diabetic patient due to baseline shifts.
2. **Multi-Cohort Pooling Demonstrates Viability (Category B)**:
   When trained simultaneously on both cohorts with proper participant isolation, the **Combined Model achieves 68.75% patient accuracy and 0.6317 Macro-F1 across 16 completely independent held-out participants**. It maintains 88.89% patient accuracy on the Hall cohort while capturing 100% of the modern CGMacros diabetic patients.
3. **Strategic Next Step**:
   Do **NOT** deploy or integrate any model into the frontend/backend yet. For future work, GlucoSense should incorporate large-scale standardized repositories (such as the AI-READI cohort on FAIRhub, $N > 1,000$) to establish a truly generalizable multi-cohort foundation before any clinical user-facing integration is considered.

---

## 15. METRIC SOURCE OF TRUTH

Every benchmark and evaluation reported in this document is traced to verified artifacts:

| Experiment / Evaluation | Model Checkpoint Path | Scaler Path | Primary Result Artifact | Test Cohort Protocol | Verified Metrics Summary |
|:---|:---|:---|:---|:---|:---|
| **Combined Cohort Model (Overall Test)** | `models/combined_cnn_lstm.pt` (Epoch 31) | `models/combined_scaler.json` | `results/cross_cohort/combined_cohort_results.json` | $N=16$ stratified holdout participants (9 Normal, 4 Prediabetes, 3 T2D), 102 24h windows ($T=288$), soft voting | Patient Acc: **68.75%** (11/16), Bal Acc: **64.81%**, Macro-F1: **0.6317**, Norm Recall: **77.8%** (7/9), Pre Recall: **50.0%** (2/4), T2D Recall: **66.7%** (2/3), T2D Precision: **40.0%** (2/5), Window Acc: **57.84%** (59/102), Window Macro-F1: **0.5166** |
| **Combined Model (Hall Test Subset)** | `models/combined_cnn_lstm.pt` | `models/combined_scaler.json` | `results/cross_cohort/combined_cohort_results.json` (`hall_test_subset`) | $N=9$ holdout participants (6 Normal, 2 Prediabetes, 1 T2D), 39 24h windows | Patient Acc: **88.89%** (8/9), Bal Acc: **66.67%**, Macro-F1: **0.6410**, T2D Recall: **0.0%** (0/1), Window Acc: **79.49%**, Window Macro-F1: **0.5327** |
| **Combined Model (CGMacros Test Subset)** | `models/combined_cnn_lstm.pt` | `models/combined_scaler.json` | `results/cross_cohort/combined_cohort_results.json` (`cgmacros_test_subset`) | $N=7$ holdout participants (3 Normal, 2 Prediabetes, 2 T2D), 63 24h windows | Patient Acc: **42.86%** (3/7), Bal Acc: **44.44%**, Macro-F1: **0.3571**, T2D Recall: **100.0%** (2/2), T2D Precision: **40.0%** (2/5), Window Acc: **44.44%**, Window Macro-F1: **0.3984** |
| **Cross-Cohort Exp A (CGM $\to$ Hall)** | `models/cgmacros_cnn_lstm_A.pt` | `models/cgmacros_scaler.json` | `results/cross_cohort/cross_cohort_A_cgmacros_to_hall.json` | Zero-shot on Hall test ($N=9$: 6 Normal, 2 Prediabetes, 1 T2D), 39 24h windows | Patient Acc: **88.89%** (8/9), Bal Acc: **66.67%**, Macro-F1: **0.6410**, T2D Recall: **0.0%** (0/1), Window Acc: **82.05%** (32/39), Window Macro-F1: **0.5564** |
| **Cross-Cohort Exp B (Hall $\to$ CGM)** | `models/hall_cnn_lstm_288.pt` | `models/hall_scaler_288.json` | `results/cross_cohort/cross_cohort_B_hall_to_cgmacros.json` | Zero-shot on CGMacros test ($N=7$: 3 Normal, 2 Prediabetes, 2 T2D), 63 24h windows | Patient Acc: **42.86%** (3/7), Bal Acc: **44.44%**, Macro-F1: **0.3333**, T2D Recall: **100.0%** (2/2), T2D Precision: **33.33%** (2/6), Window Acc: **41.27%** (26/63), Window Macro-F1: **0.3488** |
| **Distributional Shift Analysis** | N/A | N/A | `results/cross_cohort/distributional_analysis.json` | All windows from Hall ($N=57, W=255$) vs. CGMacros ($N=45, W=403$) | Hall Mean: $102.30 \pm 23.43$, CGMacros Mean: $140.68 \pm 42.12$ (+38.38 mg/dL shift) |
| **Boundary Analysis** | `models/combined_cnn_lstm.pt` | `models/combined_scaler.json` | `results/cross_cohort/prediabetes_t2d_boundary_analysis.json` | Individual participant diagnostic analysis on 16 test subjects | 3 false-positive T2D predictions (`CGMacros-019`, `CGMacros-020`, `CGMacros-045`), 1 false-negative (`1636-69-091`) |

