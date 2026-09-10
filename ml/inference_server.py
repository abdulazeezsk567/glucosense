"""
GlucoSense: FastAPI Model Inference Service
Exposes RESTful endpoints on http://127.0.0.1:8000 for real-time
CNN-LSTM diabetes classification and glycemic-risk assessment.
"""

import os
import sys
from typing import List, Optional, Any, Union, Dict
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel, Field
import json
import numpy as np

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

RESULTS_DIR = os.path.join(PROJECT_ROOT, "results")

from ml.inference import GlucoSenseInferenceEngine

app = FastAPI(
    title="GlucoSense ML Inference Service",
    description="Frozen 1D CNN-LSTM Continuous Glucose Monitoring (CGM) Glycemic-Risk Inference API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lazy singleton model loader
engine: Optional[GlucoSenseInferenceEngine] = None


def get_engine() -> GlucoSenseInferenceEngine:
    global engine
    if engine is None:
        engine = GlucoSenseInferenceEngine.get_instance()
    return engine


class MLPredictRequest(BaseModel):
    readings: Optional[Union[List[Dict[str, Any]], List[float]]] = Field(
        default=None,
        description="Array of 5-minute CGM readings (values or {timestamp, glucose} objects)"
    )
    is_mmol_l: Optional[bool] = Field(default=None, description="Set True if readings are in mmol/L")


class PredictRequest(BaseModel):
    readings: Optional[Union[List[Dict[str, Any]], List[float]]] = Field(default=None)
    glucose_readings: Optional[List[float]] = Field(default=None, description="CGM glucose readings in mg/dL")
    current_glucose: Optional[float] = Field(default=None, description="Single/latest glucose reading")
    is_mmol_l: Optional[bool] = Field(default=None)
    # Clinical and lifestyle fields safely ignored during model inference
    fasting_insulin: Optional[float] = None
    hba1c: Optional[float] = None
    bmi: Optional[float] = None
    age: Optional[float] = None
    is_pregnant: Optional[bool] = False
    blood_pressure_systolic: Optional[float] = None
    blood_pressure_diastolic: Optional[float] = None
    physical_activity: Optional[str] = None
    dietary_habit: Optional[str] = None
    carb_intake_g: Optional[float] = None


class AnalyzeCGMRequest(BaseModel):
    readings: List[Any] = Field(..., description="Array of continuous glucose readings (mg/dL)")
    fasting_insulin: Optional[float] = None
    hba1c: Optional[float] = None
    bmi: Optional[float] = None
    is_pregnant: Optional[bool] = False
    blood_pressure_systolic: Optional[float] = None
    blood_pressure_diastolic: Optional[float] = None
    physical_activity: Optional[str] = None
    dietary_habit: Optional[str] = None


@app.get("/", response_class=HTMLResponse)
def index_root():
    return """
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>GlucoSense ML Service</title>
      <meta http-equiv="refresh" content="2; url=http://localhost:3000" />
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #051424; color: #d4e4fa; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { background: #122131; border: 1px solid rgba(66, 224, 154, 0.4); padding: 2rem; border-radius: 1rem; text-align: center; max-width: 480px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        h1 { color: #5adace; margin-top: 0; font-size: 1.4rem; }
        p { color: #c6c6cd; font-size: 0.9rem; line-height: 1.5; }
        a { display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem; background: #42e09a; color: #051424; text-decoration: none; border-radius: 0.5rem; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>GlucoSense ML Service Online</h1>
        <p>This port (8000) runs the PyTorch CNN-LSTM inference backend.</p>
        <p>The interactive web dashboard is hosted on <strong>port 3000</strong>.</p>
        <a href="http://localhost:3000">Open Dashboard (http://localhost:3000) &rarr;</a>
      </div>
    </body>
    </html>
    """


@app.get("/favicon.ico")
def favicon():
    return Response(status_code=204)


@app.get("/health")
def health_check():
    eng = get_engine()
    return {
        "status": "online",
        "service": "GlucoSense-ML",
        "model_loaded": eng.model is not None,
        "device": eng.device,
        "model_version": eng.metadata.get("version", "1.0.0-combined")
    }


@app.get("/model-info")
@app.get("/api/ml/model-info")
def model_info():
    eng = get_engine()
    return {
        "model_name": "GlucoSense Combined CNN-LSTM",
        "model_metadata": eng.metadata,
        "scaler_config": {
            "features": eng.scaler.get("feature_names", ["glucose", "rate_of_change"]),
            "window_size": eng.scaler.get("window_size", 288),
            "means": eng.means,
            "stds": eng.stds,
            "classes": eng.classes
        },
        "input": {
            "type": "24-hour continuous glucose monitoring (CGM)",
            "sequence_samples": 288,
            "sampling_interval_minutes": 5,
            "features": ["glucose", "rate_of_change"],
            "input_tensor_shape": [None, 288, 2]
        },
        "classes": [
            "Normal",
            "Prediabetes / Early Type 2",
            "Type 2 Diabetes"
        ],
        "training_cohorts": {
            "cohorts": ["Hall (PLoS Biology 2018)", "CGMacros (PhysioNet 2025)"],
            "total_participants": 102,
            "t2d_participants": 19
        },
        "evaluation": {
            "held_out_participants": 16,
            "patient_accuracy": 0.6875,
            "patient_balanced_accuracy": 0.6481,
            "patient_macro_f1": 0.6317,
            "per_class_recall": {
                "normal": 0.778,
                "prediabetes": 0.500,
                "type2_diabetes": 0.667
            },
            "per_class_precision": {
                "normal": 0.875,
                "prediabetes": 0.667,
                "type2_diabetes": 0.400
            },
            "note": "These are research evaluation results on the held-out combined cohort, NOT clinical validation results."
        },
        "external_validation": {
            "cohort": "MOBILE",
            "status": "Not completed",
            "note": "External validation was not completed because participant-level traces were not acquired under controlled-access legal DUA requirements."
        },
        "disclaimer": "This AI model is a research prototype and has not been clinically validated. It is not intended to diagnose, treat, or manage diabetes. Consult a qualified healthcare professional for medical decisions."
    }


@app.post("/api/ml/predict")
def ml_predict_endpoint(req: MLPredictRequest):
    """
    Primary 24-hour CGM inference endpoint.
    Strictly requires sufficiently complete 24-hour CGM data (288 samples).
    """
    try:
        eng = get_engine()
        if not req.readings or len(req.readings) == 0:
            raise HTTPException(status_code=400, detail="Readings array cannot be empty")

        result = eng.predict(
            readings=req.readings,
            is_mmol_l=req.is_mmol_l,
            require_24h=True
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


@app.post("/predict")
def predict_endpoint(req: PredictRequest):
    """
    Prediction endpoint supporting both 24-hour CGM sequences and legacy test inputs.
    """
    try:
        eng = get_engine()
        raw = req.readings if req.readings is not None else req.glucose_readings
        if (not raw or len(raw) == 0) and req.current_glucose is not None:
            raw = [req.current_glucose] * 24

        if not raw or len(raw) == 0:
            raise HTTPException(status_code=400, detail="No glucose readings provided")

        # For legacy /predict endpoint, pad short numeric vectors to 24 steps
        if len(raw) < 24 and not isinstance(raw[0], dict):
            raw = list(raw) * (24 // len(raw) + 1)
            raw = raw[:24]

        result = eng.predict(
            readings=raw,
            is_mmol_l=req.is_mmol_l,
            require_24h=False  # Allow short sequences for legacy compatibility
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


@app.post("/analyze-cgm")
def analyze_cgm_endpoint(req: AnalyzeCGMRequest):
    """
    Analyzes CGM readings for time-in-range telemetry and feed-forward neural classification.
    """
    try:
        eng = get_engine()
        if not req.readings or len(req.readings) == 0:
            raise HTTPException(status_code=400, detail="Readings array cannot be empty")

        # Extract numeric values
        vals = []
        for v in req.readings:
            if v is None:
                continue
            if isinstance(v, dict):
                g = v.get("glucose") or v.get("value")
                if g is not None:
                    try:
                        vals.append(float(g))
                    except (ValueError, TypeError):
                        pass
            else:
                try:
                    vals.append(float(v))
                except (ValueError, TypeError):
                    pass

        if len(vals) == 0:
            raise HTTPException(status_code=400, detail="No valid numerical glucose readings found")

        # Standard clinical glycemic metrics
        mean_g = float(np.mean(vals))
        min_g = float(np.min(vals))
        max_g = float(np.max(vals))
        std_g = float(np.std(vals))
        cv = float((std_g / mean_g * 100.0) if mean_g > 0 else 0.0)

        total_pts = len(vals)
        arr = np.array(vals)
        tir_70_180 = float(np.sum((arr >= 70) & (arr <= 180)) / total_pts * 100.0)
        tbr_under_70 = float(np.sum(arr < 70) / total_pts * 100.0)
        tbr_under_54 = float(np.sum(arr < 54) / total_pts * 100.0)
        tar_over_180 = float(np.sum(arr > 180) / total_pts * 100.0)
        tar_over_250 = float(np.sum(arr > 250) / total_pts * 100.0)

        # Run model prediction
        pred_res = eng.predict(readings=vals, require_24h=False)

        return {
            "summary_metrics": {
                "reading_count": total_pts,
                "mean_glucose": round(mean_g, 1),
                "min_glucose": round(min_g, 1),
                "max_glucose": round(max_g, 1),
                "std_dev": round(std_g, 1),
                "coefficient_variation": round(cv, 1),
                "time_in_range_70_180": round(tir_70_180, 1),
                "time_below_range_under_70": round(tbr_under_70, 1),
                "time_below_range_under_54": round(tbr_under_54, 1),
                "time_above_range_over_180": round(tar_over_180, 1),
                "time_above_range_over_250": round(tar_over_250, 1)
            },
            "status": pred_res.get("status", "success"),
            "prediction": pred_res.get("prediction", "Normal"),
            "classification": pred_res.get("classification", "Normal"),
            "confidence": pred_res.get("confidence", 0.0),
            "probabilities": pred_res.get("probabilities", {}),
            "risk_assessment": pred_res.get("risk_assessment", {}),
            "model_metadata": pred_res.get("model_metadata", eng.metadata),
            "disclaimer": "This AI model is a research prototype and has not been clinically validated. It is not intended to diagnose, treat, or manage diabetes. Consult a qualified healthcare professional for medical decisions."
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CGM analysis error: {str(e)}")


@app.get("/benchmark-metrics")
def benchmark_metrics():
    try:
        table3_path = os.path.join(RESULTS_DIR, "table3_benchmark.json")
        fig4_path = os.path.join(RESULTS_DIR, "confusion_matrix_fig4.json")
        table3_data = {}
        fig4_data = {}
        if os.path.exists(table3_path):
            with open(table3_path, "r") as f:
                table3_data = json.load(f)
        if os.path.exists(fig4_path):
            with open(fig4_path, "r") as f:
                fig4_data = json.load(f)

        return {
            "status": "success",
            "table_iii": table3_data,
            "figure_iv": fig4_data,
            "training_curves_available": os.path.exists(os.path.join(RESULTS_DIR, "training_curves_fig5.png")),
            "confusion_matrix_available": os.path.exists(os.path.join(RESULTS_DIR, "5class_confusion_matrix.png"))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/figure/{name}")
def get_figure(name: str):
    allowed = {
        "fig4_confusion_matrix": "5class_confusion_matrix.png",
        "fig5_training_curves": "training_curves_fig5.png"
    }
    if name not in allowed:
        raise HTTPException(status_code=404, detail="Figure not found")
    fig_path = os.path.join(RESULTS_DIR, allowed[name])
    if not os.path.exists(fig_path):
        raise HTTPException(status_code=404, detail="Figure file missing")
    with open(fig_path, "rb") as f:
        content = f.read()
    return Response(content=content, media_type="image/png")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("ML_PORT", 8000))
    uvicorn.run(app, host="127.0.0.1", port=port)
