/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
import PatientPortal from './components/PatientPortal';
import { TabId, Clinician, Patient, AssessmentRecord, GlucoseGoal } from './types';
import { INITIAL_CLINICIAN, INITIAL_ASSESSMENT_HISTORY, CLINICAL_PATIENT } from './data';

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

  const handleLogout = () => {
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.disableAutoSelect();
      } catch (err) {
        console.warn('Google GSI disableAutoSelect error:', err);
      }
    }
    fetch('/api/auth/logout', { method: 'POST' })
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
      />

      {/* Main content viewport block */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          clinician={clinician}
          onTriggerSOS={() => setIsSOSOpen(true)}
          onLogout={handleLogout}
          isSidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
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
    </div>
  );
}
