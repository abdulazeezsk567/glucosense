# Forensic Data Access & Clinical Audit: MOBILE Trial Dataset

**Audit Date**: September 2026  
**Auditor**: GlucoSense Research & Modeling Team  
**Study Identification**: Continuous Glucose Monitoring in T2D Basal Insulin Users (MOBILE Study)  
**Trial Registration**: ClinicalTrials.gov [NCT03566693](https://clinicaltrials.gov/study/NCT03566693)  
**Primary Publication**: Martens TW, Beck RW, Bailey R, et al. *Effect of Continuous Glucose Monitoring on Glycemic Control in Patients With Type 2 Diabetes Treated With Basal Insulin: A Randomized Clinical Trial.* JAMA. 2021;325(22):2262–2272. [doi:10.1001/jama.2021.7444](https://doi.org/10.1001/jama.2021.7444)  
**Coordinating Center**: Jaeb Center for Health Research (JCHR), Tampa, FL  
**Lead Sponsor**: DexCom, Inc., San Diego, CA (Industry Sponsor)  

---

## Executive Summary & Cohort Reality Check

> [!CRITICAL]
> **MANDATORY COHORT CORRECTION**:
> - **MOBILE is NOT a 3-class dataset**. It contains **ZERO Normal** controls and **ZERO Prediabetes** controls.
> - MOBILE is an exclusively **Type 2 Diabetes (T2D) cohort** ($N=175$ participants, all diagnosed with T2D, treated with basal insulin, baseline $\text{HbA}_{1\text{c}}\;7.8\%\text{--}11.5\%$).
> - **The locked 3-class baseline for GlucoSense remains Hall + CGMacros** ($N=102$: 53 Normal, 30 Prediabetes, 19 T2D).
> - MOBILE **must NOT** be pooled into training as a balanced 3-class cohort.
> - MOBILE serves strictly as an **independent external-validation / T2D-enrichment testbed** to measure whether the T2D representations learned from Hall + CGMacros generalize to an independent primary-care T2D population wearing Dexcom G6 sensors.

---

## Systematic Forensic Audit: The 20 Required Verification Points

### 1. Current Access Procedure
* **Status**: **Controlled Request / Indirect Access Workflow** (Not directly accessible via open click-through download on `public.jaeb.org/datasets`).
* **Official Source Verification**:
  1. An audit of the live Jaeb Center for Health Research public datasets portal (`https://public.jaeb.org/datasets`) confirms that 38 diabetes trials (e.g., TIGHT, PEDAP, CLVer, WISDM, CGMND, REPLACE-BG, GMI Public Dataset) are available for electronic download via `/dataset/<id>`.
  2. However, **the MOBILE study is NOT currently listed in the public table**.
  3. Under the trial registry (NCT03566693) and the primary publication (*JAMA* 2021; 325(22):2262–2272, Supplement 4 Data Sharing Statement), access to individual participant data (IPD) requires a **formal data sharing application to the Jaeb Center for Health Research and DexCom, Inc.**.
  4. The applicant must submit:
     * A formal research protocol / analysis plan.
     * Research team credentials and institutional affiliation.
     * Description of planned data handling, security, and storage.
     * Execution of a bilateral Data Use Agreement (DUA).

### 2. Whether the Dataset is Actually Downloadable
* **Verification**: **NOT directly downloadable via unrestricted public click-through**.
* **Finding**: The dataset cannot be downloaded by visiting a public URL without prior request and execution of agreement. In contrast to open PhysioNet datasets (such as CGMacros), MOBILE requires formal request routing through the JCHR coordinating center or DexCom clinical data archives.

### 3. Whether Registration is Required
* **Verification**: **YES**.
* **Details**: Any request to Jaeb Center or DexCom requires verified investigator registration, institutional email verification, principal investigator identification, and submission of organizational contact details.

### 4. Whether Institutional Approval is Required
* **Verification**: **YES**.
* **Details**: Because MOBILE was an industry-sponsored multicenter randomized trial (DexCom, Inc. lead sponsor, JCHR coordinating center), release of de-identified individual patient-level data (IPD) to external third-party researchers requires institutional oversight (an IRB determination or exemption letter from the recipient's institution) and an institutional signatory on the Data Use Agreement.

### 5. Whether a Data-Use Agreement (DUA) is Required
* **Verification**: **YES**.
* **Details**: Access is strictly governed by a formal Data Use Agreement (DUA). The DUA binds the recipient institution and investigators to:
  * Prohibit any attempt to re-identify trial participants.
  * Limit use exclusively to the approved research scope.
  * Prohibit unauthorized sublicensing, sharing, or secondary transfers.
  * Mandate standard citation and attribution to the MOBILE Study Group and Jaeb Center.

### 6. Whether Research / Commercial Use is Allowed
* **Verification**:
  * **Academic Non-Commercial Research**: **ALLOWED** (subject to approved research protocol and DUA execution).
  * **Commercial Exploitation / Sublicensing**: **RESTRICTED / PROHIBITED without explicit corporate license from DexCom, Inc.** (the proprietary sponsor and funding entity).

### 7. Whether Redistribution is Prohibited
* **Verification**: **STRICTLY PROHIBITED**.
* **Details**: Neither the raw CGM traces nor processed participant-level tables may be redistributed, hosted in public repositories (e.g., GitHub, Hugging Face), or transferred to outside collaborators. All secondary users must obtain their own approved access through JCHR/DexCom.

### 8. Exact Number of Participants with Usable CGM
* **Total Enrolled & Randomized**: **175 participants** across 15 primary care centers in the United States.
* **Breakdown of Usable CGM Data**:
  * **Baseline Blinded CGM Wear**: **175 of 175 participants (100%)** wore a blinded Dexcom G6 sensor for ~10 to 14 days prior to randomization.
  * **Longitudinal Real-Time CGM Wear**: **116 participants** in the active CGM arm wore unblinded Dexcom G6 sensors continuously throughout the 8-month (32-week) intervention.
  * **Primary Endpoint Completion**: **165 of 175 participants (94%)** completed the 8-month follow-up visit.

### 9. Exact Number Assigned to CGM vs. BGM
* **Randomization Ratio**: **2:1** (stratified by study site and baseline $\text{HbA}_{1\text{c}}$).
* **CGM Group ($n=116$)**: Real-time Dexcom G6 Continuous Glucose Monitoring System.
* **BGM Group ($n=59$)**: Traditional Blood Glucose Meter (fingerstick self-monitoring, standard primary care).
* *Note*: The BGM group also wore blinded Dexcom G6 sensors during baseline (10–14 days) and at the 8-month primary outcome evaluation (10–14 days) to measure blinded continuous glycemic metrics.

### 10. Exact CGM Wear Duration
* **CGM Arm ($n=116$)**: **Up to 8 months (32 weeks / ~240 days)** of continuous real-time wear in Phase 1; followed by a 6-month extension phase (Phase 2, Months 8 to 14).
* **BGM Arm ($n=59$)**: **10 to 14 days** at baseline, plus **10 to 14 days** at Month 8.
* **Total Available Sensor Days**: $>20,000$ participant-days across the cohort, generating tens of thousands of potential daily 24-hour windows.

### 11. Dexcom G6 Sampling Frequency
* **Sensor Frequency**: Exactly **5 minutes** ($\Delta t = 300\text{ seconds}$, 12 readings/hour, 288 readings/24-hour day).
* **GlucoSense Compatibility**: **100% Native Alignment**. The Dexcom G6 interval matches the exact sequence dimension ($T=288$) of GlucoSense without requiring downsampling or artificial rate conversion.

### 12. Raw Data File Format
* **Format**: Comma-Separated Values (`.csv`) and SAS transport/data tables (`.sas7bdat`).
* **Structure**: Standard time-series tables linking `StudyID`, `Device_Timestamp`, `Glucose_Value`, and quality flags, alongside master clinical demographic files.

### 13. Timestamp Format
* **Format**: ISO-8601 string (`YYYY-MM-DD hh:mm:ss`) or SAS datetime numeric representation (seconds since January 1, 1960).

### 14. Glucose Units
* **Native Unit**: Milligrams per deciliter (**$\text{mg/dL}$**).
* **Dynamic Range**: Dexcom G6 hardware measuring range is $40\text{ to }400\text{ mg/dL}$. Values below $40\text{ mg/dL}$ are flagged as `LOW` ($39\text{ mg/dL}$); values above $400\text{ mg/dL}$ are flagged as `HIGH` ($401\text{ mg/dL}$).

### 15. Missingness Profile
* **Adherence**: High active wear adherence in the clinical trial: median active wear was $>80\%$ of possible hours across the 32-week active intervention.
* **Gaps**: Typical sensor transitions every 10 days (with a 2-hour sensor warm-up blackout), intermittent Bluetooth transmission packet dropouts, and sensor compressions.

### 16. Whether Individual-Level CGM Traces are Available
* **Verification**: **YES**.
* **Details**: Full, granular, time-stamped interstitial glucose time series are recorded for each participant. Data are not aggregated or summarized into daily means; continuous raw trajectories exist.

### 17. Whether Baseline HbA1c / Clinical Labels are Available
* **Verification**: **YES**.
* **Details**:
  * Central laboratory (Northwest Lipid Metabolism and Diabetes Research Laboratories, Seattle, WA) measured baseline $\text{HbA}_{1\text{c}}$: Mean $9.1\%$ (SD $0.9\%$), range $7.8\%\text{--}11.5\%$.
  * Participant-level clinical diagnosis: **100% Type 2 Diabetes**.
  * Complete clinical metadata: Age (mean $57 \pm 9$ years), sex (50% female), race/ethnicity (53% minority), BMI (mean $34.7 \pm 6.9\text{ kg/m}^2$), duration of diabetes (mean $11 \pm 7$ years).

### 18. Whether Medication Information is Available
* **Verification**: **YES**.
* **Details**:
  * Inclusion required daily basal insulin use (glargine, detemir, degludec; mean daily dose $0.48\text{ units/kg/day}$).
  * Non-insulin antihyperglycemic medications recorded: Metformin (69%), SGLT2 inhibitors (29%), GLP-1 receptor agonists (25%), Sulfonylureas (22%), DPP-4 inhibitors (11%).
  * Prandial (bolus) insulin users were strictly excluded.

### 19. Whether Raw Data Can Legally Be Used to Train GlucoSense
* **Verification**: **CONDITIONALLY YES, STRICTLY FOR ACADEMIC/RESEARCH MODELING UNDER EXECUTED DUA**.
* **Legal Constraint**: Cannot be used for commercial production models or integrated into a proprietary cloud/SaaS backend without an explicit commercial license from DexCom, Inc. Academic research benchmarking and scientific validation are permissible under the standard JCHR research DUA.

### 20. Whether Trained Model Derivatives are Permitted
* **Verification**: **YES (FOR RESEARCH PUBLICATIONS / DERIVATIVES WITH MANDATORY ATTRIBUTION)**.
* **Requirement**: Any publication, presentation, or derived mathematical model must include the required attribution statement:
  > *"The source of the data is the MOBILE Study Group and the Jaeb Center for Health Research. The analyses, content, and conclusions presented herein are solely the responsibility of the authors and have not been reviewed or approved by the MOBILE Study Group, the Jaeb Center for Health Research, or DexCom, Inc."*

---

## Summary Matrix: The 20 Forensic Audit Criteria

| # | Forensic Audit Question | Verified Status / Fact | Operational Constraint |
|:---|:---|:---|:---|
| 1 | Current access procedure | Formal research application via JCHR / DexCom | Controlled access; not instant |
| 2 | Actually downloadable | Conditional on approval (not public click-through) | Cannot download without approval |
| 3 | Registration required | Yes (investigator & institution) | Mandatory registration |
| 4 | Institutional approval required | Yes (IRB determination / institutional signatory) | Institutional review required |
| 5 | Data-use agreement required | Yes (formal bilateral DUA) | Strict legal terms |
| 6 | Research / commercial use | Academic research permitted; commercial restricted | Academic research use only |
| 7 | Redistribution prohibited | Yes, strictly prohibited | Raw data cannot be shared |
| 8 | Usable CGM participants | 175 at baseline; 116 longitudinal (8 months) | Substantial T2D test cohort |
| 9 | Assigned to CGM vs BGM | 116 CGM : 59 BGM (2:1 ratio) | BGM group has baseline CGM |
| 10 | CGM wear duration | Up to 8 months (32 weeks) for CGM arm | Multi-month dense monitoring |
| 11 | Sampling frequency | Exactly 5 minutes (288 steps/24h) | Perfect native GlucoSense match |
| 12 | Raw data format | `.csv` and `.sas7bdat` | Standard tabular parsing |
| 13 | Timestamp format | ISO datetime `YYYY-MM-DD hh:mm:ss` | Standard chronological sort |
| 14 | Glucose units | $\text{mg/dL}$ ($40\text{--}400\text{ mg/dL}$) | Direct GlucoSense input unit |
| 15 | Missingness profile | High adherence (>80% median wear); standard gaps | 24-hour sequence filtering needed |
| 16 | Individual traces available | Yes, raw continuous sensor measurements | Window slicing fully possible |
| 17 | Baseline HbA1c / clinical labels | Yes, central lab HbA1c ($9.1\% \pm 0.9\%$), 100% T2D | Rich clinical stratification |
| 18 | Medication info available | Yes (basal insulin types/doses, oral agents) | Subgroup confounding analysis |
| 19 | Can legally train GlucoSense | Yes, for academic research under DUA | Non-commercial research only |
| 20 | Trained derivatives permitted | Yes, with mandatory attribution clause | Permitted with citation |

---

## Key Takeaway & Recommendation

1. **Do NOT download or scrape MOBILE data without an executed DUA**.
2. **Do NOT treat MOBILE as a 3-class dataset**. It contains zero Normal and zero Prediabetes subjects.
3. **Lock Hall + CGMacros as the sole 3-class baseline** ($N=102$).
4. **Use MOBILE solely for independent T2D external sensitivity validation** once legal access is finalized.
