/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Bell,
  CheckCircle,
  Droplet,
  Flame,
  Utensils,
  Calculator,
  HeartPulse,
  Send,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Info,
  Plus,
  History,
  FileText,
  Check,
  Trash2,
  Sparkles
} from 'lucide-react';

interface CarePrompt {
  id: string;
  type: 'hydration' | 'activity' | 'nutrition' | 'prevention';
  tag: string;
  title: string;
  content: string;
  clinicalReason: string;
}

const CLINICAL_PROMPTS: CarePrompt[] = [
  {
    id: 'p1',
    type: 'hydration',
    tag: 'Plasma Volume Expansion',
    title: 'Dehydration Masking Hyperglycemia',
    content: 'Dehydration reduces plasma volume, artificially inflating circulating blood glucose concentration. Consume 250-500mL of water immediately to restore volume and obtain a true reading.',
    clinicalReason: 'Restores baseline intravascular plasma volume, stabilizing direct osmolarity metrics.'
  },
  {
    id: 'p2',
    type: 'activity',
    tag: 'Postprandial Walking',
    title: 'Stimulate GLUT4 Translocation',
    content: 'Engage in a 15-minute light post-meal walk. Active muscle contractions stimulate GLUT4 protein carrier translocation to the cell surface, absorbing glucose without requiring insulin.',
    clinicalReason: 'Enhances non-insulin-mediated glucose uptake (NIMGU) across peripheral skeletal muscles.'
  },
  {
    id: 'p3',
    type: 'activity',
    tag: 'Active Joint Rotation',
    title: 'Improve Vascular Perfusion',
    content: 'Perform gentle ankle rotations and calf raises for 3-5 minutes, especially when sitting. This simple physical movement prevents lower extremity blood pooling and improves microvascular circulation.',
    clinicalReason: 'Preemptively mitigates peripheral neuropathy and improves local lymphatic drainage.'
  },
  {
    id: 'p4',
    type: 'nutrition',
    tag: 'Glycemic Load Control',
    title: 'Incorporate Soluble Viscous Fiber',
    content: 'Pre-load carbohydrate meals with 5-10g of soluble fiber (e.g., chia, psyllium). Soluble fiber forms a gelatinous matrix in the digestive tract, slowing gastric emptying and glucose absorption rates.',
    clinicalReason: 'Slowing digestion flattens post-meal glucose spikes and stabilizes insulin response curve.'
  },
  {
    id: 'p5',
    type: 'prevention',
    tag: 'Stress Mitigation',
    title: 'Mitigate Cortisol-Induced Spikes',
    content: 'Under high stress, cortisol and epinephrine trigger glycogenolysis in the liver, raising glucose levels. Guide the patient through 3 minutes of box breathing (4s inhale, 4s hold, 4s exhale, 4s hold).',
    clinicalReason: 'Activates parasympathetic nervous system response, suppressing hepatic glucose release.'
  }
];

interface CareLogEntry {
  id: string;
  timestamp: string;
  type: 'insulin' | 'dietary';
  interventionName: string;
  dosage: string;
  notes: string;
  synced: boolean;
}

const INITIAL_LOGS: CareLogEntry[] = [
  {
    id: 'log-1',
    timestamp: 'Today, 08:35 AM',
    type: 'insulin',
    interventionName: 'Humalog (Rapid-Acting)',
    dosage: '5.5 Units',
    notes: 'Covering 55g carbohydrate breakfast meal. Pre-meal glucose was 112 mg/dL.',
    synced: true
  },
  {
    id: 'log-2',
    timestamp: 'Today, 07:15 AM',
    type: 'dietary',
    interventionName: 'Water Intake & Soluble Fiber',
    dosage: '350mL + 5g Psyllium Husk',
    notes: 'Pre-breakfast hydration protocol to support renal glucose clearance and flatten postprandial spike.',
    synced: true
  },
  {
    id: 'log-3',
    timestamp: 'Yesterday, 09:15 PM',
    type: 'insulin',
    interventionName: 'Lantus (Long-Acting Basal)',
    dosage: '14.0 Units',
    notes: 'Scheduled evening basal insulin administration for nightly glycemic stability.',
    synced: true
  }
];

