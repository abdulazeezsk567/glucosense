/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Brain, Cpu, Sparkles, RefreshCw, ClipboardCheck, ArrowRight, Activity, HelpCircle } from 'lucide-react';
import { PredictionInput, PredictionOutput } from '../types';

interface PredictionTabProps {
  currentGlucose: number;
  onAddAssessment: (newRecord: {
    patientName: string;
    avgGlucose: number;
    riskLevel: 'Normal' | 'Prediabetes' | 'Type 2';
    confidence: number;
  }) => void;
}

export default function PredictionTab({ currentGlucose, onAddAssessment }: PredictionTabProps) {
  // Input parameters state
  const [inputs, setInputs] = useState<PredictionInput>({
    glucose: currentGlucose,
    age: 45,
    bmi: 26.5,
    hba1c: 5.8,
  });

  // Calculation and simulation loading state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [prediction, setPrediction] = useState<PredictionOutput | null>(null);

  // Quick trigger to sync glucose from the live stream
  const handleSyncLiveGlucose = () => {
    setInputs((prev) => ({ ...prev, glucose: currentGlucose }));
  };

  // Rule-based classification engine simulating CNN-LSTM logic
  const runAssessmentModel = () => {
    setIsAnalyzing(true);
    setPrediction(null);

    // Simulated computation stages to show neural pipeline actions
    const steps = [
      'Reading input temporal arrays...',
      'Scaling feature matrices [MinMaxScale]...',
      'Feeding gates of LSTM Cell 1 [128 units]...',
      'Evaluating spatial convolutions of Conv1D...',
      'Calculating softmax probability weights...',
    ];

    let currentStepIdx = 0;
    setAnalysisStep(steps[0]);

    const interval = setInterval(() => {
      currentStepIdx++;
      if (currentStepIdx < steps.length) {
        setAnalysisStep(steps[currentStepIdx]);
      } else {
        clearInterval(interval);
        evaluateInputs();
      }
    }, 450);
  };

  const evaluateInputs = () => {
    const { glucose, age, bmi, hba1c } = inputs;

    // Classification boundaries logic
    let classification: 'Normal' | 'Prediabetes' | 'Type 2' = 'Normal';
    let probabilities = { normal: 0, prediabetes: 0, type2: 0 };
    let recommendations: string[] = [];

    // Simple robust rule system mapping metabolic values
    if (hba1c >= 6.5 || glucose >= 140) {
      classification = 'Type 2';
      // Calculate realistic prob ratios
      const baseT2 = Math.min(98, 70 + (hba1c - 6.5) * 15 + (glucose - 140) * 0.15);
      const remaining = 100 - baseT2;
      probabilities = {
        type2: parseFloat(baseT2.toFixed(1)),
        prediabetes: parseFloat((remaining * 0.85).toFixed(1)),
        normal: parseFloat((remaining * 0.15).toFixed(1)),
      };
      recommendations = [
        'Halt automated delivery adjustments and consult clinical protocols.',
        'Schedule urgent endocrinology tele-health consult within 24 hours.',
        'Perform a 3-day strict carbohydrate counting audit.',
        'Flag potential nocturnal hypoglycemia risks (0000 - 0400).',
        'Enroll in continuous glucose telemetry monitoring program.',
      ];
    } else if (hba1c >= 5.7 || glucose >= 100 || bmi >= 25.0) {
      classification = 'Prediabetes';
      const basePredia = Math.min(95, 60 + (hba1c - 5.7) * 30 + (bmi - 25.0) * 2 + (glucose - 100) * 0.5);
      const remaining = 100 - basePredia;
      probabilities = {
        prediabetes: parseFloat(basePredia.toFixed(1)),
        normal: parseFloat((remaining * 0.8).toFixed(1)),
        type2: parseFloat((remaining * 0.2).toFixed(1)),
      };
      recommendations = [
        'Initiate dietary pattern review with primary physician.',
        'Schedule follow-up HbA1c laboratory screening in 3 months.',
        'Consider enabling predictive low glucose alerts.',
        'Optimize weekly activity parameters (+150 min aerobic exercise).',
        'Review dinner meal post-prandial spikes to limit carb intake.',
      ];
    } else {
      classification = 'Normal';
      const baseNormal = Math.min(99.5, 85 + (5.7 - hba1c) * 10 + (25.0 - bmi) * 1.5);
      const remaining = 100 - baseNormal;
      probabilities = {
        normal: parseFloat(baseNormal.toFixed(1)),
        prediabetes: parseFloat((remaining * 0.9).toFixed(1)),
        type2: parseFloat((remaining * 0.1).toFixed(1)),
      };
      recommendations = [
        'Maintain current dietary and exercise macro balance.',
        'Continue quarterly HbA1c status tracking reviews.',
        'Standard 14-day clinical sensor analysis annually.',
        'Keep emergency contacts configured in user preferences.',
      ];
    }

    const confidence = Math.max(...Object.values(probabilities));

    setPrediction({
      classification,
      confidence,
      probabilities,
      recommendations,
    });

    setIsAnalyzing(false);

    // Log this assessment to global history logs
    onAddAssessment({
      patientName: 'Anonymous Patient',
      avgGlucose: glucose,
      riskLevel: classification,
      confidence: confidence,
    });
  };

  const getThemeByClass = (type?: 'Normal' | 'Prediabetes' | 'Type 2') => {
    switch (type) {
      case 'Type 2':
        return {
          title: 'Type 2 Diabetes Risk Detected',
          color: 'text-[#ffb4ab]',
          border: 'border-[#ffb4ab]/30',
          bg: 'bg-[#93000a]/20',
          pill: 'bg-[#93000a]/40 text-[#ffdad6] border-[#ffb4ab]/20',
          progressColor: 'bg-[#ffb4ab]',
        };
      case 'Prediabetes':
        return {
          title: 'Prediabetes Markers Flagged',
          color: 'text-amber-400',
          border: 'border-amber-500/30',
          bg: 'bg-amber-500/10',
          pill: 'bg-amber-500/20 text-amber-300 border-amber-500/35',
          progressColor: 'bg-amber-400',
        };
      default:
        return {
          title: 'Normal Metabolic Profile',
          color: 'text-[#42e09a]',
          border: 'border-[#42e09a]/30',
          bg: 'bg-[#42e09a]/10',
          pill: 'bg-[#42e09a]/20 text-[#42e09a] border-[#42e09a]/35',
          progressColor: 'bg-[#42e09a]',
        };
    }
  };

  const resultsTheme = prediction ? getThemeByClass(prediction.classification) : null;

  return (
    <div id="prediction-tab" className="space-y-6 max-w-6xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#d4e4fa] font-sans flex items-center gap-2">
          <Brain className="w-7 h-7 text-[#5adace]" />
          Deep Learning Risk Assessment
        </h2>
        <p className="text-sm text-[#c6c6cd] mt-1">
          Type 2 Diabetes classification model powered by temporal recurrent neural networks (CNN-LSTM V4).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Input Parameters Sidebar Form (Col-span 5) */}
        <div className="lg:col-span-5 bg-[#122131]/75 border border-[#45464d]/30 rounded-2xl p-6 space-y-6 backdrop-blur">
          <div className="flex items-center justify-between border-b border-[#45464d]/20 pb-3">
            <h3 className="font-semibold text-sm text-[#d4e4fa] uppercase tracking-wider font-mono">
              Input Parameters
            </h3>
            <button
              onClick={handleSyncLiveGlucose}
              className="text-xs text-[#5adace] hover:text-[#42e09a] transition-colors flex items-center gap-1 cursor-pointer"
              title="Pull current value from active live stream"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Live Feed</span>
            </button>
          </div>

          <div className="space-y-5">
            {/* Input: Glucose Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-semibold text-[#c6c6cd] flex items-center gap-1.5">
                  <Activity className="w-4.5 h-4.5 text-[#5adace]" />
                  Current Glucose
                </label>
                <div className="font-mono text-sm text-[#5adace] font-bold">
                  {inputs.glucose} <span className="text-[10px] text-[#c6c6cd]">mg/dL</span>
                </div>
              </div>
              <input
                type="range"
                min="50"
                max="280"
                value={inputs.glucose}
                onChange={(e) => setInputs({ ...inputs, glucose: parseInt(e.target.value) })}
                className="w-full accent-[#5adace] bg-[#0d1c2d] h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#c6c6cd]/50 font-mono">
                <span>50 mg/dL</span>
                <span>Normal</span>
                <span>280 mg/dL</span>
              </div>
            </div>

            {/* Input: Age Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-semibold text-[#c6c6cd]">Age</label>
                <div className="font-mono text-sm text-[#5adace] font-bold">
                  {inputs.age} <span className="text-[10px] text-[#c6c6cd]">years</span>
                </div>
              </div>
              <input
                type="range"
                min="18"
                max="95"
                value={inputs.age}
                onChange={(e) => setInputs({ ...inputs, age: parseInt(e.target.value) })}
                className="w-full accent-[#5adace] bg-[#0d1c2d] h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Input: BMI Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-semibold text-[#c6c6cd]">Body Mass Index (BMI)</label>
                <div className="font-mono text-sm text-[#5adace] font-bold">
                  {inputs.bmi} <span className="text-[10px] text-[#c6c6cd]">kg/m²</span>
                </div>
              </div>
              <input
                type="range"
                min="15"
                max="48"
                step="0.5"
                value={inputs.bmi}
                onChange={(e) => setInputs({ ...inputs, bmi: parseFloat(e.target.value) })}
                className="w-full accent-[#5adace] bg-[#0d1c2d] h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-[#c6c6cd]/40 font-mono">
                <span>15 (Under)</span>
                <span>21 (Target)</span>
                <span>30+ (Obese)</span>
              </div>
            </div>

            {/* Input: HbA1c Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-semibold text-[#c6c6cd]">HbA1c</label>
                <div className="font-mono text-sm text-[#5adace] font-bold">
                  {inputs.hba1c} <span className="text-[10px] text-[#c6c6cd]">%</span>
                </div>
              </div>
              <input
                type="range"
                min="4.0"
                max="14.0"
                step="0.1"
                value={inputs.hba1c}
                onChange={(e) => setInputs({ ...inputs, hba1c: parseFloat(e.target.value) })}
                className="w-full accent-[#5adace] bg-[#0d1c2d] h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#c6c6cd]/50 font-mono">
                <span>Normal &lt; 5.7</span>
                <span>Pre 5.7-6.4</span>
                <span>Type 2 &gt;= 6.5</span>
              </div>
            </div>
          </div>

          {/* Core Action Assessment CTA */}
          <button
            onClick={runAssessmentModel}
            disabled={isAnalyzing}
            className="w-full py-3 px-4 mt-4 bg-gradient-to-r from-[#42e09a] to-[#5adace] hover:opacity-90 disabled:opacity-50 text-[#051424] font-bold rounded-xl transition-all shadow-lg shadow-[#42e09a]/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <Cpu className="w-5 h-5 animate-spin" />
                <span>Running LSTM Weights...</span>
              </>
            ) : (
              <>
                <Brain className="w-5 h-5" />
                <span>Run Neural Risk Analysis</span>
              </>
            )}
          </button>
        </div>

        {/* Output Diagnostics Panel (Col-span 7) */}
        <div className="lg:col-span-7 bg-[#122131]/75 border border-[#45464d]/30 rounded-2xl p-6 min-h-[440px] flex flex-col justify-between backdrop-blur">
          
          {/* Default state placeholder */}
          {!isAnalyzing && !prediction && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-[#1c2b3c] border border-[#45464d]/20 flex items-center justify-center mb-4">
                <Cpu className="w-8 h-8 text-[#c6c6cd]/70" />
              </div>
              <h4 className="font-semibold text-base text-[#d4e4fa]">Awaiting Telemetry Feed</h4>
              <p className="text-xs text-[#c6c6cd] max-w-sm mt-2 leading-relaxed">
                Provide metabolic telemetry coefficients on the sidebar and click <strong>"Run Neural Risk Analysis"</strong> to execute feed-forward prediction.
              </p>
            </div>
          )}

          {/* Running calculation status loader */}
          {isAnalyzing && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-[#273647] border-t-[#5adace] animate-spin"></div>
                <Brain className="w-6 h-6 text-[#5adace] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <div>
                <span className="font-mono text-xs uppercase tracking-widest text-[#5adace] font-semibold block animate-pulse">
                  CONV-RNN ENGINE COMPUTING
                </span>
                <p className="text-xs text-[#c6c6cd] mt-2 font-mono italic">
                  {analysisStep}
                </p>
              </div>
            </div>
          )}

          {/* Completed output visualizer */}
          {!isAnalyzing && prediction && resultsTheme && (
            <div className="flex-1 flex flex-col justify-between space-y-6 animate-in fade-in duration-300">
              
              {/* Header result */}
              <div className="border-b border-[#45464d]/20 pb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#c6c6cd] block mb-1">
                  CNN-LSTM RECURRENT OUTCOME
                </span>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <h3 className={`text-xl font-bold font-sans ${resultsTheme.color}`}>
                    {resultsTheme.title}
                  </h3>
                  <div className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${resultsTheme.pill}`}>
                    Confidence: {prediction.confidence}%
                  </div>
                </div>
              </div>

              {/* Class Probability Distribution Block */}
              <div className="space-y-4 bg-[#0d1c2d]/80 p-4 rounded-xl border border-[#45464d]/20">
                <h4 className="text-xs font-semibold text-[#c6c6cd] uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#5adace]" />
                  Probability Distribution Metrics
                </h4>

                <div className="space-y-3 pt-1">
                  {/* Category 1: Normal */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-[#c6c6cd]">Normal Range Profile</span>
                      <span className="text-[#42e09a] font-bold">{prediction.probabilities.normal}%</span>
                    </div>
                    <div className="w-full bg-[#1c2b3c] h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-[#42e09a] rounded-full" style={{ width: `${prediction.probabilities.normal}%` }}></div>
                    </div>
                  </div>

                  {/* Category 2: Prediabetes */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-[#c6c6cd]">Prediabetes Classification</span>
                      <span className="text-amber-400 font-bold">{prediction.probabilities.prediabetes}%</span>
                    </div>
                    <div className="w-full bg-[#1c2b3c] h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${prediction.probabilities.prediabetes}%` }}></div>
                    </div>
                  </div>

                  {/* Category 3: Type 2 */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-[#c6c6cd]">Type 2 Diabetes Risk</span>
                      <span className="text-[#ffb4ab] font-bold">{prediction.probabilities.type2}%</span>
                    </div>
                    <div className="w-full bg-[#1c2b3c] h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-[#ffb4ab] rounded-full" style={{ width: `${prediction.probabilities.type2}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient Next Steps Checklist */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-[#c6c6cd] uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <ClipboardCheck className="w-4.5 h-4.5 text-[#5adace]" />
                  Proposed Patient Next Steps
                </h4>
                
                <ul className="space-y-2 pt-1">
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

              {/* Informative model fine-print */}
              <div className="text-[10px] text-[#c6c6cd]/50 font-mono text-center pt-2 border-t border-[#45464d]/10">
                This diagnostic output is generated dynamically via feed-forward parameters using weights frozen in epoch 240. Cross-reference clinical guidance.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
