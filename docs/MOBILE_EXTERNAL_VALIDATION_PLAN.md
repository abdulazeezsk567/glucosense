# External T2D Validation Plan: Hall + CGMacros Model on Independent MOBILE Cohort

**Document Status**: **PLANNED ONLY — EXECUTION BLOCKED PENDING DUA & EXPLICIT APPROVAL**  
**Creation Date**: September 2026  
**Author**: GlucoSense Research & Modeling Team  
**Evaluation Target**: Locked Hall + CGMacros Combined Model (`glucosense_combined_cnn_lstm.pt` / frozen model pipeline)  
**Target Evaluation Cohort**: Independent MOBILE Type 2 Diabetes Clinical Trial Cohort (ClinicalTrials.gov [NCT03566693](https://clinicaltrials.gov/study/NCT03566693))  

---

## 1. Objective & Scientific Rationale

### 1.1 Core Scientific Question
Does the temporal CGM representation of Type 2 Diabetes (T2D) learned from the small locked 3-class baseline (**Hall + CGMacros**, $N=102$ total, with only **19 T2D participants**) generalize to a large, independent, multi-center primary-care cohort of T2D patients wearing Dexcom G6 sensors?

### 1.2 Motivation
In our cross-cohort generalization analysis ([`docs/CROSS_COHORT_VALIDATION_REPORT.md`](file:///c:/Users/Abdul%20Azeez/Downloads/glucosense/glucosense/docs/CROSS_COHORT_VALIDATION_REPORT.md)), the combined Hall + CGMacros model demonstrated:
- Overall Patient Accuracy: **68.75%** (11/16)
- Macro-F1: **0.6317**
- T2D Recall on internal test splits: **66.7%** (2/3)

However, because the combined training baseline contains only 19 T2D individuals (5 from Hall Dexcom G4, 14 from CGMacros Dexcom G6 Pro), statistical power for T2D detection is limited. Validating this frozen model against the external MOBILE cohort ($N=175$ participants, all diagnosed with T2D) provides a high-powered, rigorous external evaluation of T2D sensitivity.

---

## 2. Non-Negotiable Methodological Rules

> [!CRITICAL]
> **RULE 1: STRICT PROHIBITION OF THRESHOLD TUNING**
> - The model weights, architecture, and decision thresholds must remain **100% frozen** at the Hall + CGMacros training state.
> - The classification rule must remain strictly the locked argmax:
>   $$\hat{y} = \arg\max_{c \in \{\text{Normal}, \text{Prediabetes}, \text{T2D}\}} P(Y=c \mid \mathbf{x})$$
>   (or the frozen decision cutoff established on the Hall + CGMacros validation set).
> - **NO threshold sweeps, temperature scaling, or ROC cut-point adjustments may be performed on MOBILE data**. Tuning thresholds on external test data constitutes data leakage and invalidates generalizability claims.

> [!WARNING]
> **RULE 2: T2D SPECIFICITY CANNOT BE ESTIMATED FROM MOBILE ALONE**
> - **MOBILE is exclusively a Type 2 Diabetes cohort** ($N=175$, 100% T2D). It contains **zero Normal** and **zero Prediabetes** controls.
> - Specificity is mathematically defined as:
>   $$\text{Specificity} = \frac{\text{True Negatives}}{\text{True Negatives} + \text{False Positives}} = \frac{\text{TN}}{\text{TN} + \text{FP}}$$
> - Because there are zero non-T2D individuals in MOBILE, $\text{TN} = 0$ and $\text{FP} = 0$. Specificity is mathematically **undefined ($0/0$)**.
> - Similarly, **False Positive Rate (FPR)** and **Balanced Accuracy** cannot be computed from MOBILE alone.
> - Any report claiming to report "specificity" on the MOBILE cohort alone is scientifically invalid and strictly forbidden.
> - MOBILE evaluates **T2D Sensitivity (Recall)** and the **T2D Softmax Probability Distribution** only.

---

## 3. Cohort Structure & Evaluation Sets

The planned validation will evaluate two distinct subsets of the MOBILE trial:

```
                          MOBILE Cohort (N = 175 T2D)
                                      │
         ┌────────────────────────────┴────────────────────────────┐
         ▼                                                         ▼
Cohort Set A (Primary)                                    Cohort Set B (Secondary)
Baseline Blinded CGM                                      Longitudinal Active CGM
N = 175 participants                                      N = 116 participants
~10–14 days wear per participant                          Up to 8 months continuous wear
Blinded (no real-time feedback)                           Real-time Dexcom G6 feedback
Measures baseline T2D representation                      Measures temporal stability & effect
Unconfounded by CGM behavioral response                   of glycemic titration
```

### 3.1 Cohort Set A: Baseline Blinded Phase (Primary Benchmark)
- **Sample Size**: Up to $N = 175$ participants.
- **Wear Duration**: 10 to 14 days of blinded Dexcom G6 wear prior to randomization.
- **Significance**: Unconfounded by behavioral changes induced by real-time CGM alerts; represents untreated/standard baseline glycemic dynamics in insulin-treated T2D.

### 3.2 Cohort Set B: Longitudinal Active CGM Phase (Secondary Benchmark)
- **Sample Size**: $N = 116$ participants assigned to the real-time CGM arm.
- **Wear Duration**: Up to 8 months (32 weeks) of dense continuous monitoring.
- **Significance**: Evaluates consistency across hundreds of daily windows per participant and examines how pharmacological insulin titration affects model predictions over time.

---

## 4. Sequence Extraction & Preprocessing Protocol

To ensure 100% alignment with the locked GlucoSense inference pipeline:

1. **Sampling Frequency**:
   - MOBILE Dexcom G6 natively records at **5-minute intervals** ($\Delta t = 5\text{ min}$, 288 readings/day).
   - No temporal downsampling is required.

2. **Window Partitioning**:
   - CGM traces will be partitioned into **non-overlapping 24-hour windows** ($T = 288$ consecutive time steps).
   - Clock alignment: Standard midnight-to-midnight ($00:00\text{--}23:59$) or fixed 24-hour contiguous segments.

3. **Data Quality & Completeness Filtering**:
   - A window is eligible if it contains $\ge 80\%$ valid readings ($\ge 230$ of 288 points).
   - Missing readings (up to 20%) will be imputed using standard linear/cubic spline interpolation as specified in GlucoSense preprocessing.
   - Windows with $<80\%$ valid readings will be discarded.

4. **Input Feature Representation**:
   - Channel 0: Normalized glucose values (scaled using training-only statistics from Hall + CGMacros).
   - Channel 1: First-order glucose rate of change ($\Delta G / \Delta t$).
   - Sequence shape: `(1, 2, 288)`.
   - **No clinical biomarkers** ($\text{HbA}_{1\text{c}}$, age, BMI, medication) will be supplied to the model.

---

## 5. Planned Reporting Schema & Metrics

Upon authorized execution of this protocol, the validation report will systematically document:

### 5.1 Cohort Scale & Usability Metrics
* **Total MOBILE T2D participants evaluated**: $N_{\text{total}}$ (target: 175).
* **Participants with usable CGM**: Number and percentage meeting $\ge 1$ valid 24-hour window ($\ge 80\%$ completeness).
* **Active CGM monitoring duration**: Mean, median, and range of monitored days per participant.
* **Total window count ($W$)**: Total non-overlapping 24-hour windows generated and passed through inference.

### 5.2 T2D Sensitivity (Recall) Analysis
Because ground truth for all instances is $y = \text{T2D}$ ($c = 2$):

$$\text{Window-Level Sensitivity} = \frac{W_{\text{pred}=\text{T2D}}}{W_{\text{total}}}$$

$$\text{Patient-Level Sensitivity (Majority Vote)} = \frac{N_{\text{majority}=\text{T2D}}}{N_{\text{total}}}$$

$$\text{Patient-Level Sensitivity (Mean Probability)} = \frac{N_{\bar{P}(\text{T2D}) > 0.333}}{N_{\text{total}}}$$

*Both window-level and patient-level aggregations will be reported.*

### 5.3 Predicted Class Probability Distribution
To understand the model's confidence and uncertainty profile on external data, the report will present the distribution of softmax outputs across all MOBILE instances:
* $P(Y = \text{Normal} \mid \mathbf{x})$: Mean, median, IQR.
* $P(Y = \text{Prediabetes} \mid \mathbf{x})$: Mean, median, IQR.
* $P(Y = \text{T2D} \mid \mathbf{x})$: Mean, median, IQR, 10th percentile, 90th percentile.
* Histogram / violin plot showing probability density of $P(\text{T2D})$.

### 5.4 False-Negative Count & Error Taxonomy
Every instance where the model fails to predict T2D is a False Negative ($\text{FN}$). The report will provide a deep forensic breakdown of all false negatives:
* **Total False-Negative Count**: Number of windows/patients misclassified.
* **Error Destination Breakdown**:
  * Classified as **Prediabetes** (near miss / boundary confusion): Expected dominant error mode based on cross-cohort findings.
  * Classified as **Normal** (severe under-call).
* **Clinical Stratification of False Negatives**:
  * Baseline $\text{HbA}_{1\text{c}}$ ($<8.5\%$ vs. $\ge 8.5\%$).
  * Mean window glucose ($<140\text{ mg/dL}$, $140\text{--}180\text{ mg/dL}$, $>180\text{ mg/dL}$).
  * Time in Range ($70\text{--}180\text{ mg/dL}$) of the window.
  * Time below range ($<70\text{ mg/dL}$) indicating tight basal insulin titration.

### 5.5 Explicit Disclaimer
The final report will feature the mandatory disclaimer:
> *"Specificity, False Positive Rate, and Balanced Accuracy are undefined and cannot be reported for this validation because the MOBILE cohort contains zero non-T2D controls."*

---

## 6. Execution Workflow (Strictly On Hold)

```
[Phase 0: Legal Access]
  Obtain approved DUA from Jaeb Center / DexCom
  Verify authorized storage environment
           │
           ▼
[Phase 1: Dataset Ingestion & Checksum Audit]
  Inspect downloaded files, record row counts & hash
  Verify individual-level time series
           │
           ▼
[Phase 2: Sequence Extraction & Validation QC]
  Slice 24-hour windows (T=288) at >=80% completeness
  Verify zero demographic leakage into features
           │
           ▼
[Phase 3: Frozen Inference (Zero Retraining / Tuning)]
  Load locked checkpoint: glucosense_combined_cnn_lstm.pt
  Forward pass on Cohort Set A (N=175 baseline)
  Forward pass on Cohort Set B (N=116 longitudinal)
           │
           ▼
[Phase 4: Synthesis & Documentation]
  Generate docs/MOBILE_EXTERNAL_VALIDATION_REPORT.md
  Present sensitivity, probability distributions, FN taxonomy
```

---

## 7. Current Directive

**STOP HERE.**  
- Do **NOT** download MOBILE files.  
- Do **NOT** train any models.  
- Do **NOT** execute any inference steps.  
- Await explicit user authorization before initiating Phase 0 or Phase 1.
