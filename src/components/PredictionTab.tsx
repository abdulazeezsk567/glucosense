/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Brain,
  Cpu,
  RefreshCw,
  ClipboardCheck,
  ArrowRight,
  Activity,
  AlertTriangle,
  FileText,
  ShieldAlert,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { PredictionOutput } from '../types';

interface PredictionTabProps {
  currentGlucose: number;
  onAddAssessment: (newRecord: {
    patientName: string;
    avgGlucose: number;
    riskLevel: 'Normal' | 'Prediabetes' | 'Type 2';
    confidence: number;
  }) => void;
}

// Generate realistic synthetic 24-hour CGM profiles (288 readings @ 5-min intervals)
function generateSyntheticTrace(type: 'normal' | 'prediabetes' | 'type2' | 'insufficient' | 'broken_gap'): number[] {
  if (type === 'insufficient') {
    // Only 12 hours (144 samples)
    return Array.from({ length: 144 }, (_, i) => {
      const base = 100 + 8 * Math.sin((i / 144) * 2 * Math.PI);
      const noise = (Math.sin(i * 1.7) * 4);
      return Math.round(base + noise);
    });
  }

  if (type === 'broken_gap') {
    // 100 readings, gap, then 50 readings (no continuous 288-sample window)
    return Array.from({ length: 100 }, (_, i) => Math.round(110 + 5 * Math.sin(i / 10)));
  }

  return Array.from({ length: 288 }, (_, i) => {
    const hour = (i * 5) / 60; // 0 to 24
    let base = 95;
    let amp = 15;

    if (type === 'normal') {
      base = 98;
      // Mild postprandial blips after breakfast (8am), lunch (1pm), dinner (7pm)
      const meal1 = Math.exp(-Math.pow(hour - 8.5, 2) / 1.5) * 35;
      const meal2 = Math.exp(-Math.pow(hour - 13.5, 2) / 1.5) * 40;
      const meal3 = Math.exp(-Math.pow(hour - 19.5, 2) / 1.5) * 45;
      const noise = Math.sin(i * 0.8) * 3;
      return Math.round(base + meal1 + meal2 + meal3 + noise);
    } else if (type === 'prediabetes') {
      base = 118;
      amp = 30;
      const meal1 = Math.exp(-Math.pow(hour - 8.5, 2) / 2.5) * 55;
      const meal2 = Math.exp(-Math.pow(hour - 13.5, 2) / 2.5) * 60;
      const meal3 = Math.exp(-Math.pow(hour - 19.5, 2) / 3.0) * 65;
      const noise = Math.sin(i * 0.9) * 5;
      return Math.round(base + meal1 + meal2 + meal3 + noise);
    } else {
      // Type 2 diabetes pattern: sustained high baseline with pronounced excursions
      base = 165;
      const meal1 = Math.exp(-Math.pow(hour - 8.5, 2) / 4.0) * 80;
      const meal2 = Math.exp(-Math.pow(hour - 13.5, 2) / 4.0) * 85;
      const meal3 = Math.exp(-Math.pow(hour - 19.5, 2) / 4.5) * 90;
      const noise = Math.sin(i * 0.7) * 7;
      return Math.round(base + meal1 + meal2 + meal3 + noise);
    }
  });
}

