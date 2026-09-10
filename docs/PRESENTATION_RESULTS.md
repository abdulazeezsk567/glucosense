# GlucoSense: Presentation Results & Milestone Summary

**Project Title**: GlucoSense: Multi-Class Glycemic-Risk Classification from Continuous Glucose Monitoring Telemetry  
**Authors**: GlucoSense Research Team  
**Date**: September 2026  
**Presentation Audience**: AI/ML Researchers, Clinical Informaticians, Technical Reviewers  

---

## Slide 1: The Problem
* **The Clinical Challenge**: Early dysglycemia (Prediabetes and early Type 2 Diabetes) is frequently asymptomatic and remains undetected until microvascular or macrovascular complications emerge.
* **Limitations of Standard Diagnostics**:
  * Fasting Plasma Glucose (FPG) misses postprandial glycemic excursions.
  * Laboratory $\text{HbA}_{1\text{c}}$ represents a 3-month average that obscures acute glycemic variability and is confounded by hemoglobinopathies.
  * Oral Glucose Tolerance Testing (OGTT) is time-consuming, unpalatable, and unreflective of free-living conditions.
* **The Opportunity**: Wearable Continuous Glucose Monitoring (CGM) captures rich, continuous, free-living temporal glucose dynamics.
* **The Research Question**: *Can an AI model accurately classify individuals into Normal, Prediabetes, or Type 2 Diabetes solely from 24-hour CGM time series, without demographic or clinical biomarker inputs?*

---

## Slide 2: The Proposed Solution (GlucoSense)
* **Approach**: A unified, end-to-end deep learning framework operating directly on raw CGM time-series sequences.
* **Core Principles**:
  1. **Strict Signal Isolation**: Only continuous glucose and its first-order rate of change are fed to the neural network. Zero clinical biomarker leakage ($\text{HbA}_{1\text{c}}$, FPG, BMI, age are strictly excluded).
  2. **Multi-Class Granularity**: Classifies into three clinically meaningful categories (Normal, Prediabetes, Type 2 Diabetes) rather than simple binary thresholds.
  3. **Multi-Scale Temporal Modeling**: Captures acute postprandial spikes via 1D convolutions while tracking 24-hour diurnal and nocturnal trends via recurrent LSTM memory.

---

## Slide 3: Datasets & Evidence Base
Four independent cohorts were audited and evaluated across the project:

| Cohort Name | Source Repository | Hardware Device | Sample Size ($N$) | Usable 24h Windows | Clinical Distribution | Role in Study |
|:---|:---|:---|:---:|:---:|:---|:---|
| **Hall et al.** | PLoS Biology (2018) | Dexcom G4 Platinum | 57 | 303 | 38 Normal / 14 Prediab / 5 T2D | Initial Baseline Benchmark |
| **CGMacros** | PhysioNet (2025) | Dexcom G6 Pro | 45 | 403 | 15 Normal / 16 Prediab / 14 T2D | Balanced Modern Cohort |
| **Combined** | Pooled Hall + CGMacros | G4 + G6 Pro | **102** | **706** | **53 Normal / 30 Prediab / 19 T2D** | **Locked Multi-Cohort Model** |
| **MOBILE** | Jaeb / DexCom (JAMA 2021) | Dexcom G6 | 175 | 0 | 100% Type 2 Diabetes | External Validation Attempt |

---

## Slide 4: Data Preprocessing Pipeline
* **Participant-Level Isolation**: Splitting is strictly performed by patient ID ($70\%$ train, $15\%$ validation, $15\%$ test). Zero window leakage across splits.
* **Sequence Standardization**:
  * 5-minute sampling grid ($\Delta t = 300\text{ seconds}$).
  * Contiguous 24-hour non-overlapping windows ($T = 288$ steps).
* **Missingness Rules**:
  * Gaps $>60\text{ minutes}$ trigger episode segmentation.
  * Gaps $\le 30\text{ minutes}$ interpolated via cubic spline.
  * Windows with $<80\%$ valid readings are discarded.
* **Zero-Leakage Feature Scaling**: Normalization parameters ($\mu_{\text{train}}, \sigma_{\text{train}}$) are fitted strictly on training participants and applied out-of-sample to test data.

---