export default function CareGuidanceTab() {
  const [currentPromptIdx, setCurrentPromptIdx] = useState(0);
  const [broadcastId, setBroadcastId] = useState<string | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Carb intake / insulin calculator state
  const [carbGramInput, setCarbGramInput] = useState<number>(45);
  const [insulinCarbRatio, setInsulinCarbRatio] = useState<number>(10);
  const [calculatedBolus, setCalculatedBolus] = useState<number>(4.5);

  // Intervention logging form state
  const [careLogs, setCareLogs] = useState<CareLogEntry[]>(INITIAL_LOGS);
  const [formType, setFormType] = useState<'insulin' | 'dietary'>('insulin');
  const [formName, setFormName] = useState('Humalog (Rapid-Acting)');
  const [formDosage, setFormDosage] = useState('4.5 Units');
  const [formNotes, setFormNotes] = useState('Calculated meal bolus based on 10:1 ratio for 45g carbohydrates.');
  const [isLoggingSuccess, setIsLoggingSuccess] = useState(false);

  const handleNextPrompt = () => {
    setCurrentPromptIdx((prev) => (prev + 1) % CLINICAL_PROMPTS.length);
    setIsSent(false);
    setSuccessMsg('');
  };

  const handlePrevPrompt = () => {
    setCurrentPromptIdx((prev) => (prev - 1 + CLINICAL_PROMPTS.length) % CLINICAL_PROMPTS.length);
    setIsSent(false);
    setSuccessMsg('');
  };

  const currentPrompt = CLINICAL_PROMPTS[currentPromptIdx];

  const handleBroadcast = (prompt: CarePrompt) => {
    if (isBroadcasting) return;
    setBroadcastId(prompt.id);
    setIsBroadcasting(true);
    setIsSent(false);

    // Simulate sending packet over HIPAA secure WebSocket/cellular gateway to patient portal
    setTimeout(() => {
      setIsBroadcasting(false);
      setIsSent(true);
      setSuccessMsg(`Successfully broadcasted "${prompt.tag}" guidance to Patient Portal & Connected Wearables.`);
    }, 1500);
  };

  const handleRecalculateBolus = (carbs: number, ratio: number) => {
    if (ratio <= 0) return;
    const bolus = Number((carbs / ratio).toFixed(1));
    setCalculatedBolus(bolus);
  };

  // Helper to prefill form based on calculator
  const applyCalculatorToForm = () => {
    setFormType('insulin');
    setFormName('Humalog (Rapid-Acting)');
    setFormDosage(`${calculatedBolus} Units`);
    setFormNotes(`Calculated meal bolus dosage to cover ${carbGramInput}g of carbohydrates with a ${insulinCarbRatio}:1 insulin sensitivity ratio.`);
  };

  // Helper to prefill form based on quick template types
  const applyTemplate = (type: 'basal' | 'hydration' | 'fiber') => {
    if (type === 'basal') {
      setFormType('insulin');
      setFormName('Lantus (Long-Acting Basal)');
      setFormDosage('12.0 Units');
      setFormNotes('Scheduled clinical long-acting basal insulin administration to support overnight baseline stability.');
    } else if (type === 'hydration') {
      setFormType('dietary');
      setFormName('Pre-meal Hydration Protocol');
      setFormDosage('400mL Pure Water');
      setFormNotes('Hydration support to counteract plasma volume compression and optimize vascular clearance.');
    } else if (type === 'fiber') {
      setFormType('dietary');
      setFormName('Pre-loading Viscous Fiber');
      setFormDosage('8g Chia / Psyllium');
      setFormNotes('Soluble fiber pre-meal intervention to delay gastric emptying and slow down glucose entry.');
    }
  };

  const handleSubmitLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formDosage) return;

    const newLog: CareLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: 'Just now',
      type: formType,
      interventionName: formName,
      dosage: formDosage,
      notes: formNotes,
      synced: true
    };

    setCareLogs([newLog, ...careLogs]);
    setIsLoggingSuccess(true);
    setTimeout(() => setIsLoggingSuccess(false), 3000);

    // Reset notes
    setFormNotes('');
  };

  const handleDeleteLog = (id: string) => {
    setCareLogs(careLogs.filter(log => log.id !== id));
  };

  return (
    <div id="care-guidance-tab" className="space-y-6 max-w-6xl mx-auto">
      {/* Title block */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#d4e4fa] font-sans">
          Clinical Care Guidance Console
        </h2>
        <p className="text-sm text-[#c6c6cd] mt-1">
          Review, simulate, and broadcast precision glycemic stabilization strategies and behavioral care suggestions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Suggestion Carousel & Transmission Panel */}
        <div className="lg:col-span-7 bg-[#122131]/75 border border-[#45464d]/30 rounded-2xl p-6 flex flex-col justify-between backdrop-blur space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Bell className="w-4 h-4 text-[#5adace]" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#5adace] rounded-full animate-ping" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-[#5adace]">
                  Active Telemetry-Driven Guidance
                </h3>
              </div>

              {/* Slider controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrevPrompt}
                  className="p-1.5 rounded-lg bg-[#0d1c2d] hover:bg-[#1c2b3c] border border-[#45464d]/20 text-[#c6c6cd] hover:text-[#d4e4fa] transition-all cursor-pointer"
                  title="Previous Guideline"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-semibold text-[#c6c6cd]/80 min-w-[36px] text-center">
                  {currentPromptIdx + 1} / {CLINICAL_PROMPTS.length}
                </span>
                <button
                  onClick={handleNextPrompt}
                  className="p-1.5 rounded-lg bg-[#0d1c2d] hover:bg-[#1c2b3c] border border-[#45464d]/20 text-[#c6c6cd] hover:text-[#d4e4fa] transition-all cursor-pointer"
                  title="Next Guideline"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main Guideline Card */}
            <div className="p-5 rounded-2xl bg-[#0d1c2d]/70 border border-[#45464d]/25 space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#5adace]/10 border border-[#5adace]/20">
                  {currentPrompt.type === 'hydration' && <Droplet className="w-5 h-5 text-[#5adace]" />}
                  {currentPrompt.type === 'activity' && <Flame className="w-5 h-5 text-[#42e09a]" />}
                  {currentPrompt.type === 'nutrition' && <Utensils className="w-5 h-5 text-amber-300" />}
                  {currentPrompt.type === 'prevention' && <HeartPulse className="w-5 h-5 text-red-400" />}
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#5adace] block">
                    {currentPrompt.tag}
                  </span>
                  <h4 className="text-base font-bold text-white leading-tight mt-0.5">
                    {currentPrompt.title}
                  </h4>
                </div>
              </div>

              <p className="text-sm text-[#d4e4fa]/90 leading-relaxed font-sans">
                {currentPrompt.content}
              </p>

              {/* Clinical rationale box */}
              <div className="p-3 bg-[#122131]/60 border border-[#45464d]/10 rounded-xl flex gap-2">
                <Info className="w-4 h-4 text-[#5adace] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-semibold text-white font-mono uppercase block tracking-wide text-[9px]">
                    Clinical Rationale & Mechanism
                  </span>
                  <p className="text-[#c6c6cd]/90 mt-1 leading-normal">
                    {currentPrompt.clinicalReason}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Transmitter Block */}
          <div className="space-y-4 pt-4 border-t border-[#45464d]/20">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0d1c2d]/55 border border-[#45464d]/25 p-4 rounded-xl">
              <div>
                <span className="text-[10px] font-mono text-[#c6c6cd]/60 uppercase tracking-widest block">
                  Secure Communication Portal
                </span>
                <span className="text-xs text-[#d4e4fa] font-semibold mt-1 block">
                  Broadcast this guideline to the active patient's connected mobile device
                </span>
              </div>

              <button
                onClick={() => handleBroadcast(currentPrompt)}
                disabled={isBroadcasting}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isBroadcasting
                    ? 'bg-[#1c2b3c] border border-[#5adace]/40 text-[#5adace] cursor-not-allowed'
                    : 'bg-[#5adace] hover:bg-[#43c4b9] text-[#051424] shadow-lg shadow-[#5adace]/10 active:scale-95'
                }`}
              >
                {isBroadcasting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-[#5adace]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Transmitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Broadcast Guidance</span>
                  </>
                )}
              </button>
            </div>

            {/* Success message banner */}
            {isSent && successMsg && (
              <div className="flex items-start gap-3 p-3 bg-[#42e09a]/10 border border-[#42e09a]/30 rounded-xl animate-fadeIn">
                <CheckCircle className="w-4.5 h-4.5 text-[#42e09a] shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-[#42e09a] block">Guideline Broadcast Active</span>
                  <p className="text-[11px] text-[#d4e4fa] mt-0.5 leading-normal">
                    {successMsg}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Glycemic Carb Balance & Bolus Calculator */}
        <div className="lg:col-span-5 bg-[#122131]/75 border border-[#45464d]/30 rounded-2xl p-6 flex flex-col justify-between backdrop-blur space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calculator className="w-4.5 h-4.5 text-[#42e09a]" />
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-[#42e09a]">
                Insulin-to-Carb Bolus Planner
              </h3>
            </div>
            <p className="text-xs text-[#c6c6cd]">
              Calculate and model dietary insulin coverage requirements based on the patient's custom clinical targets and upcoming carb intake.
            </p>

            <div className="space-y-4 mt-2">
              {/* Carb Input Slider */}
              <div className="space-y-1.5 p-3.5 rounded-xl bg-[#0d1c2d] border border-[#45464d]/20">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-[#d4e4fa] font-semibold">Carbohydrate Load</label>
                  <span className="text-xs font-mono font-bold text-[#42e09a]">
                    {carbGramInput} grams
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={carbGramInput}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setCarbGramInput(val);
                    handleRecalculateBolus(val, insulinCarbRatio);
                  }}
                  className="w-full accent-[#42e09a] bg-[#122131] h-1.5 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-mono text-[#c6c6cd]/50">
                  <span>5g (Light snack)</span>
                  <span>120g (Heavy meal)</span>
                </div>
              </div>

              {/* Insulin-to-Carbohydrate Ratio */}
              <div className="space-y-1.5 p-3.5 rounded-xl bg-[#0d1c2d] border border-[#45464d]/20">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-[#d4e4fa] font-semibold">Insulin-to-Carb Ratio (I:C)</label>
                  <span className="text-xs font-mono font-bold text-[#5adace]">
                    1 Unit per {insulinCarbRatio}g carbs
                  </span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="25"
                  step="1"
                  value={insulinCarbRatio}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setInsulinCarbRatio(val);
                    handleRecalculateBolus(carbGramInput, val);
                  }}
                  className="w-full accent-[#5adace] bg-[#122131] h-1.5 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-mono text-[#c6c6cd]/50">
                  <span>1 U / 3g (High resistance)</span>
                  <span>1 U / 25g (Sensitive)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Results display & Apply trigger button */}
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-[#0d1c2d] border-l-4 border-[#42e09a] space-y-2">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#c6c6cd]/60 block">
                Suggested Meal Bolus Dosage
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-white tracking-tight">
                  {calculatedBolus}
                </span>
                <span className="text-sm font-bold text-[#42e09a]">Units of Rapid-Acting Insulin</span>
              </div>
              <p className="text-[11px] text-[#c6c6cd]/80 leading-normal pt-1 border-t border-[#45464d]/10">
                *Calculated as: <span className="font-mono">Carbs ({carbGramInput}g) / I:C Ratio ({insulinCarbRatio})</span>.
              </p>
            </div>

            <button
              onClick={applyCalculatorToForm}
              className="w-full py-2 bg-[#42e09a]/10 hover:bg-[#42e09a]/25 border border-[#42e09a]/30 rounded-xl text-xs font-bold text-[#42e09a] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Apply Bolus to Logging Form</span>
            </button>
          </div>

          {/* Guidelines Box */}
          <div className="p-4 bg-[#1c2b3c]/40 border border-[#5adace]/20 rounded-xl space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#5adace]">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Safety Limits & Glycemic Thresholds</span>
            </div>
            <ul className="text-[10.5px] text-[#c6c6cd]/90 space-y-1.5 list-disc pl-4 leading-normal">
              <li>If current glucose exceeds <strong>250 mg/dL</strong>, test ketones.</li>
              <li>Always carry 15g of fast-acting glucose during exercise.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* NEW: Medication and Intervention Logging Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        {/* Log Entry Form */}
        <div className="lg:col-span-5 bg-[#122131]/75 border border-[#45464d]/30 rounded-2xl p-6 backdrop-blur space-y-5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#5adace]/10 text-[#5adace]">
              <Plus className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-base font-bold text-white">Log Active Intervention</h3>
          </div>

          {/* Quick-select Templates */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wide text-[#c6c6cd]/60 block">Quick Template Injections</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => applyTemplate('basal')}
                className="px-2 py-1.5 bg-[#0d1c2d] hover:bg-[#1c2b3c] border border-[#45464d]/25 text-[10px] font-semibold rounded-lg text-white transition-all cursor-pointer text-center truncate"
              >
                Basal Insulin
              </button>
              <button
                onClick={() => applyTemplate('hydration')}
                className="px-2 py-1.5 bg-[#0d1c2d] hover:bg-[#1c2b3c] border border-[#45464d]/25 text-[10px] font-semibold rounded-lg text-white transition-all cursor-pointer text-center truncate"
              >
                Hydration Protocol
              </button>
              <button
                onClick={() => applyTemplate('fiber')}
                className="px-2 py-1.5 bg-[#0d1c2d] hover:bg-[#1c2b3c] border border-[#45464d]/25 text-[10px] font-semibold rounded-lg text-white transition-all cursor-pointer text-center truncate"
              >
                Viscous Fiber
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmitLog} className="space-y-4">
            {/* Intervention Type selector */}
            <div className="space-y-1">
              <label className="text-xs text-[#c6c6cd] font-semibold">Intervention Type</label>
              <div className="grid grid-cols-2 gap-2 bg-[#0d1c2d] p-1 rounded-xl border border-[#45464d]/25">
                <button
                  type="button"
                  onClick={() => {
                    setFormType('insulin');
                    setFormName('Humalog (Rapid-Acting)');
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    formType === 'insulin'
                      ? 'bg-[#5adace] text-[#051424]'
                      : 'text-[#c6c6cd] hover:text-white'
                  }`}
                >
                  Insulin Dosage
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormType('dietary');
                    setFormName('Pre-meal Hydration Protocol');
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    formType === 'dietary'
                      ? 'bg-[#5adace] text-[#051424]'
                      : 'text-[#c6c6cd] hover:text-white'
                  }`}
                >
                  Dietary Intervention
                </button>
              </div>
            </div>

            {/* Name input */}
            <div className="space-y-1">
              <label className="text-xs text-[#c6c6cd] font-semibold">Intervention / Drug Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] placeholder-[#c6c6cd]/40 outline-none transition-all"
                placeholder="e.g. Humalog, Lantus, Water Intake"
                required
              />
            </div>

            {/* Dosage input */}
            <div className="space-y-1">
              <label className="text-xs text-[#c6c6cd] font-semibold">Amount / Dosage</label>
              <input
                type="text"
                value={formDosage}
                onChange={(e) => setFormDosage(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] placeholder-[#c6c6cd]/40 outline-none transition-all"
                placeholder="e.g. 5.0 Units, 400mL, 10g fiber"
                required
              />
            </div>

            {/* Notes input */}
            <div className="space-y-1">
              <label className="text-xs text-[#c6c6cd] font-semibold">Clinical Indication / Notes</label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] placeholder-[#c6c6cd]/40 outline-none transition-all resize-none"
                placeholder="Document specific glycemic indications or active care targets..."
              />
            </div>

            {/* Submit btn */}
            <button
              type="submit"
              className="w-full py-2.5 bg-[#5adace] hover:bg-[#43c4b9] text-[#051424] font-bold text-xs rounded-xl shadow-lg shadow-[#5adace]/10 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Document &amp; Sync to EMR</span>
            </button>

            {isLoggingSuccess && (
              <div className="p-2.5 bg-[#42e09a]/10 border border-[#42e09a]/30 rounded-xl text-center animate-fadeIn">
                <span className="text-[11px] font-bold text-[#42e09a]">Log Synced Successfully with Active Care Plan</span>
              </div>
            )}
          </form>
        </div>

        {/* Historic logs list */}
        <div className="lg:col-span-7 bg-[#122131]/75 border border-[#45464d]/30 rounded-2xl p-6 backdrop-blur flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4.5 h-4.5 text-[#5adace]" />
                <h3 className="text-base font-bold text-white">Care Plan Intervention History</h3>
              </div>
              <span className="text-[10px] font-mono text-[#c6c6cd]/50 bg-[#0d1c2d] px-2.5 py-1 rounded-full border border-[#45464d]/25">
                {careLogs.length} Records Logged
              </span>
            </div>

            {/* Log list list */}
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {careLogs.map((log) => (
                <div key={log.id} className="p-3.5 rounded-xl bg-[#0d1c2d]/70 border border-[#45464d]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#5adace]/20 transition-all">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                        log.type === 'insulin'
                          ? 'bg-[#ffb4ab]/10 text-[#ffb4ab] border border-[#ffb4ab]/20'
                          : 'bg-[#42e09a]/10 text-[#42e09a] border border-[#42e09a]/20'
                      }`}>
                        {log.type === 'insulin' ? 'Insulin dosage' : 'Dietary intervention'}
                      </span>
                      <span className="text-[10px] font-mono text-[#c6c6cd]/50">{log.timestamp}</span>
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <h4 className="text-sm font-bold text-white truncate">{log.interventionName}</h4>
                      <span className="text-xs font-mono font-semibold text-[#5adace]">({log.dosage})</span>
                    </div>

                    {log.notes && (
                      <p className="text-xs text-[#c6c6cd] leading-normal font-sans line-clamp-2">
                        {log.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#45464d]/10">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-[#42e09a] rounded-full animate-pulse" />
                      <span className="text-[9px] font-mono text-[#42e09a] uppercase font-bold tracking-wider">EMR Synced</span>
                    </div>

                    <button
                      onClick={() => handleDeleteLog(log.id)}
                      className="p-1 text-[#c6c6cd]/60 hover:text-[#ffdad6] hover:bg-[#93000a]/10 rounded transition-colors cursor-pointer"
                      title="Delete record log"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {careLogs.length === 0 && (
                <div className="py-12 border border-dashed border-[#45464d]/30 rounded-2xl flex flex-col items-center justify-center text-center p-6">
                  <FileText className="w-10 h-10 text-[#c6c6cd]/35 mb-2" />
                  <p className="text-sm font-semibold text-[#d4e4fa]">No logged interventions</p>
                  <p className="text-xs text-[#c6c6cd]/60 mt-1 max-w-[280px]">
                    Document insulin dosages or clinical dietary supplements to maintain synchronization with patient treatment plans.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-[#5adace]/10 border border-[#5adace]/20 rounded-xl text-xs text-[#c6c6cd] leading-relaxed font-sans">
            <Info className="w-4 h-4 text-[#5adace] shrink-0 mt-0.5" />
            <p>
              Intervention logs represent immediate clinical adjustments. Once signed and documented, logs are safely buffered in local states and securely committed to active EHR repositories.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
