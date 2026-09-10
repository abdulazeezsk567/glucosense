# External T2D Validation Report: Locked Hall + CGMacros Model on Independent MOBILE Cohort

**Execution Date**: September 2026  
**Evaluation Model**: `glucosense_combined_cnn_lstm.pt` (Locked Hall + CGMacros 3-Class Baseline)  
**Model Architecture**: 1D CNN + BiLSTM with Scaled CGM Inputs (Glucose + Rate of Change)  
**Decision Rule / Cutoff**: Frozen Argmax Classification ($c \in \{0: \text{Normal}, 1: \text{Prediabetes}, 2: \text{T2D}\}$, fixed decision threshold $0.333$)  
**Target Evaluation Cohort**: Independent MOBILE Trial (NCT03566693, Martens et al., *JAMA* 2021)  
**Device Generation**: Dexcom G6 Continuous Glucose Monitoring System (5-minute resolution, $T=288$)  
**Final Classification Decision**: **D. Insufficient usable MOBILE data**  

---

## Executive Summary & Cohort Reality Check

> [!CRITICAL]
> **MANDATORY COHORT BOUNDARY & STATISTICAL CONSTRAINTS**:
> 1. **MOBILE is an exclusively Type 2 Diabetes (T2D) cohort** ($N=175$ participants, 100% diagnosed with T2D). It contains **zero Normal** controls and **zero Prediabetes** controls.
> 2. **This is NOT a 3-class evaluation**:
>    - **Overall 3-class accuracy** CANNOT be reported as a primary metric.
>    - **Specificity** ($TN / (TN + FP)$) is mathematically **undefined ($0/0$)**.
>    - **Balanced Accuracy**, **Normal Recall**, and **Prediabetes Recall** CANNOT be estimated from MOBILE alone because they require control cohorts.
> 3. **Validation Focus**: This external evaluation is strictly constrained to **T2D Sensitivity (Recall)**, **Softmax Probability Distribution Analysis**, and **False-Negative Error Characterization**.
> 4. **Model Immutability**: The model was evaluated in its strictly frozen state (`combined_cnn_lstm.pt` / `glucosense_combined_cnn_lstm.pt`) without threshold tuning or parameter re-estimation.

---

## 1. Primary Evaluation Metrics & Cohort Accounting