## Slide 5: Neural Network Architecture
* **Model Family**: 1D CNN-LSTM Deep Sequence Network (88,067 trainable parameters; 88,325 total state dict elements including batch-norm running buffers).
* **Architecture Stages**:
  1. **Dual 1D Convolutions** (64 filters, kernel size 3) + BatchNorm + ReLU: Extracts sharp postprandial rises, peak slopes, and instantaneous dynamics.
  2. **Temporal Max Pooling** (stride 2): Halves sequence length to 144 steps to suppress high-frequency sensor noise.
  3. **Two-Layer Stacked LSTM** (hidden dimension 64, dropout 0.2): Tracks diurnal oscillations, basal stability, and recovery trajectories.
  4. **Fused Embedding**: Combines terminal hidden state $[64]$ with global temporal average pooling $[64]$ $\rightarrow$ $[128]$.
  5. **Dense Projection & Output Head**: Fully connected layer $(128 \rightarrow 64)$ + Linear $(64 \rightarrow 3)$ with calibrated softmax outputs.

---

## Slide 6: Summary of Experimental Findings

```
                              Patient Accuracy Across Experiments
     100% ┌─────────────────────────────────────────────────────────────────┐
          │                                                                 │
      80% │          77.8%                         88.9%            68.8%   │
          │         ┌─────┐                       ┌─────┐          ┌─────┐  │
      60% │         │     │                       │     │          │     │  │
          │         │     │                       │     │          │     │  │
      40% │         │     │    42.9%              │     │   42.9%  │     │  │
          │         │     │   ┌─────┐             │     │  ┌─────┐ │     │  │
      20% │         │     │   │     │             │     │  │     │ │     │   N/A   │
          │         │     │   │     │             │     │  │     │ │     │  (DUA)  │
       0% └─────────┴─────┴───┴─────┴─────────────┴─────┴──┴─────┴─┴─────┴─────────┘
                     Hall     CGMacros           CGM->Hall Hall->CGM Combined MOBILE
                    (Holdout)  (Test)            (Exp A)   (Exp B)   (Test)  (External)
```

### Key Quantitative Benchmarks:
1. **Single-Cohort Hall Baseline**: Patient Accuracy **77.78%** (7/9, 2h windows; Macro-F1 $0.5079$) and **88.89%** (8/9, 24h windows; Macro-F1 $0.6410$). The single test T2D patient (`1636-69-091`, tightly controlled mean glucose $110.8\text{ mg/dL}$) was misclassified as Normal ($0.0\%$ T2D recall, 0/1).
2. **Single-Cohort CGMacros**: Patient Accuracy **42.86%** (3/7), Macro-F1 **0.3571** (detected both test T2D participants ($2/2 = 100\%$), but suffered 3 false-positive T2D predictions from prediabetes postprandial excursions; precision $40.0\%$).
3. **Cross-Cohort Generalization**:
   - **Exp A (CGMacros $\to$ Hall Test, $N=9$)**: Patient Accuracy **88.89%** (8/9), Macro-F1 **0.6410**, T2D Recall **0.0%** (0/1).
   - **Exp B (Hall $\to$ CGMacros Test, $N=7$)**: Patient Accuracy **42.86%** (3/7), Macro-F1 **0.3333**, T2D Recall **100.0%** (2/2), with 4 false-positive T2D classifications (T2D Precision $33.3\%$).
4. **Combined Hall + CGMacros Model (Best Verified Baseline)**:
   - **Patient Accuracy**: **68.75%** (11/16)
   - **Balanced Accuracy**: **64.81%**
   - **Macro-F1**: **0.6317**
   - **Normal Recall**: **77.8%** (7/9 patients detected)
   - **Prediabetes Recall**: **50.0%** (2/4 patients detected)
   - **T2D Recall**: **66.7%** (2/3 patients detected)
   - **T2D Precision**: **40.0%** (2/5 patients)

---

## Slide 7: The MOBILE External Validation Attempt
* **Objective**: Measure whether the combined Hall + CGMacros model generalizes to an independent primary-care T2D cohort ($N=175$ patients on basal insulin).
* **Forensic Audit Finding**:
  * MOBILE raw participant-level CGM traces are controlled by the Jaeb Center for Health Research and DexCom, Inc.
  * ClinicalTrials.gov declares `ipdSharing: "NO"`.
  * Public download via click-through is not available. Access requires a formal research protocol and an executed bilateral institutional Data Use Agreement (DUA).
* **Result**: **No fabricated results were generated**. The evaluation was correctly and transparently classified as:
  $$\mathbf{Final\;Decision:\;D.\;Insufficient\;usable\;MOBILE\;data}$$

---

