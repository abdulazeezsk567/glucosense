# GlucoSense: Final Research Status & Milestone Report

**Document Status**: **LOCKED RESEARCH MILESTONE**  
**Project Name**: GlucoSense (Continuous Glucose Monitoring Glycemic-Risk Prototype)  
**Date**: September 2026  
**Auditor & Author**: GlucoSense Research & Machine Learning Team  
**System Classification**: Artificial Intelligence / Machine Learning Research Prototype (Non-Diagnostic)  

---

## A. Project Objective & System Overview

### A.1 Project Scope
**GlucoSense** is an investigational AI/ML system designed to evaluate the feasibility of multi-class glycemic-risk classification directly from continuous glucose monitoring (CGM) telemetry without requiring invasive venipuncture or concurrent laboratory clinical biomarkers.

### A.2 Target Diagnostic Classes
The system models a 3-tier clinical continuum of dysglycemia:
1. **Class 0: Normal / Healthy Glucose Tolerance**
   - Physiological glycemic homeostasis, low nocturnal variability, fasting glucose $<100\text{ mg/dL}$, postprandial return to baseline.
2. **Class 1: Prediabetes / Impaired Fasting Glucose (IFG) / Impaired Glucose Tolerance (IGT)**
   - Early subclinical beta-cell dysfunction, delayed postprandial clearance, elevated post-meal glycemic excursions ($140\text{--}199\text{ mg/dL}$), mild glycemic variability.
3. **Class 2: Type 2 Diabetes Mellitus (T2D)**
   - Sustained hyperglycemia, blunted or delayed insulin response, recurrent or prolonged excursions $\ge 200\text{ mg/dL}$, elevated basal plateaus.

### A.3 Prototype Declaration
> [!CRITICAL]
> **RESEARCH PROTOTYPE DISCLAIMER**:
> GlucoSense is an exploratory research and engineering prototype developed solely for algorithmic benchmarking and scientific inquiry. **It is NOT a medical device, is NOT approved by the FDA, CE-MDR, or any regulatory body, and CANNOT be used to diagnose, treat, or manage diabetes.** All clinical characterizations in this document refer to retrospective cohort definitions.

---

## B. Dataset Evidence & Cohort Accounting

Across the research lifecycle, four clinical trial cohorts were forensically audited and evaluated:

```
                                  GlucoSense Evidence Base
                                             │
         ┌───────────────────┬───────────────┴───────────────┬───────────────────┐
         ▼                   ▼                               ▼                   ▼
    Hall et al.          CGMacros                        Combined              MOBILE
   (Stanford G4)     (PhysioNet G6 Pro)               Hall + CGMacros     (Dexcom G6 T2D)
  N=57 (5 T2D)         N=45 (14 T2D)                   N=102 (19 T2D)      N=175 (100% T2D)
  Audited & Trained   Audited & Trained              Cross-Cohort Valid.  Attempted / DUA Barrier
```

### B.1 Hall et al. (Stanford Cohort, 2018)
* **Official Source**: Hall H, Perelman D, Breschi A, et al. *Glucotypes reveal new patterns of glucose dysregulation: a personalized medicine approach.* PLoS Biol. 2018;16(7):e2005143.
* **Participant Count**: **57 participants** (originally 60 enrolled; 3 excluded due to zero valid CGM data).
* **Clinical Class Distribution**:
  * Normal: **38 participants** (66.7%)
  * Prediabetes: **14 participants** (24.6%)
  * Type 2 Diabetes: **5 participants** (8.8%)
* **CGM Hardware**: Dexcom G4 Platinum (interstitial sensor with manual fingerstick calibration).
* **Native Resolution**: 5 minutes ($\Delta t = 5\text{ min}$, 288 readings/day).
* **Monitoring Duration**: 2 to 4 weeks per participant (median ~14 days).
* **Usable Sequences**: **303 non-overlapping 24-hour windows** ($T=288$).
* **Role in Pipeline**: Baseline benchmark dataset; training and validation splits for single-cohort experiments.
* **Limitations**: Severe class imbalance (only 5 T2D participants); older sensor generation; fingerstick calibration dependency.

### B.2 CGMacros (PhysioNet Cohort, 2023–2025)
* **Official Source**: PhysioNet Open Access Repository (DOI: 10.13026/0m7v-3895).
* **Participant Count**: **45 participants** (45/45 eligible).
* **Clinical Class Distribution**:
  * Normal: **15 participants** (33.3%)
  * Prediabetes: **16 participants** (35.6%)
  * Type 2 Diabetes: **14 participants** (31.1%)
