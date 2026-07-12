/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  HeartPulse, 
  Activity, 
  Smartphone, 
  Phone, 
  Send, 
  LogOut, 
  Clock, 
  ShieldAlert, 
  TrendingUp, 
  TrendingDown, 
  User, 
  CheckCircle,
  Apple,
  Flame,
  AlertTriangle,
  FileText,
  Pill,
  Bell,
  Paperclip,
  FileSpreadsheet,
  Eye,
  Download,
  Image as ImageIcon,
  X,
  UploadCloud,
  Check
} from 'lucide-react';

interface PatientPortalProps {
  patient: {
    id: string;
    name: string;
    age: number;
    type: string;
    cgmId: string;
    phone: string;
    physicianCode: string;
    email: string;
  };
  onLogout: () => void;
  onUpdateProfile?: (updatedPatient: any) => void;
}

export default function PatientPortal({ patient, onLogout, onUpdateProfile }: PatientPortalProps) {
  const [currentGlucose, setCurrentGlucose] = useState<number>(112);
  const [glucoseHistory, setGlucoseHistory] = useState<number[]>([104, 108, 115, 110, 112, 109, 112]);
  const [trend, setTrend] = useState<'stable' | 'rising' | 'falling'>('stable');
  const [isCgmConnected, setIsCgmConnected] = useState(true);
  const [activeAlert, setActiveAlert] = useState<string | null>(null);

  // Medication Reminders Feed states
  const [reminders, setReminders] = useState<any[]>([]);
  const [takenReminders, setTakenReminders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const stored = localStorage.getItem('medication_reminders');
    let loadedReminders: any[] = [];
    if (stored) {
      try {
        loadedReminders = JSON.parse(stored);
      } catch (err) {
        console.error('Failed to parse reminders', err);
      }
    }

    // Filter reminders for this patient
    const patientReminders = loadedReminders.filter((r: any) => r.patientId === patient.id && r.isActive !== false);
    
    // Seed default reminders for Sarah Jenkins if none exist
    if (patientReminders.length === 0 && patient.id === 'GS-8821') {
      const defaultReminders = [
        {
          id: 'SEED-1',
          patientId: 'GS-8821',
          patientName: 'Sarah Jenkins',
          medicationName: 'Metformin',
          dosage: '500 mg',
          frequency: 'Once daily',
          timeOfDay: '08:00 AM',
          instructions: 'Take with food to minimize GI discomfort',
          createdAt: new Date().toISOString(),
          isActive: true
        },
        {
          id: 'SEED-2',
          patientId: 'GS-8821',
          patientName: 'Sarah Jenkins',
          medicationName: 'Jardiance (Empagliflozin)',
          dosage: '10 mg',
          frequency: 'Once daily',
          timeOfDay: '09:30 AM',
          instructions: 'Take once daily in the morning with or without food',
          createdAt: new Date().toISOString(),
          isActive: true
        }
      ];
      
      const allReminders = [...defaultReminders, ...loadedReminders.filter((r: any) => r.id !== 'SEED-1' && r.id !== 'SEED-2')];
      localStorage.setItem('medication_reminders', JSON.stringify(allReminders));
      setReminders(defaultReminders);
    } else {
      setReminders(patientReminders);
    }
  }, [patient.id]);

  const handleMarkAsTaken = (id: string, name: string, dosage: string) => {
    setTakenReminders(prev => ({ ...prev, [id]: true }));
    
    const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const notificationMessage = `📝 Adherence Log: I have taken my scheduled dose of ${name} (${dosage}) at ${nowStr}.`;
    
    setMessages(prev => [
      ...prev,
      {
        sender: 'patient',
        text: notificationMessage,
        time: nowStr
      }
    ]);

    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          sender: 'clinician',
          text: `Thank you for logging your medication intake for ${name}. This has been synchronized with your real-time EHR profile. Keep up the perfect adherence!`,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 1500);
  };
  
  // Navigation Tabs in Patient Portal
  const [patientTab, setPatientTab] = useState<'dashboard' | 'physician'>('dashboard');

  // Custom Chat Feed states - Persisted in localStorage
  const [messages, setMessages] = useState<any[]>(() => {
    const stored = localStorage.getItem(`patient_messages_${patient.id}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (err) {
        console.error('Failed to parse chat messages', err);
      }
    }
    return [
      {
        sender: 'clinician',
        text: 'Hello, your continuous glucose sensor link is active. Please let me know if you experience any sudden lows.',
        time: '08:15 AM'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem(`patient_messages_${patient.id}`, JSON.stringify(messages));
  }, [messages, patient.id]);

  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // File Upload states and references
  const fileInputRef = useRef<HTMLInputElement>(null);
  const vaultFileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedReports, setUploadedReports] = useState<any[]>(() => {
    const stored = localStorage.getItem(`patient_reports_${patient.id}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (err) {
        console.error('Failed to parse patient reports', err);
      }
    }
    return [
      {
        id: 'rep-1',
        name: 'Lab_Report_A1C_Biometrics.pdf',
        type: 'pdf',
        size: '142.5 KB',
        uploadedAt: 'Yesterday, 10:45 AM',
        dataUrl: ''
      },
      {
        id: 'rep-2',
        name: 'Glucose_Log_Weekly_Spreadsheet.csv',
        type: 'csv',
        size: '12.8 KB',
        uploadedAt: '2 days ago, 02:15 PM',
        dataUrl: ''
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem(`patient_reports_${patient.id}`, JSON.stringify(uploadedReports));
  }, [uploadedReports, patient.id]);

  // Selected file preview modal state
  const [activePreview, setActivePreview] = useState<any | null>(null);

  // Function to process and log file uploads
  const processUploadedFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const sizeStr = (file.size / 1024).toFixed(1) + ' KB';
      
      let fileType: 'pdf' | 'csv' | 'image' = 'pdf';
      if (file.type.startsWith('image/')) {
        fileType = 'image';
      } else if (file.name.endsWith('.csv') || file.type === 'text/csv') {
        fileType = 'csv';
      }

      const newReport = {
        id: `rep-${Date.now()}`,
        name: file.name,
        type: fileType,
        size: sizeStr,
        uploadedAt: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }) + ', ' + new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        dataUrl: dataUrl
      };

      // Add to uploaded reports list
      setUploadedReports(prev => [newReport, ...prev]);

      // Append file attachment into the active chat message feed
      const userMsg = {
        sender: 'patient',
        text: `Shared report: ${file.name}`,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        attachment: {
          name: file.name,
          type: fileType,
          dataUrl: dataUrl,
          size: sizeStr
        }
      };

      setMessages(prev => [...prev, userMsg]);
      setIsTyping(true);

      // Trigger automatic smart doctor reply based on document/report type
      setTimeout(() => {
        setIsTyping(false);
        let replyText = '';
        if (fileType === 'csv') {
          replyText = `📊 Ingestion Confirmed: I have received your CSV data log "${file.name}" (${sizeStr}). Our biometrics engine has integrated the values into your electronic record. Looks excellent!`;
        } else if (fileType === 'pdf') {
          replyText = `📄 Document Secured: I have received your PDF clinical report "${file.name}" (${sizeStr}) and saved it into your patient dossier. I will review the laboratory metrics.`;
        } else {
          replyText = `🖼️ Diagnostic Image Logged: The image upload "${file.name}" has been attached to your clinical chat log. Thank you for keeping me updated.`;
        }

        setMessages(prev => [
          ...prev,
          {
            sender: 'clinician',
            text: replyText,
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }, 1800);
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
    // Reset inputs
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (vaultFileInputRef.current) vaultFileInputRef.current.value = '';
  };

  const handleDeleteReport = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedReports(prev => prev.filter(r => r.id !== id));
  };

  // SOS States
  const [sosCountdown, setSosCountdown] = useState<number | null>(null);
  const [sosActive, setSosActive] = useState(false);
  const timerRef = useRef<any>(null);

  // Keep mutable refs for current glucose and history to prevent side-effects in intervals
  const currentGlucoseRef = useRef(currentGlucose);
  const glucoseHistoryRef = useRef(glucoseHistory);

  useEffect(() => {
    currentGlucoseRef.current = currentGlucose;
  }, [currentGlucose]);

  useEffect(() => {
    glucoseHistoryRef.current = glucoseHistory;
  }, [glucoseHistory]);

  // Continuous minor glucose variation simulation
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isCgmConnected) return;

      const prev = currentGlucoseRef.current;
      // Small random drift between -2 and +2
      const change = Math.floor(Math.random() * 5) - 2;
      const next = Math.max(70, Math.min(260, prev + change));

      // Update history sparkline
      const history = glucoseHistoryRef.current;
      const nextHistory = [...history.slice(1), next];
      const diff = next - history[history.length - 1];
      if (diff > 1) setTrend('rising');
      else if (diff < -1) setTrend('falling');
      else setTrend('stable');
      setGlucoseHistory(nextHistory);

      // Dynamic thresholds
      if (next > 160) {
        setActiveAlert('Hyperglycemic Spike Detected');
      } else if (next < 80) {
        setActiveAlert('Hypoglycemic Dip Detected');
      } else {
        setActiveAlert(null);
      }

      setCurrentGlucose(next);
    }, 4500);

    return () => clearInterval(interval);
  }, [isCgmConnected]);

  // Autoscroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const userMsg = {
      sender: 'patient',
      text: newMessage,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setNewMessage('');
    setIsTyping(true);

    // Simulate doctor or automated triage agent response
    setTimeout(() => {
      setIsTyping(false);
      let replyText = "I have logged this in your clinical record. Keep monitoring your live telemetry feed.";
      
      const lower = userMsg.text.toLowerCase();
      if (lower.includes('insulin') || lower.includes('dose')) {
        replyText = "Always verify insulin dosing with your active prescription. If glucose remains elevated, reach out to General Hospital Urgent Wing.";
      } else if (lower.includes('sugar') || lower.includes('high') || lower.includes('spike')) {
        replyText = "I see. Try performing 15 minutes of light walking and drink plenty of water to help stabilize your levels.";
      } else if (lower.includes('low') || lower.includes('dizzy') || lower.includes('shaking')) {
        replyText = "⚠️ Warning: Hypoglycemia. Consume 15g of fast-acting carbs (juice, glucose tablets) immediately and retest in 15 minutes.";
      } else if (lower.includes('hello') || lower.includes('hi')) {
        replyText = `Hello! I am reviewing your real-time CGM data (currently ${currentGlucose} mg/dL). How can I assist you today?`;
      }

      setMessages(prev => [
        ...prev,
        {
          sender: 'clinician',
          text: replyText,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 1500);
  };

  // Log dynamic activities that alter glucose
  const triggerMealLog = (carbType: 'high' | 'low') => {
    if (carbType === 'high') {
      setCurrentGlucose(prev => {
        const next = Math.min(240, prev + 45);
        setGlucoseHistory(history => [...history.slice(1), next]);
        setTrend('rising');
        setActiveAlert('Post-Meal Glycemic Spike');
        return next;
      });
      // Append automated event
      setMessages(prev => [
        ...prev,
        {
          sender: 'clinician',
          text: "⚠️ Alert: Fast carbohydrate ingestion detected. Consider your mealtime insulin bolus if recommended by your physician.",
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } else {
      setCurrentGlucose(prev => {
        const next = Math.max(90, Math.min(130, prev + 10));
        setGlucoseHistory(history => [...history.slice(1), next]);
        setTrend('stable');
        setActiveAlert(null);
        return next;
      });
    }
  };

  const triggerExerciseLog = () => {
    setCurrentGlucose(prev => {
      const next = Math.max(78, prev - 25);
      setGlucoseHistory(history => [...history.slice(1), next]);
      setTrend('falling');
      if (next < 80) {
        setActiveAlert('Post-exercise Hypoglycemia risk');
      } else {
        setActiveAlert(null);
      }
      return next;
    });

    setMessages(prev => [
      ...prev,
      {
        sender: 'clinician',
        text: "🏃 Activity logged. Aerobic exercise noted. Baseline glucose levels stabilizing downward. Good work!",
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // SOS Trigger Countdown
  const startSOS = () => {
    setSosCountdown(5);
    setSosActive(false);
    timerRef.current = setInterval(() => {
      setSosCountdown(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setSosActive(true);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelSOS = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setSosCountdown(null);
    setSosActive(false);
  };

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(patient.name || '');
  const [editAge, setEditAge] = useState(String(patient.age || ''));
  const [editType, setEditType] = useState(patient.type || '');
  const [editCgmId, setEditCgmId] = useState(patient.cgmId || '');
  const [editPhone, setEditPhone] = useState(patient.phone || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Keep edit state updated if patient prop changes
  useEffect(() => {
    setEditName(patient.name || '');
    setEditAge(String(patient.age || ''));
    setEditType(patient.type || '');
    setEditCgmId(patient.cgmId || '');
    setEditPhone(patient.phone || '');
  }, [patient]);

  const handleSavePatientProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileError(null);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          age: parseInt(editAge) || undefined,
          type: editType,
          cgmId: editCgmId,
          phone: editPhone
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update profile settings.');
      }

      const data = await res.json();
      localStorage.setItem('clinical_patient', JSON.stringify(data.profile));
      if (onUpdateProfile) {
        onUpdateProfile(data.profile);
      }
      setIsEditingProfile(false);
    } catch (err: any) {
      setProfileError(err.message || 'Unable to update profile settings.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#051424] text-[#c6c6cd] font-sans p-4 md:p-8 relative overflow-x-hidden">
      {/* Decorative ambient gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#5adace]/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#42e09a]/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Patient Portal Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#122131]/60 border border-[#45464d]/30 p-5 rounded-2xl backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#5adace] to-[#42e09a] flex items-center justify-center shadow-md">
              <User className="w-6 h-6 text-[#051424]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-lg md:text-xl text-[#d4e4fa]">
                  Patient Telemetry Dashboard
                </h1>
                <span className="text-[10px] bg-[#1c2b3c] px-2 py-0.5 rounded-full text-[#5adace] border border-[#5adace]/25 font-mono">
                  Active Link
                </span>
              </div>
              <p className="text-xs text-[#c6c6cd]/80 mt-0.5 font-mono">
                Encrypted Session for <span className="text-[#5adace] font-semibold">{patient.name}</span> (ID: {patient.id})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2 bg-[#0d1c2d] border border-[#45464d]/15 px-3 py-1.5 rounded-xl text-xs font-mono">
              <span className={`w-2.5 h-2.5 rounded-full ${isCgmConnected ? 'bg-[#42e09a] animate-pulse' : 'bg-red-500'}`} />
              <span>CGM ID: {patient.cgmId}</span>
            </div>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-500/35 hover:border-red-500/60 text-red-400 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </header>

        {/* SOS Warning State overlay */}
        {(sosCountdown !== null || sosActive) && (
          <div className="bg-red-950/80 border border-red-500/60 p-6 rounded-3xl backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center animate-bounce border border-red-500/40 shrink-0">
                <ShieldAlert className="w-8 h-8 text-red-400" />
              </div>
              <div>
                {sosCountdown !== null ? (
                  <>
                    <h2 className="font-display font-bold text-lg text-white">Emergency Dispatch Countdown</h2>
                    <p className="text-xs text-red-300">
                      Sending secure GPS details &amp; vital logs to First Responders and {patient.phone} in <span className="font-mono text-base font-bold text-white underline">{sosCountdown}s</span>...
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="font-display font-bold text-lg text-white">EMERGENCY ALERT BROADCASTED</h2>
                    <p className="text-xs text-red-200 font-mono">
                      GPS dispatch sent. Dr. Sarah Jenkins is notified. Emergency medical protocols synchronized. Keep calm, help is on the way.
                    </p>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={cancelSOS}
              className="px-6 py-2.5 bg-white text-red-950 hover:bg-gray-100 font-bold rounded-xl text-xs transition-colors shrink-0 cursor-pointer shadow-lg"
            >
              Cancel Distress Alert
            </button>
          </div>
        )}

        {/* Main interactive sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left / Center Grid Column: Telemetry & Actions */}
          <div className="lg:col-span-2 space-y-6">

            {/* Medication & Dosage Notification Feed */}
            <div id="medication-notification-feed-card" className="bg-[#122131]/60 border border-[#5adace]/30 rounded-3xl p-6 backdrop-blur-md space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#45464d]/20 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#5adace]/10 flex items-center justify-center text-[#5adace]">
                    <Bell className="w-4 h-4 text-[#5adace]" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-[#d4e4fa] uppercase tracking-wider">
                      Prescription Notification Feed
                    </h3>
                    <p className="text-[10px] text-[#c6c6cd]">
                      Daily dosage reminders and clinical instructions synchronized by Dr. Sarah Jenkins.
                    </p>
                  </div>
                </div>
                
                {/* Adherence Score Index */}
                {reminders.length > 0 && (
                  <div className="text-right">
                    <span className="text-[9px] text-[#c6c6cd]/60 uppercase font-mono block">Adherence Index</span>
                    <span className="text-xs font-mono font-bold text-[#42e09a]">
                      {Math.round((Object.values(takenReminders).filter(Boolean).length / reminders.length) * 100)}% Today
                    </span>
                  </div>
                )}
              </div>

              {reminders.length === 0 ? (
                <div className="py-4 text-center text-xs text-[#c6c6cd]/50 italic">
                  No active medication dosage reminders scheduled. Enjoy your day!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                  {reminders.map((reminder) => {
                    const isTaken = !!takenReminders[reminder.id];
                    return (
                      <div 
                        key={reminder.id} 
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3.5 ${
                          isTaken 
                            ? 'bg-[#42e09a]/5 border-[#42e09a]/30 shadow-[#42e09a]/5' 
                            : 'bg-[#0d1c2d]/70 border-[#45464d]/20 hover:border-[#5adace]/30'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                              isTaken 
                                ? 'bg-[#42e09a]/10 text-[#42e09a]' 
                                : 'bg-[#5adace]/10 text-[#5adace]'
                            }`}>
                              {reminder.timeOfDay}
                            </span>
                            {isTaken && (
                              <span className="text-[9px] font-mono uppercase text-[#42e09a] font-bold flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> Taken
                              </span>
                            )}
                          </div>

                          <div className="space-y-0.5">
                            <h4 className={`text-xs font-bold leading-tight ${isTaken ? 'text-gray-400 line-through' : 'text-[#d4e4fa]'}`}>
                              {reminder.medicationName}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] text-[#c6c6cd]/60 font-mono">
                              <span>Dosage: {reminder.dosage}</span>
                              <span>•</span>
                              <span>{reminder.frequency}</span>
                            </div>
                          </div>

                          <p className={`text-[10.5px] leading-relaxed italic ${isTaken ? 'text-[#c6c6cd]/40' : 'text-[#c6c6cd]'}`}>
                            "{reminder.instructions}"
                          </p>
                        </div>

                        {!isTaken && (
                          <button
                            type="button"
                            onClick={() => handleMarkAsTaken(reminder.id, reminder.medicationName, reminder.dosage)}
                            className="w-full py-2 bg-[#1c2b3c] hover:bg-[#2c3a4c] border border-[#5adace]/30 hover:border-[#5adace] text-[#5adace] hover:text-white rounded-xl text-[10.5px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Pill className="w-3.5 h-3.5" />
                            <span>Mark as Taken</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Real-time CGM Metrics Card */}
            <div className="bg-[#122131]/40 border border-[#45464d]/30 rounded-3xl p-6 backdrop-blur-md space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#5adace]" />
                  <h2 className="font-display font-bold text-base text-[#d4e4fa]">Continuous Glucose Monitor (CGM) Feed</h2>
                </div>
                <button
                  onClick={() => setIsCgmConnected(!isCgmConnected)}
                  className={`text-[10px] font-bold px-3 py-1 rounded-lg border transition-colors cursor-pointer ${
                    isCgmConnected 
                      ? 'bg-[#42e09a]/10 border-[#42e09a]/40 text-[#42e09a]' 
                      : 'bg-red-500/10 border-red-500/40 text-red-400'
                  }`}
                >
                  {isCgmConnected ? 'SENSOR Connected' : 'SENSOR Paused'}
                </button>
              </div>

              {/* Dynamic Alarm alerts banner */}
              {activeAlert && (
                <div className="bg-amber-950/30 border border-amber-500/35 p-3.5 rounded-xl flex items-center gap-2.5 text-amber-400 text-xs font-mono animate-pulse">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{activeAlert} — Glucose levels drifting outside standard bounds.</span>
                </div>
              )}

              {/* Grid layout representing stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Stat 1: Main Metric */}
                <div className="bg-[#0d1c2d] p-5 rounded-2xl border border-[#45464d]/15 flex flex-col justify-between relative overflow-hidden">
                  <div className="text-xs text-[#c6c6cd]/60 uppercase tracking-wider font-semibold">Real-time Level</div>
                  <div className="my-3 flex items-baseline gap-2">
                    <span className="text-4xl font-display font-extrabold text-[#d4e4fa] tracking-tight">
                      {isCgmConnected ? currentGlucose : '---'}
                    </span>
                    <span className="text-xs text-[#c6c6cd]/60 font-mono">mg/dL</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    {trend === 'rising' && (
                      <span className="text-[#42e09a] flex items-center gap-0.5">
                        <TrendingUp className="w-4 h-4" /> Drifting Up
                      </span>
                    )}
                    {trend === 'falling' && (
                      <span className="text-red-400 flex items-center gap-0.5">
                        <TrendingDown className="w-4 h-4" /> Drifting Down
                      </span>
                    )}
                    {trend === 'stable' && (
                      <span className="text-[#5adace]/80">● Stable Trend</span>
                    )}
                  </div>
                </div>

                {/* Stat 2: Sparkline Chart preview */}
                <div className="bg-[#0d1c2d] p-5 rounded-2xl border border-[#45464d]/15 flex flex-col justify-between col-span-1 md:col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-[#c6c6cd]/60 uppercase tracking-wider font-semibold">Telemetry Sparkline (7-Tick History)</span>
                    <span className="text-[10px] font-mono text-[#5adace]/70">Interval: 4.5s</span>
                  </div>

                  <div className="h-16 flex items-end justify-between gap-1.5 pt-3">
                    {glucoseHistory.map((val, idx) => {
                      const max = 220;
                      const pct = Math.max(15, Math.min(100, (val / max) * 100));
                      // color map
                      let color = 'bg-[#5adace]';
                      if (val > 150) color = 'bg-amber-400';
                      if (val < 80) color = 'bg-red-400';
                      if (val >= 80 && val <= 140) color = 'bg-[#42e09a]';

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[9px] font-mono opacity-60 scale-75">{val}</span>
                          <div 
                            className={`w-full rounded-t-sm transition-all duration-500 ${color}`} 
                            style={{ height: `${pct}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Dynamic Care suggestions banner */}
              <div className="bg-[#0d1c2d]/50 p-4 rounded-xl border border-[#45464d]/15 text-xs text-[#c6c6cd] flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-[#42e09a] shrink-0 mt-0.5" />
                <p>
                  Target Medical Window: <strong className="text-white">80 - 130 mg/dL</strong>. Your historical variance shows a healthy metabolic baseline. Continue wearing your sensor.
                </p>
              </div>

            </div>

            {/* Simulated Patient Intervention Actions */}
            <div className="bg-[#122131]/40 border border-[#45464d]/30 rounded-3xl p-6 backdrop-blur-md space-y-4">
              <div>
                <h3 className="font-display font-bold text-base text-[#d4e4fa]">Telemetry Simulation Controls</h3>
                <p className="text-xs text-[#c6c6cd]/80">Log nutritional food intake or physical aerobic activity to view instantaneous CGM telemetry updates.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <button
                  onClick={() => triggerMealLog('high')}
                  className="flex items-center justify-center gap-2 py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/60 rounded-xl transition-all cursor-pointer group text-amber-300 font-medium text-xs"
                >
                  <Apple className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Log High-Carb Meal (+45)</span>
                </button>

                <button
                  onClick={() => triggerMealLog('low')}
                  className="flex items-center justify-center gap-2 py-3 bg-[#42e09a]/10 hover:bg-[#42e09a]/20 border border-[#42e09a]/30 hover:border-[#42e09a]/60 rounded-xl transition-all cursor-pointer group text-[#42e09a] font-medium text-xs"
                >
                  <Apple className="w-4 h-4 group-hover:scale-110 transition-transform text-[#42e09a]" />
                  <span>Log Low-Carb Meal (+10)</span>
                </button>

                <button
                  onClick={triggerExerciseLog}
                  className="flex items-center justify-center gap-2 py-3 bg-[#5adace]/10 hover:bg-[#5adace]/20 border border-[#5adace]/30 hover:border-[#5adace]/60 rounded-xl transition-all cursor-pointer group text-[#5adace] font-medium text-xs"
                >
                  <Flame className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Log 20m Walk (-25)</span>
                </button>
              </div>
            </div>

            {/* Profile Overview and Emergency Dispatch Center */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Care Circle & Emergency Card */}
              <div className="bg-[#122131]/40 border border-[#45464d]/30 rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-red-400">
                    <ShieldAlert className="w-5 h-5 animate-pulse" />
                    <h3 className="font-display font-bold text-base text-[#d4e4fa]">HIPAA SOS distress trigger</h3>
                  </div>
                  <p className="text-xs text-[#c6c6cd] leading-relaxed">
                    Instantly broadcast your telemetry logs, GPS coordinates, and medical record indices directly to Mercy General First Responders.
                  </p>

                  <div className="bg-[#0d1c2d] p-3.5 rounded-xl border border-[#45464d]/15 text-xs space-y-1.5 font-mono">
                    <div className="text-[10px] text-[#c6c6cd]/50 uppercase tracking-wider font-semibold">Primary Care Contact</div>
                    <div className="text-[#d4e4fa] font-bold">Jane Doe (Spouse)</div>
                    <div className="text-[#5adace]">{patient.phone}</div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={startSOS}
                    className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-red-900/30 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Broadcast Emergency SOS</span>
                  </button>
                </div>
              </div>

              {/* Static Medical Dossier Index */}
              <div className="bg-[#122131]/40 border border-[#45464d]/30 rounded-3xl p-6 backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-[#45464d]/20 pb-2">
                  <div className="flex items-center gap-2 text-[#5adace]">
                    <FileText className="w-5 h-5" />
                    <h3 className="font-display font-bold text-base text-[#d4e4fa]">EHR Patient Profile</h3>
                  </div>
                  {!isEditingProfile ? (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="text-[10px] text-[#5adace] hover:text-white font-bold bg-[#1c2b3c] hover:bg-[#2c3a4c] px-2.5 py-1 rounded-lg border border-[#5adace]/30 transition-colors cursor-pointer uppercase tracking-wider font-mono"
                    >
                      Edit Profile
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsEditingProfile(false);
                        setProfileError(null);
                      }}
                      className="text-[10px] text-gray-400 hover:text-white font-bold bg-[#1c2b3c] hover:bg-[#2c3a4c] px-2.5 py-1 rounded-lg border border-[#45464d]/30 transition-colors cursor-pointer uppercase tracking-wider font-mono"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {profileError && (
                  <div className="text-[11px] text-red-400 font-mono bg-red-950/20 border border-red-500/30 p-2.5 rounded-lg">
                    {profileError}
                  </div>
                )}

                {isEditingProfile ? (
                  <form onSubmit={handleSavePatientProfile} className="space-y-3.5 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#c6c6cd]/60 uppercase tracking-wider font-semibold font-mono block">Patient Name</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-[#c6c6cd]/60 uppercase tracking-wider font-semibold font-mono block">Age (Years)</label>
                      <input
                        type="number"
                        required
                        value={editAge}
                        onChange={(e) => setEditAge(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-[#c6c6cd]/60 uppercase tracking-wider font-semibold font-mono block">Diabetes Type</label>
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none cursor-pointer"
                      >
                        <option value="Not Specified">Not Specified</option>
                        <option value="Normal">Normal</option>
                        <option value="Prediabetes">Prediabetes</option>
                        <option value="Type 1">Type 1</option>
                        <option value="Type 2">Type 2</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-[#c6c6cd]/60 uppercase tracking-wider font-semibold font-mono block">CGM ID Code</label>
                      <input
                        type="text"
                        value={editCgmId}
                        onChange={(e) => setEditCgmId(e.target.value)}
                        placeholder="e.g. DEX-G6-GS8821"
                        className="w-full px-3 py-1.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-[#c6c6cd]/60 uppercase tracking-wider font-semibold font-mono block">Contact Phone</label>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="e.g. +1 (555) 019-2834"
                        className="w-full px-3 py-1.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="w-full py-2 bg-[#5adace] hover:opacity-90 disabled:opacity-50 text-[#051424] font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider font-mono mt-2"
                    >
                      {isSavingProfile ? 'Saving...' : 'Save Profile'}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1.5 border-b border-[#45464d]/15">
                      <span className="text-[#c6c6cd]/50">Patient Name:</span>
                      <span className="text-[#d4e4fa] font-bold">{patient.name}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-[#45464d]/15">
                      <span className="text-[#c6c6cd]/50">Diagnosis status:</span>
                      <span className="text-[#42e09a] font-bold">{patient.type || 'Not Specified'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-[#45464d]/15">
                      <span className="text-[#c6c6cd]/50">Age Bracket:</span>
                      <span className="text-[#d4e4fa]">{patient.age} Years Old</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-[#45464d]/15">
                      <span className="text-[#c6c6cd]/50">Primary Email:</span>
                      <span className="text-[#d4e4fa] truncate max-w-[150px]">{patient.email}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-[#45464d]/15">
                      <span className="text-[#c6c6cd]/50">Contact Phone:</span>
                      <span className="text-[#5adace] font-semibold">{patient.phone || 'Not Provided'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-[#45464d]/15">
                      <span className="text-[#c6c6cd]/50">CGM ID Code:</span>
                      <span className="text-[#5adace] font-mono">{patient.cgmId || 'Not Configured'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-[#45464d]/15">
                      <span className="text-[#c6c6cd]/50">Assigned Doctor:</span>
                      <span className="text-[#d4e4fa] font-semibold">Dr. Sarah Jenkins</span>
                    </div>
                    <div className="flex justify-between py-1 border-none">
                      <span className="text-[#c6c6cd]/50">Physician ID:</span>
                      <span className="text-[#d4e4fa]">{patient.physicianCode}</span>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Right Column: Encrypted Communication Portal with Endocrinologist */}
          <div className="bg-[#122131]/40 border border-[#45464d]/30 rounded-3xl p-5 flex flex-col h-[520px] md:h-[600px] backdrop-blur-md">
            
            {/* Communication Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-[#45464d]/20 shrink-0">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-[#1c2b3c] border border-[#5adace]/30 flex items-center justify-center">
                  <HeartPulse className="w-5 h-5 text-[#5adace]" />
                </div>
                <span className="absolute bottom-[-1px] right-[-1px] w-3 h-3 bg-[#42e09a] border-2 border-[#051424] rounded-full" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-[#d4e4fa]">Clinician Telemedicine Feed</h3>
                <p className="text-[10px] text-[#c6c6cd]/70 font-mono">Linked: Dr. Sarah Jenkins</p>
              </div>
            </div>

            {/* Chat message logs */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3 px-1">
              {messages.map((msg, index) => {
                const isDoc = msg.sender === 'clinician';
                return (
                  <div 
                    key={index} 
                    className={`flex flex-col max-w-[85%] ${isDoc ? 'mr-auto items-start' : 'ml-auto items-end'}`}
                  >
                    <div 
                      className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        isDoc 
                          ? 'bg-[#1c2b3c] text-[#d4e4fa] rounded-tl-none border border-[#45464d]/20' 
                          : 'bg-[#5adace] text-[#051424] font-medium rounded-tr-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-[#c6c6cd]/40 font-mono mt-1 px-1">{msg.time}</span>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex items-center gap-1.5 text-xs text-[#c6c6cd]/50 bg-[#1c2b3c]/40 border border-[#45464d]/10 px-3 py-2 rounded-xl w-32 font-mono animate-pulse">
                  <span>Clinician typing...</span>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Chat Send Form */}
            <form onSubmit={handleSendMessage} className="pt-3 border-t border-[#45464d]/20 flex gap-2 shrink-0">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Ask Dr. Jenkins a question..."
                className="flex-1 px-4 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none"
              />
              <button
                type="submit"
                className="w-10 h-10 bg-[#5adace] hover:opacity-90 text-[#051424] flex items-center justify-center rounded-xl transition-all cursor-pointer hover:scale-105 shrink-0 shadow-md shadow-[#5adace]/10"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </div>

        </div>

      </div>
    </div>
  );
}
