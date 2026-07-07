/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  User,
  Activity,
  Heart,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  Flame,
  Coffee,
  MoreVertical,
  Dna,
} from 'lucide-react';
import { CLINICAL_PATIENT, RECENT_CLINICAL_EVENTS } from '../data';
import { ClinicalEvent } from '../types';

export default function ActivePatientTab() {
  const patient = CLINICAL_PATIENT;
  const [events, setEvents] = useState<ClinicalEvent[]>(RECENT_CLINICAL_EVENTS);

  // New custom event logger form states
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventType, setNewEventType] = useState<'alert' | 'activity' | 'meal'>('meal');

  const handleLogEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim() || !newEventDesc.trim()) return;

    const newEvent: ClinicalEvent = {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      title: newEventTitle,
      description: newEventDesc,
      tags: [newEventType.toUpperCase()],
      type: newEventType,
    };

    setEvents([newEvent, ...events]);
    setNewEventTitle('');
    setNewEventDesc('');
    alert('Event logged! New biometric indicator recorded in clinical record.');
  };

  return (
    <div id="active-patient-tab" className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#d4e4fa]">
          Patient Deep-Dive
        </h2>
        <p className="text-sm text-[#c6c6cd] mt-1">
          Detailed glycemic telemetry, metabolic profiles, and historic clinical event logs.
        </p>
      </div>

      {/* Patient Biography Card Profile */}
      <div className="bg-[#122131]/75 border border-[#45464d]/30 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur">
        <div className="flex items-center gap-5 w-full md:w-auto">
          <img
            src={patient.avatarUrl}
            alt={patient.name}
            className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover border-2 border-[#5adace] shrink-0"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-xl font-bold text-[#d4e4fa] tracking-tight">{patient.name}</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ffb4ab]/15 border border-[#ffb4ab]/30 text-[#ffb4ab]">
                {patient.type} Diabetes
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5 mt-2.5 text-xs text-[#c6c6cd]">
              <div>
                <span className="text-[#c6c6cd]/60 uppercase text-[10px] block">Age</span>
                <span className="font-semibold text-[#d4e4fa]">{patient.age} years</span>
              </div>
              <div>
                <span className="text-[#c6c6cd]/60 uppercase text-[10px] block">Patient ID</span>
                <span className="font-semibold text-[#d4e4fa] font-mono">{patient.id}</span>
              </div>
              <div>
                <span className="text-[#c6c6cd]/60 uppercase text-[10px] block">Sensor Status</span>
                <span className="font-semibold text-[#42e09a] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#42e09a] animate-ping"></span>
                  Active (Dexcom G6)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 w-full md:w-auto border-t md:border-t-0 md:border-l border-[#45464d]/20 pt-4 md:pt-0 md:pl-6 shrink-0 justify-around">
          {/* Stat 1 */}
          <div className="text-center md:text-left">
            <span className="text-[10px] text-[#c6c6cd]/60 uppercase font-mono tracking-wider">Est. HbA1c</span>
            <span className="text-2xl font-bold font-mono text-[#5adace] block mt-0.5">5.8%</span>
          </div>
          {/* Stat 2 */}
          <div className="text-center md:text-left">
            <span className="text-[10px] text-[#c6c6cd]/60 uppercase font-mono tracking-wider">Time-In-Range</span>
            <span className="text-2xl font-bold font-mono text-[#42e09a] block mt-0.5">88.5%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Metabolic telemetry analytics & Custom Event logger (Col-span 7) */}
        <div className="lg:col-span-7 space-y-6 flex flex-col justify-between">
          
          {/* Interactive event logs timeline */}
          <div className="bg-[#122131]/75 border border-[#45464d]/30 rounded-2xl p-5 md:p-6 space-y-4 backdrop-blur flex-1">
            <h3 className="font-semibold text-sm text-[#d4e4fa] uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Dynamic Telemetry Event Logs</span>
              <span className="text-xs text-[#c6c6cd] font-normal lowercase font-sans">showing {events.length} logs</span>
            </h3>

            <div className="space-y-4 mt-6 relative pl-3.5 border-l border-[#45464d]/25">
              {events.map((ev, index) => {
                const isAlert = ev.type === 'alert';
                const isMeal = ev.type === 'meal';
                return (
                  <div key={index} className="relative space-y-1 pl-4 pb-1">
                    {/* Event timeline node icon badge */}
                    <div className={`absolute -left-[24px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isAlert
                        ? 'bg-[#93000a] border-[#ffb4ab]'
                        : isMeal
                          ? 'bg-[#1c2b3c] border-[#5adace]'
                          : 'bg-[#0d1c2d] border-[#42e09a]'
                    }`}>
                      {isAlert ? (
                        <AlertTriangle className="w-2.5 h-2.5 text-[#ffb4ab]" />
                      ) : isMeal ? (
                        <Coffee className="w-2.5 h-2.5 text-[#5adace]" />
                      ) : (
                        <Flame className="w-2.5 h-2.5 text-[#42e09a]" />
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-[#d4e4fa]">{ev.title}</h4>
                      <span className="text-[10px] font-mono text-[#c6c6cd]/50 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {ev.time}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#c6c6cd] leading-relaxed">{ev.description}</p>
                    
                    {/* Tags pill */}
                    <div className="flex gap-1.5 pt-1.5">
                      {ev.tags.map((tag, tIdx) => (
                        <span key={tIdx} className="text-[9px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-[#1c2b3c] text-[#5adace] border border-[#45464d]/10">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Clinician's Event log custom form */}
          <div className="bg-[#122131]/75 border border-[#45464d]/30 rounded-2xl p-5 md:p-6 mt-6 backdrop-blur">
            <h4 className="font-semibold text-xs text-[#d4e4fa] uppercase tracking-wider font-mono flex items-center gap-2 pb-3 border-b border-[#45464d]/15">
              <Plus className="w-4 h-4 text-[#5adace]" />
              Log Custom Clinical Event
            </h4>

            <form onSubmit={handleLogEvent} className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-4 items-end">
              <div className="space-y-1">
                <label className="text-[10px] text-[#c6c6cd] uppercase font-semibold">Event Title</label>
                <input
                  type="text"
                  placeholder="e.g. Carb Intake logged"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[#c6c6cd] uppercase font-semibold">Event Description</label>
                <input
                  type="text"
                  placeholder="e.g. Patient consumed 45g carbs..."
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none"
                />
              </div>

              <div className="flex gap-2">
                <div className="space-y-1 flex-1">
                  <label className="text-[10px] text-[#c6c6cd] uppercase font-semibold block">Type</label>
                  <select
                    value={newEventType}
                    onChange={(e) => setNewEventType(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none cursor-pointer"
                  >
                    <option value="meal">Meal Intake</option>
                    <option value="activity">Physical Activity</option>
                    <option value="alert">Critical Alert</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-gradient-to-r from-[#42e09a] to-[#5adace] text-[#051424] font-bold rounded-xl text-xs h-[36px] transition-all cursor-pointer flex items-center justify-center shrink-0 self-end"
                >
                  Log Log
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Metabolic Statistics grid (Col-span 5) */}
        <div className="lg:col-span-5 bg-[#122131]/75 border border-[#45464d]/30 rounded-2xl p-5 md:p-6 space-y-6 backdrop-blur">
          <div>
            <h3 className="font-semibold text-sm text-[#d4e4fa] uppercase tracking-wider font-mono">
              Glycemic Profile Index
            </h3>
            <p className="text-[11px] text-[#c6c6cd] mt-1">
              Statistical indices computed directly from the patient sensor telemetry database.
            </p>
          </div>

          <div className="space-y-4">
            {/* Stat 1 */}
            <div className="bg-[#0d1c2d] p-4 rounded-xl border border-[#45464d]/15 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-[#c6c6cd]/70 uppercase">Standard Deviation</span>
                <span className="text-lg font-mono font-bold text-[#d4e4fa] block mt-1">14 mg/dL</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#1c2b3c] flex items-center justify-center text-[#5adace]">
                <Activity className="w-4 h-4" />
              </div>
            </div>

            {/* Stat 2 */}
            <div className="bg-[#0d1c2d] p-4 rounded-xl border border-[#45464d]/15 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-[#c6c6cd]/70 uppercase">Sensor Active Lifespan</span>
                <span className="text-lg font-mono font-bold text-[#42e09a] block mt-1">6 days remaining</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#1c2b3c] flex items-center justify-center text-[#42e09a]">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>

            {/* Stat 3 */}
            <div className="bg-[#0d1c2d] p-4 rounded-xl border border-[#45464d]/15 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-[#c6c6cd]/70 uppercase">Insulin Sensitivity Factor</span>
                <span className="text-lg font-mono font-bold text-[#5adace] block mt-1">1 : 45 mg/dL</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#1c2b3c] flex items-center justify-center text-[#5adace]">
                <Dna className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