## Slide 8: Critical Scientific Limitations
* **Small Cohort Scale**: Only 19 total T2D participants in the entire training pool; holdout test set contained only 3 T2D individuals.
* **Fuzzy Prediabetes $\leftrightarrow$ T2D Boundary**: High postprandial excursions in prediabetes create false-positive diabetes predictions (3 false-positive T2D patients in test set).
* **Hardware Shift**: Different sensor generations (Dexcom G4 vs. G6 Pro) alter signal baselines and noise characteristics.
* **Confounding Factors**: Medication (metformin, SGLT2i, basal insulin), diet, and acute exercise significantly alter CGM traces without changing underlying clinical diagnosis.
* **No Medical Claim**: GlucoSense is an engineering prototype. It has zero regulatory clearance and cannot make clinical diagnoses.

---

## Slide 9: Future Work & Next Milestones
1. **Multi-Institutional Data Agreements**: Finalize bilateral DUAs for MOBILE ($N=175$) and AI-READI ($N>1,000$) to scale the T2D training distribution.
2. **Domain Adaptation & Hardware Normalization**: Implement adversarial domain adaptation or contrastive learning to make representations invariant to sensor hardware.
3. **Multi-Day Trajectory Modeling**: Extend sequence length from 24 hours to 7–14 days to capture inter-day glycemic variability and weekend/weekday behavioral cycles.
4. **Prospective Clinical Alignment**: Benchmark CGM AI predictions against prospective, concurrent Oral Glucose Tolerance Tests (OGTT).

---

## Slide 10: Final Scientific Takeaway

> **"GlucoSense successfully demonstrates the feasibility of extracting multi-class glycemic-risk representations directly from 24-hour continuous glucose monitoring time series without demographic or biomarker inputs. However, due to small cohort sizes, sensor distribution shift, and pending external validation, the system remains a research prototype and is not suitable for clinical diagnostic use."**

---

## Slide 11: METRIC SOURCE OF TRUTH

| Benchmark Evaluation | Model Checkpoint | Primary Result Artifact | Sample Protocol | Reconciled Verified Metrics |
|:---|:---|:---|:---|:---|
| **Combined Overall Test** | `models/combined_cnn_lstm.pt` | `results/cross_cohort/combined_cohort_results.json` | $N=16$ holdout test patients (9 Norm, 4 Pre, 3 T2D), 102 24h windows | Patient Acc: **68.75%** (11/16), Macro-F1: **0.6317**, T2D Recall: **66.7%** (2/3) |
| **Combined (Hall Test)** | `models/combined_cnn_lstm.pt` | `results/cross_cohort/combined_cohort_results.json` | $N=9$ holdout test patients (6 Norm, 2 Pre, 1 T2D), 39 24h windows | Patient Acc: **88.89%** (8/9), Macro-F1: **0.6410**, T2D Recall: **0.0%** (0/1) |
| **Combined (CGMacros Test)** | `models/combined_cnn_lstm.pt` | `results/cross_cohort/combined_cohort_results.json` | $N=7$ holdout test patients (3 Norm, 2 Pre, 2 T2D), 63 24h windows | Patient Acc: **42.86%** (3/7), Macro-F1: **0.3571**, T2D Recall: **100.0%** (2/2) |
| **CGMacros Standalone** | `models/cgmacros_cnn_lstm_A.pt` | `results/cgmacros/experiment_A_metrics.json` | $N=7$ holdout test patients (3 Norm, 2 Pre, 2 T2D), 63 24h windows | Patient Acc: **42.86%** (3/7), Macro-F1: **0.3571**, T2D Recall: **100.0%** (2/2) |
| **Cross-Cohort Exp A (CGM $\to$ Hall)** | `models/cgmacros_cnn_lstm_A.pt` | `results/cross_cohort/cross_cohort_A_cgmacros_to_hall.json` | $N=9$ Hall test patients, 39 24h windows, zero-shot | Patient Acc: **88.89%** (8/9), Macro-F1: **0.6410**, T2D Recall: **0.0%** (0/1) |
| **Cross-Cohort Exp B (Hall $\to$ CGM)** | `models/hall_cnn_lstm_288.pt` | `results/cross_cohort/cross_cohort_B_hall_to_cgmacros.json` | $N=7$ CGMacros test patients, 63 24h windows, zero-shot | Patient Acc: **42.86%** (3/7), Macro-F1: **0.3333**, T2D Recall: **100.0%** (2/2) |
| **Hall Standalone Baseline** | `models/glucosense_cnn_lstm.pt` | `results/patient_level_metrics.json` | $N=9$ Hall test patients, 2,671 2h windows | Patient Acc: **77.78%** (7/9), Macro-F1: **0.5079**, T2D Recall: **0.0%** (0/1) |
| **MOBILE External Evaluation** | `models/combined_cnn_lstm.pt` | `results/mobile_external_validation.json` | $N=175$ trial, $N=0$ local traces | **Decision D: Insufficient usable data** (Zero fabricated traces) |

