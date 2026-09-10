# GlucoSense: Clinical Dataset Documentation

This document describes the continuous glucose monitoring (CGM) dataset acquired, cleaned, and utilized for the reproducible implementation of **GlucoSense: A Unified Deep Learning Framework for Multi-Class Diabetes Classification and Insulin-Aware Glycemic Risk Assessment Using CGM Data**.

---

## 1. Dataset Overview & Provenance

| Field | Description |
|---|---|
| **Dataset Title** | *Glucotypes reveal new patterns of glucose dysregulation* |
| **Authors** | Heather Hall, Dalia Perelman, Alessandra Breschi, Patricia Limcaoco, Rebecca Jiang, Tejaswini Rao, Colleen Shen, et al. (Michael Snyder Lab) |
| **Publication** | *PLOS Biology*, 2018, Volume 16, Issue 7, Article e2005143 |
| **Official DOI** | [10.1371/journal.pbio.2005143](https://doi.org/10.1371/journal.pbio.2005143) |
| **License** | Creative Commons Attribution (CC-BY 4.0) — Open Access, unrestricted use |
| **Hosting Organization** | Public Library of Science (PLOS) Official Corpus Repository |
| **Automated Downloader** | `python ml/download_dataset.py` |

---

## 2. Cohort Demographics & Diagnostic Criteria

The dataset contains comprehensive continuous glucose monitoring telemetry and clinical laboratory biomarkers from **57 human participants**.

Diagnoses were established according to standard **American Diabetes Association (ADA)** guidelines based on fasting plasma glucose (FPG), oral glucose tolerance test (OGTT 2-hour postprandial), and laboratory glycated hemoglobin ($\text{HbA}_{1\text{c}}$):

| Clinical Diagnosis | Participant Count | Percentage of Cohort | Description & ADA Thresholds |
|---|---|---|---|
| **Normal (`non-diabetic`)** | 38 | 66.7% | $\text{HbA}_{1\text{c}} < 5.7\%$, $\text{FPG} < 100\text{ mg/dL}$ |
| **Prediabetes (`pre-diabetic`)** | 14 | 24.6% | $\text{HbA}_{1\text{c}} \in [5.7\%, 6.4\%]$ or $\text{FPG} \in [100, 125]\text{ mg/dL}$ |
| **Type 2 Diabetes (`diabetic`)** | 5 | 8.8% | $\text{HbA}_{1\text{c}} \ge 6.5\%$ or $\text{FPG} \ge 126\text{ mg/dL}$ |
| **Total** | **57** | **100.0%** | Comprehensive multi-class metabolic cohort |

---

## 3. Sensor Technology & Data Acquisition

- **Device**: Dexcom G4 Platinum Continuous Glucose Monitor.
- **Sampling Frequency**: Every 5 minutes (288 observations per 24-hour cycle).
- **Measurement Units**: Milligrams per deciliter ($\text{mg/dL}$).
- **Sensor Range**: 40 to 400 $\text{mg/dL}$ (sensor boundary clips are flagged as `"Low"` and `"High"`).
- **Total Raw Readings**: **105,426 discrete observations** across all 57 subjects.
- **Monitoring Period**: Average of 2 to 4 weeks per participant under free-living conditions with standardized meal testing.

---

## 4. Feature Columns in Raw Data

### Primary CGM Telemetry (`pbio.2005143.s010.gz` / `cgm_readings_raw.tsv`)
1. `DisplayTime`: Sensor-recorded timestamp (`YYYY-MM-DD HH:MM:SS`).
2. `GlucoseValue`: Measured interstitial glucose concentration ($\text{mg/dL}$ or `"Low"` / `"High"` string).
3. `subjectId`: Unique participant identifier (e.g., `1636-69-001`).
4. `InternalTime`: Internal transmitter clock timestamp.

### Clinical & Metabolic Phenotyping (`pbio.2005143.s014` / `clinical_metadata.db`)
1. `userID`: Matching subject identifier.
2. `Age`: Participant chronological age in years (mean: 51.5 years).
3. `BMI`: Body Mass Index in $\text{kg/m}^2$ (mean: 26.8 $\text{kg/m}^2$).
4. `A1C`: Laboratory $\text{HbA}_{1\text{c}}$ percentage (mean: 5.41%).
5. `FBG`: Fasting blood glucose in $\text{mg/dL}$ (mean: 93.2 $\text{mg/dL}$).
6. `ogtt.2hr`: 2-hour blood glucose following 75g oral glucose tolerance challenge ($\text{mg/dL}$).
7. `insulin`: Fasting plasma insulin concentration ($\mu\text{IU/mL}$) available for 53 participants.
8. `SSPG`: Steady-State Plasma Glucose ($\text{mg/dL}$) quantifying insulin sensitivity.
9. `diagnosis`: ADA clinical classification (`non-diabetic`, `pre-diabetic`, `diabetic`).
10. `glucotype`: Glycemic variability cluster assignment (`low`, `moderate`, `severe`).

---

## 5. Data Cleaning & Quality Control

The preprocessing pipeline (`ml/preprocess.py`) applies the following clinical data engineering procedures:
1. **Sensor Boundary Imputation**: Readings recorded as `"Low"` are mapped to $40.0\text{ mg/dL}$ (the physical lower detection limit of the Dexcom sensor); readings recorded as `"High"` are mapped to $400.0\text{ mg/dL}$.
2. **Physiological Filtering**: Records outside the physiological range $[30.0, 500.0]\text{ mg/dL}$ are removed as non-physiological calibration artifacts.
3. **Timestamp Standardization & Deduplication**: Timestamps are parsed to ISO 8601 UTC datetimes and sorted chronologically per subject. Duplicate timestamps within the same minute are averaged.
4. **Episode Segmentation**: Telemetry streams are segmented into contiguous episodes whenever a sensor transmission gap exceeds 60 minutes, preventing artificial interpolation across multi-hour dropouts.
5. **Regularized Resampling**: Each episode is regularized to exactly 5-minute sampling intervals. Minor gaps ($\le 30$ minutes, corresponding to $\le 6$ missed readings) are imputed using linear interpolation.

---

## 6. Windowing & Feature Extraction

- **Sliding Window Size**: $L = 24$ steps (2 hours of continuous 5-minute telemetry).
- **Stride**: 6 steps (30-minute shift between consecutive windows).
- **Total Windows Extracted**: **16,935 sliding windows**.
- **Engineered Feature Channels ($C = 3$)**:
  1. $X_{t, 0}$: Standardized glucose reading ($G_t$).
  2. $X_{t, 1}$: Instantaneous rate of change ($\frac{dG}{dt} = \frac{G_t - G_{t-1}}{\Delta t}$ in $\text{mg/dL}$ per 5 minutes).
  3. $X_{t, 2}$: Setpoint deviation from euglycemic baseline ($\frac{G_t - 100}{50}$).

---

## 7. Leak-Free Patient-Level Splitting

To ensure 100% data integrity and prevent intra-patient correlation leakage (which artificially inflates model accuracy when random window splitting is used):
- Partitioning is performed strictly at the **participant level** (`subjectId`), stratified by diagnosis class.
- All 16,935 windows from a given participant belong exclusively to one split:

| Split | Number of Patients | Number of Windows | Class Distribution [Normal, Pre, T2D] |
|---|---|---|---|
| **Training Set** | 39 | 11,566 | [7,722, 2,962, 882] |
| **Validation Set** | 9 | 2,698 | [1,790, 595, 313] |
| **Held-Out Test Set** | 9 | 2,671 | [1,774, 597, 300] |
| **Total** | **57** | **16,935** | **Strictly Disjoint Patient Partitions** |

Feature scalers (mean and standard deviation) are fit **strictly on the Training split** and applied identically to validation and test splits via `models/scaler_config.json`.