export default function PredictionTab({ currentGlucose, onAddAssessment }: PredictionTabProps) {
  // Input raw CGM trace state
  const [cgmReadings, setCgmReadings] = useState<number[]>(() => generateSyntheticTrace('normal'));
  const [rawTextInput, setRawTextInput] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string>('normal');

  // Loading and analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [prediction, setPrediction] = useState<PredictionOutput | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Preset switch handler
  const handleSelectPreset = (type: 'normal' | 'prediabetes' | 'type2' | 'insufficient' | 'broken_gap') => {
    setSelectedPreset(type);
    const trace = generateSyntheticTrace(type);
    setCgmReadings(trace);
    setRawTextInput('');
    setPrediction(null);
    setErrorMessage(null);
  };

  // Parse custom raw text
  const handleParseRawText = (text: string) => {
    setRawTextInput(text);
    if (!text.trim()) return;
    const tokens = text.split(/[\s,;\n\r]+/);
    const parsed: number[] = [];
    for (const t of tokens) {
      if (!t.trim()) continue;
      const n = parseFloat(t);
      if (!isNaN(n) && n >= 20 && n <= 500) {
        parsed.push(Math.round(n));
      }
    }
    if (parsed.length > 0) {
      setCgmReadings(parsed);
      setSelectedPreset('custom');
      setPrediction(null);
      setErrorMessage(null);
    }
  };

  // Sync current single glucose into trace
  const handleSyncCurrentGlucose = () => {
    if (cgmReadings.length >= 288) {
      const updated = [...cgmReadings.slice(1), Math.round(currentGlucose)];
      setCgmReadings(updated);
    } else {
      setCgmReadings([...cgmReadings, Math.round(currentGlucose)]);
    }
    setPrediction(null);
  };

  // Execute Neural Risk Analysis via real inference API
  const runAssessmentModel = async () => {
    setIsAnalyzing(true);
    setPrediction(null);
    setErrorMessage(null);

    const steps = [
      'Ingesting 24-hour CGM sequence (5-min intervals)...',
      'Validating physiological bounds [30 - 500 mg/dL]...',
      'Computing glucose rate of change (ROC) first difference...',
      'Applying frozen combined standardizer (Hall + CGMacros)...',
      'Executing 1D CNN-LSTM temporal convolutions & recurrent cells...',
      'Aggregating soft voting probabilities across valid windows...',
    ];

    let currentStepIdx = 0;
    setAnalysisStep(steps[0]);

    const stepInterval = setInterval(() => {
      currentStepIdx++;
      if (currentStepIdx < steps.length) {
        setAnalysisStep(steps[currentStepIdx]);
      }
    }, 280);

    try {
      // Call Express same-origin reverse proxy API endpoint /api/ml/predict
      const response = await fetch('/api/ml/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readings: cgmReadings })
      });

      clearInterval(stepInterval);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || errData.error || `Server returned HTTP ${response.status}`);
      }

      const data: PredictionOutput = await response.json();
      setPrediction(data);

      if (data.status === 'success') {
        const predClass = data.prediction || data.classification;
        const riskLevel: 'Normal' | 'Prediabetes' | 'Type 2' =
          predClass.includes('Type 2') ? 'Type 2' :
          predClass.includes('Prediabetes') ? 'Prediabetes' : 'Normal';

        const avgG = cgmReadings.length > 0
          ? Math.round(cgmReadings.reduce((a, b) => a + b, 0) / cgmReadings.length)
          : 100;

        const confScore = Math.round(
          data.confidence > 1.0 ? data.confidence : data.confidence * 100
        );

        onAddAssessment({
          patientName: 'Active CGM Profile',
          avgGlucose: avgG,
          riskLevel,
          confidence: confScore
        });
      }
    } catch (err: any) {
      clearInterval(stepInterval);
      setErrorMessage(err.message || 'Failed to communicate with the ML inference service.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getThemeByClass = (type?: string) => {
    if (!type) return null;
    if (type.includes('Type 2')) {
      return {
        title: 'Model classification: Type 2 Diabetes risk category',
        color: 'text-[#ffb4ab]',
        border: 'border-[#ffb4ab]/30',
        bg: 'bg-[#93000a]/20',
        pill: 'bg-[#93000a]/40 text-[#ffdad6] border-[#ffb4ab]/30',
        progressColor: 'bg-[#ffb4ab]',
      };
    } else if (type.includes('Prediabetes')) {
      return {
        title: 'Model classification: Prediabetes / Early Type 2 risk category',
        color: 'text-amber-400',
        border: 'border-amber-500/30',
        bg: 'bg-amber-500/10',
        pill: 'bg-amber-500/20 text-amber-300 border-amber-500/35',
        progressColor: 'bg-amber-400',
      };
    } else {
      return {
        title: 'Model classification: Normal glucose tolerance category',
        color: 'text-[#42e09a]',
        border: 'border-[#42e09a]/30',
        bg: 'bg-[#42e09a]/10',
        pill: 'bg-[#42e09a]/20 text-[#42e09a] border-[#42e09a]/35',
        progressColor: 'bg-[#42e09a]',
      };
    }
  };

  const resultsTheme = prediction?.status === 'success' ? getThemeByClass(prediction.prediction || prediction.classification) : null;
  const hoursCovered = ((cgmReadings.length * 5) / 60).toFixed(1);

  return (
    <div id="prediction-tab" className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Prototype Identification */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight text-[#d4e4fa] font-sans flex items-center gap-2.5">
            <Brain className="w-7 h-7 text-[#5adace]" />
            AI Glycemic Risk Assessment
          </h2>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-[#5adace]/15 text-[#5adace] border border-[#5adace]/30">
            Research prototype — not a medical diagnosis
          </span>
        </div>
        <p className="text-xs text-[#c6c6cd] mt-1.5 leading-relaxed">
          Frozen multi-cohort 1D CNN-LSTM model trained exclusively on 24-hour continuous glucose monitoring (CGM) telemetry and rate-of-change dynamics.
        </p>
      </div>

      {/* Mandatory Medical Safety Disclaimer Banner */}
      <div className="bg-[#122131]/90 border border-amber-500/40 rounded-xl p-3.5 flex items-start gap-3 backdrop-blur shadow-sm">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-[#e6edf3] leading-relaxed">
          <strong className="text-amber-300 font-semibold">Medical Safety Disclaimer:</strong> This AI model is a research prototype and has not been clinically validated. It is not intended to diagnose, treat, or manage diabetes. Consult a qualified healthcare professional for medical decisions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CGM Telemetry Ingestion Sidebar (Col-span 5) */}
        <div className="lg:col-span-5 bg-[#122131]/80 border border-[#45464d]/30 rounded-2xl p-6 space-y-6 backdrop-blur">
          <div className="flex items-center justify-between border-b border-[#45464d]/20 pb-3">
            <h3 className="font-semibold text-xs text-[#d4e4fa] uppercase tracking-wider font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#5adace]" />
              CGM Telemetry Sequence
            </h3>
            <button
              onClick={handleSyncCurrentGlucose}
              className="text-xs text-[#5adace] hover:text-[#42e09a] transition-colors flex items-center gap-1 cursor-pointer"
              title="Append latest reading to sequence"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Append Latest</span>
            </button>
          </div>

          {/* Demo / Test Data Presets */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#c6c6cd] block">
                Demo / Test Data Presets:
              </label>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-medium">
                Synthetic Test Traces
              </span>
            </div>
            <p className="text-[11px] text-[#93a2b8] leading-tight">
              Synthetic demonstration waveforms for interface testing. These are <strong>not real patient data</strong>, <strong>not clinically validated examples</strong>, and <strong>not medically recommended glucose profiles</strong>.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleSelectPreset('normal')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  selectedPreset === 'normal'
                    ? 'bg-[#42e09a]/15 border-[#42e09a] text-[#42e09a] font-semibold'
                    : 'bg-[#1c2b3c]/60 border-[#45464d]/30 text-[#c6c6cd] hover:border-[#5adace]/50'
                }`}
              >
                Demo: Normal Curve
                <span className="block text-[10px] opacity-75 font-mono">Demo / Test · 288 pts (~98 mg/dL)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('prediabetes')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  selectedPreset === 'prediabetes'
                    ? 'bg-amber-500/15 border-amber-400 text-amber-300 font-semibold'
                    : 'bg-[#1c2b3c]/60 border-[#45464d]/30 text-[#c6c6cd] hover:border-[#5adace]/50'
                }`}
              >
                Demo: Prediabetes Curve
                <span className="block text-[10px] opacity-75 font-mono">Demo / Test · 288 pts (~132 mg/dL)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('type2')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  selectedPreset === 'type2'
                    ? 'bg-[#ffb4ab]/15 border-[#ffb4ab] text-[#ffb4ab] font-semibold'
                    : 'bg-[#1c2b3c]/60 border-[#45464d]/30 text-[#c6c6cd] hover:border-[#5adace]/50'
                }`}
              >
                Demo: Type 2 Risk Curve
                <span className="block text-[10px] opacity-75 font-mono">Demo / Test · 288 pts (~195 mg/dL)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('insufficient')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  selectedPreset === 'insufficient'
                    ? 'bg-rose-500/20 border-rose-400 text-rose-300 font-semibold'
                    : 'bg-[#1c2b3c]/60 border-[#45464d]/30 text-[#c6c6cd] hover:border-[#5adace]/50'
                }`}
              >
                Demo: Incomplete (&lt;24h)
                <span className="block text-[10px] opacity-75 font-mono">Demo / Test · 144 pts (12 hours)</span>
              </button>
            </div>
          </div>

          {/* Sequence Statistics Metric Card */}
          <div className="bg-[#0d1c2d] p-3.5 rounded-xl border border-[#45464d]/25 space-y-2 font-mono text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[#c6c6cd]">Readings Loaded:</span>
              <span className={`font-bold ${cgmReadings.length >= 288 ? 'text-[#42e09a]' : 'text-amber-400'}`}>
                {cgmReadings.length} samples
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#c6c6cd]">Sampling Interval:</span>
              <span className="text-[#d4e4fa]">5 minutes</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#c6c6cd]">Duration Covered:</span>
              <span className="text-[#d4e4fa]">{hoursCovered} / 24.0 hours</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#c6c6cd]">Window Requirement:</span>
              <span className={`font-semibold ${cgmReadings.length >= 288 ? 'text-[#42e09a]' : 'text-amber-400'}`}>
                {cgmReadings.length >= 288 ? 'Satisfied (≥288)' : 'Insufficient (<288)'}
              </span>
            </div>
          </div>

          {/* Custom CGM Values Paste */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#c6c6cd] flex items-center justify-between">
              <span>Or Paste Custom CGM Values:</span>
              <FileText className="w-3.5 h-3.5 text-[#5adace]" />
            </label>
            <textarea
              rows={3}
              value={rawTextInput}
              onChange={(e) => handleParseRawText(e.target.value)}
              placeholder="Paste comma or newline separated glucose values (mg/dL)..."
              className="w-full bg-[#0d1c2d] border border-[#45464d]/40 rounded-xl p-3 text-xs font-mono text-[#d4e4fa] placeholder-[#c6c6cd]/40 focus:outline-none focus:border-[#5adace]"
            />
          </div>

          {/* Core Inference CTA Button */}
          <button
            onClick={runAssessmentModel}
            disabled={isAnalyzing || cgmReadings.length === 0}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#42e09a] to-[#5adace] hover:opacity-90 disabled:opacity-40 text-[#051424] font-bold rounded-xl transition-all shadow-lg shadow-[#42e09a]/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <Cpu className="w-5 h-5 animate-spin" />
                <span>Running CNN-LSTM Forward Pass...</span>
              </>
            ) : (
              <>
                <Brain className="w-5 h-5" />
                <span>Run AI Glycemic Risk Assessment</span>
              </>
            )}
          </button>
        </div>

        {/* Output Diagnostics Panel (Col-span 7) */}
        <div className="lg:col-span-7 bg-[#122131]/80 border border-[#45464d]/30 rounded-2xl p-6 min-h-[480px] flex flex-col justify-between backdrop-blur">
          
          {/* Default Placeholder */}
          {!isAnalyzing && !prediction && !errorMessage && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-[#1c2b3c] border border-[#45464d]/20 flex items-center justify-center mb-4">
                <Cpu className="w-8 h-8 text-[#5adace]/70" />
              </div>
              <h4 className="font-semibold text-base text-[#d4e4fa]">Awaiting 24-Hour CGM Telemetry</h4>
              <p className="text-xs text-[#c6c6cd] max-w-sm mt-2 leading-relaxed">
                Select a benchmark 24-hour trace or enter CGM values on the left panel, then click <strong>"Run AI Glycemic Risk Assessment"</strong> to execute inference.
              </p>
              <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-[#c6c6cd]/60">
                <Clock className="w-3.5 h-3.5 text-[#5adace]" />
                <span>Requires exactly 288 samples (5-min intervals = 24h)</span>
              </div>
            </div>
          )}

          {/* Running Calculation Loader */}
          {isAnalyzing && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-[#273647] border-t-[#5adace] animate-spin"></div>
                <Brain className="w-6 h-6 text-[#5adace] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <div>
                <span className="font-mono text-xs uppercase tracking-widest text-[#5adace] font-semibold block animate-pulse">
                  CNN-LSTM TEMPORAL SEQUENCE EVALUATION
                </span>
                <p className="text-xs text-[#c6c6cd] mt-2 font-mono italic">
                  {analysisStep}
                </p>
              </div>
            </div>
          )}

          {/* Connection Error View */}
          {!isAnalyzing && errorMessage && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-rose-400" />
              </div>
              <h4 className="font-semibold text-base text-rose-300">Inference Service Error</h4>
              <p className="text-xs text-[#c6c6cd] max-w-md leading-relaxed">
                {errorMessage}
              </p>
              <p className="text-[11px] font-mono text-[#c6c6cd]/60">
                Verify that the Python inference service is running via: <br />
                <code className="text-[#5adace]">python ml/inference_server.py</code>
              </p>
            </div>
          )}

          {/* Safe Rejection: Insufficient Data */}
          {!isAnalyzing && prediction && prediction.status === 'insufficient_data' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <h4 className="font-semibold text-lg text-amber-300">
                  Insufficient CGM data for reliable assessment.
                </h4>
                <p className="text-xs text-[#c6c6cd] max-w-md mt-2 leading-relaxed">
                  {prediction.message || "At least 24 hours of sufficiently complete CGM data (288 samples at 5-minute intervals) is required."}
                </p>
              </div>

              <div className="bg-[#0d1c2d] p-4 rounded-xl border border-[#45464d]/25 text-left text-xs font-mono space-y-1.5 max-w-md w-full">
                <div className="flex justify-between">
                  <span className="text-[#c6c6cd]">Samples Provided:</span>
                  <span className="text-amber-400 font-bold">{cgmReadings.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#c6c6cd]">Minimum Required:</span>
                  <span className="text-[#d4e4fa]">288 samples (24 hours)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#c6c6cd]">Decision Policy:</span>
                  <span className="text-[#5adace]">Zero fabrication / Safe rejection</span>
                </div>
              </div>

              <p className="text-[11px] text-[#c6c6cd]/70 italic">
                In strict adherence to medical safety boundaries, incomplete traces are rejected rather than artificially filled.
              </p>
            </div>
          )}

          {/* Success Outcome: AI Glycemic Risk Assessment Display */}
          {!isAnalyzing && prediction && prediction.status === 'success' && resultsTheme && (
            <div className="flex-1 flex flex-col justify-between space-y-5 animate-in fade-in duration-300">
              
              {/* Header result with Non-Diagnostic classification */}
              <div className="border-b border-[#45464d]/20 pb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#5adace] block mb-1">
                  AI GLYCEMIC RISK ASSESSMENT · FROZEN CNN-LSTM
                </span>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <h3 className={`text-lg font-bold font-sans ${resultsTheme.color}`}>
                    {resultsTheme.title}
                  </h3>
                  <div className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${resultsTheme.pill}`}>
                    Confidence: {(prediction.confidence > 1.0 ? prediction.confidence : prediction.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Data Quality Information Card */}
              <div className="bg-[#0d1c2d]/70 p-3.5 rounded-xl border border-[#45464d]/20 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#42e09a]" />
                  <span className="text-[#c6c6cd]">Valid 24h Windows:</span>
                  <span className="text-[#d4e4fa] font-bold">{prediction.valid_windows || 1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#c6c6cd]">Sampling Interval:</span>
                  <span className="text-[#d4e4fa]">5 min</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#c6c6cd]">Coverage:</span>
                  <span className="text-[#42e09a] font-bold">
                    {Math.round((prediction.data_quality?.coverage || 1.0) * 100)}%
                  </span>
                </div>
              </div>

              {/* Class Probability Simplex Distribution */}
              <div className="space-y-3.5 bg-[#0d1c2d]/90 p-4 rounded-xl border border-[#45464d]/20">
                <h4 className="text-xs font-semibold text-[#c6c6cd] uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#5adace]" />
                  Class Softmax Probabilities
                </h4>

                <div className="space-y-2.5 pt-1">
                  {/* Category 1: Normal */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-[#c6c6cd]">Normal Range Profile</span>
                      <span className="text-[#42e09a] font-bold">
                        {(prediction.probabilities.normal > 1.0 ? prediction.probabilities.normal : prediction.probabilities.normal * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-[#1c2b3c] h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#42e09a] rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, prediction.probabilities.normal > 1.0 ? prediction.probabilities.normal : prediction.probabilities.normal * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Category 2: Prediabetes / Early Type 2 */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-[#c6c6cd]">Prediabetes / Early Type 2</span>
                      <span className="text-amber-400 font-bold">
                        {(prediction.probabilities.prediabetes > 1.0 ? prediction.probabilities.prediabetes : prediction.probabilities.prediabetes * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-[#1c2b3c] h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, prediction.probabilities.prediabetes > 1.0 ? prediction.probabilities.prediabetes : prediction.probabilities.prediabetes * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Category 3: Type 2 Diabetes */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-[#c6c6cd]">Type 2 Diabetes Risk</span>
                      <span className="text-[#ffb4ab] font-bold">
                        {((prediction.probabilities.type2_diabetes ?? prediction.probabilities.type2) > 1.0
                          ? (prediction.probabilities.type2_diabetes ?? prediction.probabilities.type2)
                          : (prediction.probabilities.type2_diabetes ?? prediction.probabilities.type2) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-[#1c2b3c] h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#ffb4ab] rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (prediction.probabilities.type2_diabetes ?? prediction.probabilities.type2) > 1.0 ? (prediction.probabilities.type2_diabetes ?? prediction.probabilities.type2) : (prediction.probabilities.type2_diabetes ?? prediction.probabilities.type2) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Research Observations & Next Steps */}
              {prediction.recommendations && prediction.recommendations.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold text-[#c6c6cd] uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <ClipboardCheck className="w-4 h-4 text-[#5adace]" />
                    Research Observations
                  </h4>

                  <ul className="space-y-2 pt-0.5">
                    {prediction.recommendations.map((rec, index) => (
                      <li
                        key={index}
                        className="text-xs text-[#d4e4fa] flex items-start gap-2.5 bg-[#1c2b3c]/40 p-2.5 rounded-lg border border-[#45464d]/10"
                      >
                        <ArrowRight className="w-4 h-4 text-[#5adace] mt-0.5 shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Informative model fine-print */}
              <div className="text-[10px] text-[#c6c6cd]/50 font-mono text-center pt-2 border-t border-[#45464d]/10">
                Decision Rule: argmax(probabilities) on soft voting window aggregate. Model weights: models/combined_cnn_lstm.pt (Frozen).
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
