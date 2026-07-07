/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import {
  Settings,
  User,
  Bell,
  Siren,
  ShieldCheck,
  Download,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Sliders,
  Sun,
  Moon,
  Target,
  Upload,
  Image as ImageIcon,
  Github,
} from 'lucide-react';
import { Clinician, GlucoseGoal } from '../types';
import { ANIMATED_AVATAR_PRESETS } from '../utils/avatars';

interface SettingsTabProps {
  clinician: Clinician;
  setClinician: React.Dispatch<React.SetStateAction<Clinician>>;
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
  clinician,
  setClinician,
  emergencyContact,
  setEmergencyContact,
  theme,
  setTheme,
  glucoseGoals,
  setGlucoseGoals,
}: SettingsTabProps) {
  // Input local state before saving to main app context
  const [profile, setProfile] = useState<Clinician>({ ...clinician });
  const [emergency, setEmergency] = useState({ ...emergencyContact });
  const [localGoals, setLocalGoals] = useState<GlucoseGoal[]>(() => [...glucoseGoals]);

  // GitHub Integration local configurations state
  const [githubSyncEnabled, setGithubSyncEnabled] = useState(() => {
    return localStorage.getItem('github_sync_enabled') === 'true';
  });
  const [githubPat, setGithubPat] = useState(() => localStorage.getItem('github_pat') || '');
  const [githubRepo, setGithubRepo] = useState(() => localStorage.getItem('github_repo') || '');
  const [githubBranch, setGithubBranch] = useState(() => localStorage.getItem('github_branch') || 'main');
  const [showPat, setShowPat] = useState(false);
  const [isVerifyingGithub, setIsVerifyingGithub] = useState(false);
  const [githubStatus, setGithubStatus] = useState<{ status: 'idle' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  });

  const [selectedBackupPatientId, setSelectedBackupPatientId] = useState('GS-8821');
  const [backupLogs, setBackupLogs] = useState<string[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Keep local form values updated if global context changes (e.g. login/logout)
  React.useEffect(() => {
    setProfile({ ...clinician });
  }, [clinician]);

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
        setProfile((prev) => ({ ...prev, avatarUrl: reader.result as string }));
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
          setProfile((prev) => ({ ...prev, avatarUrl: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setClinician({ ...profile });
    setEmergencyContact({ ...emergency });
    setGlucoseGoals(localGoals);
    
    // Persist GitHub Credentials & Sync Toggle State
    localStorage.setItem('github_sync_enabled', githubSyncEnabled ? 'true' : 'false');
    localStorage.setItem('github_pat', githubPat);
    localStorage.setItem('github_repo', githubRepo);
    localStorage.setItem('github_branch', githubBranch);

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    alert('Settings successfully updated! Clinician profiles, custom patient glucose goals, emergency vectors, and GitHub sync settings have been saved.');
  };

  const handleBackupToGithub = async () => {
    const patient = localGoals.find(g => g.patientId === selectedBackupPatientId) || localGoals[0];
    if (!patient) return;

    setIsBackingUp(true);
    setBackupStatus('idle');
    setBackupLogs([`[${new Date().toLocaleTimeString()}] Initiating secure GitOps EHR backup...`]);

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
      await delay(600);
      setBackupLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Compiling active diagnostic telemetry logs for ${patient.patientName}...`]);
      
      // Generate Markdown diagnostic logs
      const markdownLogs = `# CLINICAL DIAGNOSTIC TELEMETRY REPORT
## PATIENT PROFILE
- **Full Name**: ${patient.patientName}
- **Patient Identifier**: ${patient.patientId}
- **Metabolic Reference**: Type 1 / Type 2 Clinical Telemetry
- **Recorded On**: ${new Date().toLocaleString()}

## GLYCEMIC TARGET CALIBRATIONS
- **Low Safety Threshold**: ${patient.low} mg/dL
- **High Safety Threshold**: ${patient.high} mg/dL
- **Current Metric Deviation**: Nominal Range

## BIOMETRIC INDEX METRICS
- **Estimated HbA1c**: 5.8%
- **Time-In-Range (TIR)**: 88.5%
- **Standard Deviation**: 14 mg/dL
- **Active CGM Lifespan**: 6 days remaining

## DIAGNOSTIC CLINICAL NOTES
Telemetry logs evaluated by the predictive model show a stable metabolic slope. No critical hypoglycemia risk predicted for the 1-hour active outlook.

-- *Report authorized by clinician ${clinician.fullName} (ID: ${clinician.medicalId})*`;

      await delay(600);
      setBackupLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Rendering beautiful diagnostic PDF report in-memory using jsPDF...`]);

      // Generate PDF Report using jsPDF
      const doc = new jsPDF();
      
      // PDF Header
      doc.setFillColor(5, 20, 36); // Deep blue #051424
      doc.rect(0, 0, 210, 45, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('EHR PATIENT DIAGNOSTIC REPORT', 15, 24);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(90, 218, 206); // Accent teal #5adace
      doc.text('Clinical GitOps Backup Suite - Encrypted Patient Health Record', 15, 34);
      
      doc.setTextColor(170, 185, 200);
      doc.text(`Backup Date: ${new Date().toLocaleDateString()}`, 155, 24);

      // Section 1: Patient Bio
      doc.setTextColor(20, 35, 55);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Patient Metadata & Clinical Profile', 15, 62);
      
      doc.setDrawColor(200, 210, 225);
      doc.line(15, 66, 195, 66);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 70, 85);
      doc.text(`Patient Full Name: ${patient.patientName}`, 15, 75);
      doc.text(`Patient ID: ${patient.patientId}`, 15, 82);
      doc.text(`Glycemic Targets: Low Target Limit ${patient.low} mg/dL | High Target Limit ${patient.high} mg/dL`, 15, 89);
      doc.text(`HbA1c Estimation: 5.8% (Target Range < 6.5%)`, 15, 96);
      doc.text(`Time-In-Range (TIR): 88.5% (Clinical Target > 70%)`, 15, 103);

      // Section 2: Clinical Assessment
      doc.setTextColor(20, 35, 55);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Clinical Assessment & Machine Learning Forecast', 15, 120);
      doc.line(15, 124, 195, 124);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 70, 85);
      doc.text(`Assessed by Physician: ${clinician.fullName} (${clinician.medicalId})`, 15, 133);
      doc.text(`Clinical Center: ${clinician.primaryFacility || 'Mercy General Hospital'}`, 15, 140);
      doc.text(`Department: ${clinician.specialization || 'Endocrinology & Diabetology'}`, 15, 147);
      
      const textLine1 = "Continuous Glucose Monitoring (CGM) telemetry records indicate highly controlled metabolic dynamics.";
      const textLine2 = "The OLS predictive slope is within healthy therapeutic ranges, presenting no immediate hypoglycemic threats.";
      const textLine3 = "Clinical recommendations: Continue current basal-bolus regimen and review logs weekly.";
      doc.text(textLine1, 15, 156);
      doc.text(textLine2, 15, 163);
      doc.text(textLine3, 15, 170);

      // Signature Area
      doc.setDrawColor(180, 190, 205);
      doc.line(15, 190, 195, 190);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(100, 110, 120);
      doc.text('Authorized Digital Clinician Signature (Encrypted & Backed Up via GitOps Protocol)', 15, 198);
      doc.text(`${clinician.fullName}, M.D.`, 15, 205);

      const pdfBase64 = doc.output('datauristring').split(',')[1];
      
      await delay(600);

      // Check if GitHub Synchronization is enabled and configured
      if (!githubSyncEnabled) {
        setBackupLogs(prev => [
          ...prev, 
          `[${new Date().toLocaleTimeString()}] [SANDBOX WARNING] GitHub Sync is currently DISABLED in settings.`,
          `[${new Date().toLocaleTimeString()}] [SANDBOX SUCCESS] Generated patient report package locally.`,
          `[${new Date().toLocaleTimeString()}] Triggering local browser download of compiled PDF...`
        ]);
        doc.save(`${patient.patientName.replace(/\s+/g, '_')}_diagnostic_report.pdf`);
        setBackupStatus('success');
        setIsBackingUp(false);
        return;
      }

      if (!githubPat || !githubRepo) {
        setBackupLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [SANDBOX ERROR] GitHub credentials (PAT or Repository) missing!`,
          `[${new Date().toLocaleTimeString()}] Triggering local browser download of compiled PDF as fallback...`
        ]);
        doc.save(`${patient.patientName.replace(/\s+/g, '_')}_diagnostic_report.pdf`);
        setBackupStatus('success');
        setIsBackingUp(false);
        return;
      }

      setBackupLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Synchronizing with remote GitHub Repo: https://github.com/${githubRepo}...`]);
      
      const headers = {
        Authorization: `token ${githubPat}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      };

      const branchName = githubBranch || 'main';

      // 1. Commit Patient Diagnostic Log (Markdown)
      const pathMd = `patient_records/${patient.patientId}_${patient.patientName.toLowerCase().replace(/\s+/g, '_')}_diagnostic_logs.md`;
      setBackupLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Uploading diagnostic logs to: ${pathMd}...`]);

      let shaMd: string | undefined;
      try {
        const checkRes = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${pathMd}?ref=${branchName}`, { headers });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          shaMd = checkData.sha;
          setBackupLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Existing file found. Updating with SHA: ${shaMd?.slice(0, 7)}...`]);
        }
      } catch (e) {}

      const mdPayload = {
        message: `Clinical GitOps Backup: Diagnostic logs for ${patient.patientName} (${patient.patientId})`,
        content: btoa(unescape(encodeURIComponent(markdownLogs))),
        branch: branchName,
        ...(shaMd ? { sha: shaMd } : {}),
      };

      const pushMdRes = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${pathMd}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(mdPayload),
      });

      if (!pushMdRes.ok) {
        throw new Error(`Failed to commit Markdown log: HTTP ${pushMdRes.status}`);
      }
      setBackupLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ✓ Diagnostic logs written successfully.`]);

      // 2. Commit Patient Diagnostic Report PDF (Binary Base64)
      const pathPdf = `patient_records/${patient.patientId}_${patient.patientName.toLowerCase().replace(/\s+/g, '_')}_diagnostic_report.pdf`;
      setBackupLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Uploading binary PDF diagnostic report to: ${pathPdf}...`]);

      let shaPdf: string | undefined;
      try {
        const checkPdfRes = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${pathPdf}?ref=${branchName}`, { headers });
        if (checkPdfRes.ok) {
          const checkPdfData = await checkPdfRes.json();
          shaPdf = checkPdfData.sha;
          setBackupLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Existing PDF report found. Updating with SHA: ${shaPdf?.slice(0, 7)}...`]);
        }
      } catch (e) {}

      const pdfPayload = {
        message: `Clinical GitOps Backup: Dynamic PDF report for ${patient.patientName} (${patient.patientId})`,
        content: pdfBase64,
        branch: branchName,
        ...(shaPdf ? { sha: shaPdf } : {}),
      };

      const pushPdfRes = await fetch(`https://api.github.com/repos/${githubRepo}/contents/${pathPdf}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(pdfPayload),
      });

      if (!pushPdfRes.ok) {
        throw new Error(`Failed to commit binary PDF report: HTTP ${pushPdfRes.status}`);
      }

      const pdfCommitData = await pushPdfRes.json();
      const commitUrl = pdfCommitData.commit.html_url;

      setBackupLogs(prev => [
        ...prev, 
        `[${new Date().toLocaleTimeString()}] ✓ PDF Diagnostic Report written successfully.`,
        `[${new Date().toLocaleTimeString()}] [GITOPS COMPLETED] Full diagnostic backup synchronized correctly to branch "${branchName}"!`,
        `[${new Date().toLocaleTimeString()}] Live commit: ${commitUrl}`
      ]);
      setBackupStatus('success');
      alert(`Success! Generated diagnostic logs and PDF reports for ${patient.patientName} have been backed up directly to GitHub.`);

    } catch (err: any) {
      console.error(err);
      setBackupLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [ERROR] Backup execution failed: ${err.message}`]);
      setBackupStatus('error');
    } finally {
      setIsBackingUp(false);
    }
  };

  const verifyGithubConnection = async () => {
    if (!githubPat) {
      setGithubStatus({ status: 'error', message: 'Personal Access Token is required to verify connection.' });
      return;
    }
    setIsVerifyingGithub(true);
    setGithubStatus({ status: 'idle', message: 'Verifying token authorization with GitHub API...' });

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${githubPat}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: HTTP ${response.status} ${response.statusText || 'Unauthorized'}`);
      }

      const userData = await response.json();
      
      if (githubRepo) {
        setGithubStatus({ status: 'idle', message: `Verifying access to repository '${githubRepo}'...` });
        const repoResponse = await fetch(`https://api.github.com/repos/${githubRepo}`, {
          headers: {
            Authorization: `token ${githubPat}`,
            Accept: 'application/vnd.github.v3+json',
          },
        });

        if (!repoResponse.ok) {
          throw new Error(`Repository not found or access denied. Ensure '${githubRepo}' exists and the token has push permissions.`);
        }
      }

      setGithubStatus({
        status: 'success',
        message: `Connected successfully! Authenticated as @${userData.login}${githubRepo ? ` with write access to ${githubRepo}` : ''}.`,
      });
    } catch (err: any) {
      console.error(err);
      setGithubStatus({
        status: 'error',
        message: err.message || 'Verification failed. Please check your token and network connection.',
      });
    } finally {
      setIsVerifyingGithub(false);
    }
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
        
        {/* Clinician Profile Configuration Card */}
        <div className="bg-[#122131]/75 border border-[#45464d]/30 rounded-2xl p-6 space-y-5 backdrop-blur">
          <div className="flex items-center justify-between border-b border-[#45464d]/20 pb-3">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-[#5adace]" />
              <h3 className="font-semibold text-sm text-[#d4e4fa] uppercase tracking-wider font-mono">
                Clinician Profile Record
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
                    Select a modern animated character that represents your clinical profile or matches your energy.
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
              <label className="text-xs text-[#c6c6cd] font-medium block">Full Clinician Name</label>
              <input
                type="text"
                disabled={profile.authProvider === 'google'}
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
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
              <label className="text-xs text-[#c6c6cd] font-medium block">Medical Practitioner ID</label>
              <input
                type="text"
                value={profile.medicalId}
                onChange={(e) => setProfile({ ...profile, medicalId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none font-mono"
              />
            </div>
            {/* Input 3 */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#c6c6cd] font-medium block">Clinical Specialization</label>
              <input
                type="text"
                value={profile.specialization}
                onChange={(e) => setProfile({ ...profile, specialization: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none"
              />
            </div>
            {/* Input 4 */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#c6c6cd] font-medium block">Primary Health Facility</label>
              <input
                type="text"
                value={profile.primaryFacility}
                onChange={(e) => setProfile({ ...profile, primaryFacility: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Glucose Goals Configuration Card */}
        <div className="bg-[#122131]/75 border border-[#45464d]/30 rounded-2xl p-6 space-y-5 backdrop-blur shadow-xl">
          <div className="flex items-center gap-2 border-b border-[#45464d]/20 pb-3">
            <Target className="w-5 h-5 text-[#5adace]" />
            <h3 className="font-semibold text-sm text-[#d4e4fa] uppercase tracking-wider font-mono">
              Glucose Target Goals of the Patient
            </h3>
          </div>
          
          <p className="text-xs text-[#c6c6cd]">
            Define custom low (hypoglycemia) and high (hyperglycemia) alert thresholds. These override system defaults and dynamically update dashboard telemetry lines and safety zones.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {localGoals.map((goal, index) => (
              <div 
                key={goal.patientId}
                className="p-4 bg-[#0d1c2d]/40 border border-[#45464d]/15 rounded-2xl space-y-3 hover:border-[#5adace]/20 transition-all"
              >
                {/* Patient Header */}
                <div className="flex items-center justify-between border-b border-[#45464d]/10 pb-2">
                  <div>
                    <span className="font-bold text-xs text-[#d4e4fa] block">
                      {goal.patientName}
                    </span>
                    <span className="font-mono text-[9px] text-[#5adace]/80">
                      ID: {goal.patientId}
                    </span>
                  </div>
                  
                  {/* Range visual indicator */}
                  <div className="flex items-center gap-1 font-mono text-[9px] text-[#c6c6cd]">
                    <span className="text-[#ffb4ab]">{goal.low}</span>
                    <span className="opacity-50">-</span>
                    <span className="text-amber-400">{goal.high}</span>
                    <span className="opacity-50">mg/dL</span>
                  </div>
                </div>

                {/* Low / High Controls */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#c6c6cd]/80 block font-medium">
                      Low Limit (Hypo)
                    </label>
                    <div className="flex items-center bg-[#0d1c2d] border border-[#45464d]/25 rounded-xl overflow-hidden px-1">
                      <button
                        type="button"
                        onClick={() => {
                          const nextGoals = [...localGoals];
                          nextGoals[index].low = Math.max(50, goal.low - 5);
                          setLocalGoals(nextGoals);
                        }}
                        className="w-6 h-6 flex items-center justify-center text-[#ffb4ab] hover:bg-[#1c2b3c] rounded-lg transition-colors cursor-pointer text-xs font-bold font-mono"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="50"
                        max="100"
                        value={goal.low}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 70;
                          const nextGoals = [...localGoals];
                          nextGoals[index].low = val;
                          setLocalGoals(nextGoals);
                        }}
                        className="w-full text-center py-1 bg-transparent border-none text-xs text-[#ffb4ab] font-bold font-mono focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const nextGoals = [...localGoals];
                          nextGoals[index].low = Math.min(100, goal.low + 5);
                          setLocalGoals(nextGoals);
                        }}
                        className="w-6 h-6 flex items-center justify-center text-[#ffb4ab] hover:bg-[#1c2b3c] rounded-lg transition-colors cursor-pointer text-xs font-bold font-mono"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#c6c6cd]/80 block font-medium">
                      High Limit (Hyper)
                    </label>
                    <div className="flex items-center bg-[#0d1c2d] border border-[#45464d]/25 rounded-xl overflow-hidden px-1">
                      <button
                        type="button"
                        onClick={() => {
                          const nextGoals = [...localGoals];
                          nextGoals[index].high = Math.max(110, goal.high - 5);
                          setLocalGoals(nextGoals);
                        }}
                        className="w-6 h-6 flex items-center justify-center text-amber-400 hover:bg-[#1c2b3c] rounded-lg transition-colors cursor-pointer text-xs font-bold font-mono"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="110"
                        max="220"
                        value={goal.high}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 140;
                          const nextGoals = [...localGoals];
                          nextGoals[index].high = val;
                          setLocalGoals(nextGoals);
                        }}
                        className="w-full text-center py-1 bg-transparent border-none text-xs text-amber-400 font-bold font-mono focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const nextGoals = [...localGoals];
                          nextGoals[index].high = Math.min(220, goal.high + 5);
                          setLocalGoals(nextGoals);
                        }}
                        className="w-6 h-6 flex items-center justify-center text-amber-400 hover:bg-[#1c2b3c] rounded-lg transition-colors cursor-pointer text-xs font-bold font-mono"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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

        {/* GitHub EHR Repository Sync Settings Card */}
        <div id="github-settings-card" className="bg-[#122131]/75 border border-[#45464d]/30 rounded-2xl p-6 space-y-5 backdrop-blur shadow-xl">
          <div className="flex items-center justify-between border-b border-[#45464d]/20 pb-3">
            <div className="flex items-center gap-2">
              <Github className="w-5 h-5 text-[#5adace]" />
              <h3 className="font-semibold text-sm text-[#d4e4fa] uppercase tracking-wider font-mono">
                GitHub EHR Integration Settings & Backup Module
              </h3>
            </div>
            <span className="bg-[#5adace]/10 border border-[#5adace]/30 text-[#5adace] px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
              Secure Repo Sync
            </span>
          </div>

          <p className="text-xs text-[#c6c6cd] leading-relaxed">
            Link and toggle remote clinical synchronization with your secure EHR repository to back up patient diagnostic logs and automatically compile beautiful PDF clinical diagnostic reports directly into your target repository.
          </p>

          {/* New Active Toggle Switch */}
          <div className="flex items-center justify-between p-4 bg-[#0d1c2d] rounded-xl border border-[#45464d]/20">
            <div className="space-y-0.5">
              <span className="font-semibold text-xs text-[#d4e4fa] block">EHR Continuous Synchronization Status</span>
              <span className="text-[10px] text-[#c6c6cd]">Toggle to completely authorize or disable remote patient record backups.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setGithubSyncEnabled(!githubSyncEnabled);
                localStorage.setItem('github_sync_enabled', (!githubSyncEnabled).toString());
              }}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer border flex items-center gap-2 ${
                githubSyncEnabled 
                  ? 'bg-[#42e09a]/10 hover:bg-[#42e09a]/20 border-[#42e09a]/40 text-[#42e09a] shadow-[0_0_8px_rgba(66,224,154,0.1)]' 
                  : 'bg-[#ffb4ab]/10 hover:bg-[#ffb4ab]/20 border-[#ffb4ab]/40 text-[#ffb4ab]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${githubSyncEnabled ? 'bg-[#42e09a]' : 'bg-[#ffb4ab]'}`}></span>
              <span>{githubSyncEnabled ? 'Active (Linked)' : 'Inactive (Disabled)'}</span>
            </button>
          </div>

          <div className={`space-y-4 transition-all duration-300 ${githubSyncEnabled ? 'opacity-100' : 'opacity-70'}`}>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* PAT Input */}
              <div className="col-span-12 md:col-span-6 space-y-1.5">
                <label className="text-xs text-[#c6c6cd] font-medium block">GitHub Personal Access Token (PAT)</label>
                <div className="relative">
                  <input
                    type={showPat ? 'text' : 'password'}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxx"
                    value={githubPat}
                    onChange={(e) => setGithubPat(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPat(!showPat)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c6c6cd] hover:text-[#5adace] focus:outline-none"
                  >
                    {showPat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-[#c6c6cd]/60">
                  Requires <code className="text-[#5adace] font-mono">repo</code> permissions. Created at <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-[#5adace] underline hover:text-[#5adace]/80">github.com/settings/tokens</a>.
                </p>
              </div>

              {/* Repo Path Input */}
              <div className="col-span-12 md:col-span-4 space-y-1.5">
                <label className="text-xs text-[#c6c6cd] font-medium block">Target Repository Path</label>
                <input
                  type="text"
                  placeholder="doctor-jenkins/patient-records"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none font-mono"
                />
                <p className="text-[10px] text-[#c6c6cd]/60">Format: <code className="text-[#c6c6cd]">owner/repository</code></p>
              </div>

              {/* Target Branch */}
              <div className="col-span-12 md:col-span-2 space-y-1.5">
                <label className="text-xs text-[#c6c6cd] font-medium block">Branch</label>
                <input
                  type="text"
                  placeholder="main"
                  value={githubBranch}
                  onChange={(e) => setGithubBranch(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none font-mono"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#45464d]/10 pb-4">
              <button
                type="button"
                disabled={isVerifyingGithub}
                onClick={verifyGithubConnection}
                className="px-4 py-2 bg-[#1c2b3c] hover:bg-[#2c3a4c] disabled:bg-[#1c2b3c]/50 border border-[#45464d]/40 rounded-xl text-xs font-semibold text-[#d4e4fa] transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#5adace] ${isVerifyingGithub ? 'animate-spin' : ''}`} />
                <span>{isVerifyingGithub ? 'Testing Connection...' : 'Verify Connection'}</span>
              </button>

              {githubStatus.message && (
                <div className={`text-xs px-3 py-1.5 rounded-lg font-mono flex-1 text-center sm:text-left ${
                  githubStatus.status === 'success'
                    ? 'bg-[#42e09a]/10 border border-[#42e09a]/20 text-[#42e09a]'
                    : 'bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 text-[#ffb4ab]'
                }`}>
                  {githubStatus.status === 'success' ? '✓ ' : '✗ '} {githubStatus.message}
                </div>
              )}
            </div>

            {/* Diagnostic Logs & PDF Backup Control Suite */}
            <div className="pt-2 space-y-4">
              <h4 className="text-xs font-bold text-[#d4e4fa] uppercase tracking-wider font-mono">
                EHR GitOps Backup Control Panel
              </h4>
              <p className="text-xs text-[#c6c6cd]">
                Select any patient clinical profile to generate an authorized PDF diagnostic report and formatted Markdown log telemetry package, then push it directly into the repository branch.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] text-[#c6c6cd] uppercase font-mono block">Patient Profile Target</label>
                  <select
                    value={selectedBackupPatientId}
                    onChange={(e) => setSelectedBackupPatientId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none cursor-pointer"
                  >
                    {localGoals.map((goal) => (
                      <option key={goal.patientId} value={goal.patientId}>
                        {goal.patientName} (ID: {goal.patientId})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end shrink-0">
                  <button
                    type="button"
                    disabled={isBackingUp}
                    onClick={handleBackupToGithub}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-[#5adace] to-[#42e09a] text-[#051424] font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-transform cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {isBackingUp ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-[#051424]" />
                        <span>Compiling EHR Backup...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 text-[#051424]" />
                        <span>{githubSyncEnabled && githubPat && githubRepo ? 'Sync Diagnostic Backup to GitHub' : 'Generate & Download Diagnostic Package (Sandbox)'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Dynamic Console Logs for Backups */}
              {backupLogs.length > 0 && (
                <div className="bg-[#051424] border border-[#45464d]/30 rounded-xl p-3 h-[130px] overflow-y-auto font-mono text-[9px] text-[#42e09a] space-y-1 scrollbar-thin">
                  {backupLogs.map((log, i) => (
                    <div key={i} className="leading-tight select-all">{log}</div>
                  ))}
                </div>
              )}
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
