/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Settings,
  User,
  Download,
  Check,
  RefreshCw,
  Sliders,
  Sun,
  Moon,
  Upload,
  Image as ImageIcon,
  Siren,
} from 'lucide-react';
import { GlucoseGoal } from '../types';
import { ANIMATED_AVATAR_PRESETS } from '../utils/avatars';

interface SettingsTabProps {
  patient: any;
  setPatient: React.Dispatch<React.SetStateAction<any>>;
  emergencyContact: { name: string; relationship: string; phone: string };
  setEmergencyContact: React.Dispatch<
    React.SetStateAction<{ name: string; relationship: string; phone: string }>
  >;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  glucoseGoals: GlucoseGoal[];
  setGlucoseGoals: React.Dispatch<React.SetStateAction<GlucoseGoal[]>>;
}

export default function SettingsTab({
  patient,
  setPatient,
  emergencyContact,
  setEmergencyContact,
  theme,
  setTheme,
  glucoseGoals,
  setGlucoseGoals,
}: SettingsTabProps) {
  // Input local state before saving to main app context
  const [profile, setProfile] = useState<any>({ ...patient });
  const [emergency, setEmergency] = useState({ ...emergencyContact });
  const [localGoals, setLocalGoals] = useState<GlucoseGoal[]>(() => [...glucoseGoals]);

  // Keep local form values updated if global context changes (e.g. login/logout)
  React.useEffect(() => {
    setProfile({ ...patient });
  }, [patient]);

  React.useEffect(() => {
    setEmergency({ ...emergencyContact });
  }, [emergencyContact]);

  React.useEffect(() => {
    setLocalGoals([...glucoseGoals]);
  }, [glucoseGoals]);

  const [notifs, setNotifs] = useState({
    critical: true,
    weekly: false,
    retrain: true,
  });

  const [isCalibrating, setIsCalibrating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFileError('Please select an image file (PNG, JPG, SVG, GIF etc.)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setFileError('Image size exceeds 2MB limit. Please upload a smaller file.');
      return;
    }

    setFileError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfile((prev: any) => ({ ...prev, avatarUrl: reader.result as string }));
      }
    };
    reader.onerror = () => {
      setFileError('Failed to read image. Please try again.');
    };
    reader.readAsDataURL(file);
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
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setFileError('Please drop an image file (PNG, JPG, SVG, GIF etc.)');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setFileError('Image size exceeds 2MB limit.');
        return;
      }
      setFileError(null);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setProfile((prev: any) => ({ ...prev, avatarUrl: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setPatient({ ...profile });
    setEmergencyContact({ ...emergency });
    setGlucoseGoals(localGoals);
    
    // Persist to local storage
    localStorage.setItem('clinical_patient', JSON.stringify(profile));

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    alert('Settings successfully updated! Patient profile record, custom patient glucose goals, and emergency vectors have been saved.');
  };

  const handleSelfCalibrate = () => {
    setIsCalibrating(true);
    setTimeout(() => {
      setIsCalibrating(false);
      alert('Neural Core Calibration Complete. soft-update of feed-forward bias matrices completed successfully.');
    }, 1500);
  };

  const handleExportCSV = () => {
    // Generate synthetic audit logs in memory
    const rows = [
      ['Timestamp', 'Patient ID', 'Avg Glucose (mg/dL)', 'Model Output', 'Status'],
      ['2026-07-06 14:30:12', 'GS-8821', '108', 'Normal', 'Success'],
      ['2026-07-06 10:15:45', 'GS-5012', '162', 'Type 2', 'Success'],
      ['2026-07-05 18:22:01', 'GS-4299', '115', 'Prediabetes', 'Success'],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((r) => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `glucosense_audit_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="settings-tab" className="space-y-6 max-w-4xl mx-auto font-sans">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#d4e4fa] flex items-center gap-2">
          <Settings className="w-7 h-7 text-[#5adace]" />
          Settings &amp; Preferences
        </h2>
        <p className="text-sm text-[#c6c6cd] mt-1">
          Configure clinical profile records, biometric emergency vectors, and model diagnostics triggers.
        </p>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        
        {/* Patient Profile Configuration Card */}
        <div className="bg-[#122131]/75 border border-[#45464d]/30 rounded-2xl p-6 space-y-5 backdrop-blur">
          <div className="flex items-center justify-between border-b border-[#45464d]/20 pb-3">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-[#5adace]" />
              <h3 className="font-semibold text-sm text-[#d4e4fa] uppercase tracking-wider font-mono">
                Patient Profile Record
              </h3>
            </div>
            {profile.authProvider === 'google' && (
              <span className="bg-[#1e3a8a]/40 border border-[#3b82f6]/40 text-[#60a5fa] px-3 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#60a5fa] animate-pulse" />
                Signed in with Google
              </span>
            )}
          </div>

          {/* Interactive Profile Photo Selection Panel */}
          <div className="bg-[#0d1c2d]/40 p-5 rounded-2xl border border-[#45464d]/25 space-y-5">
            <div className="flex flex-col md:flex-row items-stretch gap-6">
              
              {/* Profile image preview box */}
              <div className="flex flex-col items-center justify-center shrink-0 bg-[#071321] border border-[#45464d]/20 rounded-2xl p-4 w-full md:w-32 text-center space-y-2">
                <div className="relative group">
                  <img
                    src={profile.avatarUrl}
                    alt="Current Profile Avatar Preview"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-[#5adace] shadow-lg shadow-[#5adace]/10 group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-[#5adace] text-[#051424] p-1 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider scale-90">
                    LIVE
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#5adace] uppercase tracking-widest block pt-1">Active AVATAR</span>
              </div>

              {/* Preset selection (Animated Animals / Peoples) */}
              <div className="space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#d4e4fa] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5adace] animate-pulse" />
                    Animated Animals &amp; Peoples Presets
                  </h4>
                  <p className="text-[10px] text-[#c6c6cd] mt-0.5">
                    Select a modern animated character that represents your patient profile or matches your energy.
                  </p>
                </div>

                {/* Preset circles with cute SVG images */}
                <div className="flex flex-wrap items-center gap-2.5 justify-start py-1">
                  {ANIMATED_AVATAR_PRESETS.map((preset) => {
                    const isActive = profile.avatarUrl === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setProfile({ ...profile, avatarUrl: preset.url });
                          setFileError(null);
                        }}
                        className={`w-11 h-11 rounded-2xl overflow-hidden border-2 cursor-pointer transition-all hover:scale-110 active:scale-95 shrink-0 ${
                          isActive ? 'border-[#5adace] bg-[#5adace]/5 scale-105 shadow-md shadow-[#5adace]/15' : 'border-[#45464d]/30 bg-[#0d1c2d] hover:border-[#5adace]/40'
                        }`}
                        title={`Select ${preset.name}`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </button>
                    );
                  })}
                </div>
                
                <span className="text-[9px] font-mono text-[#c6c6cd]/50 uppercase tracking-widest block">Hover or tap on custom presets to watch them dance!</span>
              </div>
            </div>

            {/* Drag & Drop File Upload Area */}
            <div className="space-y-2 pt-2 border-t border-[#45464d]/15">
              <span className="text-[10px] text-[#c6c6cd] font-semibold block uppercase tracking-wider">Upload Custom Photo from Gallery / Files</span>
              
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                  dragActive 
                    ? 'border-[#5adace] bg-[#5adace]/5' 
                    : 'border-[#45464d]/30 hover:border-[#5adace]/40 bg-[#0d1c2d]/60 hover:bg-[#0d1c2d]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                <Upload className="w-5 h-5 text-[#5adace]/80 animate-bounce" />
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-[#d4e4fa]">
                    Drag &amp; drop your profile image here, or <span className="text-[#5adace] underline">browse files</span>
                  </p>
                  <p className="text-[9px] text-[#c6c6cd]/60">Supports PNG, JPG, GIF, SVG (Max size 2MB)</p>
                </div>
              </div>

              {fileError && (
                <p className="text-[11px] font-semibold text-[#f43f5e] mt-1 bg-[#f43f5e]/10 px-3 py-1.5 rounded-lg border border-[#f43f5e]/20">
                  ⚠️ {fileError}
                </p>
              )}
            </div>

            {/* Custom URL paste area */}
            <div className="space-y-1.5 pt-2.5 border-t border-[#45464d]/15">
              <label className="text-[10px] text-[#c6c6cd] font-semibold block uppercase tracking-wider">Or supply any Custom Image URL:</label>
              <input
                type="url"
                value={profile.avatarUrl}
                onChange={(e) => {
                  setProfile({ ...profile, avatarUrl: e.target.value });
                  setFileError(null);
                }}
                placeholder="https://example.com/your-custom-avatar.jpg"
                className="w-full px-3 py-2 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none font-mono placeholder-[#c6c6cd]/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input 1 */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#c6c6cd] font-medium block">Full Patient Name</label>
              <input
                type="text"
                disabled={profile.authProvider === 'google'}
                value={profile.name || ''}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-xs outline-none ${
                  profile.authProvider === 'google'
                    ? 'bg-[#0d1c2d]/50 border-[#45464d]/15 text-[#c6c6cd]/60 cursor-not-allowed font-semibold'
                    : 'bg-[#0d1c2d] border-[#45464d]/30 focus:border-[#5adace] text-[#d4e4fa]'
                }`}
              />
              {profile.authProvider === 'google' && (
                <span className="text-[9px] text-[#5adace] font-mono block mt-1">Managed via Google Profile authentication</span>
              )}
            </div>
            {/* Input 2 */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#c6c6cd] font-medium block">Patient Identifier ID</label>
              <input
                type="text"
                value={profile.id || ''}
                onChange={(e) => setProfile({ ...profile, id: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none font-mono"
              />
            </div>
            {/* Input 3 */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#c6c6cd] font-medium block">Patient Age (years)</label>
              <input
                type="number"
                value={profile.age || ''}
                onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none"
              />
            </div>
            {/* Input 4 */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#c6c6cd] font-medium block">Diabetes Condition Type</label>
              <input
                type="text"
                value={profile.type || ''}
                onChange={(e) => setProfile({ ...profile, type: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none"
              />
            </div>
            {/* Input 5 */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#c6c6cd] font-medium block">Contact Phone</label>
              <input
                type="text"
                value={profile.phone || ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none"
                placeholder="+1 (555) 019-2834"
              />
            </div>
            {/* Input 6 */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#c6c6cd] font-medium block">CGM ID Code</label>
              <input
                type="text"
                value={profile.cgmId || ''}
                onChange={(e) => setProfile({ ...profile, cgmId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none font-mono"
                placeholder="DEX-G6-GS8821"
              />
            </div>
          </div>
        </div>

        {/* Visual Theme Selection Configuration Card */}
        <div className="bg-[#122131]/75 border border-[#45464d]/30 rounded-2xl p-6 space-y-5 backdrop-blur shadow-xl">
          <div className="flex items-center gap-2 border-b border-[#45464d]/20 pb-3">
            <Sun className="w-5 h-5 text-[#5adace]" />
            <h3 className="font-semibold text-sm text-[#d4e4fa] uppercase tracking-wider font-mono">
              Visual Theme Preferences
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Dark Theme Option */}
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-[#1c2b3c] border-[#5adace] text-[#d4e4fa] shadow-md shadow-[#5adace]/5'
                  : 'bg-[#0d1c2d]/50 border-[#45464d]/20 text-[#c6c6cd] hover:border-[#45464d]/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${theme === 'dark' ? 'bg-[#5adace]/20 text-[#5adace]' : 'bg-[#1c2b3c]/40 text-[#c6c6cd]'}`}>
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-xs block">Deep Dark Space</span>
                  <span className="text-[10px] text-inherit opacity-70">Day &amp; Night-shift friendly</span>
                </div>
              </div>
              {theme === 'dark' && (
                <div className="w-5 h-5 rounded-full bg-[#5adace] flex items-center justify-center text-[#051424]">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </button>

            {/* Light Theme Option */}
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-white border-[#5adace] text-[#051424] shadow-md shadow-[#cbd5e1]/10'
                  : 'bg-[#0d1c2d]/50 border-[#45464d]/20 text-[#c6c6cd] hover:border-[#45464d]/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${theme === 'light' ? 'bg-[#5adace]/20 text-[#5adace]' : 'bg-[#1c2b3c]/40 text-[#c6c6cd]'}`}>
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-xs block">Clinical Slate Light</span>
                  <span className="text-[10px] text-inherit opacity-70">High-contrast daytime reading</span>
                </div>
              </div>
              {theme === 'light' && (
                <div className="w-5 h-5 rounded-full bg-[#5adace] flex items-center justify-center text-[#051424]">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Biometric Emergency Vectors configuration */}
        <div className="bg-[#122131]/75 border border-[#45464d]/30 rounded-2xl p-6 space-y-5 backdrop-blur">
          <div className="flex items-center gap-2 border-b border-[#45464d]/20 pb-3">
            <Siren className="w-5 h-5 text-[#ffb4ab]" />
            <h3 className="font-semibold text-sm text-[#d4e4fa] uppercase tracking-wider font-mono">
              Biometric Emergency SOS Contact
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Input 1 */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#c6c6cd] font-medium block">Emergency Contact Name</label>
              <input
                type="text"
                value={emergency.name}
                onChange={(e) => setEmergency({ ...emergency, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none"
              />
            </div>
            {/* Input 2 */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#c6c6cd] font-medium block">Relationship to Patient</label>
              <input
                type="text"
                value={emergency.relationship}
                onChange={(e) => setEmergency({ ...emergency, relationship: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none"
              />
            </div>
            {/* Input 3 */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#c6c6cd] font-medium block">Primary Cell Number</label>
              <input
                type="text"
                value={emergency.phone}
                onChange={(e) => setEmergency({ ...emergency, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none font-mono"
              />
            </div>
          </div>
        </div>



        {/* Core preferences and diagnostic calibration triggers */}
        <div className="bg-[#122131]/75 border border-[#45464d]/30 rounded-2xl p-6 space-y-6 backdrop-blur">
          <div className="flex items-center gap-2 border-b border-[#45464d]/20 pb-3">
            <Sliders className="w-5 h-5 text-[#5adace]" />
            <h3 className="font-semibold text-sm text-[#d4e4fa] uppercase tracking-wider font-mono">
              System Control &amp; Maintenance
            </h3>
          </div>

          {/* Configuration checkbox list */}
          <div className="space-y-3.5">
            <label className="flex items-center gap-3 cursor-pointer text-xs text-[#c6c6cd] hover:text-[#d4e4fa] transition-colors select-none">
              <input
                type="checkbox"
                checked={notifs.critical}
                onChange={(e) => setNotifs({ ...notifs, critical: e.target.checked })}
                className="rounded border-[#45464d] bg-[#0d1c2d] text-[#5adace] focus:ring-0"
              />
              <div className="space-y-0.5">
                <span className="font-semibold text-sm text-[#d4e4fa] block">Enable Critical Hypoglycemic Alerts</span>
                <span className="text-[11px] block text-[#c6c6cd]/75">Triggers floating alert and immediate pager events when sensor drops &lt; 70 mg/dL.</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer text-xs text-[#c6c6cd] hover:text-[#d4e4fa] transition-colors select-none">
              <input
                type="checkbox"
                checked={notifs.retrain}
                onChange={(e) => setNotifs({ ...notifs, retrain: e.target.checked })}
                className="rounded border-[#45464d] bg-[#0d1c2d] text-[#5adace] focus:ring-0"
              />
              <div className="space-y-0.5">
                <span className="font-semibold text-sm text-[#d4e4fa] block">Neural Weight Re-calibration Logs</span>
                <span className="text-[11px] block text-[#c6c6cd]/75">Notify when local client evaluations show gradient descent improvements.</span>
              </div>
            </label>
          </div>

          <div className="pt-4 flex flex-wrap gap-3 border-t border-[#45464d]/15">
            {/* Self calibration */}
            <button
              type="button"
              onClick={handleSelfCalibrate}
              disabled={isCalibrating}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1c2b3c] hover:bg-[#2c3a4c] border border-[#45464d]/40 rounded-xl text-xs font-semibold text-[#d4e4fa] transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-[#5adace] ${isCalibrating ? 'animate-spin' : ''}`} />
              <span>{isCalibrating ? 'Calibrating weights...' : 'Trigger Model Self-Calibration'}</span>
            </button>

            {/* Audit log export */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1c2b3c] hover:bg-[#2c3a4c] border border-[#45464d]/40 rounded-xl text-xs font-semibold text-[#d4e4fa] transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#42e09a]" />
              <span>Download Assessment Audit (CSV)</span>
            </button>
          </div>
        </div>

        {/* Global Save Button */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-[#42e09a] to-[#5adace] hover:opacity-90 text-[#051424] font-bold rounded-xl transition-all shadow-lg shadow-[#42e09a]/10 cursor-pointer flex items-center gap-2"
          >
            {saveSuccess ? (
              <>
                <Check className="w-5 h-5" />
                <span>Profiles Updated</span>
              </>
            ) : (
              <span>Save Configurations</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
