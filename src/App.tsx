/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, AlertTriangle, X } from 'lucide-react';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardTab from './components/DashboardTab';
import PredictionTab from './components/PredictionTab';
import HistoryTab from './components/HistoryTab';
import RecommendationsTab from './components/RecommendationsTab';
import DiagnosticsTab from './components/DiagnosticsTab';
import SettingsTab from './components/SettingsTab';
import ActivePatientTab from './components/ActivePatientTab';
import CareGuidanceTab from './components/CareGuidanceTab';
import SOSModal from './components/SOSModal';
import GlucoBot from './components/GlucoBot';
import HelpSupportModal from './components/HelpSupportModal';
import PatientPortal from './components/PatientPortal';
import { TabId, Clinician, Patient, AssessmentRecord, GlucoseGoal } from './types';
import { INITIAL_CLINICIAN, INITIAL_ASSESSMENT_HISTORY, CLINICAL_PATIENT } from './data';

const getCsrfToken = (): string => {
  const match = document.cookie.match(new RegExp('(^| )csrf_token=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : '';
};

// Helper function to play a short, subtle audio beep warning
const playBeep = (type: 'low' | 'high') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const playTone = (frequency: number, duration: number, startTime: number, volume: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, startTime);
      
      gainNode.gain.setValueAtTime(volume, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    if (type === 'low') {
      // Double warning beeps (low and warm warnings)
      playTone(420, 0.12, now, 0.15);
      playTone(420, 0.12, now + 0.18, 0.15);
    } else {
      // High bright warning beeps
      playTone(650, 0.12, now, 0.1);
      playTone(800, 0.12, now + 0.18, 0.1);
    }
  } catch (err) {
    console.warn('Metabolic alert audio beep could not play:', err);
  }
};

export default function App() {
  const [userSession, setUserSession] = useState<{
    role: 'clinician' | 'patient';
    profile: any;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [currentGlucose, setCurrentGlucose] = useState<number>(108);
  const [isLiveSimulating, setIsLiveSimulating] = useState<boolean>(true);
  const [assessmentHistory, setAssessmentHistory] = useState<AssessmentRecord[]>(
    INITIAL_ASSESSMENT_HISTORY
  );
  
  // Custom target glucose ranges for individual patients
  const [glucoseGoals, setGlucoseGoals] = useState<GlucoseGoal[]>([
    { patientId: 'GS-8821', patientName: 'Sarah Jenkins', low: 70, high: 140 },
    { patientId: 'GS-5012', patientName: 'Marcus Reyes', low: 70, high: 140 },
    { patientId: 'GS-4299', patientName: 'Emma Lin', low: 75, high: 145 },
    { patientId: 'GS-9912', patientName: 'David Jones', low: 70, high: 140 },
    { patientId: 'GS-2384', patientName: 'Anna Kowalski', low: 70, high: 135 },
    { patientId: 'GS-1182', patientName: 'Thomas Wright', low: 80, high: 150 },
  ]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('GS-8821');
  
  // Visual Theme settings state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  const toggleTheme = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };
  
  // Clinician profile state linked globally
  const [clinician, setClinician] = useState<Clinician>(INITIAL_CLINICIAN);

  // Patient profile state linked globally
  const [patient, setPatient] = useState<Patient>(() => {
    const saved = localStorage.getItem('clinical_patient');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {}
    }
    return CLINICAL_PATIENT;
  });
  
  // Emergency care circle details
  const [emergencyContact, setEmergencyContact] = useState({
    name: 'Jane Doe',
    relationship: 'Spouse',
    phone: '+1 (555) 019-2834',
  });

  // Emergency SOS Modal triggers
  const [isSOSOpen, setIsSOSOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Global toasts notification system state
  const [toasts, setToasts] = useState<{
    id: string;
    patientId: string;
    patientName: string;
    type: 'low' | 'high';
    value: number;
    limit: number;
    timestamp: string;
  }[]>([]);

  // Global notifications history list (bell notifications)
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    patientId: string;
    patientName: string;
    type: 'low' | 'high' | 'system' | 'info';
    message: string;
    timestamp: string;
    read: boolean;
  }>>([
    {
      id: 'notif-1',
      patientId: 'GS-8821',
      patientName: 'Sarah Jenkins',
      type: 'info',
      message: 'Dexcom G6 CGMS baseline telemetry calibrated successfully.',
      timestamp: '10:42 AM',
      read: false,
    },
    {
      id: 'notif-2',
      patientId: 'GS-8821',
      patientName: 'Sarah Jenkins',
      type: 'system',
      message: 'New clinical assessment profile generated and signed.',
      timestamp: 'Yesterday',
      read: false,
    },
    {
      id: 'notif-3',
      patientId: 'GS-8821',
      patientName: 'Sarah Jenkins',
      type: 'info',
      message: 'Predictive hazard analysis retrained with active CGM logs.',
      timestamp: 'Yesterday',
      read: true,
    }
  ]);

  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Ref to track the last checked glucose status to avoid duplicate alert triggers
  const lastStateRef = useRef<{
    patientId: string;
    value: number;
    status: 'normal' | 'low' | 'high';
  }>({
    patientId: '',
    value: currentGlucose,
    status: 'normal',
  });

  const activeGoal = glucoseGoals.find(g => g.patientId === selectedPatientId) || {
    patientId: selectedPatientId,
    patientName: 'Sarah Jenkins',
    low: 70,
    high: 140
  };

  // Monitor current glucose against custom target goals and trigger alerts on breach
  useEffect(() => {
    const status = currentGlucose < activeGoal.low ? 'low' : currentGlucose > activeGoal.high ? 'high' : 'normal';
    
    // We trigger an alert toast if:
    // 1. The status changes from normal to low/high (new breach).
    // 2. The patient selection changes and they are already in a breached state.
    // 3. Or a manual tester preset is clicked which triggers a large jump (e.g., from 105 to 62).
    const statusChanged = lastStateRef.current.status !== status;
    const patientChanged = lastStateRef.current.patientId !== selectedPatientId;
    const isLargePresetJump = Math.abs(lastStateRef.current.value - currentGlucose) >= 15;
    
    const isNewBreach = status !== 'normal' && (statusChanged || patientChanged || isLargePresetJump);

    if (isNewBreach) {
      const now = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

      const newToast = {
        id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        patientId: selectedPatientId,
        patientName: activeGoal.patientName,
        type: status as 'low' | 'high',
        value: currentGlucose,
        limit: status === 'low' ? activeGoal.low : activeGoal.high,
        timestamp: now,
      };

      // Add new toast to list (limit to maximum 4 active toasts to keep layout clean)
      setToasts((prev) => [newToast, ...prev].slice(0, 4));
      
      // Also add to notifications history list
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          patientId: selectedPatientId,
          patientName: activeGoal.patientName,
          type: status as 'low' | 'high',
          message: `${activeGoal.patientName} is currently outside target limit at ${currentGlucose} mg/dL.`,
          timestamp: now,
          read: false,
        },
        ...prev
      ]);

      // Play a short, subtle audio warning alert beep
      playBeep(status as 'low' | 'high');
    }

    // Save state for next comparison
    lastStateRef.current = {
      patientId: selectedPatientId,
      value: currentGlucose,
      status,
    };
  }, [currentGlucose, selectedPatientId, activeGoal.low, activeGoal.high, activeGoal.patientName]);

  // Clean up oldest toast after 6 seconds of exposure
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(0, prev.length - 1));
    }, 6000);
    return () => clearTimeout(timer);
  }, [toasts]);

  // Restore authenticated session on startup
  React.useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('No active session');
      })
      .then(data => {
        if (data && data.role && data.profile) {
          setUserSession({ role: data.role, profile: data.profile });
          if (data.role === 'clinician') {
            setClinician(data.profile);
          }
        }
      })
      .catch(() => {
        // No valid session, stay on login screen
      });
  }, []);

  // Core callback when a new neural assessment is run
  const handleAddAssessment = (newRecord: {
    patientName: string;
    avgGlucose: number;
    riskLevel: 'Normal' | 'Prediabetes' | 'Type 2';
    confidence: number;
  }) => {
    const timestamp = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }) + ', ' + new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const isSarah = newRecord.patientName === 'Sarah Jenkins' || newRecord.patientName === 'Anonymous Patient';

    const completeRecord: AssessmentRecord = {
      id: `REC-${String(assessmentHistory.length + 1).padStart(3, '0')}`,
      timestamp,
      patientId: isSarah ? 'GS-8821' : `GS-${Math.floor(1000 + Math.random() * 9000)}`,
      patientName: isSarah ? 'Sarah Jenkins' : newRecord.patientName,
      avatarInitials: isSarah ? 'SJ' : newRecord.patientName.split(' ').map(n => n[0]).join('').toUpperCase(),
      avgGlucose: newRecord.avgGlucose,
      riskLevel: newRecord.riskLevel,
      confidence: newRecord.confidence,
    };

    setAssessmentHistory((prev) => [completeRecord, ...prev]);
  };

  const handleDeepDivePatient = (patientId: string) => {
    setActiveTab('active-patient');
  };

  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  const handleLogout = () => {
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.disableAutoSelect();
      } catch (err) {
        console.warn('Google GSI disableAutoSelect error:', err);
      }
    }
    fetch('/api/auth/logout', { 
      method: 'POST',
      headers: {
        'X-CSRF-Token': getCsrfToken()
      }
    })
      .finally(() => {
        setUserSession(null);
        setActiveTab('dashboard');
      });
  };

  // Require Auth gateway login
  if (!userSession) {
    return (
      <div className={theme === 'light' ? 'light-theme' : ''}>
        <LoginScreen
          onLoginSuccess={(role, profile) => {
            setUserSession({ role, profile });
            if (role === 'clinician') {
              setClinician(profile);
            }
          }}
          onPatientRegistered={(newPatient) => {
            const timestamp = new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }) + ', ' + new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });

            const completeRecord: AssessmentRecord = {
              id: newPatient.id,
              timestamp,
              patientId: newPatient.id,
              patientName: newPatient.name,
              avatarInitials: newPatient.name.split(' ').map((n: string) => n[0]).join('').toUpperCase(),
              avgGlucose: 112,
              riskLevel: (newPatient.type === 'Type 1' || newPatient.type === 'Type 2') ? 'Type 2' : (newPatient.type as any || 'Normal'),
              confidence: 96.4,
            };

            setAssessmentHistory((prev) => [completeRecord, ...prev]);
          }}
        />
      </div>
    );
  }

  // Show Patient portal if user role is patient
  if (userSession.role === 'patient') {
    return (
      <div className={theme === 'light' ? 'light-theme min-h-screen bg-[#f8fafc]' : ''}>
        <PatientPortal
          patient={userSession.profile}
          onLogout={handleLogout}
          onUpdateProfile={(updatedPatient) => {
            setUserSession(prev => prev ? { ...prev, profile: updatedPatient } : null);
          }}
        />
      </div>
    );
  }

  return (
    <div className={`flex bg-[#051424] text-[#c6c6cd] min-h-screen relative font-sans selection:bg-[#5adace]/30 selection:text-[#d4e4fa] ${theme === 'light' ? 'light-theme' : ''}`}>
      
      {/* Sidebar - Desktop */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        clinician={clinician}
        onLogout={handleLogout}
        currentGlucose={currentGlucose}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        patient={patient}
        onOpenHelpSupport={() => setIsHelpOpen(true)}
      />

      {/* Main content viewport block */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          clinician={clinician}
          onTriggerSOS={() => {
            setIsSOSOpen(true);
            const now = new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });
            setNotifications((prev) => [
              {
                id: `notif-sos-${Date.now()}`,
                patientId: 'GS-8821',
                patientName: 'Sarah Jenkins',
                type: 'low',
                message: 'URGENT: Emergency SOS response sequence triggered!',
                timestamp: now,
                read: false,
              },
              ...prev
            ]);
          }}
          onLogout={handleLogout}
          isSidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          notifications={notifications}
          onMarkNotificationRead={handleMarkNotificationRead}
          onClearAllNotifications={handleClearAllNotifications}
          onOpenHelpSupport={() => setIsHelpOpen(true)}
        />

        {/* Content Tabs Wrapper with responsive layouts */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardTab
              currentGlucose={currentGlucose}
              setCurrentGlucose={setCurrentGlucose}
              isLiveSimulating={isLiveSimulating}
              setIsLiveSimulating={setIsLiveSimulating}
              glucoseGoals={glucoseGoals}
              selectedPatientId={selectedPatientId}
              setSelectedPatientId={setSelectedPatientId}
            />
          )}

          {activeTab === 'prediction' && (
            <PredictionTab
              currentGlucose={currentGlucose}
              onAddAssessment={handleAddAssessment}
            />
          )}

          {activeTab === 'history' && (
            <HistoryTab
              assessmentHistory={assessmentHistory}
              setAssessmentHistory={setAssessmentHistory}
              onDeepDivePatient={handleDeepDivePatient}
              selectedPatientId={selectedPatientId}
              glucoseGoals={glucoseGoals}
            />
          )}

          {activeTab === 'recommendations' && <RecommendationsTab />}

          {activeTab === 'diagnostics' && <DiagnosticsTab />}

          {activeTab === 'settings' && (
            <SettingsTab
              patient={patient}
              setPatient={setPatient}
              emergencyContact={emergencyContact}
              setEmergencyContact={setEmergencyContact}
              theme={theme}
              setTheme={toggleTheme}
              glucoseGoals={glucoseGoals}
              setGlucoseGoals={setGlucoseGoals}
            />
          )}

          {activeTab === 'active-patient' && <ActivePatientTab patient={patient} />}

          {activeTab === 'care-guidance' && <CareGuidanceTab />}
        </main>
      </div>

      {/* Floating Interactive Companion */}
      <GlucoBot />

      {/* Immersive SOS Trigger screen countdown */}
      <SOSModal
        isOpen={isSOSOpen}
        onClose={() => setIsSOSOpen(false)}
        emergencyContact={emergencyContact}
        currentGlucose={currentGlucose}
      />

      {/* Clinical Help & Support Desk overlay modal */}
      <HelpSupportModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        onOpenBot={() => window.dispatchEvent(new CustomEvent('open-glucobot'))}
      />

      {/* Toast CSS Animations Keyframes */}
      <style>{`
        @keyframes toastShrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-toast-progress {
          animation: toastShrinkWidth 6s linear forwards;
        }
      `}</style>

      {/* Real-time Global Toast Notifications Floating Panel */}
      <div className="fixed top-24 right-6 z-[9999] flex flex-col gap-3.5 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => {
              setSelectedPatientId(toast.patientId);
              setActiveTab('dashboard');
              setToasts((prev) => prev.filter((t) => t.id !== toast.id));
            }}
            className={`pointer-events-auto w-full bg-[#07192d]/95 border ${
              toast.type === 'low' 
                ? 'border-[#ffb4ab]/80 shadow-[0_10px_30px_rgba(255,180,171,0.15)] hover:border-[#ffb4ab]' 
                : 'border-amber-500/80 shadow-[0_10px_30px_rgba(245,158,11,0.12)] hover:border-amber-400'
            } p-4 rounded-xl shadow-2xl backdrop-blur-md relative overflow-hidden transition-all duration-300 ease-out flex flex-col gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.99] group`}
            title="Click to view patient telemetry on dashboard"
          >
            {/* Header section of the notification */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {toast.type === 'low' ? (
                  <div className="p-1.5 bg-[#93000a]/30 text-[#ffb4ab] rounded-lg">
                    <AlertCircle className="w-4 h-4 animate-bounce" />
                  </div>
                ) : (
                  <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
                    <AlertTriangle className="w-4 h-4 animate-pulse" />
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-bold font-mono tracking-wider text-white uppercase">
                    {toast.type === 'low' ? 'CRITICAL LOW METABOLIC ALERT' : 'HIGH GLUCOSE BREACH DETECTED'}
                  </h4>
                  <span className="text-[9px] text-[#c6c6cd] font-mono">{toast.timestamp}</span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                }}
                className="text-[#c6c6cd] hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
                title="Dismiss alert"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Content section */}
            <div className="text-xs text-[#d4e4fa] leading-relaxed">
              Patient <strong className="text-white">{toast.patientName}</strong> ({toast.patientId}) is currently at{' '}
              <strong className={toast.type === 'low' ? 'text-[#ffb4ab]' : 'text-amber-400'}>{toast.value} mg/dL</strong>, which is outside their personalized target range of{' '}
              <span className="font-mono">{toast.type === 'low' ? `>= ${toast.limit}` : `<= ${toast.limit}`} mg/dL</span>.
            </div>

            {/* Action footer */}
            <div className="flex items-center justify-between pt-1.5 border-t border-[#45464d]/20 mt-0.5 text-[10px] font-mono text-[#c6c6cd]/80">
              <span className="flex items-center gap-1.5 text-[#5adace] group-hover:underline font-bold font-sans">
                <span className={`w-1.5 h-1.5 rounded-full ${toast.type === 'low' ? 'bg-[#ff847c]' : 'bg-amber-400'} animate-pulse`}></span>
                <span>Click to View Telemetry</span>
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                }}
                className="text-[#c6c6cd] hover:text-white font-bold font-sans flex items-center gap-0.5 cursor-pointer hover:bg-white/5 px-2 py-0.5 rounded"
              >
                Dismiss
              </button>
            </div>
            
            {/* Auto-dismiss progress tracking line */}
            <div className="absolute bottom-0 left-0 h-1 bg-[#45464d]/15 w-full">
              <div 
                className={`h-full ${toast.type === 'low' ? 'bg-[#ffb4ab]' : 'bg-amber-500'} animate-toast-progress`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
