/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, HeartPulse, Lock, Mail, Eye, EyeOff, CheckCircle, User, Calendar, Activity, Smartphone, Phone } from 'lucide-react';
import { Clinician, Patient } from '../types';
import { INITIAL_CLINICIAN } from '../data';

declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_CLIENT_ID = ((import.meta as any).env.VITE_GOOGLE_CLIENT_ID || '855423871201-placeholder.apps.googleusercontent.com');

interface LoginScreenProps {
  onLoginSuccess: (role: 'clinician' | 'patient', profile: any) => void;
  onPatientRegistered?: (patient: Patient) => void;
}

export default function LoginScreen({ onLoginSuccess, onPatientRegistered }: LoginScreenProps) {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [medicalId, setMedicalId] = useState('MED-8924-XXL');
  const [password, setPassword] = useState('password');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Patient Registration States
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('42');
  const [diabetesType, setDiabetesType] = useState('Type 2');
  const [cgmId, setCgmId] = useState('DEX-G6-GS8821');
  const [patientPhone, setPatientPhone] = useState('+1 (555) 019-2834');
  const [physicianCode, setPhysicianCode] = useState('MED-8924-XXL');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPassword, setPatientPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [newlyCreatedPatient, setNewlyCreatedPatient] = useState<any>(null);

  // Google Sign-In and Sign-Up custom interactive states
  const [googleAuthMode, setGoogleAuthMode] = useState<'clinician' | 'patient' | null>(null);
  const [googleSigningIn, setGoogleSigningIn] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);

  // Parse JWT token helper
  const decodeJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to decode JWT:', error);
      return null;
    }
  };

  const handleGoogleSuccess = (credentialToken: string) => {
    setGoogleSigningIn(true);
    setGoogleAuthError(null);
    try {
      const decoded = decodeJwt(credentialToken);
      if (!decoded || !decoded.email) {
        throw new Error('Google identity handshake was unsuccessful or email is missing.');
      }

      // Determine which role was active during login
      const activeRole = localStorage.getItem('gsi_active_role') as 'clinician' | 'patient' || 'clinician';

      // Load registered accounts
      const googleUsersStr = localStorage.getItem('google_users');
      const googleUsers = googleUsersStr ? JSON.parse(googleUsersStr) : [];
      
      let existingUser = googleUsers.find(
        (u: any) => u.email.toLowerCase() === decoded.email.toLowerCase() && u.role === activeRole
      );

      if (existingUser) {
        // Treat as SIGN IN (route straight to Dashboard / Portal)
        setTimeout(() => {
          setGoogleSigningIn(false);
          onLoginSuccess(activeRole, existingUser);
        }, 1000);
      } else {
        // Treat as SIGN UP (create record, route to onboarding step)
        if (activeRole === 'clinician') {
          const newClinician = {
            fullName: decoded.name || 'Dr. Sarah Jenkins',
            email: decoded.email,
            avatarUrl: decoded.picture || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDl5T3Q35e_5_uY_Se47_AB9a1u1QTxoRb4vSL0ypz837J0dPoz3HvJDFTRLSi5TyE9ExjAWN9ImxQNsQITfK9Xo3QPfaC2XmL6R1fYG6rFSYwcHPDcAk7_mpnDcHB5-KFYkDNCj5Pm7c_07Q-g-AaYozf_9eMVuKZjo2IKasg0-cONKBIZm3svNkfsyT9siTf6Eg9tT4BCCmZ1CnkuT8NNbEeilHJjqqJXJE6qTGDXUV4liddKuAyGDyaJZ0_t_L65btCsYRksVEY',
            medicalId: `MED-${Math.floor(1000 + Math.random() * 9000)}-GGL`,
            specialization: 'Endocrinologist',
            primaryFacility: 'EHR Connected Google Suite',
            authProvider: 'google',
            role: 'clinician'
          };
          
          googleUsers.push(newClinician);
          localStorage.setItem('google_users', JSON.stringify(googleUsers));
          
          setTimeout(() => {
            setGoogleSigningIn(false);
            onLoginSuccess('clinician', newClinician);
          }, 1000);
        } else {
          // Patient Registration
          const patientData = {
            id: `GS-${Math.floor(1000 + Math.random() * 9000)}`,
            name: decoded.name || 'Sarah Jenkins',
            age: 38,
            type: 'Type 1',
            cgmId: 'DEX-G6-GOOG9',
            phone: '+1 (555) 019-2834',
            physicianCode: 'MED-8924-XXL',
            email: decoded.email,
            avatarUrl: decoded.picture || '',
            authProvider: 'google',
            role: 'patient'
          };

          googleUsers.push(patientData);
          localStorage.setItem('google_users', JSON.stringify(googleUsers));

          if (onPatientRegistered) {
            onPatientRegistered({
              id: patientData.id,
              name: patientData.name,
              age: patientData.age,
              type: patientData.type,
              avatarUrl: patientData.avatarUrl,
            });
          }

          setTimeout(() => {
            setGoogleSigningIn(false);
            setNewlyCreatedPatient(patientData);
            setRegistrationSuccess(true);
          }, 1000);
        }
      }
    } catch (err: any) {
      console.error('Google credentials lookup error:', err);
      setGoogleAuthError(err.message || 'Establishment of Google identity session failed.');
      setGoogleSigningIn(false);
    }
  };

  useEffect(() => {
    // Initialize Google Identity Services
    const initGsi = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response: any) => {
              if (response.credential) {
                handleGoogleSuccess(response.credential);
              } else {
                setGoogleAuthError('Google Auth returned an empty credential response.');
              }
            },
            auto_select: false,
          });

          // Render transparent overlays if containers exist
          const clinicianOverlay = document.getElementById('google-btn-overlay-clinician');
          if (clinicianOverlay) {
            window.google.accounts.id.renderButton(clinicianOverlay, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              width: clinicianOverlay.offsetWidth || 340,
            });
          }

          const patientOverlay = document.getElementById('google-btn-overlay-patient');
          if (patientOverlay) {
            window.google.accounts.id.renderButton(patientOverlay, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              width: patientOverlay.offsetWidth || 340,
            });
          }
        } catch (err: any) {
          console.error('GSI Init Error:', err);
        }
      }
    };

    // Poll for window.google
    const timer = setInterval(() => {
      if (window.google?.accounts?.id) {
        initGsi();
        clearInterval(timer);
      }
    }, 500);

    return () => clearInterval(timer);
  }, [isLoginTab, googleSigningIn]);

  const handleSelectGoogleAccount = (account: { name: string; email: string; role: 'clinician' | 'patient' }) => {
    setGoogleSigningIn(true);
    setTimeout(() => {
      setGoogleSigningIn(false);
      setGoogleAuthMode(null);
      if (account.role === 'clinician') {
        const clinicianProfile = {
          ...INITIAL_CLINICIAN,
          fullName: account.name,
          medicalId: `MED-${Math.floor(1000 + Math.random() * 9000)}-GGL`,
          primaryFacility: 'EHR Connected Google Suite',
        };
        onLoginSuccess('clinician', clinicianProfile);
      } else {
        const patientData = {
          id: `GS-${Math.floor(1000 + Math.random() * 9000)}`,
          name: account.name,
          age: 38,
          type: 'Type 1',
          cgmId: 'DEX-G6-GOOG9',
          phone: '+1 (555) 019-2834',
          physicianCode: 'MED-8924-XXL',
          email: account.email,
          avatarUrl: '',
        };
        if (onPatientRegistered) {
          onPatientRegistered({
            id: patientData.id,
            name: patientData.name,
            age: patientData.age,
            type: patientData.type,
            avatarUrl: '',
          });
        }
        setNewlyCreatedPatient(patientData);
        setRegistrationSuccess(true);
      }
    }, 1200);
  };

  const handleAuthenticate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);

    setTimeout(() => {
      setIsAuthenticating(false);
      onLoginSuccess('clinician', INITIAL_CLINICIAN);
    }, 1200);
  };

  const handleRegisterPatient = (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);

    setTimeout(() => {
      setIsRegistering(false);
      const generatedId = `GS-${Math.floor(1000 + Math.random() * 9000)}`;
      const patientData = {
        id: generatedId,
        name: patientName || 'Sarah Jenkins',
        age: parseInt(patientAge) || 42,
        type: diabetesType,
        cgmId: cgmId || 'DEX-G6-GS8821',
        phone: patientPhone || '+1 (555) 019-2834',
        physicianCode: physicianCode || 'MED-8924-XXL',
        email: patientEmail || 'patient@ehr-telemetry.io',
        avatarUrl: '',
      };
      setNewlyCreatedPatient(patientData);
      setRegistrationSuccess(true);

      // Notify parent to append to assessment history if it's open
      if (onPatientRegistered) {
        onPatientRegistered({
          id: generatedId,
          name: patientData.name,
          age: patientData.age,
          type: patientData.type,
          avatarUrl: '',
        });
      }
    }, 1500);
  };

  const handleQuickBypass = () => {
    onLoginSuccess('clinician', INITIAL_CLINICIAN);
  };

  if (registrationSuccess && newlyCreatedPatient) {
    return (
      <div
        id="registration-success"
        className="min-h-screen bg-[#051424] flex items-center justify-center p-4 font-sans text-[#c6c6cd] relative overflow-hidden"
      >
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#42e09a]/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#5adace]/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-md w-full bg-[#122131]/70 border border-[#42e09a]/35 p-6 md:p-8 rounded-3xl backdrop-blur-xl shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-[#42e09a]/20 border border-[#42e09a]/40 flex items-center justify-center mx-auto shadow-lg shadow-[#42e09a]/10">
            <CheckCircle className="w-10 h-10 text-[#42e09a]" />
          </div>

          <div className="space-y-2">
            <h2 className="font-sans font-bold text-2xl text-[#d4e4fa] tracking-tight">
              Enrollment Successful!
            </h2>
            <p className="text-xs text-[#c6c6cd] max-w-xs mx-auto leading-relaxed">
              Patient profile successfully created with secure continuous telemetry linking.
            </p>
          </div>

          <div className="bg-[#0d1c2d] p-4 rounded-xl border border-[#45464d]/15 text-left text-xs space-y-2 font-mono">
            <div className="flex justify-between border-b border-[#45464d]/10 pb-1.5">
              <span className="text-[#c6c6cd]/60">PATIENT ID:</span>
              <span className="text-[#5adace] font-bold">{newlyCreatedPatient.id}</span>
            </div>
            <div className="flex justify-between border-b border-[#45464d]/10 pb-1.5">
              <span className="text-[#c6c6cd]/60">NAME:</span>
              <span className="text-[#d4e4fa]">{newlyCreatedPatient.name}</span>
            </div>
            <div className="flex justify-between border-b border-[#45464d]/10 pb-1.5">
              <span className="text-[#c6c6cd]/60">AGE / TYPE:</span>
              <span className="text-[#d4e4fa]">{newlyCreatedPatient.age} yrs / {newlyCreatedPatient.type}</span>
            </div>
            <div className="flex justify-between border-b border-[#45464d]/10 pb-1.5">
              <span className="text-[#c6c6cd]/60">TELEMETRY ID:</span>
              <span className="text-[#42e09a]">{newlyCreatedPatient.cgmId}</span>
            </div>
            <div className="flex justify-between pb-0.5">
              <span className="text-[#c6c6cd]/60">CLINICAL UNIT:</span>
              <span className="text-[#d4e4fa] font-semibold">{newlyCreatedPatient.physicianCode}</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => onLoginSuccess('patient', newlyCreatedPatient)}
              className="w-full py-3 bg-gradient-to-r from-[#42e09a] to-[#5adace] hover:opacity-90 text-[#051424] font-bold rounded-xl text-sm transition-all shadow-lg shadow-[#42e09a]/10 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>Launch Patient Portal</span>
            </button>
            <button
              onClick={() => {
                setRegistrationSuccess(false);
                setIsLoginTab(true);
              }}
              className="w-full py-2.5 bg-[#1c2b3c]/80 hover:bg-[#2c3a4c] border border-[#45464d]/30 text-xs font-bold rounded-xl transition-all cursor-pointer text-[#5adace]"
            >
              Go to Physician Sign-In Gate
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id="login-screen"
      className="min-h-screen bg-[#051424] flex items-center justify-center p-4 font-sans text-[#c6c6cd] relative overflow-hidden"
    >
      {/* Decorative gradient glowing backing shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#5adace]/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#42e09a]/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-md w-full bg-[#122131]/70 border border-[#45464d]/35 p-6 md:p-8 rounded-3xl backdrop-blur-xl shadow-2xl space-y-6 md:space-y-8 animate-in zoom-in-95 duration-300">
        
        {/* Portal Branding Banner */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#42e09a] to-[#5adace] flex items-center justify-center mx-auto shadow-lg shadow-[#42e09a]/15">
            <HeartPulse className="w-8 h-8 text-[#051424]" />
          </div>
          <div>
            <h1 className="font-sans font-bold text-xl md:text-2xl text-[#d4e4fa] tracking-tight">
              GlucoSense Clinical Suite
            </h1>
            <p className="text-xs text-[#c6c6cd] mt-1 leading-relaxed">
              Secure EHR Gateway &amp; Metabolic Prediction Engine
            </p>
          </div>
        </div>

        {/* Form authentication tabs */}
        <div className="flex bg-[#0d1c2d] p-1 rounded-xl border border-[#45464d]/15">
          <button
            onClick={() => setIsLoginTab(true)}
            className={`w-1/2 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
              isLoginTab
                ? 'bg-[#1c2b3c] text-[#5adace] shadow-sm'
                : 'text-[#c6c6cd] hover:text-[#d4e4fa]'
            }`}
          >
            Physician Sign-In
          </button>
          <button
            onClick={() => setIsLoginTab(false)}
            className={`w-1/2 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
              !isLoginTab
                ? 'bg-[#1c2b3c] text-[#5adace] shadow-sm'
                : 'text-[#c6c6cd] hover:text-[#d4e4fa]'
            }`}
          >
            Patient Register
          </button>
        </div>

        {isLoginTab ? (
          /* Physician login form layout */
          <form onSubmit={handleAuthenticate} className="space-y-5">
            {/* Input 1 */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#c6c6cd]/90 font-medium block">
                Medical Practitioner ID
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#c6c6cd]/50 font-mono text-xs">
                  ID
                </span>
                <input
                  type="text"
                  required
                  value={medicalId}
                  onChange={(e) => setMedicalId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none font-mono"
                  placeholder="e.g. MED-8924-XXL"
                />
              </div>
            </div>

            {/* Input 2 */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#c6c6cd]/90 font-medium block">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <Lock className="w-4 h-4 text-[#c6c6cd]/50" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#c6c6cd]/60 hover:text-[#d4e4fa] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot toggles */}
            <div className="flex items-center justify-between text-xs pt-1.5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[#c6c6cd]/80 hover:text-[#d4e4fa]">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-[#45464d] bg-[#0d1c2d] text-[#5adace] focus:ring-0"
                />
                <span>Keep HIPAA gateway logged in</span>
              </label>
              <span className="text-[#5adace] hover:underline cursor-pointer">Forgot ID?</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-3.5 mt-2 bg-gradient-to-r from-[#42e09a] to-[#5adace] hover:opacity-90 disabled:opacity-50 text-[#051424] font-bold rounded-xl text-sm transition-all shadow-lg shadow-[#42e09a]/10 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isAuthenticating ? (
                <>
                  <ShieldCheck className="w-5 h-5 animate-pulse" />
                  <span>Synchronizing secure EHR feeds...</span>
                </>
              ) : (
                <span>Authenticate &amp; Synchronize</span>
              )}
            </button>

            {/* Google Authentication Separator & Button */}
            <div className="flex items-center gap-2 my-4">
              <div className="flex-1 h-px bg-[#45464d]/25"></div>
              <span className="text-[10px] font-mono text-[#c6c6cd]/50 uppercase tracking-widest">or secure authorize</span>
              <div className="flex-1 h-px bg-[#45464d]/25"></div>
            </div>

            <div 
              className="relative w-full"
              onMouseDown={() => {
                localStorage.setItem('gsi_active_role', 'clinician');
                setGoogleSigningIn(true);
              }}
            >
              <button
                type="button"
                disabled={googleSigningIn}
                className="w-full py-3 bg-[#0d1c2d] hover:bg-[#1c2b3c] border border-[#45464d]/30 text-[#d4e4fa] font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-md"
              >
                {googleSigningIn && localStorage.getItem('gsi_active_role') === 'clinician' ? (
                  <span className="w-4 h-4 border-2 border-[#5adace] border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.53 5.53 0 0 1 8.4 13a5.53 5.53 0 0 1 5.59-5.514c1.486 0 2.829.543 3.867 1.438l3.143-3.143C19.105 3.962 16.733 3 13.99 3 8.471 3 4 7.471 4 13s4.471 10 9.99 10c5.762 0 9.562-4.048 9.562-9.714 0-.648-.057-1.286-.171-1.99H12.24z"
                    />
                  </svg>
                )}
                <span>{googleSigningIn && localStorage.getItem('gsi_active_role') === 'clinician' ? 'Connecting Securely...' : 'Continue with Google'}</span>
              </button>
              
              <div 
                id="google-btn-overlay-clinician" 
                className="absolute inset-0 w-full h-full opacity-[0.01] overflow-hidden z-10 [&_iframe]:w-full [&_iframe]:h-full cursor-pointer"
              />
            </div>

            {googleAuthError && localStorage.getItem('gsi_active_role') === 'clinician' && (
              <div className="p-3 bg-red-950/45 border border-red-500/35 text-[#ffb4ab] text-xs rounded-xl space-y-1 mt-2.5">
                <p className="font-semibold">⚠️ Connection Issue</p>
                <p className="text-[10px] text-[#c6c6cd]">{googleAuthError}</p>
                <button 
                  type="button" 
                  onClick={() => {
                    setGoogleAuthMode('clinician');
                    setGoogleAuthError(null);
                    setGoogleSigningIn(false);
                  }} 
                  className="text-[#5adace] hover:underline font-mono text-[9px] uppercase tracking-wider font-bold pt-1.5 block"
                >
                  Click here to use Mock Sandbox list
                </button>
              </div>
            )}
          </form>
        ) : (
          /* Complete, fully functional Patient Registration form layout */
          <form onSubmit={handleRegisterPatient} className="space-y-4">
            <div className="text-center pb-1">
              <p className="text-[11px] text-[#c6c6cd]/70 leading-relaxed max-w-xs mx-auto">
                Continuous Telemetry Enrollment &amp; Direct Sensor Handshake Link
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Name */}
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] text-[#c6c6cd]/80 uppercase tracking-wider font-semibold block">
                  Full Patient Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <User className="w-3.5 h-3.5 text-[#c6c6cd]/50" />
                  </span>
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none"
                    placeholder="e.g. Sarah Jenkins"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] text-[#c6c6cd]/80 uppercase tracking-wider font-semibold block">
                  Secure Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Mail className="w-3.5 h-3.5 text-[#c6c6cd]/50" />
                  </span>
                  <input
                    type="email"
                    required
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none"
                    placeholder="sarah@example.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] text-[#c6c6cd]/80 uppercase tracking-wider font-semibold block">
                  Portal Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Lock className="w-3.5 h-3.5 text-[#c6c6cd]/50" />
                  </span>
                  <input
                    type="password"
                    required
                    value={patientPassword}
                    onChange={(e) => setPatientPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Age */}
              <div className="space-y-1">
                <label className="text-[10px] text-[#c6c6cd]/80 uppercase tracking-wider font-semibold block">
                  Age
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Calendar className="w-3.5 h-3.5 text-[#c6c6cd]/50" />
                  </span>
                  <input
                    type="number"
                    required
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none"
                    placeholder="42"
                    min="1"
                    max="120"
                  />
                </div>
              </div>

              {/* Diabetes Type */}
              <div className="space-y-1">
                <label className="text-[10px] text-[#c6c6cd]/80 uppercase tracking-wider font-semibold block">
                  Diabetes Type
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Activity className="w-3.5 h-3.5 text-[#c6c6cd]/50" />
                  </span>
                  <select
                    value={diabetesType}
                    onChange={(e) => setDiabetesType(e.target.value)}
                    className="w-full pl-9 pr-2 py-2 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none appearance-none cursor-pointer"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Prediabetes">Prediabetes</option>
                    <option value="Type 1">Type 1</option>
                    <option value="Type 2">Type 2</option>
                  </select>
                </div>
              </div>

              {/* CGM Sensor ID */}
              <div className="space-y-1">
                <label className="text-[10px] text-[#c6c6cd]/80 uppercase tracking-wider font-semibold block">
                  CGM ID Code
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Smartphone className="w-3.5 h-3.5 text-[#c6c6cd]/50" />
                  </span>
                  <input
                    type="text"
                    required
                    value={cgmId}
                    onChange={(e) => setCgmId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none font-mono"
                    placeholder="DEX-G6-GS8821"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1">
                <label className="text-[10px] text-[#c6c6cd]/80 uppercase tracking-wider font-semibold block">
                  Contact Phone
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Phone className="w-3.5 h-3.5 text-[#c6c6cd]/50" />
                  </span>
                  <input
                    type="tel"
                    required
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none"
                    placeholder="+1 (555) 019-2834"
                  />
                </div>
              </div>

              {/* Physician Code */}
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] text-[#c6c6cd]/80 uppercase tracking-wider font-semibold block">
                  Assigned Physician ID
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#c6c6cd]/50 font-mono text-[10px]">
                    ID
                  </span>
                  <input
                    type="text"
                    required
                    value={physicianCode}
                    onChange={(e) => setPhysicianCode(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none font-mono"
                    placeholder="MED-8924-XXL"
                  />
                </div>
              </div>
            </div>

            {/* Submit Register Button */}
            <button
              type="submit"
              disabled={isRegistering}
              className="w-full py-3.5 mt-2 bg-gradient-to-r from-[#42e09a] to-[#5adace] hover:opacity-90 disabled:opacity-50 text-[#051424] font-bold rounded-xl text-xs transition-all shadow-lg shadow-[#42e09a]/10 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isRegistering ? (
                <>
                  <ShieldCheck className="w-4 h-4 animate-pulse" />
                  <span>Enrolling HIPAA Sensor Feed...</span>
                </>
              ) : (
                <span>Complete Enrollment &amp; Register</span>
              )}
            </button>

            {/* Google Registration Separator & Button */}
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-[#45464d]/25"></div>
              <span className="text-[10px] font-mono text-[#c6c6cd]/50 uppercase tracking-widest">or auto-register</span>
              <div className="flex-1 h-px bg-[#45464d]/25"></div>
            </div>

            <div 
              className="relative w-full"
              onMouseDown={() => {
                localStorage.setItem('gsi_active_role', 'patient');
                setGoogleSigningIn(true);
              }}
            >
              <button
                type="button"
                disabled={googleSigningIn}
                className="w-full py-3 bg-[#0d1c2d] hover:bg-[#1c2b3c] border border-[#45464d]/30 text-[#d4e4fa] font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-md"
              >
                {googleSigningIn && localStorage.getItem('gsi_active_role') === 'patient' ? (
                  <span className="w-4 h-4 border-2 border-[#5adace] border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.53 5.53 0 0 1 8.4 13a5.53 5.53 0 0 1 5.59-5.514c1.486 0 2.829.543 3.867 1.438l3.143-3.143C19.105 3.962 16.733 3 13.99 3 8.471 3 4 7.471 4 13s4.471 10 9.99 10c5.762 0 9.562-4.048 9.562-9.714 0-.648-.057-1.286-.171-1.99H12.24z"
                    />
                  </svg>
                )}
                <span>{googleSigningIn && localStorage.getItem('gsi_active_role') === 'patient' ? 'Connecting Securely...' : 'Instant Google Registration'}</span>
              </button>
              
              <div 
                id="google-btn-overlay-patient" 
                className="absolute inset-0 w-full h-full opacity-[0.01] overflow-hidden z-10 [&_iframe]:w-full [&_iframe]:h-full cursor-pointer"
              />
            </div>

            {googleAuthError && localStorage.getItem('gsi_active_role') === 'patient' && (
              <div className="p-3 bg-red-950/45 border border-red-500/35 text-[#ffb4ab] text-xs rounded-xl space-y-1 mt-2.5">
                <p className="font-semibold">⚠️ Registration Issue</p>
                <p className="text-[10px] text-[#c6c6cd]">{googleAuthError}</p>
                <button 
                  type="button" 
                  onClick={() => {
                    setGoogleAuthMode('patient');
                    setGoogleAuthError(null);
                    setGoogleSigningIn(false);
                  }} 
                  className="text-[#5adace] hover:underline font-mono text-[9px] uppercase tracking-wider font-bold pt-1.5 block"
                >
                  Click here to use Mock Sandbox list
                </button>
              </div>
            )}
          </form>
        )}

        {/* Demo Bypass action link */}
        <div className="pt-4 border-t border-[#45464d]/20 text-center">
          <button
            onClick={handleQuickBypass}
            className="text-xs font-mono font-bold text-[#5adace] hover:text-[#42e09a] transition-colors cursor-pointer inline-flex items-center gap-1 bg-[#1c2b3c]/30 hover:bg-[#2c3a4c]/50 px-4 py-2 rounded-xl border border-[#45464d]/20"
          >
            Quick Bypass (Demo Access)
          </button>
        </div>
      </div>

      {/* Google Account Selector Modal Overlay */}
      {googleAuthMode && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#122131] border border-[#45464d]/60 rounded-3xl max-w-sm w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Google Identity Logo & Header */}
            <div className="text-center space-y-2">
              <svg className="w-8 h-8 mx-auto" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.53 5.53 0 0 1 8.4 13a5.53 5.53 0 0 1 5.59-5.514c1.486 0 2.829.543 3.867 1.438l3.143-3.143C19.105 3.962 16.733 3 13.99 3 8.471 3 4 7.471 4 13s4.471 10 9.99 10c5.762 0 9.562-4.048 9.562-9.714 0-.648-.057-1.286-.171-1.99H12.24z"
                />
              </svg>
              <h2 className="text-lg font-bold text-white tracking-tight">Sign in with Google</h2>
              <p className="text-xs text-[#c6c6cd]">to continue to <span className="font-semibold text-[#5adace]">GlucoSense Portal</span></p>
            </div>

            {/* Account List */}
            {googleSigningIn ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-[#5adace] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-semibold text-[#5adace] animate-pulse">Establishing OAuth handshake protocol...</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {googleAuthMode === 'clinician' ? (
                  <>
                    {/* Clinician Account 1 */}
                    <button
                      onClick={() => handleSelectGoogleAccount({ name: 'Abdul Azeez', email: 'abdulazeezsk56789@gmail.com', role: 'clinician' })}
                      className="w-full flex items-center gap-3 p-3 bg-[#0d1c2d] hover:bg-[#1c2b3c] border border-[#45464d]/25 hover:border-[#5adace]/40 rounded-xl text-left transition-all cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#5adace]/10 flex items-center justify-center font-bold text-xs text-[#5adace] group-hover:scale-105 transition-transform shrink-0">
                        AA
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#d4e4fa] truncate leading-tight">Abdul Azeez</p>
                        <p className="text-[10px] text-[#c6c6cd]/60 truncate mt-0.5">abdulazeezsk56789@gmail.com</p>
                      </div>
                    </button>

                    {/* Clinician Account 2 */}
                    <button
                      onClick={() => handleSelectGoogleAccount({ name: 'Dr. Sarah Jenkins', email: 'sarah.jenkins@glucosense.io', role: 'clinician' })}
                      className="w-full flex items-center gap-3 p-3 bg-[#0d1c2d] hover:bg-[#1c2b3c] border border-[#45464d]/25 hover:border-[#5adace]/40 rounded-xl text-left transition-all cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#42e09a]/10 flex items-center justify-center font-bold text-xs text-[#42e09a] group-hover:scale-105 transition-transform shrink-0">
                        SJ
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#d4e4fa] truncate leading-tight">Dr. Sarah Jenkins</p>
                        <p className="text-[10px] text-[#c6c6cd]/60 truncate mt-0.5">sarah.jenkins@glucosense.io</p>
                      </div>
                    </button>
                  </>
                ) : (
                  <>
                    {/* Patient Account 1 */}
                    <button
                      onClick={() => handleSelectGoogleAccount({ name: 'Abdul Azeez', email: 'abdulazeezsk56789@gmail.com', role: 'patient' })}
                      className="w-full flex items-center gap-3 p-3 bg-[#0d1c2d] hover:bg-[#1c2b3c] border border-[#45464d]/25 hover:border-[#5adace]/40 rounded-xl text-left transition-all cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#5adace]/10 flex items-center justify-center font-bold text-xs text-[#5adace] group-hover:scale-105 transition-transform shrink-0">
                        AA
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#d4e4fa] truncate leading-tight">Abdul Azeez</p>
                        <p className="text-[10px] text-[#c6c6cd]/60 truncate mt-0.5">abdulazeezsk56789@gmail.com</p>
                      </div>
                    </button>

                    {/* Patient Account 2 */}
                    <button
                      onClick={() => handleSelectGoogleAccount({ name: 'Marcus Reyes', email: 'marcus.reyes@patient-telemetry.io', role: 'patient' })}
                      className="w-full flex items-center gap-3 p-3 bg-[#0d1c2d] hover:bg-[#1c2b3c] border border-[#45464d]/25 hover:border-[#5adace]/40 rounded-xl text-left transition-all cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#42e09a]/10 flex items-center justify-center font-bold text-xs text-[#42e09a] group-hover:scale-105 transition-transform shrink-0">
                        MR
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#d4e4fa] truncate leading-tight">Marcus Reyes</p>
                        <p className="text-[10px] text-[#c6c6cd]/60 truncate mt-0.5">marcus.reyes@patient-telemetry.io</p>
                      </div>
                    </button>
                  </>
                )}

                {/* Account list footer helper */}
                <p className="text-[9px] text-[#c6c6cd]/40 text-center leading-normal pt-2 font-mono uppercase tracking-wider">
                  Secure OAuth2 Client ID Handshake Active
                </p>
              </div>
            )}

            {/* Cancel Button */}
            {!googleSigningIn && (
              <button
                type="button"
                onClick={() => setGoogleAuthMode(null)}
                className="w-full py-2 bg-[#1c2b3c] hover:bg-[#2c3a4c] border border-[#45464d]/30 text-xs font-bold rounded-xl transition-all cursor-pointer text-[#c6c6cd] text-center"
              >
                Cancel Authentication
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

