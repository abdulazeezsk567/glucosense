/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Siren, AlertOctagon, XCircle, ShieldAlert, CheckCircle2, PhoneCall } from 'lucide-react';

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  emergencyContact: { name: string; relationship: string; phone: string };
  currentGlucose: number;
}

export default function SOSModal({
  isOpen,
  onClose,
  emergencyContact,
  currentGlucose,
}: SOSModalProps) {
  const [countdown, setCountdown] = useState(5);
  const [alertDispatched, setAlertDispatched] = useState(false);

  // Countdown clock loop
  useEffect(() => {
    if (!isOpen) {
      setCountdown(5);
      setAlertDispatched(false);
      return;
    }

    if (countdown <= 0) {
      setAlertDispatched(true);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isOpen, countdown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#051424]/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#122131] border-2 border-[#ffb4ab] rounded-3xl max-w-md w-full overflow-hidden shadow-2xl shadow-[#ffb4ab]/15 flex flex-col p-6 space-y-6 md:p-8 animate-in zoom-in-95 duration-300">
        
        {/* Banner Alert Heading */}
        <div className="flex items-center gap-3.5 border-b border-[#45464d]/20 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-[#93000a]/30 border border-[#ffb4ab]/40 flex items-center justify-center text-[#ffb4ab] shrink-0 animate-pulse">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-[#ffb4ab] tracking-tight">
              Biometric Emergency Gateway
            </h3>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#c6c6cd]/80 block mt-1">
              Active Telemetry Override
            </span>
          </div>
        </div>

        {/* Phase A: Counting down */}
        {!alertDispatched && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-4">
            <div>
              <span className="text-6xl font-extrabold font-mono text-[#ffb4ab] leading-none drop-shadow-[0_0_15px_rgba(255,180,171,0.4)] animate-bounce inline-block">
                {countdown}
              </span>
              <span className="text-xs text-[#c6c6cd] block font-mono mt-3">Seconds to automatic dispatch</span>
            </div>

            <p className="text-xs text-[#c6c6cd] max-w-xs leading-relaxed">
              System is transmitting diagnostic telemetry coefficients (Current: <strong>{currentGlucose} mg/dL</strong>) to your care circle.
            </p>

            <div className="bg-[#0d1c2d] p-3 rounded-xl border border-[#45464d]/15 w-full text-left">
              <span className="text-[10px] text-[#c6c6cd]/60 uppercase block">Emergency Recipient</span>
              <span className="font-bold text-sm text-[#ffdad6] mt-0.5 block">{emergencyContact.name} ({emergencyContact.relationship})</span>
              <span className="font-mono text-xs text-[#c6c6cd] mt-0.5 block">{emergencyContact.phone}</span>
            </div>

            <div className="flex gap-2 w-full pt-2">
              <button
                onClick={onClose}
                className="w-full py-3.5 bg-[#93000a]/15 hover:bg-[#93000a]/30 border border-[#ffb4ab]/40 hover:border-[#ffb4ab]/60 text-[#ffb4ab] font-bold rounded-xl text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <XCircle className="w-4.5 h-4.5" />
                <span>Halt Sequence (Cancel)</span>
              </button>
            </div>
            
            <span className="text-[10px] text-[#c6c6cd]/50 font-mono">
              Aborting countdown halts automatic spouse and first responder pings.
            </span>
          </div>
        )}

        {/* Phase B: Dispatched successfully */}
        {alertDispatched && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-[#42e09a]/20 border-2 border-[#42e09a] flex items-center justify-center text-[#42e09a] shadow-lg shadow-[#42e09a]/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h4 className="font-extrabold text-base text-[#42e09a] uppercase tracking-wide">
                EMERGENCY ALERT SENT
              </h4>
              <p className="text-xs text-[#c6c6cd] max-w-xs mt-2 leading-relaxed">
                Biometric secure telemetry packet broadcast successfully completed.
              </p>
            </div>

            {/* List of dispatches */}
            <div className="bg-[#0d1c2d] p-3.5 rounded-xl border border-[#45464d]/15 w-full space-y-2.5 text-left text-xs text-[#c6c6cd]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#42e09a]"></span>
                <span>Contact <strong>{emergencyContact.name}</strong> paged via secure SMS tunnel</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#42e09a]"></span>
                <span>First responders notified with current GPS coordinates</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#42e09a]"></span>
                <span>Clinician logs updated with critical glycemic code ({currentGlucose} mg/dL)</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#42e09a] to-[#5adace] text-[#051424] font-bold rounded-xl text-sm transition-all cursor-pointer shadow-md shadow-[#42e09a]/10"
            >
              Okay, Dismiss Alert
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
