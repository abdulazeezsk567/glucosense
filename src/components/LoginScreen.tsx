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

const getCsrfToken = (): string => {
  const match = document.cookie.match(new RegExp('(^| )csrf_token=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : '';
};

interface LoginScreenProps {
  onLoginSuccess: (role: 'clinician' | 'patient', profile: any) => void;
  onPatientRegistered?: (patient: Patient) => void;
}

export default function LoginScreen({ onLoginSuccess, onPatientRegistered }: LoginScreenProps) {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [emailId, setEmailId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);


  // Patient Registration States
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('42');
  const [diabetesType, setDiabetesType] = useState('');
  const [cgmId, setCgmId] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [physicianCode, setPhysicianCode] = useState('MED-8924-XXL');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPassword, setPatientPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [newlyCreatedPatient, setNewlyCreatedPatient] = useState<any>(null);

  const [googleSigningIn, setGoogleSigningIn] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setGoogleSigningIn(false);
        setGoogleAuthError(null);
        const { role, profile } = event.data;
        onLoginSuccess(role, profile);
      } else if (event.data?.type === 'OAUTH_AUTH_FAILURE') {
        setGoogleSigningIn(false);
        setGoogleAuthError(event.data.error || 'Identity verification failed.');
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [onLoginSuccess]);

  const handleGoogleAuth = async (mode: 'login' | 'register') => {
    setGoogleSigningIn(true);
    setGoogleAuthError(null);
    try {
      const originUrl = window.location.origin;
      const redirectUri = `${originUrl}/auth/callback`;
      
      console.log('--- Google OAuth Handshake Initiated ---');
      console.log('Origin URL being sent:', originUrl);
      console.log('Redirect URI target:', redirectUri);
      
      const res = await fetch(`/api/auth/google/url?origin=${encodeURIComponent(originUrl)}&mode=${mode}`);
      if (!res.ok) {
        const errorData = await res.json();
        if (errorData.diagnostics) {
          console.error('OAuth Setup Issue Diagnostics:', errorData.diagnostics);
        }
        throw new Error(errorData.error || 'Failed to generate Google Sign-In secure channel.');
      }
      
      const data = await res.json();
      const { url, diagnostics } = data;
      
      if (diagnostics) {
        console.log('Successfully loaded Google Client ID:', diagnostics.clientId);
        console.log('Google Redirect Callback expected:', diagnostics.redirectUri);
        console.log('Helpful Tips:', diagnostics.publishingStatusHelp);
      }
      
      const width = 500;
      const height = 650;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        url,
        'google_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
      );

      if (!popup) {
        throw new Error('OAuth handshake window was blocked by your browser. Please allow popups for this portal.');
      }

      // Detect user closing the popup window manually
      const checkPopupClosed = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopupClosed);
          setGoogleSigningIn((current) => {
            if (current) {
              setGoogleAuthError('The Google verification window was closed before completion.');
              return false;
            }
            return current;
          });
        }
      }, 1000);

    } catch (err: any) {
      setGoogleSigningIn(false);
      setGoogleAuthError(err.message || 'Identity handshake could not be established.');
    }
  };

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setGoogleAuthError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        },
        body: JSON.stringify({ email: emailId, password }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Authentication failure.');
      }
      const data = await res.json();
      setIsAuthenticating(false);
      onLoginSuccess(data.role, data.profile);
    } catch (err: any) {
      setIsAuthenticating(false);
      setGoogleAuthError(err.message || 'EHR verification failed.');
    }
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    setGoogleAuthError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        },
        body: JSON.stringify({
          name: patientName,
          email: patientEmail,
          age: patientAge,
          type: diabetesType,
          cgmId,
          phone: patientPhone,
          physicianCode,
          password: patientPassword,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Enrollment registration failed.');
      }
      const data = await res.json();
      setIsRegistering(false);
      setNewlyCreatedPatient(data.profile);
      setRegistrationSuccess(true);

      if (onPatientRegistered) {
        onPatientRegistered(data.profile);
      }
    } catch (err: any) {
      setIsRegistering(false);
      setGoogleAuthError(err.message || 'Continuous telemetry link enrollment failed.');
    }
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
              Go to Patient Sign-In Gate
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
            onClick={() => {
              setIsLoginTab(true);
              setGoogleAuthError(null);
            }}
            className={`w-1/2 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
              isLoginTab
                ? 'bg-[#1c2b3c] text-[#5adace] shadow-sm'
                : 'text-[#c6c6cd] hover:text-[#d4e4fa]'
            }`}
          >
            Patient Sign-In
          </button>
          <button
            onClick={() => {
              setIsLoginTab(false);
              setGoogleAuthError(null);
            }}
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
          /* Patient login form layout */
          <form onSubmit={handleAuthenticate} className="space-y-5">
            {/* Input 1 - Email ID */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#c6c6cd]/90 font-medium block">
                Email ID
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <Mail className="w-4 h-4 text-[#c6c6cd]/50" />
                </span>
                <input
                  type="email"
                  required
                  value={emailId}
                  onChange={(e) => setEmailId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none"
                  placeholder="e.g. patient@glucosense.io"
                />
              </div>
            </div>

            {/* Input 2 - Password */}
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

            <div className="relative w-full">
              <button
                type="button"
                disabled={googleSigningIn}
                onClick={() => handleGoogleAuth('login')}
                className="w-full py-3 bg-[#0d1c2d] hover:bg-[#1c2b3c] border border-[#45464d]/30 text-[#d4e4fa] font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-md"
              >
                {googleSigningIn ? (
                  <span className="w-4 h-4 border-2 border-[#5adace] border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.53 5.53 0 0 1 8.4 13a5.53 5.53 0 0 1 5.59-5.514c1.486 0 2.829.543 3.867 1.438l3.143-3.143C19.105 3.962 16.733 3 13.99 3 8.471 3 4 7.471 4 13s4.471 10 9.99 10c5.762 0 9.562-4.048 9.562-9.714 0-.648-.057-1.286-.171-1.99H12.24z"
                    />
                  </svg>
                )}
                <span>{googleSigningIn ? 'Connecting Securely...' : 'Continue with Google'}</span>
              </button>
            </div>

            {googleAuthError && (
              <div className="p-3 bg-red-950/45 border border-red-500/35 text-[#ffb4ab] text-xs rounded-xl space-y-1 mt-2.5">
                <p className="font-semibold">⚠️ Connection Issue</p>
                <p className="text-[10px] text-[#c6c6cd]">{googleAuthError}</p>
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
                  Diabetes Type (Optional)
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
                    <option value="">Not Specified</option>
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
                  CGM ID Code (Optional)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Smartphone className="w-3.5 h-3.5 text-[#c6c6cd]/50" />
                  </span>
                  <input
                    type="text"
                    value={cgmId}
                    onChange={(e) => setCgmId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none font-mono"
                    placeholder="e.g. DEX-G6-GS8821"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1">
                <label className="text-[10px] text-[#c6c6cd]/80 uppercase tracking-wider font-semibold block">
                  Contact Phone (Optional)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Phone className="w-3.5 h-3.5 text-[#c6c6cd]/50" />
                  </span>
                  <input
                    type="tel"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none"
                    placeholder="e.g. +1 (555) 019-2834"
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

            <div className="relative w-full">
              <button
                type="button"
                disabled={googleSigningIn}
                onClick={() => handleGoogleAuth('register')}
                className="w-full py-3 bg-[#0d1c2d] hover:bg-[#1c2b3c] border border-[#45464d]/30 text-[#d4e4fa] font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-md"
              >
                {googleSigningIn ? (
                  <span className="w-4 h-4 border-2 border-[#5adace] border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.53 5.53 0 0 1 8.4 13a5.53 5.53 0 0 1 5.59-5.514c1.486 0 2.829.543 3.867 1.438l3.143-3.143C19.105 3.962 16.733 3 13.99 3 8.471 3 4 7.471 4 13s4.471 10 9.99 10c5.762 0 9.562-4.048 9.562-9.714 0-.648-.057-1.286-.171-1.99H12.24z"
                    />
                  </svg>
                )}
                <span>{googleSigningIn ? 'Connecting Securely...' : 'Instant Google Registration'}</span>
              </button>
            </div>

            {googleAuthError && (
              <div className="p-3 bg-red-950/45 border border-red-500/35 text-[#ffb4ab] text-xs rounded-xl space-y-1 mt-2.5">
                <p className="font-semibold">⚠️ Registration Issue</p>
                <p className="text-[10px] text-[#c6c6cd]">{googleAuthError}</p>
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

    </div>
  );
}

