/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  History,
  ClipboardList,
  Activity,
  Settings,
  User,
  HeartPulse,
  HeartHandshake,
  LogOut,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { TabId, Clinician } from '../types';

interface SidebarProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  clinician: Clinician;
  onLogout: () => void;
  currentGlucose?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  clinician,
  onLogout,
  currentGlucose,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'prediction', label: 'Prediction', icon: TrendingUp },
    { id: 'history', label: 'History', icon: History },
    { id: 'recommendations', label: 'Recommendations', icon: ClipboardList },
    { id: 'diagnostics', label: 'Diagnostics', icon: Activity },
    { id: 'care-guidance', label: 'Care Guidance', icon: HeartHandshake },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  const isDangerous = currentGlucose !== undefined && (currentGlucose < 70 || currentGlucose > 250);

  return (
    <aside
      id="desktop-sidebar"
      className={`hidden md:flex ${
        isCollapsed ? 'w-20' : 'w-64'
      } h-screen flex-col bg-[#122131] border-r border-[#45464d]/40 backdrop-blur-xl shrink-0 sticky top-0 transition-all duration-300 relative`}
    >
      {/* Floating Toggle Button */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? "Expand Sidebar" : "Minimize Sidebar"}
          className="absolute -right-3 top-10 bg-[#122131] border border-[#45464d]/40 rounded-full p-1.5 text-[#c6c6cd] hover:text-[#5adace] hover:border-[#5adace] shadow-lg transition-all cursor-pointer z-50 hidden md:block"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      )}

      {/* Brand Header */}
      <div className={`p-6 border-b border-[#45464d]/20 flex items-center ${isCollapsed ? 'justify-center px-4' : 'gap-3'}`}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5adace] to-[#42e09a] flex items-center justify-center shadow-lg shadow-[#5adace]/10 shrink-0">
          <HeartPulse className="w-6 h-6 text-[#051424]" />
        </div>
        {!isCollapsed && (
          <div>
            <h1 className="font-semibold text-lg text-[#d4e4fa] tracking-tight leading-none">
              GlucoSense
            </h1>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#5adace] block mt-1">
              Clinical Suite
            </span>
          </div>
        )}
      </div>

      {/* Critical Telemetry Alert Banner inside Sidebar */}
      {isDangerous && (
        isCollapsed ? (
          <div 
            title={`CRITICAL ALERT: Glucose: ${currentGlucose} mg/dL`}
            className="mx-auto mt-4 p-2 bg-red-950/40 border border-red-500/60 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.25)] cursor-pointer"
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-red-500 animate-ping" />
          </div>
        ) : (
          <div className="mx-4 mt-4 p-3 bg-red-950/40 border border-red-500/60 rounded-xl flex items-center gap-2.5 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.25)]">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-mono font-bold text-red-400 block tracking-wider uppercase leading-none">
                CRITICAL TELEMETRY ALERT
              </span>
              <span className="text-xs font-bold text-white block mt-1">
                Glucose: {currentGlucose} mg/dL
              </span>
              <span className="text-[9px] text-red-300 font-semibold block mt-0.5 uppercase tracking-wide">
                {currentGlucose! < 70 ? 'HYPOGLYCEMIA RISK' : 'HYPERGLYCEMIA RISK'}
              </span>
            </div>
          </div>
        )
      )}

      {/* Primary Navigation */}
      <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-4'} py-6 space-y-1.5 overflow-y-auto`}>
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'} rounded-xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[#42e09a]/10 to-transparent text-[#42e09a] font-bold border-l-4 border-[#42e09a] pl-2.5'
                  : 'text-[#c6c6cd] hover:text-[#d4e4fa] hover:bg-[#2c3a4c]/30'
              }`}
            >
              <IconComponent className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#42e09a]' : 'text-[#c6c6cd]'}`} />
              {!isCollapsed && <span className="text-sm tracking-wide">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Active Patient Deep-Dive shortcut */}
      <div className={isCollapsed ? 'px-2 mb-2' : 'px-4 mb-2'}>
        <button
          onClick={() => setActiveTab('active-patient')}
          title={isCollapsed ? "Sarah Jenkins (Deep-Dive)" : undefined}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'} rounded-xl transition-all duration-200 border border-[#45464d]/30 cursor-pointer ${
            activeTab === 'active-patient'
              ? 'bg-[#5adace]/10 text-[#5adace] font-bold border-[#5adace]/60'
              : 'bg-[#0d1c2d]/40 text-[#c6c6cd] hover:text-[#d4e4fa] hover:bg-[#2c3a4c]/40'
          }`}
        >
          <User className="w-5 h-5 text-[#5adace] shrink-0" />
          {!isCollapsed && (
            <div className="text-left">
              <span className="text-xs font-semibold block text-[#5adace]">Deep-Dive</span>
              <span className="text-sm block text-inherit font-medium leading-none">Active Patient</span>
            </div>
          )}
        </button>
      </div>

      {/* Secondary Actions & User Profile */}
      <div className={`p-4 border-t border-[#45464d]/20 ${isCollapsed ? 'space-y-4 px-2' : 'space-y-4'}`}>
        <div className="space-y-1">
          <button
            onClick={() => setActiveTab('settings')}
            title={isCollapsed ? "Help & Support" : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-4 py-2'} rounded-lg text-xs text-[#c6c6cd] hover:text-[#d4e4fa] hover:bg-[#2c3a4c]/20 transition-all cursor-pointer`}
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Help &amp; Support</span>}
          </button>
          <button
            onClick={onLogout}
            title={isCollapsed ? "Sign Out" : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-4 py-2'} rounded-lg text-xs text-[#ffb4ab] hover:text-[#ffdad6] hover:bg-[#93000a]/10 transition-all cursor-pointer`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>

        {/* Doctor Clinician Info badge button */}
        <button
          onClick={() => setShowPhotoModal(true)}
          className={`w-full text-left bg-[#0d1c2d] hover:bg-[#1c2b3c]/60 ${isCollapsed ? 'p-2 justify-center' : 'p-3'} rounded-xl flex items-center gap-3 border border-[#45464d]/20 hover:border-[#5adace]/40 transition-all cursor-pointer group`}
          title={isCollapsed ? clinician.fullName : "View Full Clinical Profile Photo"}
        >
          <img
            src={clinician.avatarUrl}
            alt={clinician.fullName}
            className="w-9 h-9 rounded-full object-cover border border-[#bec6e0]/30 shrink-0 group-hover:scale-105 transition-transform"
            referrerPolicy="no-referrer"
          />
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#d4e4fa] truncate leading-tight group-hover:text-[#5adace] transition-colors">
                {clinician.fullName}
              </p>
              <span className="text-[10px] font-mono text-[#c6c6cd]/70 uppercase tracking-tight block">
                {clinician.medicalId}
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Clinician Profile Photo Viewer Modal in Lower Middle */}
      {showPhotoModal && (
        <div 
          className="fixed inset-0 bg-[#051424]/80 backdrop-blur-sm z-[9999] flex items-end justify-center p-4 pb-16 sm:pb-24"
          onClick={() => setShowPhotoModal(false)}
        >
          <div 
            className="bg-[#122131] border border-[#45464d]/40 rounded-3xl p-6 max-w-sm w-full relative shadow-2xl animate-in fade-in slide-in-from-bottom-20 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowPhotoModal(false)}
              className="absolute top-4 right-4 p-1.5 bg-[#1c2b3c] hover:bg-[#2c3a4c] rounded-full text-[#c6c6cd] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-[#5adace] shadow-lg shadow-[#5adace]/10">
                <img 
                  src={clinician.avatarUrl} 
                  alt={clinician.fullName} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#d4e4fa]">{clinician.fullName}</h3>
                <p className="text-xs text-[#5adace] font-semibold mt-0.5">{clinician.specialization}</p>
                <p className="text-[10px] font-mono text-[#c6c6cd]/50 mt-1 uppercase tracking-wider">{clinician.medicalId}</p>
              </div>
              <div className="w-full pt-3 border-t border-[#45464d]/20 text-xs text-[#c6c6cd]">
                <p className="font-medium text-[#bec6e0]">{clinician.primaryFacility}</p>
                <p className="text-[10px] text-[#c6c6cd]/40 mt-1">EHR Active Session Practitioner</p>
              </div>
              <button
                onClick={() => {
                  setShowPhotoModal(false);
                  setActiveTab('settings');
                }}
                className="w-full py-2 bg-[#5adace] hover:bg-[#43c4b9] text-[#051424] font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
              >
                Go to Profile Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
