/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle,
  XCircle,
  Activity,
  Heart,
  TrendingDown,
  RefreshCw,
  Sliders,
  AlertTriangle,
  Flame,
  ChefHat,
  Stethoscope,
} from 'lucide-react';
import { PROTOCOL_RECOMMENDATIONS } from '../data';

export default function RecommendationsTab() {
  const [recommendations, setRecommendations] = useState(PROTOCOL_RECOMMENDATIONS);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);

  const handleApprove = (id: string, title: string) => {
    setApprovalStatus(`Approving: ${title}`);
    setTimeout(() => {
      setApprovalStatus(null);
      // Remove or flag item from active recommendations list to simulate real queue clearance
      setRecommendations((prev) => prev.filter((item) => item.id !== id));
      alert(`Adjustment Approved: "${title}" has been synced to the patient's insulin pump telemetry via the secure EHR gateway.`);
    }, 1200);
  };

  const handleDismiss = (id: string) => {
    setRecommendations((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div id="recommendations-tab" className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#d4e4fa]">
            Clinical Recommendations &amp; Protocols
          </h2>
          <p className="text-sm text-[#c6c6cd] mt-1">
            Dynamic AI-driven treatment optimizations matching active metabolic profiles.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#c6c6cd]/80 bg-[#122131]/60 px-3.5 py-2 rounded-xl border border-[#45464d]/30">
          <Sparkles className="w-4 h-4 text-[#5adace]" />
          <span>94% Average Protocol Recommendation Match</span>
        </div>
      </div>

      {/* Approve Status Overlay Bar */}
      {approvalStatus && (
        <div className="bg-[#122131] border border-[#5adace] p-4 rounded-xl flex items-center justify-between text-xs text-[#5adace] animate-pulse">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>{approvalStatus}... Authenticating FDA-approved clinical tunnel protocol...</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Recommendation queue card queue list (Col-span 7) */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-xs uppercase font-semibold text-[#c6c6cd] tracking-wider font-mono">
            Active Recommendations Queue ({recommendations.length})
          </h3>

          {recommendations.length > 0 ? (
            recommendations.map((rec) => {
              const isHigh = rec.priorityType === 'error';
              const isMod = rec.priorityType === 'warning';
              return (
                <div
                  key={rec.id}
                  className="bg-[#122131]/75 border border-[#45464d]/30 rounded-2xl p-5 hover:border-[#45464d]/50 transition-all duration-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#45464d]/15 pb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded ${
                          isHigh
                            ? 'bg-[#93000a]/30 text-[#ffb4ab] border border-[#ffb4ab]/20'
                            : isMod
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/20'
                              : 'bg-[#5adace]/10 text-[#5adace] border border-[#5adace]/20'
                        }`}
                      >
                        {rec.priority}
                      </span>
                      <span className="text-[10px] font-mono text-[#c6c6cd]/70">
                        Confidence {rec.confidence}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="text-base font-bold text-[#d4e4fa] tracking-tight">{rec.title}</h4>
                    <p className="text-xs text-[#c6c6cd] mt-2 leading-relaxed">{rec.description}</p>
                  </div>

                  {rec.currentProtocol && (
                    <div className="mt-4 grid grid-cols-2 gap-3 bg-[#0d1c2d] p-3 rounded-xl border border-[#45464d]/10 font-mono text-xs">
                      <div>
                        <span className="text-[10px] text-[#c6c6cd]/60 block uppercase">Current Delivery</span>
                        <span className="font-semibold text-[#ffdad6] mt-0.5 block">{rec.currentProtocol}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#c6c6cd]/60 block uppercase">Proposed Treatment</span>
                        <span className="font-semibold text-[#42e09a] mt-0.5 block">{rec.proposedProtocol}</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-5 flex gap-2 justify-end">
                    <button
                      onClick={() => handleDismiss(rec.id)}
                      className="px-3.5 py-2 text-xs font-semibold text-[#c6c6cd] hover:text-[#ffb4ab] bg-[#2c3a4c]/10 hover:bg-[#93000a]/10 rounded-lg transition-all cursor-pointer border border-transparent hover:border-[#ffb4ab]/25"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleApprove(rec.id, rec.title)}
                      className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-[#42e09a] to-[#5adace] text-[#051424] hover:opacity-90 rounded-lg transition-all shadow-md shadow-[#42e09a]/5 cursor-pointer"
                    >
                      {rec.actionLabel || 'Approve Adjustment'}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-[#122131]/30 border border-dashed border-[#45464d]/30 rounded-2xl p-8 text-center">
              <CheckCircle className="w-10 h-10 text-[#42e09a] mx-auto mb-3" />
              <h4 className="font-bold text-sm text-[#d4e4fa]">Queue Fully Cleared</h4>
              <p className="text-xs text-[#c6c6cd] mt-1">
                All treatment recommendation protocols have been reviewed and successfully delivered.
              </p>
            </div>
          )}
        </div>

        {/* Clinical Protocol Matrix (Col-span 5) */}
        <div className="lg:col-span-5 bg-[#122131]/75 border border-[#45464d]/30 rounded-2xl p-5 md:p-6 space-y-6 backdrop-blur">
          <div>
            <h3 className="font-semibold text-sm text-[#d4e4fa] uppercase tracking-wider font-mono">
              Clinical Protocol Matrix
            </h3>
            <p className="text-[11px] text-[#c6c6cd] mt-1 leading-relaxed">
              Standard treatment matrices and parameters mapped against biometric safety categories.
            </p>
          </div>

          <div className="space-y-4">
            {/* Category Tier 1 */}
            <div className="border border-[#42e09a]/20 bg-[#0d1c2d]/75 p-4 rounded-xl space-y-3.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#42e09a]"></span>
                <h4 className="text-xs font-bold text-[#42e09a] uppercase font-mono tracking-wider">
                  Tier 1 - Standard Stable
                </h4>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] leading-tight text-[#c6c6cd]">
                <div className="space-y-1 bg-[#122131] p-2 rounded">
                  <span className="font-mono text-[9px] text-[#5adace] uppercase block">Monitoring</span>
                  <span>14-day review CGM, Qrtly HbA1c</span>
                </div>
                <div className="space-y-1 bg-[#122131] p-2 rounded">
                  <span className="font-mono text-[9px] text-[#5adace] uppercase block">Dietary</span>
                  <span>Maintain current macro index</span>
                </div>
                <div className="space-y-1 bg-[#122131] p-2 rounded">
                  <span className="font-mono text-[9px] text-[#5adace] uppercase block">Insulin</span>
                  <span>Continue active basal profiles</span>
                </div>
              </div>
            </div>

            {/* Category Tier 2 */}
            <div className="border border-amber-500/20 bg-[#0d1c2d]/75 p-4 rounded-xl space-y-3.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <h4 className="text-xs font-bold text-amber-400 uppercase font-mono tracking-wider">
                  Tier 2 - Elevated Care
                </h4>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] leading-tight text-[#c6c6cd]">
                <div className="space-y-1 bg-[#122131] p-2 rounded">
                  <span className="font-mono text-[9px] text-amber-400 uppercase block">Monitoring</span>
                  <span>Enable predictive alerts, wkly audit</span>
                </div>
                <div className="space-y-1 bg-[#122131] p-2 rounded">
                  <span className="font-mono text-[9px] text-amber-400 uppercase block">Dietary</span>
                  <span>Dinner carb review, limit sugar spikes</span>
                </div>
                <div className="space-y-1 bg-[#122131] p-2 rounded">
                  <span className="font-mono text-[9px] text-amber-400 uppercase block">Insulin</span>
                  <span>Evaluate bolus timing, basal +5% overnight</span>
                </div>
              </div>
            </div>

            {/* Category Tier 3 */}
            <div className="border border-[#ffb4ab]/20 bg-[#0d1c2d]/75 p-4 rounded-xl space-y-3.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffb4ab] animate-pulse"></span>
                <h4 className="text-xs font-bold text-[#ffb4ab] uppercase font-mono tracking-wider">
                  Tier 3 - Critical Telemetry
                </h4>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] leading-tight text-[#c6c6cd]">
                <div className="space-y-1 bg-[#122131] p-2 rounded">
                  <span className="font-mono text-[9px] text-[#ffb4ab] uppercase block">Monitoring</span>
                  <span>Daily telemetry review, drop alerts</span>
                </div>
                <div className="space-y-1 bg-[#122131] p-2 rounded">
                  <span className="font-mono text-[9px] text-[#ffb4ab] uppercase block">Dietary</span>
                  <span>Nutrition referral, strict audit</span>
                </div>
                <div className="space-y-1 bg-[#122131] p-2 rounded">
                  <span className="font-mono text-[9px] text-[#ffb4ab] uppercase block">Insulin</span>
                  <span>Urgent telehealth, halt automated mod</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
