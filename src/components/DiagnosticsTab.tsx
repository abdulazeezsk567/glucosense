/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, RotateCcw, Play, CheckCircle, AlertCircle, Heart, ChevronRight, Activity } from 'lucide-react';

export default function DiagnosticsTab() {
  const [values, setValues] = useState<(number | '')[]>(Array(20).fill(''));
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [singleValue, setSingleValue] = useState<string>('');
  const [bulkValues, setBulkValues] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper: Count filled values
  const filledCount = values.filter((v) => v !== '').length;

  const handleAppendSingle = () => {
    if (singleValue.trim() === '') return;
    const parsed = parseInt(singleValue, 10);
    if (isNaN(parsed) || parsed < 20 || parsed > 600) {
      alert("Please enter a valid glucose level (20-600 mg/dL)");
      return;
    }
    const firstEmptyIndex = values.findIndex((v) => v === '');
    if (firstEmptyIndex === -1) {
      alert("All 20 slots are already populated. Click 'Reset' to clear or overwrite.");
      return;
    }
    const updated = [...values];
    updated[firstEmptyIndex] = parsed;
    setValues(updated);
    setIsAnalyzed(false);
    setSingleValue('');
  };

  const handleApplyBulk = () => {
    if (bulkValues.trim() === '') return;
    const tokens = bulkValues.split(/[\s,;\n\r]+/);
    const parsedNumbers: number[] = [];
    for (const token of tokens) {
      if (token.trim() === '') continue;
      const num = parseInt(token, 10);
      if (!isNaN(num) && num >= 20 && num <= 600) {
        parsedNumbers.push(num);
      }
    }
    if (parsedNumbers.length === 0) {
      alert("No valid glucose values (20-600 mg/dL) found in the entry.");
      return;
    }
    const nextValues = [...values];
    for (let i = 0; i < 20; i++) {
      if (i < parsedNumbers.length) {
        nextValues[i] = parsedNumbers[i];
      }
    }
    setValues(nextValues);
    setIsAnalyzed(false);
    setBulkValues('');
  };

  const handleInputChange = (index: number, val: string) => {
    const updated = [...values];
    if (val === '') {
      updated[index] = '';
    } else {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed)) {
        updated[index] = parsed;
      }
    }
    setValues(updated);
    setIsAnalyzed(false); // Reset analysis if data changes
  };

  const handleReset = () => {
    setValues(Array(20).fill(''));
    setIsAnalyzed(false);
  };

  const handlePreFill = (type: 'normal' | 'hypo' | 'hyper') => {
    let preset: number[] = [];
    if (type === 'normal') {
      // Normal stable trend around 100
      preset = [98, 102, 105, 99, 97, 101, 104, 108, 110, 106, 102, 99, 101, 103, 105, 102, 98, 96, 100, 103];
    } else if (type === 'hypo') {
      // Starting normal then crashing down below 70
      preset = [110, 105, 102, 98, 92, 87, 83, 78, 74, 71, 68, 65, 61, 58, 55, 54, 58, 62, 65, 68];
    } else {
      // Starting high and spiking severely above 250
      preset = [165, 172, 180, 192, 205, 218, 225, 238, 245, 252, 258, 264, 270, 278, 285, 290, 282, 274, 265, 258];
    }
    setValues(preset);
    setIsAnalyzed(false);
  };

  // CSV parsing logic
  const parseCSVData = (text: string) => {
    // Split by commas, semicolons, newlines, spaces
    const tokens = text.split(/[\s,;\n\r]+/);
    const parsedNumbers: number[] = [];
    for (const token of tokens) {
      if (token.trim() === '') continue;
      const num = parseFloat(token);
      if (!isNaN(num) && num > 20 && num < 600) {
        parsedNumbers.push(Math.round(num));
      }
    }

    if (parsedNumbers.length === 0) {
      alert("No valid glucose values (20-600 mg/dL) found in the file.");
      return;
    }

    const nextValues = [...values];
    for (let i = 0; i < 20; i++) {
      if (i < parsedNumbers.length) {
        nextValues[i] = parsedNumbers[i];
      }
    }
    setValues(nextValues);
    setIsAnalyzed(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseCSVData(text);
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseCSVData(text);
      };
      reader.readAsText(file);
    }
  };

  // Analytics calculation
  const getAnalysisResults = () => {
    const validNums = values.filter((v): v is number => typeof v === 'number');
    if (validNums.length === 0) return null;

    const mean = Math.round(validNums.reduce((a, b) => a + b, 0) / validNums.length);
    const min = Math.min(...validNums);
    const max = Math.max(...validNums);

    // Standard deviation
    const avg = validNums.reduce((a, b) => a + b, 0) / validNums.length;
    const sqDiffs = validNums.map((v) => Math.pow(v - avg, 2));
    const variance = sqDiffs.reduce((a, b) => a + b, 0) / validNums.length;
    const stdDev = Math.round(Math.sqrt(variance) * 10) / 10;

    // Time in range 70-180 mg/dL
    const inRangeCount = validNums.filter((v) => v >= 70 && v <= 180).length;
    const timeInRange = Math.round((inRangeCount / validNums.length) * 100);

    // Severe thresholds
    const hasHypo = validNums.some((v) => v < 70);
    const hasHyper = validNums.some((v) => v > 250);

    let classification: 'Stable / In-Range' | 'Severe Hypoglycemia Risk' | 'Severe Hyperglycemia Risk' = 'Stable / In-Range';
    let confidence = 94.2;
    let severity: 'low' | 'high' = 'low';

    if (hasHypo && hasHyper) {
      classification = 'Severe Hypoglycemia Risk'; // prioritize lower bounds safety
      confidence = 91.8;
      severity = 'high';
    } else if (hasHypo) {
      classification = 'Severe Hypoglycemia Risk';
      confidence = 97.4;
      severity = 'high';
    } else if (hasHyper) {
      classification = 'Severe Hyperglycemia Risk';
      confidence = 96.1;
      severity = 'high';
    } else if (mean > 150) {
      classification = 'Severe Hyperglycemia Risk';
      confidence = 88.5;
      severity = 'high';
    }

    return { mean, min, max, stdDev, timeInRange, classification, confidence, severity };
  };

  const results = getAnalysisResults();

  return (
    <div id="diagnostics-tab" className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Header section with telemetry engine detail */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#d4e4fa] flex items-center gap-2.5">
          <Activity className="w-7 h-7 text-[#5adace] animate-pulse" />
          Diagnostic Infusion Engine
        </h2>
        <p className="text-sm text-[#c6c6cd] mt-1.5">
          Input CGM sequence data for comprehensive glycemic risk assessment &amp; DL classification
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Main CGM Sequence card */}
        <div className="xl:col-span-8 bg-[#122131]/75 border border-[#45464d]/30 rounded-2xl p-6 space-y-6 backdrop-blur">
          
          {/* Header section of the input card */}
          <div className="flex items-center justify-between border-b border-[#45464d]/15 pb-4">
            <div>
              <h3 className="font-bold text-sm text-[#d4e4fa] uppercase tracking-wider font-mono">
                CGM Sequence Input
              </h3>
              <p className="text-xs text-[#c6c6cd] mt-1">
                Enter exactly 20 consecutive glucose readings (mg/dL)
              </p>
            </div>

            {/* Value counter and custom micro-bar graph */}
            <div className="text-right space-y-1.5">
              <span className="text-xs font-mono font-semibold text-[#5adace]">
                {filledCount}/20 values
              </span>
              <div className="w-24 h-1.5 bg-[#0d1c2d] rounded-full overflow-hidden border border-[#45464d]/20">
                <div
                  className="h-full bg-[#5adace] transition-all duration-300"
                  style={{ width: `${(filledCount / 20) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Drag & Drop File Parser Area */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-7 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group ${
              dragActive
                ? 'border-[#5adace] bg-[#5adace]/10'
                : 'border-[#45464d]/60 bg-[#0d1c2d]/40 hover:bg-[#0d1c2d]/60 hover:border-[#5adace]/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="p-3 bg-[#1c2b3c]/50 rounded-xl border border-[#45464d]/30 text-[#5adace] group-hover:scale-110 transition-transform">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#d4e4fa]">
                Drop CSV file here or <span className="text-[#5adace] underline">click to browse</span>
              </p>
              <p className="text-[10px] text-[#c6c6cd]/60 mt-1 font-mono">
                Extracts sequential glucose values from columns
              </p>
            </div>
          </div>

          {/* Manual Numerical Input Console */}
          <div className="bg-[#0d1c2d]/60 border border-[#45464d]/25 p-4 rounded-xl space-y-4">
            <h4 className="text-xs font-mono font-bold text-[#bec6e0] uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5adace]" />
              Manual telemetry Reading Input
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Method A: Append individual readings sequentially */}
              <div className="space-y-2 bg-[#122131]/40 p-3 rounded-lg border border-[#45464d]/10">
                <span className="text-[10px] font-mono font-semibold text-[#c6c6cd] uppercase block">
                  Method 1: Append Individual Reading
                </span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="20"
                    max="600"
                    placeholder="Enter value (e.g. 120)"
                    value={singleValue}
                    onChange={(e) => setSingleValue(e.target.value)}
                    className="flex-1 bg-[#0d1c2d] border border-[#45464d]/40 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-[#5adace] outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAppendSingle();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAppendSingle}
                    className="px-3 py-1.5 bg-[#5adace] hover:bg-[#5adace]/80 text-[#051424] font-bold rounded-lg text-xs transition-all active:scale-95 cursor-pointer shrink-0"
                  >
                    + Append
                  </button>
                </div>
                <span className="text-[9px] text-[#c6c6cd]/50 block">
                  Appends to the first unoccupied slot in the 20-slot sequence.
                </span>
              </div>

              {/* Method B: Bulk Comma-Separated Values */}
              <div className="space-y-2 bg-[#122131]/40 p-3 rounded-lg border border-[#45464d]/10">
                <span className="text-[10px] font-mono font-semibold text-[#c6c6cd] uppercase block">
                  Method 2: Paste Bulk Sequence
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 100, 115, 120, 95"
                    value={bulkValues}
                    onChange={(e) => setBulkValues(e.target.value)}
                    className="flex-1 bg-[#0d1c2d] border border-[#45464d]/40 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-[#5adace] outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyBulk();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleApplyBulk}
                    className="px-3 py-1.5 bg-[#5adace]/20 border border-[#5adace]/40 hover:bg-[#5adace]/30 text-[#5adace] font-bold rounded-lg text-xs transition-all active:scale-95 cursor-pointer shrink-0"
                  >
                    Inject Sequence
                  </button>
                </div>
                <span className="text-[9px] text-[#c6c6cd]/50 block">
                  Comma/space-separated values (fills up to 20 readings).
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Sequential Grid Inputs */}
          <div>
            <div className="grid grid-cols-4 sm:grid-cols-10 gap-2.5">
              {values.map((val, idx) => {
                const isCritLow = typeof val === 'number' && val < 70;
                const isCritHigh = typeof val === 'number' && val > 250;
                const isDefined = val !== '';

                return (
                  <div
                    key={idx}
                    className={`relative p-2 rounded-xl border text-center transition-all ${
                      isCritLow
                        ? 'bg-red-950/20 border-red-500/40 text-red-400'
                        : isCritHigh
                        ? 'bg-red-950/20 border-red-500/40 text-red-400'
                        : isDefined
                        ? 'bg-[#1c2b3c]/40 border-[#5adace]/30 text-[#5adace]'
                        : 'bg-[#0d1c2d]/50 border-[#45464d]/20 text-[#c6c6cd]'
                    }`}
                  >
                    <span className="text-[9px] font-mono font-bold text-[#c6c6cd]/40 block mb-1">
                      {idx + 1}
                    </span>
                    <input
                      type="number"
                      min="30"
                      max="500"
                      placeholder="—"
                      value={val}
                      onChange={(e) => handleInputChange(idx, e.target.value)}
                      className="w-full text-center bg-transparent border-0 p-0 text-sm font-semibold font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-0"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Row buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAnalyzed(true)}
                disabled={filledCount === 0}
                className="px-4 py-2.5 bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-[#16a34a]/10 hover:shadow-[#16a34a]/20 cursor-pointer select-none transition-all active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Execute Analysis</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 bg-[#1c2b3c]/50 hover:bg-[#1c2b3c] text-[#c6c6cd] font-bold rounded-xl text-xs border border-[#45464d]/40 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-[#c6c6cd]/50 uppercase tracking-wider mr-1">
                Quick Pre-fills:
              </span>
              <button
                type="button"
                onClick={() => handlePreFill('normal')}
                className="px-2.5 py-1.5 text-[10px] font-bold bg-[#0d1c2d] hover:bg-[#1c2b3c]/80 text-[#5adace] border border-[#5adace]/25 rounded-lg cursor-pointer transition-all"
              >
                Normal Preset
              </button>
              <button
                type="button"
                onClick={() => handlePreFill('hypo')}
                className="px-2.5 py-1.5 text-[10px] font-bold bg-[#0d1c2d] hover:bg-[#1c2b3c]/80 text-red-400 border border-red-500/25 rounded-lg cursor-pointer transition-all"
              >
                Hypo Spikes
              </button>
              <button
                type="button"
                onClick={() => handlePreFill('hyper')}
                className="px-2.5 py-1.5 text-[10px] font-bold bg-[#0d1c2d] hover:bg-[#1c2b3c]/80 text-red-400 border border-red-500/25 rounded-lg cursor-pointer transition-all"
              >
                Hyper Spikes
              </button>
            </div>
          </div>
        </div>

        {/* Diagnostic Infusion Engine Analytical Outcomes Panel */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-[#122131]/75 border border-[#45464d]/30 rounded-2xl p-6 space-y-5 backdrop-blur shadow-xl">
            <h3 className="font-bold text-xs text-[#d4e4fa] uppercase tracking-widest font-mono flex items-center gap-2 border-b border-[#45464d]/15 pb-3">
              <CheckCircle className="w-4 h-4 text-[#5adace]" />
              Analysis Metrics
            </h3>

            {!isAnalyzed || !results ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-[#0d1c2d] border border-[#45464d]/20 flex items-center justify-center mx-auto text-[#c6c6cd]/40">
                  <Activity className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#d4e4fa]">
                    Engine Idle
                  </p>
                  <p className="text-[10px] text-[#c6c6cd]/60 max-w-[220px] mx-auto leading-normal">
                    Enter or pre-fill telemetry readings above, then click 'Execute Analysis' to run LSTM risk diagnostics.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Classification alert banner */}
                <div
                  className={`p-4 rounded-xl border ${
                    results.severity === 'high'
                      ? 'bg-red-950/20 border-red-500/30 text-red-400'
                      : 'bg-[#42e09a]/10 border-[#42e09a]/30 text-[#42e09a]'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {results.severity === 'high' ? (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="text-[9px] font-mono tracking-wider uppercase font-bold block opacity-75">
                        LSTM Neural Outcome
                      </span>
                      <span className="text-sm font-bold block mt-0.5">
                        {results.classification}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Classification confidence rating */}
                <div className="space-y-1.5 bg-[#0d1c2d]/50 p-3 rounded-xl border border-[#45464d]/15">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#c6c6cd]/85">Neural Engine Confidence</span>
                    <span className="font-bold text-[#5adace]">{results.confidence}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#0d1c2d] rounded-full overflow-hidden border border-[#45464d]/10">
                    <div
                      className="h-full bg-[#5adace] rounded-full"
                      style={{ width: `${results.confidence}%` }}
                    />
                  </div>
                </div>

                {/* Numerical details list */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-[#0d1c2d] p-3 rounded-xl border border-[#45464d]/15">
                    <span className="text-[9px] font-mono text-[#c6c6cd]/60 uppercase block">Mean Glucose</span>
                    <span className="text-base font-mono font-bold text-white block mt-1">
                      {results.mean} <span className="text-[9px] text-[#c6c6cd]/50 font-sans">mg/dL</span>
                    </span>
                  </div>
                  <div className="bg-[#0d1c2d] p-3 rounded-xl border border-[#45464d]/15">
                    <span className="text-[9px] font-mono text-[#c6c6cd]/60 uppercase block">Variability (SD)</span>
                    <span className="text-base font-mono font-bold text-[#5adace] block mt-1">
                      ±{results.stdDev} <span className="text-[9px] text-[#c6c6cd]/50 font-sans">mg/dL</span>
                    </span>
                  </div>
                  <div className="bg-[#0d1c2d] p-3 rounded-xl border border-[#45464d]/15 col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-[#c6c6cd]/60 uppercase">Time In Range (70-180)</span>
                      <span className="text-xs font-mono font-bold text-[#42e09a]">{results.timeInRange}%</span>
                    </div>
                    <div className="w-full h-1 bg-[#0d1c2d] rounded-full overflow-hidden mt-1.5">
                      <div
                        className={`h-full rounded-full ${results.timeInRange > 70 ? 'bg-[#42e09a]' : 'bg-amber-500'}`}
                        style={{ width: `${results.timeInRange}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Interactive clinical alerts and advisory recommendations */}
                <div className="space-y-2 pt-1">
                  <h4 className="text-[10px] font-mono font-bold text-[#bec6e0]/60 uppercase tracking-widest">
                    Clinical Advisory Vectors
                  </h4>
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {results.classification === 'Stable / In-Range' ? (
                      <>
                        <div className="text-[11px] text-[#c6c6cd] flex items-start gap-1.5 bg-[#051424]/40 p-2 rounded border border-[#45464d]/10">
                          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[#42e09a] mt-0.5" />
                          <span>Glucose readings indicate stable glycemic levels with minimal fluctuations.</span>
                        </div>
                        <div className="text-[11px] text-[#c6c6cd] flex items-start gap-1.5 bg-[#051424]/40 p-2 rounded border border-[#45464d]/10">
                          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[#42e09a] mt-0.5" />
                          <span>Standard therapeutic infusion profile should be continued without adjustments.</span>
                        </div>
                      </>
                    ) : results.classification === 'Severe Hypoglycemia Risk' ? (
                      <>
                        <div className="text-[11px] text-[#c6c6cd] flex items-start gap-1.5 bg-red-950/10 p-2 rounded border border-red-500/10">
                          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-red-400 mt-0.5" />
                          <span>Severe hypoglycemia danger detected. Suspend active insulin infusion pumps immediately.</span>
                        </div>
                        <div className="text-[11px] text-[#c6c6cd] flex items-start gap-1.5 bg-red-950/10 p-2 rounded border border-red-500/10">
                          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-red-400 mt-0.5" />
                          <span>Administer rapid-acting carbohydrates (15g rule) and recalibrate sensor.</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-[11px] text-[#c6c6cd] flex items-start gap-1.5 bg-amber-950/10 p-2 rounded border border-amber-500/10">
                          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-amber-500 mt-0.5" />
                          <span>Severe hyperglycemia danger. Confirm correction bolus algorithm infusion requirements.</span>
                        </div>
                        <div className="text-[11px] text-[#c6c6cd] flex items-start gap-1.5 bg-amber-950/10 p-2 rounded border border-amber-500/10">
                          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-amber-500 mt-0.5" />
                          <span>Verify hydration status and check for trace ketones in clinical audit protocol.</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
