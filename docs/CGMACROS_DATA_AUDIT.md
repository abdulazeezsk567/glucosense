# CGMacros Dataset Forensic Audit & Compatibility Report

**Dataset**: CGMacros — Personalized Nutrition and Diet Monitoring  
**Source**: PhysioNet ([doi:10.13026/3z8q-x658](https://doi.org/10.13026/3z8q-x658))  
**Archive**: `CGMacros_dateshifted365.zip` (SHA256: `05c8b0e6f1a2757050aced55ce4bf6ab2ac9b30f2fd8ca193056812d9c621d4d`)  
**Auditor**: Antigravity Machine Learning Research Agent  
**Date**: September 2026  
**Status**: Completed — Ingestion Verified — Zero Training Performed  

---

## 1. Executive Summary

As directed in **Option A**, the complete **CGMacros** dataset was downloaded directly from PhysioNet's open AWS S3 mirror, cryptographically verified against the official `SHA256SUMS.txt`, extracted, and subjected to a comprehensive primary forensic audit and pipeline compatibility test.

### Key Milestones Achieved:
1. **Cryptographic & Enrollment Integrity**: SHA256 verification passed. Exactly **45 completed participants** were unpacked across 45 dedicated subject directories (`CGMacros-001` through `CGMacros-049`).
2. **Clinical Class Balance**: Exactly **15 Normal**, **16 Prediabetes**, and **14 Type 2 Diabetes** participants, directly mapped from venous blood laboratory HbA1c panels (`A1c PDL (Lab)`) per official ADA screening cutoffs.
3. **100% Participant Eligibility**: Zero participants were excluded. Every single participant ($45/45$) provided high-quality continuous telemetry yielding at least 7 non-overlapping 24-hour sequence windows (mean: 8.96 windows).
4. **Adapter Compatibility**: Successfully ingested through GlucoSense's `GenericCGMAdapter` and `ScalableCGMDataset`, producing canonical tensors of shape $(N, 288, 3)$ with **zero NaNs, zero Infs, and zero label contamination**.
5. **Major Cohort Expansion**: Yields **403 non-overlapping 24-hour windows** with balanced class representation ($135\text{ Normal} : 142\text{ Prediabetes} : 126\text{ T2D}$), providing a **$7.4\times$ increase in T2D 24-hour sequences** over the Hall et al. baseline (126 vs. 17).
6. **Safety Mandate Enforced**: No frontend/backend modifications, no checkpoint overwriting, and **no model training** was initiated.

---

## 2. Phase 1: Forensic Raw Data Audit

### 2.1 File and Directory Structure
The uncompressed dataset resides at `data/external/cgmacros/extracted/CGMacros/` and conforms to the following structure:

```text
data/external/cgmacros/
├── CGMacros_dateshifted365.zip          [626.7 MB, SHA256: 05c8b0e6...]
├── SHA256SUMS.txt                       [PhysioNet official checksums]
├── DataDictionary_Bio.csv               [Metadata schema dictionary]
├── DataDictionary_CGMacros-00X.csv      [Telemetry schema dictionary]
├── DataDictionary_Gut_Health_Test.csv   [Viome health score dictionary]
├── DataDictionary_Microbes.csv          [Microbiome detection dictionary]
├── LICENSE.txt                          [CC BY-NC-SA 4.0 Public License]
├── participant_audit_summary.csv        [Generated per-participant forensic summary]
├── normalized_metadata.csv              [GlucoSense adapter-compatible clinical metadata]
└── extracted/CGMacros/
    ├── bio.csv                          [45 rows x 24 clinical columns]
    ├── gut_health_test.csv              [45 rows x 23 gut health scores]
    ├── microbes.csv                     [45 rows x 1,980 microbial columns]
    ├── DataDictionary.pdf               [Full study protocol and data dictionary]
    ├── parse_data.ipynb                 [Authors' benchmark Jupyter notebook]
    └── CGMacros-0XX/                    [45 participant directories: 001 to 049]
        ├── CGMacros-0XX.csv             [Participant 1-minute telemetry file]
        └── photos/                      [Meal photographs for start/end ground truth]
```

### 2.2 Cohort Enumeration and Dropout Mapping
While the participant numbering ranges from `001` to `049`, exactly **45 participants** completed the study. Four subject IDs (`024`, `025`, `037`, `040`) were withdrawn during screening per the study protocol:
- **Completed Subjects**: `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 38, 39, 41, 42, 43, 44, 45, 46, 47, 48, 49]`.
- All 45 subject folders exist on disk and exactly match the 45 rows in `bio.csv`.

### 2.3 Diagnostic Class Ground Truth
Labels are derived from standardized American Diabetes Association (ADA) cutoffs on venous laboratory HbA1c panels (`A1c PDL (Lab)`) measured at the baseline screening visit by Pacific Diagnostic Laboratories (PDL):
- **Normal ($\text{HbA1c} < 5.7\%$ & no diabetes history)**: **15 participants** ($33.3\%$)
- **Prediabetes ($5.7\% \le \text{HbA1c} \le 6.4\%$)**: **16 participants** ($35.6\%$)
- **Type 2 Diabetes ($\text{HbA1c} > 6.4\%$ or clinical diagnosis)**: **14 participants** ($31.1\%$)

#### Complete 45-Participant Clinical Breakdown:
| Subject ID | Age | Sex | BMI (kg/m²) | Screening HbA1c (%) | Fasting Glucose (mg/dL) | Verified Clinical Class |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `CGMacros-001` | 27 | M | 22.27 | 5.4 | 91 | **Normal** |
| `CGMacros-002` | 49 | F | 30.95 | 5.5 | 93 | **Normal** |
| `CGMacros-003` | 59 | F | 26.95 | 6.5 | 118 | **Type 2 Diabetes** |
| `CGMacros-004` | 33 | F | 42.38 | 5.5 | 105 | **Normal** |
| `CGMacros-005` | 51 | F | 30.96 | 6.6 | 144 | **Type 2 Diabetes** |
| `CGMacros-006` | 51 | F | 29.30 | 5.2 | 96 | **Normal** |
| `CGMacros-007` | 66 | F | 27.07 | 5.9 | 108 | **Prediabetes** |
| `CGMacros-008` | 54 | M | 39.95 | 5.8 | 112 | **Prediabetes** |
| `CGMacros-009` | 34 | F | 37.00 | 5.7 | 122 | **Prediabetes** |
| `CGMacros-010` | 54 | F | 35.81 | 5.7 | 100 | **Prediabetes** |
| `CGMacros-011` | 34 | M | 29.16 | 5.7 | 109 | **Prediabetes** |
| `CGMacros-012` | 52 | M | 30.27 | 7.1 | 179 | **Type 2 Diabetes** |
| `CGMacros-013` | 56 | F | 32.63 | 6.2 | 103 | **Prediabetes** |
| `CGMacros-014` | 53 | M | 28.47 | 7.1 | 147 | **Type 2 Diabetes** |
| `CGMacros-015` | 47 | F | 24.34 | 5.4 | 89 | **Normal** |
| `CGMacros-016` | 48 | F | 45.94 | 5.8 | 104 | **Prediabetes** |
| `CGMacros-017` | 33 | F | 22.69 | 5.0 | 95 | **Normal** |
| `CGMacros-018` | 18 | M | 38.06 | 5.4 | 103 | **Normal** |
| `CGMacros-019` | 40 | F | 36.43 | 5.6 | 98 | **Normal** |
| `CGMacros-020` | 59 | F | 35.95 | 6.4 | 119 | **Prediabetes** |
| `CGMacros-021` | 63 | F | 25.67 | 5.3 | 98 | **Normal** |
| `CGMacros-022` | 69 | F | 20.69 | 5.9 | 107 | **Prediabetes** |
| `CGMacros-023` | 55 | M | 24.24 | 6.2 | 135 | **Prediabetes** |
| `CGMacros-026` | 35 | M | 31.17 | 5.9 | 104 | **Prediabetes** |
| `CGMacros-027` | 24 | F | 27.13 | 4.7 | 90 | **Normal** |
| `CGMacros-028` | 59 | F | 40.00 | 7.0 | 131 | **Type 2 Diabetes** |
| `CGMacros-029` | 52 | M | 29.52 | 6.1 | 136 | **Prediabetes** |
| `CGMacros-030` | 60 | F | 34.01 | 7.6 | 195 | **Type 2 Diabetes** |
| `CGMacros-031` | 46 | F | 23.11 | 5.1 | 102 | **Normal** |
| `CGMacros-032` | 64 | M | 22.92 | 5.3 | 100 | **Normal** |
| `CGMacros-033` | 40 | M | 30.04 | 5.6 | 116 | **Normal** |
| `CGMacros-034` | 24 | M | 25.80 | 4.6 | 80 | **Normal** |
| `CGMacros-035` | 45 | F | 28.73 | 8.5 | 218 | **Type 2 Diabetes** |
| `CGMacros-036` | 61 | M | 24.99 | 6.9 | 101 | **Type 2 Diabetes** |
| `CGMacros-038` | 52 | M | 34.46 | 7.2 | 151 | **Type 2 Diabetes** |
| `CGMacros-039` | 45 | F | 26.92 | 8.3 | 158 | **Type 2 Diabetes** |
| `CGMacros-041` | 58 | F | 27.85 | 6.3 | 138 | **Prediabetes** |
| `CGMacros-042` | 51 | F | 43.27 | 7.1 | 142 | **Type 2 Diabetes** |
| `CGMacros-043` | 45 | F | 49.09 | 6.0 | 96 | **Prediabetes** |
| `CGMacros-044` | 60 | F | 35.92 | 6.0 | 119 | **Prediabetes** |
| `CGMacros-045` | 46 | F | 32.88 | 6.1 | 148 | **Prediabetes** |
| `CGMacros-046` | 51 | M | 28.16 | 7.4 | 154 | **Type 2 Diabetes** |
| `CGMacros-047` | 62 | M | 31.38 | 6.9 | 150 | **Type 2 Diabetes** |
| `CGMacros-048` | 22 | F | 21.13 | 4.8 | 79 | **Normal** |
| `CGMacros-049` | 58 | F | 36.09 | 7.2 | 148 | **Type 2 Diabetes** |

### 2.4 Sensor Telemetry and Data Hygiene
- **Sensor Hardware**: Dual continuous monitoring with **Dexcom G6 Pro** (blinded, abdominal) and **Abbott FreeStyle Libre Pro** (blinded, upper arm).
- **Sampling Frequency**: Authors aligned all wearable sensors to a unified 1-minute grid (`Timestamp`), linearly interpolating between native Dexcom 5-minute sampling points.
- **Total Raw Observations**: **687,580 rows** across all 45 participant CSV files.
- **Dexcom G6 Pro Valid Readings**: **629,825 readings** (mean 13,996 per subject; nominal ~9.7 days of continuous 1-min readings).
- **Abbott Libre Pro Valid Readings**: **687,360 readings** (mean 15,275 per subject; nominal ~10.6 days of continuous 1-min readings).
- **Glucose Units**: **mg/dL** (native range: minimum $40.0\text{ mg/dL}$, maximum $400.0\text{ mg/dL}$).
- **Abnormal Glucose Values**: Exactly **0 values** outside the valid sensor range ($[40, 400]$).
- **Duplicate Timestamps**: Exactly **0 duplicate timestamps** across the entire dataset.
- **Duplicate Rows**: Exactly **0 duplicate rows**.
- **Monitoring Duration**: Range $7.23$ to $19.15$ days, Mean **$10.90$ days** per participant.

---

## 3. Phase 2: Pipeline Compatibility Test

### 3.1 Adapter Configuration
The dataset was transformed using `GenericCGMAdapter` with the following configuration:
```python
adapter = GenericCGMAdapter(
    telemetry_source=r"data\external\cgmacros\extracted\CGMacros\CGMacros-*\CGMacros-*.csv",
    metadata_file=r"data\external\cgmacros\normalized_metadata.csv",
    cohort_name="CGMacros PhysioNet Cohort",
    subject_col=None,  # Auto-derives subject_id from file stem (e.g., 'CGMacros-001')
    time_col="Timestamp",
    glucose_col="Dexcom GL",
    diagnosis_col="diagnosis",
    class_mapping={
        "normal": 0,
        "prediabetes": 1,
        "type 2 diabetes": 2
    },
    resample_interval_min=5,
    max_gap_split_min=60,
    max_interpolate_min=30,
    is_mmol_l=False
)
```

### 3.2 Ingestion and Episode Segmentation Results
- **Resampling**: Successfully aggregated to standard 5-minute intervals matching GlucoSense specifications.
- **Total Resampled Readings**: **127,096 points** across 10,587.4 monitored patient-hours.
- **Imputed Points**: 482 points (**0.38% imputation rate**), demonstrating exceptional sensor continuity.
- **Total Episodes**: **47 episodes** across 45 participants (43 participants formed a single contiguous episode; only 2 participants had a single disconnection gap $>60$ min).

### 3.3 24-Hour Sequence Window Extraction
Using `ScalableCGMDataset(window_size=288, stride=288)`:
- **Tensor Shape**: $X \in \mathbb{R}^{403 \times 288 \times 3}$, $y \in \mathbb{Z}^{403}$
- **Feature Channels**:
  - Channel 0: Interstitial Glucose ($mg/dL$)
  - Channel 1: Rate of Change / First Difference ($\Delta mg/dL$ per 5-min step)
  - Channel 2: Normalized Euglycemic Deviation ($(G - 100)/50$)
- **Data Integrity**: **0 NaNs**, **0 Infs** across all extracted tensors.

---

## 4. Phase 3: Dataset Quality Report

### 4.1 Ten Mandated Quality Metrics

| # | Quality Metric | Verified Value | Notes |
| :---: | :--- | :---: | :--- |
| **1** | **Raw participant count** | **45** | Screened from 49 recruited; subjects 24, 25, 37, 40 dropped during initial screening |
| **2** | **Eligible participant count** | **45** | 100% of participants meet all sequence continuity and duration criteria |
| **3** | **Excluded participant count** | **0** | No participant was excluded; all have $\ge 7$ full 24-hour sequence windows |
| **4** | **Class distribution (before filtering)** | **15 N / 16 Pre / 14 T2D** | Balanced: $33.3\% / 35.6\% / 31.1\%$ |
| **5** | **Class distribution (after filtering)** | **15 N / 16 Pre / 14 T2D** | Identical: Zero attrition |
| **6** | **Total raw CGM observations** | **687,580** (1-min) / **127,096** (5-min) | $6.5\times$ more raw observations than Hall baseline (105,426) |
| **7** | **Total usable 24-hour windows** | **403 non-overlapping windows** | 1,596 windows with 6h stride; 9,512 windows with 1h stride |
| **8** | **Windows per participant** | **Min: 7, Median: 9, Mean: 8.96, Max: 9** | Tight distribution across all 45 subjects |
| **9** | **Missingness statistics** | **0.38%** imputation on 5-min grid | Only 482 of 127,096 points required linear gap filling |
| **10** | **Continuous episode statistics** | **47 episodes across 45 participants** | Total monitored duration: 10,587.4 hours (~441 days) |

### 4.2 Window Yield by Clinical Class

```
Class 0 (Normal):          135 windows (33.50%)
Class 1 (Prediabetes):     142 windows (35.24%)
Class 2 (Type 2 Diabetes): 126 windows (31.27%)
-------------------------------------------------
Total 24h Windows:         403 windows (100.0%)
```

---

## 5. Comparative Benchmark: CGMacros vs. Locked Hall Baseline

| Metric | Locked Hall Baseline (2018) | CGMacros Ingestion (2025) | Impact for GlucoSense |
| :--- | :---: | :---: | :--- |
| **Participants Total** | 57 | **45** | Compact, high-compliance cohort |
| **Normal Participants** | 38 ($66.7\%$) | **15** ($33.3\%$) | Removes healthy-class skew |
| **Prediabetes Participants** | 14 ($24.6\%$) | **16** ($35.6\%$) | $+14.3\%$ expansion |
| **Type 2 Diabetes Participants** | **5** ($8.8\%$) | **14** ($31.1\%$) | **$+180.0\%$ expansion ($2.8\times$ participants)** |
| **Class Ratio (N : Pre : T2D)** | $7.6 : 2.8 : 1.0$ (Severely imbalanced) | **$1.1 : 1.1 : 1.0$ (Near-perfect parity)** | Eliminates majority-class bias |
| **Raw CGM Readings** | 105,426 | **687,580** | **$6.5\times$ more raw sensor observations** |
| **Total 24h Windows (Non-overlap)**| 263 | **403** | **$+53.2\%$ more sequences** |
| **T2D 24h Windows** | **17** ($6.5\%$) | **126** ($31.3\%$) | **$7.4\times$ increase in diabetic sequences** |
| **Sensor Hardware** | Dexcom G4 Platinum | Dexcom G6 Pro & Libre Pro | Modern factory-calibrated sensors |
| **Imputation Rate** | 1.84% | **0.38%** | $4.8\times$ lower missingness |

---

## 6. Exact Next Action

The audit and compatibility testing phases are complete and verified. As mandated by safety protocols:
- **No training has been run.**
- **Existing Hall checkpoints remain untouched.**
- The repository is fully prepared for reproducible, leak-free training of `GlucoSenseScalableCNNLSTM` on CGMacros once approved.

Awaiting user directive on whether to proceed with leak-free participant splitting ($70/15/15$), training-only standardizer calibration, and model training.
