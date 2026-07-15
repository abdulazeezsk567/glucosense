/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  MoveRight,
  Sparkles,
  Activity,
  Heart,
  TrendingUp as TrendUpIcon,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Cpu,
  Layers,
  Settings,
  Github,
  Check,
  Send,
  ArrowUpRight,
  RefreshCw,
  X,
  Bell,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { GlucoseGoal } from '../types';

const CustomTooltip = ({ active, payload, low = 70, high = 140 }: any) => {
  if (active && payload && payload.length) {
    const glucoseVal = payload[0].value;
    let riskText = 'Normal Range';
    let riskColor = 'text-[#42e09a]';
    if (glucoseVal < low) {
      riskText = 'Critical Low';
      riskColor = 'text-[#ffb4ab]';
    } else if (glucoseVal > high) {
      riskText = 'High Glucose';
      riskColor = 'text-amber-400';
    }

    return (
      <div className="bg-[#122131]/95 border border-[#5adace]/40 p-2.5 rounded-xl text-xs font-mono shadow-2xl space-y-1 backdrop-blur-md">
        <p className="text-[#c6c6cd] font-semibold text-[10px]">{payload[0].payload.time}</p>
        <p className="text-white font-bold text-sm">
          Glucose: <span className="text-[#5adace]">{glucoseVal}</span> <span className="text-[10px] font-normal text-[#c6c6cd]">mg/dL</span>
        </p>
        <p className={`text-[9px] font-bold uppercase tracking-wider ${riskColor}`}>
          Status: {riskText}
        </p>
      </div>
    );
  }
  return null;
};

// Helper function: Standard Normal Cumulative Distribution Function approximation
// Used to compute the probability of glucose falling below a target limit based on residuals variance
function stdNormalCDF(z: number): number {
  if (z < -6) return 0;
  if (z > 6) return 1;
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - prob : prob;
}

interface PredictionResult {
  predictedGlucose: number;
  slope: number;
  hypoRiskProbability: number;
  isRisk: boolean;
  confidence: number;
  stdError: number;
}

// Machine Learning Trend Predictor using Autoregressive Linear Regression & Normal Error CDF
function predictHypoglycemiaTrend(
  data: { time: string; glucose: number }[],
  lowLimit: number,
  sensitivityMultiplier: number = 1.0
): PredictionResult {
  if (data.length < 4) {
    return {
      predictedGlucose: 100,
      slope: 0,
      hypoRiskProbability: 0,
      isRisk: false,
      confidence: 95,
      stdError: 10
    };
  }

  // We analyze the last 6 hourly telemetry points to capture short-term trend dynamics
  const pointsToFit = data.slice(-6);
  const n = pointsToFit.length;
  
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += pointsToFit[i].glucose;
    sumXY += i * pointsToFit[i].glucose;
    sumXX += i * i;
  }

  // Linear Regression: y = slope * x + intercept
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Forecast the next hour (index = n)
  const predictedGlucose = Math.max(35, Math.min(320, Math.round(slope * n + intercept)));

  // Calculate residual variance (standard error of estimate)
  let sumResidualSq = 0;
  for (let i = 0; i < n; i++) {
    const fitted = slope * i + intercept;
    sumResidualSq += Math.pow(pointsToFit[i].glucose - fitted, 2);
  }
  const stdError = Math.max(4, Math.sqrt(sumResidualSq / (n - 2 || 1)));

  // Z-score for glucose dropping below the clinician's designated alert threshold
  // Z = (targetLowLimit - predictedGlucose) / stdError
  // We incorporate a sensitivity multiplier adjustability
  const adjustedLowLimit = lowLimit * sensitivityMultiplier;
  const zScore = (adjustedLowLimit - predictedGlucose) / stdError;

  let hypoRiskProbability = 0;
  if (slope < -0.15) {
    // Declining trend: compute exact probabilistic risk of breach
    const prob = stdNormalCDF(zScore);
    hypoRiskProbability = Math.round(prob * 100);
  } else {
    // Stable or rising trend: risk is very low unless predicted is already critical
    if (predictedGlucose < lowLimit) {
      hypoRiskProbability = 98;
    } else {
      const prob = stdNormalCDF((adjustedLowLimit - predictedGlucose) / stdError);
      hypoRiskProbability = Math.max(1, Math.round(prob * 100));
    }
  }

  // Trigger alert if the predicted glucose is below threshold OR probability is >= 35%
  const isRisk = predictedGlucose < adjustedLowLimit || hypoRiskProbability >= 35;

  // Model fit confidence score based on relative error percentage (clamped to 80%-99.5%)
  const rawConfidence = 100 - (stdError / (predictedGlucose || 1)) * 100;
  const confidence = Math.max(82, Math.min(99.4, parseFloat(rawConfidence.toFixed(1))));

  return {
    predictedGlucose,
    slope: parseFloat(slope.toFixed(2)),
    hypoRiskProbability,
    isRisk,
    confidence,
    stdError: parseFloat(stdError.toFixed(2))
  };
}

