/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Menu, X, Bell, Siren, ShieldCheck, HeartPulse, LogOut } from 'lucide-react';
import { TabId, Clinician } from '../types';

interface HeaderProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  clinician: Clinician;
  onTriggerSOS: () => void;
  onLogout?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export default function Header({
  activeTab,
  setActiveTab,
  clinician,
  onTriggerSOS,
  onLogout,
  isSidebarCollapsed,
  onToggleSidebar,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'dashboard', label: 'Patient Dashboard' },
    { id: 'prediction', label: 'Risk Prediction' },
    { id: 'history', label: 'Assessment History' },
    { id: 'recommendations', label: 'Clinical Protocols' },
    { id: 'diagnostics', label: 'Diagnostics' },
    { id: 'care-guidance', label: 'Care Guidance' },
    { id: 'settings', label: 'Settings & Prefs' },
    { id: 'active-patient', label: 'Sarah Jenkins (Active)' },
  ];

  const handleTabClick = (tabId: TabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-[#122131]/80 backdrop-blur-xl border-b border-[#45464d]/30 sticky top-0 z-40 w-full px-6 py-3.5 flex items-center justify-between">
      {/* Brand Label */}
      <div className="flex items-center gap-2">
        {/* Mobile Hamburger (toggles mobile drawer) */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-[#c6c6cd] hover:text-[#d4e4fa] hover:bg-[#2c3a4c]/50 rounded-lg transition-colors cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Desktop Hamburger (toggles sidebar collapse) */}
        <button
          onClick={onToggleSidebar}
          title={isSidebarCollapsed ? "Expand Sidebar" : "Minimize Sidebar"}
          className="hidden md:flex p-2 text-[#c6c6cd] hover:text-[#d4e4fa] hover:bg-[#2c3a4c]/50 rounded-lg transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-[#bec6e0] ml-1">
          <HeartPulse className="w-5 h-5 text-[#5adace] animate-pulse" />
          <span className="font-bold text-base md:text-lg text-[#d4e4fa] tracking-tight">
            GlucoSense
          </span>
        </div>
      </div>

      {/* Desktop breadcrumb indicator / state indicators */}
      <div className="hidden md:flex items-center gap-4 text-xs font-medium text-[#c6c6cd]">
        <div className="flex items-center gap-1.5 bg-[#0d1c2d] px-3 py-1.5 rounded-full border border-[#5adace]/20 text-[#5adace]">
          <ShieldCheck className="w-4 h-4" />
          <span>Encrypted Gateway (HIPAA)</span>
        </div>
        <span className="text-[#45464d]">|</span>
        <span className="uppercase text-[10px] tracking-widest font-mono text-[#bec6e0] bg-[#1c2b3c] px-2.5 py-1 rounded">
          Active View: {tabs.find((t) => t.id === activeTab)?.label}
        </span>
      </div>

      {/* Icons Actions Bar */}
      <div className="flex items-center gap-3">
        {/* Urgent Emergency SOS quick-trigger */}
        <button
          onClick={onTriggerSOS}
          title="Trigger Emergency Response Sequence"
          className="bg-[#ffb4ab]/15 border border-[#ffb4ab]/40 hover:bg-[#ffb4ab]/30 p-2 rounded-lg text-[#ffb4ab] transition-all duration-300 flex items-center gap-1 cursor-pointer animate-pulse"
        >
          <Siren className="w-4.5 h-4.5" />
          <span className="hidden sm:inline text-xs font-semibold">SOS Alert</span>
        </button>

        {/* Notifications Mock Toggle */}
        <div className="relative">
          <button
            onClick={() => alert("Notification Center: All clinical telemetry feeds are synchronized and running with 98.2% accuracy.")}
            className="p-2 text-[#c6c6cd] hover:text-[#d4e4fa] hover:bg-[#2c3a4c]/50 rounded-lg transition-colors cursor-pointer"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#5adace] rounded-full"></span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown List */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-[#122131] border-b border-[#45464d]/50 shadow-2xl p-4 space-y-2 z-50 animate-in slide-in-from-top-4 duration-200 md:hidden">
          <p className="text-[10px] uppercase font-mono tracking-wider text-[#c6c6cd]/60 px-3 pb-2 border-b border-[#45464d]/20 mb-2">
            Select Live View Screen
          </p>
          {tabs.map((tab) => {
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer ${
                  isTabActive
                    ? 'bg-[#5adace]/15 text-[#5adace] font-bold border-l-4 border-[#5adace] pl-3'
                    : 'text-[#c6c6cd] hover:text-[#d4e4fa] hover:bg-[#2c3a4c]/30'
                }`}
              >
                {tab.label}
              </button>
            );
          })}

          {onLogout && (
            <div className="pt-2 border-t border-[#45464d]/20 mt-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-[#ffb4ab] bg-[#93000a]/10 hover:bg-[#93000a]/20 border border-[#ffb4ab]/25 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Sign Out Securely</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