* **CGM Hardware**: Dexcom G6 Pro (blinded professional CGM, factory-calibrated).
* **Native Resolution**: Exactly 5 minutes (288 readings/day).
* **Monitoring Duration**: ~10 days per participant.
* **Usable Sequences**: **403 non-overlapping 24-hour windows** (135 Normal, 142 Prediabetes, 126 T2D).
* **Role in Pipeline**: Standalone balanced training cohort; cross-cohort validation partner.
* **Limitations**: Shorter monitoring duration (10 days vs. 14+ days); test set contains only 2 T2D individuals.

### B.3 Combined Cohort (Hall + CGMacros Pooled Baseline)
* **Composition**: Pooled Hall ($N=57$) and CGMacros ($N=45$) cohorts.
* **Total Participants**: **102 participants**.
* **Pooled Class Distribution**:
  * Normal: **53 participants** (52.0%)
  * Prediabetes: **30 participants** (29.4%)
  * Type 2 Diabetes: **19 participants** (18.6%)
* **Total Usable Windows**: **706 non-overlapping 24-hour windows** (338 Normal, 219 Prediabetes, 149 T2D).
* **Test Split Usage**: Stratified participant-level holdout ($N=16$ test participants: 9 Normal, 4 Prediabetes, 3 T2D; 102 test windows).
* **Role in Pipeline**: **Locked GlucoSense multi-cohort benchmark model** (`glucosense_combined_cnn_lstm.pt`).