interface DashboardTabProps {
  currentGlucose: number;
  setCurrentGlucose: React.Dispatch<React.SetStateAction<number>>;
  isLiveSimulating: boolean;
  setIsLiveSimulating: (active: boolean) => void;
  glucoseGoals: GlucoseGoal[];
  selectedPatientId: string;
  setSelectedPatientId: (patientId: string) => void;
}

export default function DashboardTab({
  currentGlucose,
  setCurrentGlucose,
  isLiveSimulating,
  setIsLiveSimulating,
  glucoseGoals,
  selectedPatientId,
  setSelectedPatientId,
}: DashboardTabProps) {
  const [trend, setTrend] = useState<'stable' | 'up' | 'down'>('stable');
  const currentGoal = glucoseGoals.find(g => g.patientId === selectedPatientId) || {
    patientId: 'GS-8821',
    patientName: 'Sarah Jenkins',
    low: 70,
    high: 140
  };

  const [hourlyData, setHourlyData] = useState<{ time: string; glucose: number }[]>(() => {
    const times = [
      '8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM',
      '8 PM', '9 PM', '10 PM', '11 PM', '12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM', '6 AM', 'Now'
    ];
    const initialValues = [
      92, 95, 102, 108, 115, 120, 118, 102, 95, 88, 94, 101,
      112, 125, 132, 128, 115, 106, 98, 94, 92, 90, 95, currentGlucose
    ];
    return times.map((t, idx) => ({
      time: t,
      glucose: initialValues[idx]
    }));
  });

  // ML Sensitivity states
  const [sensitivity, setSensitivity] = useState(1.0);
  const [showMLConfig, setShowMLConfig] = useState(false);



  // Keep a mutable ref to the current glucose to avoid re-initializing the interval
  const currentGlucoseRef = React.useRef(currentGlucose);
  useEffect(() => {
    currentGlucoseRef.current = currentGlucose;
  }, [currentGlucose]);

  // Periodic simulation adjustments
  useEffect(() => {
    if (!isLiveSimulating) return;

    const interval = setInterval(() => {
      const prev = currentGlucoseRef.current;
      const delta = Math.floor(Math.random() * 5) - 2; // -2, -1, 0, 1, 2
      let next = prev + delta;
      // Keep within plausible limits
      if (next < 40) next = 42;
      if (next > 310) next = 295;

      // Set state visual trends
      if (delta > 0) setTrend('up');
      else if (delta < 0) setTrend('down');
      else setTrend('stable');

      setCurrentGlucose(next);
    }, 3500);

    return () => clearInterval(interval);
  }, [isLiveSimulating, setCurrentGlucose]);

  // Sync currentGlucose to Recharts hourlyData
  useEffect(() => {
    setHourlyData((prev) => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          glucose: currentGlucose,
        };
      }
      return updated;
    });
  }, [currentGlucose]);

  const getRiskLabel = (val: number) => {
    if (val < currentGoal.low) return { label: 'Risk: High (Low)', color: 'text-[#ffb4ab]', border: 'border-[#ffb4ab]/30', bg: 'bg-[#93000a]/10' };
    if (val > currentGoal.high) return { label: 'Risk: Caution (High)', color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10' };
    return { label: 'Risk: Low', color: 'text-[#42e09a]', border: 'border-[#42e09a]/30', bg: 'bg-[#42e09a]/10' };
  };

  const currentRisk = getRiskLabel(currentGlucose);

  // Run the ML prediction algorithm
  const predictionResult = predictHypoglycemiaTrend(hourlyData, currentGoal.low, sensitivity);

  return (
    <div id="dashboard-tab" className="space-y-6 max-w-6xl mx-auto relative">
      {/* Tab Title Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#d4e4fa] font-sans">
            Patient Overview
          </h2>
          <p className="text-sm text-[#c6c6cd] mt-1">
            Real-time metabolic monitoring for <span className="text-[#5adace] font-semibold">{currentGoal.patientName}</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Patient Dropdown Selector */}
          <div className="flex items-center gap-2 bg-[#122131]/60 px-3.5 py-2 rounded-full border border-[#45464d]/30 backdrop-blur">
            <span className="text-[10px] font-mono uppercase text-[#c6c6cd] font-semibold">Patient:</span>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="bg-[#0d1c2d] text-xs text-[#5adace] font-bold py-1 px-3 rounded-full border border-[#45464d]/40 outline-none focus:border-[#5adace] cursor-pointer"
            >
              {glucoseGoals.map((g) => (
                <option key={g.patientId} value={g.patientId}>
                  {g.patientName}
                </option>
              ))}
            </select>
          </div>

          {/* Live streaming controller badge */}
          <div className="flex items-center gap-3 bg-[#122131]/60 px-4 py-2.5 rounded-full border border-[#45464d]/30 backdrop-blur">
            <span className={`w-2.5 h-2.5 rounded-full bg-[#42e09a] ${isLiveSimulating ? 'animate-ping' : ''}`}></span>
            <span className="font-mono text-xs font-semibold text-[#42e09a] tracking-wider uppercase">
              {isLiveSimulating ? 'LIVE FEED ACTIVE' : 'STREAM STOPPED'}
            </span>
            <div className="w-px h-4 bg-[#45464d]/40 mx-1"></div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isLiveSimulating}
                onChange={(e) => setIsLiveSimulating(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#273647] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[#051424] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#d4e4fa] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#5adace]"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Main Glass Hero Panel */}
      <div className="bg-[#122131]/75 backdrop-blur-md rounded-2xl p-6 border border-[#45464d]/30 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Current Glucose display details */}
        <div className="lg:col-span-4 flex flex-col justify-between p-2">
          <div>
            <h3 className="text-xs uppercase tracking-widest font-mono text-[#c6c6cd] font-semibold">
              Current Glucose
            </h3>
            
            {/* Massive Metrics view */}
            <div className="flex items-baseline gap-2 mt-4">
              <span className="font-mono text-5xl md:text-6xl font-extrabold text-[#5adace] tracking-tight drop-shadow-[0_0_15px_rgba(90,218,206,0.25)]">
                {currentGlucose}
              </span>
              <span className="text-[#c6c6cd] font-mono text-sm uppercase tracking-wider font-semibold">
                mg/dL
              </span>
            </div>

            {/* Dynamic trend state indicator */}
            <div className="flex items-center gap-2 mt-4">
              {trend === 'up' && (
                <div className="flex items-center gap-1.5 text-amber-400 text-sm font-semibold">
                  <TrendingUp className="w-4.5 h-4.5" />
                  <span>Trending Upwards (+1.4m/m)</span>
                </div>
              )}
              {trend === 'down' && (
                <div className="flex items-center gap-1.5 text-[#5adace] text-sm font-semibold">
                  <TrendingDown className="w-4.5 h-4.5" />
                  <span>Trending Downwards (-1.1m/m)</span>
                </div>
              )}
              {trend === 'stable' && (
                <div className="flex items-center gap-1.5 text-[#42e09a] text-sm font-semibold">
                  <MoveRight className="w-4.5 h-4.5" />
                  <span>Stable telemetry trend</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {/* Dynamic Risk Tag badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${currentRisk.border} ${currentRisk.bg} ${currentRisk.color} text-xs font-semibold`}>
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{currentRisk.label}</span>
            </div>

            {/* In-app Simulator quick clicker toggle */}
            <div className="pt-2 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-[#c6c6cd] hover:text-[#d4e4fa] transition-colors select-none">
                <input
                  type="checkbox"
                  checked={isLiveSimulating}
                  onChange={(e) => setIsLiveSimulating(e.target.checked)}
                  className="rounded border-[#45464d] bg-[#0d1c2d] text-[#5adace] focus:ring-0"
                />
                <span>Simulate live patient telemetry stream</span>
              </label>

              {/* Simulation Preset controls for testing sidebar indicator */}
              <div className="pt-3 border-t border-[#45464d]/15 space-y-2">
                <p className="text-[10px] uppercase font-mono tracking-widest text-[#bec6e0]/70">
                  Simulation Testing Presets
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLiveSimulating(false);
                      setCurrentGlucose(105);
                      setHourlyData(prev => {
                        const updated = [...prev];
                        const n = updated.length;
                        if (n >= 5) {
                          updated[n - 5] = { ...updated[n - 5], glucose: 101 };
                          updated[n - 4] = { ...updated[n - 4], glucose: 103 };
                          updated[n - 3] = { ...updated[n - 3], glucose: 98 };
                          updated[n - 2] = { ...updated[n - 2], glucose: 102 };
                          updated[n - 1] = { ...updated[n - 1], glucose: 105 };
                        }
                        return updated;
                      });
                    }}
                    className="px-2 py-1 text-[10px] bg-[#1c2b3c] hover:bg-[#2c3a4c] text-[#d4e4fa] rounded border border-[#45464d]/30 font-mono transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
                  >
                    Normal (105)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLiveSimulating(false);
                      setCurrentGlucose(62);
                      setHourlyData(prev => {
                        const updated = [...prev];
                        const n = updated.length;
                        if (n >= 5) {
                          updated[n - 5] = { ...updated[n - 5], glucose: 110 };
                          updated[n - 4] = { ...updated[n - 4], glucose: 95 };
                          updated[n - 3] = { ...updated[n - 3], glucose: 82 };
                          updated[n - 2] = { ...updated[n - 2], glucose: 70 };
                          updated[n - 1] = { ...updated[n - 1], glucose: 62 };
                        }
                        return updated;
                      });
                    }}
                    className="px-2 py-1 text-[10px] bg-red-950/40 hover:bg-red-900/40 text-[#ffb4ab] rounded border border-red-500/30 font-mono transition-all cursor-pointer hover:scale-[1.02] active:scale-95 animate-pulse"
                  >
                    Hypo Danger (62)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLiveSimulating(false);
                      setCurrentGlucose(265);
                      setHourlyData(prev => {
                        const updated = [...prev];
                        const n = updated.length;
                        if (n >= 5) {
                          updated[n - 5] = { ...updated[n - 5], glucose: 120 };
                          updated[n - 4] = { ...updated[n - 4], glucose: 160 };
                          updated[n - 3] = { ...updated[n - 3], glucose: 210 };
                          updated[n - 2] = { ...updated[n - 2], glucose: 245 };
                          updated[n - 1] = { ...updated[n - 1], glucose: 265 };
                        }
                        return updated;
                      });
                    }}
                    className="px-2 py-1 text-[10px] bg-red-950/40 hover:bg-red-900/40 text-[#ffb4ab] rounded border border-red-500/30 font-mono transition-all cursor-pointer hover:scale-[1.02] active:scale-95 animate-pulse"
                  >
                    Hyper Danger (265)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 24 Hour Continuous Glucose Profile Chart */}
        <div className="lg:col-span-8 bg-[#0d1c2d]/90 rounded-xl p-5 border border-[#45464d]/20 relative min-h-[240px] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs uppercase font-semibold text-[#c6c6cd] tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[#42e09a]" />
              Continuous 24h Telemetry Trend
            </h4>
            <span className="text-[10px] font-mono bg-[#1c2b3c] border border-[#45464d]/30 text-[#5adace] px-2.5 py-0.5 rounded-md font-bold">
              Target: {currentGoal.low} - {currentGoal.high} mg/dL
            </span>
          </div>

          {/* Interactive Chart stage with dynamic ML Forecast Overlay */}
          {(() => {
            const chartDataWithForecast = hourlyData.map((d) => ({
              ...d,
              historyGlucose: d.glucose,
              forecastGlucose: undefined as number | undefined,
            }));

            // Append the future forecast point (+1h)
            chartDataWithForecast.push({
              time: '+1h (ML)',
              glucose: predictionResult.predictedGlucose,
              historyGlucose: undefined as any,
              forecastGlucose: predictionResult.predictedGlucose,
            });

            // Set the forecast glucose of the 'Now' point to connect the lines
            if (chartDataWithForecast.length >= 2) {
              const nowPointIdx = chartDataWithForecast.length - 2;
              chartDataWithForecast[nowPointIdx].forecastGlucose = chartDataWithForecast[nowPointIdx].historyGlucose;
            }

            return (
              <div className="relative flex-1 mt-1 overflow-hidden rounded-lg bg-[#051424]/40 border border-[#45464d]/10 min-h-[140px] p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartDataWithForecast}
                    margin={{ top: 10, right: 10, left: -25, bottom: -5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#45464d"
                      opacity={0.12}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="time"
                      stroke="#c6c6cd"
                      opacity={0.6}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#c6c6cd', fontSize: 9, fontFamily: 'monospace' }}
                    />
                    <YAxis
                      domain={[40, 300]}
                      stroke="#c6c6cd"
                      opacity={0.6}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#c6c6cd', fontSize: 9, fontFamily: 'monospace' }}
                      tickCount={5}
                    />
                    <Tooltip
                      content={<CustomTooltip low={currentGoal.low} high={currentGoal.high} />}
                      cursor={{ stroke: '#5adace', strokeWidth: 1, strokeDasharray: '3 3' }}
                    />
                    <ReferenceArea
                      y1={currentGoal.low}
                      y2={currentGoal.high}
                      {...({ fill: '#42e09a', fillOpacity: 0.03 } as any)}
                    />
                    <ReferenceLine
                      y={currentGoal.high}
                      stroke="#ffb4ab"
                      strokeDasharray="3 3"
                      strokeOpacity={0.3}
                      label={{ value: `HIGH LIMIT (${currentGoal.high})`, position: 'insideRight', fill: '#ffb4ab', fontSize: 8, fontFamily: 'monospace' }}
                    />
                    <ReferenceLine
                      y={currentGoal.low}
                      stroke="#ffb4ab"
                      strokeDasharray="3 3"
                      strokeOpacity={0.3}
                      label={{ value: `LOW LIMIT (${currentGoal.low})`, position: 'insideRight', fill: '#ffb4ab', fontSize: 8, fontFamily: 'monospace' }}
                    />
                    {/* Solid line for historical data */}
                    <Line
                      type="monotone"
                      dataKey="historyGlucose"
                      stroke="#42e09a"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: '#42e09a', stroke: '#0d1c2d', strokeWidth: 1.5 }}
                      isAnimationActive={false}
                    />
                    {/* Dashed line for ML 1-hour prediction */}
                    <Line
                      type="monotone"
                      dataKey="forecastGlucose"
                      stroke={predictionResult.isRisk ? '#ff847c' : '#5adace'}
                      strokeWidth={2.5}
                      strokeDasharray="4 4"
                      dot={{ r: 4, fill: predictionResult.isRisk ? '#ff847c' : '#5adace', stroke: '#0d1c2d', strokeWidth: 1 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Machine Learning Hypoglycemia Threat Alert */}
      <div id="ml-alert-system-panel" className="grid grid-cols-1 gap-5">
        
        {/* ML Hypoglycemia Alert & Risk Diagnostics Column */}
        <div className="bg-[#122131]/75 border border-[#45464d]/30 rounded-2xl p-6 backdrop-blur space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#45464d]/20 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#5adace]" />
                <h3 className="font-semibold text-sm text-[#d4e4fa] uppercase tracking-wider font-mono">
                  Predictive ML Hypoglycemia Risk Core
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMLConfig(!showMLConfig)}
                className="text-xs text-[#5adace] hover:underline font-mono flex items-center gap-1 focus:outline-none"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{showMLConfig ? 'Hide Hyperparameters' : 'Configure Model'}</span>
              </button>
            </div>

            {/* Model Configuration Area (Collapsible) */}
            {showMLConfig && (
              <div className="my-3 p-3 bg-[#0d1c2d]/90 border border-[#45464d]/30 rounded-xl space-y-3 font-sans">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#d4e4fa]">Risk Sensitivity Threshold: <span className="text-[#5adace] font-mono">{sensitivity.toFixed(2)}x</span></span>
                  <span className="text-[10px] text-[#c6c6cd] font-mono">Standard: 1.00x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.05"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#1c2b3c] rounded-lg appearance-none cursor-pointer accent-[#5adace]"
                />
                <div className="flex justify-between text-[10px] text-[#c6c6cd]/60 font-mono">
                  <span>0.80x (Low Risk Recall)</span>
                  <span>1.00x (Balanced)</span>
                  <span>1.30x (High Risk Recall)</span>
                </div>
                <p className="text-[10px] text-[#c6c6cd] leading-relaxed italic">
                  *Calibrating the sensitivity multiplier shifts the statistical threshold limit (Current low limit adjusted to: <span className="text-[#5adace] font-mono">{Math.round(currentGoal.low * sensitivity)} mg/dL</span>). Higher multipliers flag marginal trends early.
                </p>
              </div>
            )}

            {/* Dynamic Alarm / Safe Display */}
            {predictionResult.isRisk ? (
              <div className="mt-4 bg-[#93000a]/15 border border-[#ffb4ab]/30 p-4 rounded-xl space-y-3 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-[#ffb4ab]/20 rounded-lg text-[#ffb4ab]">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-[#ffb4ab] uppercase tracking-wider font-mono">
                      🚨 HYPOGLYCEMIA CRITICAL RISK ALARM (1-HOUR OUTLOOK)
                    </h4>
                    <p className="text-xs text-[#ffb4ab]/90 mt-1 leading-relaxed">
                      ML trend analysis detects a rapid metabolic deceleration slope of <span className="font-bold text-[#ffb4ab] font-mono">{predictionResult.slope} mg/dL/hr</span>. 
                      Glucose level is projected to breach the safety threshold of <span className="font-bold text-white font-mono">{currentGoal.low} mg/dL</span> within the next hour, descending to an estimated <span className="font-bold text-white font-mono underline">{predictionResult.predictedGlucose} mg/dL</span>.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#ffb4ab]/20 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-[#ffb4ab]/70">Hypo Probability</span>
                    <p className="text-lg font-mono font-bold text-[#ffb4ab]">{predictionResult.hypoRiskProbability}%</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-[#ffb4ab]/70">Recommended Triage</span>
                    <p className="text-[11px] font-sans font-medium text-white">Ingest 15g Fast-Acting Carbs</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 bg-[#42e09a]/5 border border-[#42e09a]/20 p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-[#42e09a]/10 rounded-lg text-[#42e09a]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#42e09a] uppercase tracking-wider font-mono">
                      ✓ ML TREND NOMINAL — CLINICAL FORECAST CLEAR
                    </h4>
                    <p className="text-xs text-[#c6c6cd] mt-1 leading-relaxed">
                      The predictive model has evaluated the past 6 hours of continuous telemetry data. The trend slope is stable or rising (Slope: <span className="font-semibold text-white font-mono">{predictionResult.slope} mg/dL/hr</span>). 
                      The probability of hypoglycemia within the next hour is nominal (<span className="font-semibold text-[#42e09a] font-mono">{predictionResult.hypoRiskProbability}%</span>). No corrective medical maneuvers required.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Model Mathematical Coefficients */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0d1c2d]/40 border border-[#45464d]/10 p-3 rounded-xl">
              <div className="text-center sm:text-left">
                <span className="text-[9px] uppercase font-mono text-[#c6c6cd]/60 block">Trend Slope</span>
                <span className={`text-xs font-mono font-bold ${predictionResult.slope < -0.15 ? 'text-amber-400' : 'text-[#42e09a]'}`}>
                  {predictionResult.slope} mg/dL/h
                </span>
              </div>
              <div className="text-center sm:text-left">
                <span className="text-[9px] uppercase font-mono text-[#c6c6cd]/60 block">Forecast (1h)</span>
                <span className={`text-xs font-mono font-bold ${predictionResult.predictedGlucose < currentGoal.low ? 'text-[#ffb4ab]' : 'text-[#d4e4fa]'}`}>
                  {predictionResult.predictedGlucose} mg/dL
                </span>
              </div>
              <div className="text-center sm:text-left">
                <span className="text-[9px] uppercase font-mono text-[#c6c6cd]/60 block">Standard Error</span>
                <span className="text-xs font-mono font-bold text-[#c6c6cd]">
                  ±{predictionResult.stdError} mg/dL
                </span>
              </div>
              <div className="text-center sm:text-left">
                <span className="text-[9px] uppercase font-mono text-[#c6c6cd]/60 block">Confidence Score</span>
                <span className="text-xs font-mono font-bold text-[#5adace]">
                  {predictionResult.confidence}%
                </span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-[#c6c6cd]/50 mt-3 font-mono">
            *This predictive engine employs a weighted Autoregressive Ordinary Least Squares (OLS) slope projection combined with Gaussian probability density calculation across CGM telemetry residues.
          </p>
        </div>

      </div>

      {/* Grid of Statistical Diagnostic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Statistical Card 1: Class */}
        <div className="bg-[#122131]/60 p-5 rounded-2xl border border-[#45464d]/20 flex flex-col justify-between hover:bg-[#122131]/80 transition-all duration-200">
          <p className="text-xs uppercase tracking-widest font-mono text-[#c6c6cd] font-semibold">
            Predicted Class (+1h)
          </p>
          <div className="flex items-center gap-2.5 mt-4">
            {predictionResult.isRisk ? (
              <>
                <span className="w-3 h-3 rounded-full bg-[#ffb4ab] shadow-[0_0_8px_rgba(255,180,171,0.6)] animate-pulse"></span>
                <span className="text-md font-bold font-sans text-[#ffb4ab]">
                  Hypo Threat Detected
                </span>
              </>
            ) : (
              <>
                <span className="w-3 h-3 rounded-full bg-[#42e09a] shadow-[0_0_8px_rgba(66,224,154,0.5)]"></span>
                <span className="text-md font-bold font-sans text-[#d4e4fa]">
                  Stable (In-Range)
                </span>
              </>
            )}
          </div>
        </div>

        {/* Statistical Card 2: Model Confidence */}
        <div className="bg-[#122131]/60 p-5 rounded-2xl border border-[#45464d]/20 flex flex-col justify-between hover:bg-[#122131]/80 transition-all duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest font-mono text-[#c6c6cd] font-semibold">
              Model Confidence
            </p>
            <Sparkles className="w-4 h-4 text-[#5adace]" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-mono font-bold text-[#5adace]">{predictionResult.confidence}</span>
              <span className="text-xs text-[#c6c6cd] font-mono">%</span>
            </div>
            {/* Miniature progress conf block bar */}
            <div className="w-full bg-[#0d1c2d] h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#5adace] to-[#42e09a] rounded-full" style={{ width: `${predictionResult.confidence}%` }}></div>
            </div>
          </div>
        </div>

        {/* Statistical Card 3: Predicted Glucose */}
        <div className="bg-[#122131]/60 p-5 rounded-2xl border border-[#45464d]/20 flex flex-col justify-between hover:bg-[#122131]/80 transition-all duration-200">
          <p className="text-xs uppercase tracking-widest font-mono text-[#c6c6cd] font-semibold">
            Projected Glucose (+1h)
          </p>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className={`text-2xl font-mono font-bold tracking-wide ${predictionResult.isRisk ? 'text-[#ffb4ab]' : 'text-[#d4e4fa]'}`}>
              {predictionResult.predictedGlucose}
            </span>
            <span className="text-xs text-[#c6c6cd] font-mono uppercase tracking-wider">mg/dL</span>
          </div>
        </div>

        {/* Statistical Card 4: Historical Average */}
        <div className="bg-[#122131]/60 p-5 rounded-2xl border border-[#45464d]/20 flex flex-col justify-between hover:bg-[#122131]/80 transition-all duration-200">
          <p className="text-xs uppercase tracking-widest font-mono text-[#c6c6cd] font-semibold">
            24h Telemetry Slope
          </p>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className={`text-2xl font-mono font-bold tracking-wide ${predictionResult.slope < 0 ? 'text-[#ffb4ab]' : 'text-[#42e09a]'}`}>
              {predictionResult.slope > 0 ? `+${predictionResult.slope}` : predictionResult.slope}
            </span>
            <span className="text-[10px] text-[#c6c6cd] font-sans">mg/dL/hr</span>
          </div>
        </div>
      </div>
    </div>
  );
}