In strict compliance with GlucoSense data governance and the 20-point forensic audit ([`docs/MOBILE_DATA_ACCESS_AUDIT.md`](file:///c:/Users/Abdul%20Azeez/Downloads/glucosense/glucosense/docs/MOBILE_DATA_ACCESS_AUDIT.md)), the cohort screening and usability status are documented below:

| # | Metric | Verified Value | Forensic Operational Context |
|:---|:---|:---|:---|
| 1 | **Number of MOBILE participants in trial** | **175** | 116 assigned to CGM; 59 assigned to BGM (Martens et al., *JAMA* 2021) |
| 2 | **Number available in approved local environment** | **0** | No raw participant traces acquired locally |
| 3 | **Number with usable CGM** | **0** | 0 complete 24-hour sequences available locally |
| 4 | **Number excluded** | **175** (100%) | All trial participants currently excluded from inference execution |
| 5 | **Exact exclusion reasons** | **Pending Institutional DUA & Controlled Access Approval** | MOBILE individual participant data (IPD) is not publicly downloadable via click-through. Release requires a formal research protocol, institutional IRB determination, and an executed bilateral Data Use Agreement (DUA) between the investigator's institution, the Jaeb Center for Health Research (JCHR), and DexCom, Inc. (lead commercial sponsor). ClinicalTrials.gov NCT03566693 explicitly declares `ipdSharing: "NO"`. |
| 6 | **Total CGM duration available** | **0 days** | Monitored in trial: 10–14 days baseline for 175 participants; 32 weeks for 116 participants; 0 days locally acquired |
| 7 | **Total usable 24-hour windows** | **0 windows** | Criteria: $T=288$ consecutive 5-min readings at $\ge 80\%$ completeness |
| 8 | **Patient-level T2D sensitivity / recall** | **N/A** (No usable data) | Undefined due to absence of local telemetry files |
| 9 | **Window-level T2D sensitivity / recall** | **N/A** (No usable data) | Undefined due to absence of local telemetry files |
| 10 | **Number of false negatives** | **0 observed** (N/A) | No instances evaluated |
| 11 | **False-negative breakdown (Normal vs. Prediabetes)** | **N/A** | No instances evaluated |
| 12 | **Predicted T2D probability (Mean / Median / IQR)** | **N/A** | Softmax distribution cannot be computed without input sequences |

---

## 2. Phase A: Baseline Blinded CGM Evaluation

* **Target Population**: All $N=175$ participants enrolled in MOBILE who completed the 10-to-14-day blinded Dexcom G6 wear period prior to randomized intervention.
* **Clinical Setting**: Primary-care adults with poorly controlled T2D treated with basal insulin (mean $\text{HbA}_{1\text{c}}\;9.1 \pm 0.9\%$, mean age $57 \pm 9$ years, BMI $34.7 \pm 6.9\text{ kg/m}^2$).
* **Evaluation Status**: **Precluded by absence of acquired raw telemetry files**.
* **Usable Baseline Windows Extracted**: **0**.
* **Patient-Level Baseline Sensitivity**: **N/A**.
* **Methodological Finding**: When legal DUA clearance is finalized and raw files are transferred, Phase A will serve as the primary external benchmark because blinded wear isolates genuine T2D glycemic dynamics without behavioral feedback confounding.

---

## 3. Phase B: Longitudinal Active CGM Evaluation

* **Target Population**: The $N=116$ participants randomized to the active, unblinded real-time Dexcom G6 arm who wore sensors for up to 8 months (32 weeks / ~240 days).
* **Isolation Rule**: Evaluated strictly separately from Phase A (results must never be pooled).
* **Evaluation Status**: **Precluded by absence of acquired raw telemetry files**.
* **Participants Evaluated**: **0**.
* **Windows Evaluated**: **0**.
* **Participant-Level Sensitivity**: **N/A**.
* **Window-Level Sensitivity**: **N/A**.
* **Methodological Finding**: In Phase B, participants underwent basal insulin dose titration, and mean $\text{HbA}_{1\text{c}}$ dropped from $9.1\%$ to $8.0\%$ (time in range $70\text{--}180\text{ mg/dL}$ increased from $38\%$ to $59\%$). Evaluating Phase B separately will reveal whether successful pharmacotherapy causes the model to transition from T2D predictions to Prediabetes predictions (pharmacological boundary shift).

---

## 4. Phase C: Error Analysis Framework

Because raw sensor traces have not been transferred, zero false-negative classifications were observed. However, the exact error taxonomy protocol is locked as follows:

For every future false-negative participant ($\text{FN}$), the pipeline will extract:
1. **Pseudonymous Participant ID**: Trial-assigned subject ID (no PHI).
2. **Predicted Class**: Categorized as **Prediabetes** ($c=1$) or **Normal** ($c=0$).
3. **Softmax Output Vector**: $[P(\text{Normal}), P(\text{Prediabetes}), P(\text{T2D})]$.
4. **Window Glycemic Metrics**:
   - Mean glucose ($\text{mg/dL}$)
   - Glucose standard deviation ($\text{SD}$)
   - Time in Range ($70\text{--}180\text{ mg/dL}$)
   - Time below range ($<70\text{ mg/dL}$)
5. **Clinical Confounders**:
   - Baseline $\text{HbA}_{1\text{c}}$ ($<8.5\%$ vs. $\ge 8.5\%$)
   - Daily basal insulin dose ($\text{units/kg/day}$)
   - Concomitant SGLT2i or GLP-1 RA therapy

*Rule Confirmation*: These clinical confounders will be analyzed solely to understand physiological misclassification mechanisms; they will **never** be used as model inputs or to modify the model weights.

---

## 5. Phase D: Generalization Performance Across GlucoSense Benchmarks

To establish rigorous context, the table below compares all evaluated cohorts in the GlucoSense research lineage:

| Evaluation Phase | Cohort & Dataset | Hardware Device | Total T2D Sample | Ground Truth T2D Recall | Dominant Confusion Mode |
|:---|:---|:---|:---:|:---:|:---|
| **Internal CV** | Hall et al. (Stanford) | Dexcom G4 Platinum | $N=5$ | **100.0%** (5/5) | None (overfitting risk on tiny cohort) |
| **Internal Test** | CGMacros (PhysioNet) | Dexcom G6 Pro | $N=2$ | **100.0%** (2/2) | None in test; high FP in validation |
| **Cross-Cohort Test** | Hall + CGMacros Combined | Dexcom G4 + G6 Pro | $N=3$ | **66.7%** (2/3) | Prediabetes $\leftrightarrow$ T2D Boundary Shift |
| **External Validation** | **MOBILE (Jaeb / DexCom)** | **Dexcom G6** | **$N=0$ (175 unacquired)** | **N/A** | **Data Governance Barrier (DUA Required)** |

### Scientific Distinction Between Validation Tiers
1. **Internal Test Performance**: Evaluates generalization within the same clinical protocol and identical patient distribution (Hall internal split, CGMacros internal split). Subject to cohort-specific bias.
2. **Cross-Cohort Validation**: Evaluates generalization across different study protocols and sensor generations (Hall Dexcom G4 $\leftrightarrow$ CGMacros Dexcom G6 Pro). Demonstrated significant sensor distribution shift and Prediabetes/T2D boundary overlap.
3. **External Cohort Validation**: Evaluates frozen model on completely independent, geographically distinct primary-care populations (MOBILE).
4. **Clinical Validation Warning**: This external evaluation is an **engineering and algorithmic benchmark**, **NOT a clinical validation**. It does not constitute regulatory clearance, diagnostic validity, or evidence of clinical efficacy under FDA or CE-MDR standards.

---

## 6. Phase E: Data Governance & Local Storage Verification

In accordance with Phase E requirements and the JCHR/DexCom compliance framework:
1. **Local Storage Audit**: Confirmed that no unauthorized, un-governed, or pirated MOBILE data exists on local storage.
2. **Public Repository Cleanliness**: Confirmed that no participant-level data, raw traces, or identifying information have been committed to git or uploaded to public storage.
3. **Redistribution Prevention**: All raw data redistribution prohibitions remain strictly enforced.
4. **Compliance Status**: Full compliance maintained with institutional review policies, JCHR access procedures, and HIPAA/GDPR data protection standards.

---

## 7. Artifact Summary

The following artifacts have been generated and committed to the results archive:
- **Metrics JSON**: [`results/mobile_external_validation.json`](file:///c:/Users/Abdul%20Azeez/Downloads/glucosense/glucosense/results/mobile_external_validation.json)
- **Status & Screening Plot**: `results/mobile/mobile_validation_status.png`

---

## Final Classification Decision

Based on the objective verification of cohort availability, absence of locally acquired raw telemetry traces, and the prerequisite for an executed institutional Data Use Agreement (DUA) with the Jaeb Center for Health Research and DexCom, Inc.:

$$\mathbf{FINAL\;DECISION:\;D.\;Insufficient\;usable\;MOBILE\;data}$$

**Per explicit instruction, the model checkpoints, frontend, and backend remain completely unchanged. Execution is stopped.**