### B.4 MOBILE Clinical Trial Cohort (Jaeb Center / DexCom, 2021)
* **Trial Identification**: ClinicalTrials.gov [NCT03566693](https://clinicaltrials.gov/study/NCT03566693); Martens et al., *JAMA* 2021; 325(22):2262–2272.
* **Cohort Scale**: **175 participants** (116 CGM arm, 59 BGM arm).
* **Clinical Distribution**: **100% Type 2 Diabetes** (0 Normal, 0 Prediabetes).
* **CGM Device**: Dexcom G6 real-time / blinded CGM (5-minute resolution).
* **Attempted External Validation Status**: **Attempted but Unexecuted**.
* **Reason for Exclusion**:
  * Individual participant data (IPD) is controlled and requires a bilateral institutional Data Use Agreement (DUA) with the Jaeb Center for Health Research and DexCom, Inc.
  * ClinicalTrials.gov explicitly declares `ipdSharing: "NO"`.
  * No participant-level traces have been acquired or downloaded to the local environment.
  * Final Decision: **D. Insufficient usable MOBILE data**.
  * No synthetic or fabricated results were generated.

---

## C. Data Preprocessing & Signal Engineering

To ensure strict zero-leakage signal integrity, all data preparation follows a rigorous pipeline:

```
Raw Telemetry Traces (Timestamp, Glucose)
                 │
                 ▼ [Step 1: Gap Splitting (>60 min)]
Contiguous Monitoring Episodes
                 │
                 ▼ [Step 2: Short Gap Imputation (<=30 min Cubic Spline)]
Regular 5-Minute Telemetry Grid (Δt = 5 min)
                 │
                 ▼ [Step 3: Participant-Level Partitioning]
Train Set (70%) ───► Val Set (15%) ───► Test Set (15%)
                 │                          │
                 ▼                          ▼
Fit StandardScaler                  Transform Features
(Mean & Std on Train ONLY)          (Zero Test Contamination)
                 │                          │
                 ▼                          ▼
Feature 0: Scaled Glucose          Feature 1: Rate of Change (ΔG/Δt)
                 │
                 ▼
24-Hour Non-Overlapping Windows (Shape: [2, 288])
```

### C.1 Methodological Guarantees
1. **Participant-Level Splitting**: All splits are partitioned strictly by `subject_id`. No participant's windows can simultaneously appear across train, validation, or test sets.
2. **Standard 24-Hour Windows**: Sequences are segmented into non-overlapping windows of length $T=288$ ($24\text{ hours} \times 12\text{ samples/hour}$).
3. **5-Minute Resampling**: Irregular intervals are resampled to the 5-minute grid ($\Delta t = 300\text{ s}$).
4. **Episode Segmentation & Missingness**:
   - Gaps $>60\text{ minutes}$ trigger episode splits.
   - Gaps $\le 30\text{ minutes}$ are imputed using cubic spline or linear forward-fill.
   - Windows with $<80\%$ completeness ($<230$ valid readings) are discarded.
5. **Two-Channel Feature Inputs**:
   - Channel 0: Normalized glucose: $z_t = (G_t - \mu_{\text{train}}) / \sigma_{\text{train}}$
   - Channel 1: Instantaneous rate of change: $\Delta G_t / \Delta t = (G_t - G_{t-1}) / 5$
6. **Training-Only Scaler Isolation**: Normalization statistics ($\mu_{\text{train}}, \sigma_{\text{train}}$) are computed exclusively on training windows; test sequences are transformed out-of-sample.
7. **Strict Biomarker Exclusion**:
   - $\text{HbA}_{1\text{c}}$, Fasting Plasma Glucose (FPG), Oral Glucose Tolerance Test (OGTT) values, BMI, age, sex, and medications are **strictly excluded** from model inputs.
   - The model makes predictions exclusively from the sensor time series.

---

## D. Neural Network Architecture & Model Specifications

The verified model present in the repository (`ml/model_scalable.py` and `models/combined_cnn_lstm.pt`) is a unified **1D CNN-LSTM** deep sequence network:

```
Input Sequence: [Batch, 2 Channels, 288 Steps]
                       │
                       ▼
        1D Convolution Layer 1 (64 Filters, Kernel=3, Padding=1)
        Batch Normalization 1D + ReLU Activation
                       │
                       ▼
        1D Convolution Layer 2 (64 Filters, Kernel=3, Padding=1)
        Batch Normalization 1D + ReLU Activation
                       │
                       ▼
        Max Pooling 1D (Pool Size=2, Stride=2) ──► Length: 144
                       │
                       ▼
        2-Layer LSTM (Hidden Size=64, Dropout=0.2)
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
Last Recurrent Hidden State    Global Temporal Average Pooling
     [Batch, 64]                       [Batch, 64]
         └─────────────┬─────────────┘
                       ▼ Concatenate
          Fused Embedding [Batch, 128]
                       │
                       ▼
           Dense Linear Layer (128 ──► 64) + ReLU + Dropout(0.3)
                       │
                       ▼
           Output Linear Head (64 ──► 3 Classes)
                       │
                       ▼
          Softmax Logits: [P(Normal), P(Prediabetes), P(T2D)]
```

### D.1 Exact Parameter Count Verification
Inspecting `models/combined_cnn_lstm.pt` confirms:
* **Total Parameters in State Dict**: **88,325**
* **Trainable Parameters**: **88,067** (excluding batch-norm running mean/variance)
* **Epoch of Best Checkpoint**: Epoch 31
* **Validation Macro-F1**: 0.6168

---

## E. Model Evaluation & Benchmark Results

### E.1 Summary Performance Across All Experimental Tiers (Reconciled to Verified Artifacts)

| Tier | Evaluation Protocol | Model Checkpoint / Artifact | Patients ($N$) | Window Count ($W$) | Patient Accuracy | Patient Balanced Acc | Patient Macro-F1 | T2D Recall | Prediabetes Recall | Normal Recall |
|:---|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **1a** | Single-Cohort Holdout (2h windows) | Hall Baseline (`glucosense_cnn_lstm.pt`) | 9 (Test) | 2,671 | 77.78% (7/9) | 50.00% | 0.5079 | 0.0% (0/1) | 50.0% (1/2) | 100.0% (6/6) |
| **1b** | Single-Cohort Holdout (24h windows) | Hall Baseline (`hall_cnn_lstm_288.pt`) | 9 (Test) | 39 | 88.89% (8/9) | 66.67% | 0.6410 | 0.0% (0/1) | 100.0% (2/2) | 100.0% (6/6) |
| **2** | Single-Cohort Holdout (24h windows) | CGMacros Test (`cgmacros_cnn_lstm_A.pt`) | 7 (Test) | 63 | 42.86% (3/7) | 44.44% | 0.3571 | 100.0% (2/2) | 0.0% (0/2) | 33.3% (1/3) |
| **3** | Cross-Cohort Exp B (Hall $\to$ CGMacros) | Zero-Shot on CGMacros Test (`hall_cnn_lstm_288.pt`) | 7 (Test) | 63 | 42.86% (3/7) | 44.44% | 0.3333 | 100.0% (2/2) | 0.0% (0/2) | 33.3% (1/3) |
| **4** | Cross-Cohort Exp A (CGMacros $\to$ Hall) | Zero-Shot on Hall Test (`cgmacros_cnn_lstm_A.pt`) | 9 (Test) | 39 | 88.89% (8/9) | 66.67% | 0.6410 | 0.0% (0/1) | 100.0% (2/2) | 100.0% (6/6) |
| **5** | **Pooled Multi-Cohort Baseline** | **Combined Test** (`combined_cnn_lstm.pt`) | **16 (Test)** | **102** | **68.75% (11/16)** | **64.81%** | **0.6317** | **66.67% (2/3)** | **50.0% (2/4)** | **77.78% (7/9)** |
| **6** | External Validation Attempt | MOBILE Cohort (`glucosense_combined_cnn_lstm.pt`) | 0 (175 trial) | 0 | **N/A** | **N/A** | **N/A** | **N/A** | **N/A** | **N/A** |

### E.2 Detailed Analysis of the Combined Model Holdout Test ($N=16$)
On the locked combined test set, the model achieved:
* **Patient Accuracy**: **68.75%** (11/16 correctly classified)
* **Patient Balanced Accuracy**: **64.81%**
* **Patient Macro-F1**: **0.6317**
* **Window Accuracy**: **57.84%** (59/102 windows)
* **Confusion Matrix Breakdown (Patient-Level)**:
  * **Normal**: 7 True Positive, 1 confused with Prediabetes, 1 confused with T2D. Precision: 87.5%, Recall: 77.8%.
  * **Prediabetes**: 2 True Positive, 0 confused with Normal, 2 confused with T2D. Precision: 66.7%, Recall: 50.0%.
  * **Type 2 Diabetes**: 2 True Positive, 1 confused with Normal (`1636-69-091`, Hall patient with tightly controlled glucose, mean $110.8\text{ mg/dL}$), 0 confused with Prediabetes. Precision: 40.0%, Recall: 66.7%.
* **T2D Detection False Positives**: 3 patients (`CGMacros-019` Normal, `CGMacros-020` Prediabetes, `CGMacros-045` Prediabetes) were classified as T2D due to sharp postprandial excursions, demonstrating the fuzzy boundary between impaired glucose tolerance and early diabetes.

---

## F. Limitations & Risk Analysis

The experimental findings demonstrate clear feasibility while establishing substantial scientific limitations:

1. **Small Sample Scale**:
   - Total pooled cohort contains only **102 participants**.
   - Total T2D participants across both training datasets is **19** (5 from Hall, 14 from CGMacros).
   - Combined test set contains only **3 T2D participants**. While $2/3$ were detected, the sample is too small for statistical certainty.
2. **Substantial Device & Cohort Distribution Shift**:
   - Hall used Dexcom G4 (fingerstick calibrated, 2014); CGMacros used Dexcom G6 Pro (factory calibrated, 2022).
   - Cross-cohort testing revealed that training on CGMacros failed to detect the Hall test T2D subject ($0/1$ recall), while training on Hall over-called CGMacros as T2D ($4$ false-positive T2D classifications).
3. **Boundary Instability (Prediabetes vs. T2D)**:
   - Early T2D and impaired glucose tolerance exhibit overlapping glycemic profiles. The model frequently confuses postprandial spikes in prediabetes with early diabetes.
4. **Lack of Completed External Validation**:
   - The planned validation on the independent MOBILE cohort ($N=175$) could not be completed because raw participant-level traces have not been transferred under an executed institutional DUA.
5. **No Clinical Diagnostic Validity**:
   - GlucoSense is an exploratory algorithmic benchmark. It has not undergone prospective clinical trials, physician oversight studies, or regulatory review.

---

## G. Final Scientific Conclusion

> **"The current evidence supports GlucoSense as a research prototype demonstrating feasibility of CGM-based glycemic-risk classification. The evidence is insufficient to support clinical diagnostic use."**

---

## H. METRIC SOURCE OF TRUTH

Every metric reported in this document is traced back to a specific, reproducible JSON or report artifact generated during experimentation:

| Benchmark / Evaluation | Model Checkpoint Path | Normalization Scaler Path | Primary Result Artifact | Test Cohort Protocol | Verified Metrics Summary |
|:---|:---|:---|:---|:---|:---|
| **Combined Hall + CGMacros Model (Overall Test)** | `models/combined_cnn_lstm.pt` (Epoch 31) | `models/combined_scaler.json` | `results/cross_cohort/combined_cohort_results.json` | $N=16$ stratified holdout participants (9 Normal, 4 Prediabetes, 3 T2D), 102 24h windows ($T=288$), soft voting | Patient Acc: **68.75%** (11/16), Bal Acc: **64.81%**, Macro-F1: **0.6317**, Norm Recall: **77.8%** (7/9), Pre Recall: **50.0%** (2/4), T2D Recall: **66.7%** (2/3), T2D Precision: **40.0%** (2/5) |
| **Combined Model (Hall Test Subset)** | `models/combined_cnn_lstm.pt` | `models/combined_scaler.json` | `results/cross_cohort/combined_cohort_results.json` (`hall_test_subset`) | $N=9$ holdout participants (6 Normal, 2 Prediabetes, 1 T2D), 39 24h windows | Patient Acc: **88.89%** (8/9), Bal Acc: **66.67%**, Macro-F1: **0.6410**, T2D Recall: **0.0%** (0/1) |
| **Combined Model (CGMacros Test Subset)** | `models/combined_cnn_lstm.pt` | `models/combined_scaler.json` | `results/cross_cohort/combined_cohort_results.json` (`cgmacros_test_subset`) | $N=7$ holdout participants (3 Normal, 2 Prediabetes, 2 T2D), 63 24h windows | Patient Acc: **42.86%** (3/7), Bal Acc: **44.44%**, Macro-F1: **0.3571**, T2D Recall: **100.0%** (2/2), T2D Precision: **40.0%** (2/5) |
| **CGMacros Standalone Model (Exp A)** | `models/cgmacros_cnn_lstm_A.pt` (Epoch 18) | `models/cgmacros_scaler.json` | `results/cgmacros/experiment_A_metrics.json` | $N=7$ stratified holdout participants (3 Normal, 2 Prediabetes, 2 T2D), 63 24h windows ($T=288$), soft voting | Patient Acc: **42.86%** (3/7), Bal Acc: **44.44%**, Macro-F1: **0.3571**, T2D Recall: **100.0%** (2/2), T2D Precision: **40.0%** (2/5), Window Acc: **47.62%** |
| **Cross-Cohort Exp A: CGMacros $\to$ Hall** | `models/cgmacros_cnn_lstm_A.pt` | `models/cgmacros_scaler.json` | `results/cross_cohort/cross_cohort_A_cgmacros_to_hall.json` | $N=9$ unseen Hall test participants (6 Normal, 2 Prediabetes, 1 T2D), 39 24h windows ($T=288$), zero-shot | Patient Acc: **88.89%** (8/9), Bal Acc: **66.67%**, Macro-F1: **0.6410**, T2D Recall: **0.0%** (0/1), Window Acc: **82.05%** (32/39) |
| **Cross-Cohort Exp B: Hall $\to$ CGMacros** | `models/hall_cnn_lstm_288.pt` | `models/hall_scaler_288.json` | `results/cross_cohort/cross_cohort_B_hall_to_cgmacros.json` | $N=7$ unseen CGMacros test participants (3 Normal, 2 Prediabetes, 2 T2D), 63 24h windows ($T=288$), zero-shot | Patient Acc: **42.86%** (3/7), Bal Acc: **44.44%**, Macro-F1: **0.3333**, T2D Recall: **100.0%** (2/2), T2D Precision: **33.33%** (2/6), Window Acc: **41.27%** |
| **Hall Standalone Baseline (2h Windows)** | `models/glucosense_cnn_lstm.pt` | Fitted on Train Split (`data/processed/`) | `results/patient_level_metrics.json` & `results/metrics.json` | $N=9$ stratified holdout participants (6 Normal, 2 Prediabetes, 1 T2D), 2,671 2h windows ($T=24$, 3ch), soft voting | Patient Acc: **77.78%** (7/9), Bal Acc: **50.00%**, Macro-F1: **0.5079**, T2D Recall: **0.0%** (0/1), Window Acc: **59.42%**, Window Macro-F1: **0.4249** |
| **MOBILE External Validation Attempt** | `models/combined_cnn_lstm.pt` (referenced as `glucosense_combined_cnn_lstm.pt`) | `models/combined_scaler.json` | `results/mobile_external_validation.json` & `docs/MOBILE_EXTERNAL_VALIDATION_RESULTS.md` | $N=175$ trial cohort, $N=0$ locally acquired traces; evaluated under locked decision rule | Usable Windows: **0**, T2D Sensitivity: **N/A**, Final Decision: **D. Insufficient usable MOBILE data** (Zero fabricated traces) |

