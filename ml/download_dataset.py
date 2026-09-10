"""
GlucoSense: Dataset Acquisition Script
Downloads the real, open-access Hall et al. (2018) clinical CGM dataset from PLOS Biology.
Reference: Hall et al., "Glucotypes reveal new patterns of glucose dysregulation",
PLOS Biology 2018, 16(7): e2005143. DOI: 10.1371/journal.pbio.2005143
License: Creative Commons Attribution (CC-BY 4.0)
"""

import os
import urllib.request
import gzip
import sqlite3
import pandas as pd
import argparse

RAW_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "raw")

URLS = {
    # S1 Data: Raw continuous glucose monitoring recordings (5-min intervals)
    "cgm_s1": "https://doi.org/10.1371/journal.pbio.2005143.s010",
    # S5 Data: SQLite database containing participant characteristics, ADA diagnosis, and insulin metrics
    "clinical_s5": "https://doi.org/10.1371/journal.pbio.2005143.s014",
    # S8 Data: Insulin secretion rate during OGTT
    "insulin_s8": "https://doi.org/10.1371/journal.pbio.2005143.s017"
}


def download_file(url: str, dest_path: str, is_gzip: bool = False, decompressed_path: str = None):
    if os.path.exists(dest_path) and (not decompressed_path or os.path.exists(decompressed_path)):
        print(f"[SKIP] File already exists: {dest_path}")
        return

    print(f"[DOWNLOADING] {url} -> {dest_path}...")
    headers = {"User-Agent": "GlucoSense-Research/1.0 (Academic Research; Python/urllib)"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as response:
        content = response.read()

    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    with open(dest_path, "wb") as f:
        f.write(content)
    print(f"[SUCCESS] Downloaded {len(content):,} bytes to {dest_path}")

    if is_gzip and decompressed_path:
        print(f"[DECOMPRESSING] {dest_path} -> {decompressed_path}...")
        uncompressed = gzip.decompress(content)
        with open(decompressed_path, "wb") as f:
            f.write(uncompressed)
        print(f"[SUCCESS] Decompressed {len(uncompressed):,} bytes to {decompressed_path}")


def download_all():
    os.makedirs(RAW_DATA_DIR, exist_ok=True)

    # 1. Download CGM time series (S1 Data)
    s1_gz = os.path.join(RAW_DATA_DIR, "pbio.2005143.s010.gz")
    s1_tsv = os.path.join(RAW_DATA_DIR, "cgm_readings_raw.tsv")
    download_file(URLS["cgm_s1"], s1_gz, is_gzip=True, decompressed_path=s1_tsv)

    # 2. Download clinical metadata SQLite database (S5 Data)
    s5_db = os.path.join(RAW_DATA_DIR, "clinical_metadata.db")
    download_file(URLS["clinical_s5"], s5_db)

    # 3. Download insulin secretion rate (S8 Data)
    s8_tsv = os.path.join(RAW_DATA_DIR, "insulin_secretion_rate.tsv")
    download_file(URLS["insulin_s8"], s8_tsv)


def verify_dataset():
    s1_tsv = os.path.join(RAW_DATA_DIR, "cgm_readings_raw.tsv")
    s5_db = os.path.join(RAW_DATA_DIR, "clinical_metadata.db")

    if not os.path.exists(s1_tsv) or not os.path.exists(s5_db):
        raise FileNotFoundError("Raw dataset files not found. Run download_all() first.")

    # Verify CGM readings
    cgm_df = pd.read_csv(s1_tsv, sep="\t")
    print("\n================ CGM DATASET VERIFICATION ================")
    print(f"Total CGM Records: {len(cgm_df):,}")
    print(f"Columns: {list(cgm_df.columns)}")
    print(f"Unique Subjects with CGM: {cgm_df['subjectId'].nunique()}")
    print(f"Glucose Range: {cgm_df['GlucoseValue'].min()} - {cgm_df['GlucoseValue'].max()} mg/dL")
    print(f"Sample Records:\n{cgm_df.head(3)}")

    # Verify Clinical DB
    conn = sqlite3.connect(s5_db)
    clinical_df = pd.read_sql("SELECT * FROM clinical", conn)
    conn.close()

    print("\n============= CLINICAL METADATA VERIFICATION =============")
    print(f"Total Clinical Participants: {len(clinical_df)}")
    print(f"Diagnosis Breakdown:\n{clinical_df['diagnosis'].value_counts()}")
    print(f"Participants with Insulin Data: {clinical_df['insulin'].notna().sum()}")
    print(f"Mean Fasting Blood Glucose (FBG): {clinical_df['FBG'].mean():.1f} mg/dL")
    print(f"Mean HbA1c: {clinical_df['A1C'].mean():.2f}%")
    print("==========================================================\n")

    # Export a unified clean participants summary CSV for quick inspection
    participants_csv = os.path.join(RAW_DATA_DIR, "participants_summary.csv")
    clinical_cols = ["userID", "Age", "BMI", "A1C", "FBG", "insulin", "diagnosis", "glucotype", "mean_glucose", "sd_glucose"]
    clinical_df[clinical_cols].to_csv(participants_csv, index=False)
    print(f"[SAVED] Participants summary exported to {participants_csv}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download and verify Hall et al. (2018) CGM dataset")
    parser.add_argument("--verify", action="store_true", help="Only verify already downloaded files")
    args = parser.parse_args()

    if not args.verify:
        download_all()
    verify_dataset()
