/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  X, 
  Bell, 
  Siren, 
  ShieldCheck, 
  HeartPulse, 
  LogOut,
  AlertCircle,
  AlertTriangle,
  Info,
  Check,
  Trash2,
  HelpCircle
} from 'lucide-react';
import { TabId, Clinician } from '../types';

export interface NotificationItem {
  id: string;
  patientId: string;
  patientName: string;
  type: 'low' | 'high' | 'system' | 'info';
  message: string;
  timestamp: string;
  read: boolean;
}

interface HeaderProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  clinician: Clinician;
  onTriggerSOS: () => void;
  onLogout?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  notifications?: NotificationItem[];
  onMarkNotificationRead?: (id: string) => void;
  onClearAllNotifications?: () => void;
  onOpenHelpSupport?: () => void;
}

export default function Header({
  activeTab,
  setActiveTab,
  clinician,
  onTriggerSOS,
  onLogout,
  isSidebarCollapsed,
  onToggleSidebar,
  notifications = [],
  onMarkNotificationRead,
  onClearAllNotifications,
  onOpenHelpSupport,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close notification popover if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

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

        {/* Notifications Dropdown Component */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            title="Notification Center"
            className={`p-2 text-[#c6c6cd] hover:text-[#d4e4fa] hover:bg-[#2c3a4c]/50 rounded-lg transition-colors cursor-pointer relative ${notificationsOpen ? 'bg-[#2c3a4c]/50 text-[#d4e4fa]' : ''}`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-[#5adace] text-[#051424] font-bold text-[9px] rounded-full flex items-center justify-center px-1 font-mono leading-none shadow shadow-[#5adace]/50">
                {unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2.5 w-80 md:w-96 bg-[#122131] border border-[#45464d]/40 rounded-2xl shadow-2xl backdrop-blur-xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Dropdown Header */}
              <div className="p-4 border-b border-[#45464d]/20 flex items-center justify-between bg-[#0d1c2d]/45">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#5adace]" />
                  <h4 className="text-xs font-bold font-mono tracking-wider text-white uppercase">Clinical Feed</h4>
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={() => {
                      if (onClearAllNotifications) onClearAllNotifications();
                    }}
                    className="text-[10px] text-[#ffb4ab] hover:text-[#ffdad6] hover:underline font-mono flex items-center gap-1 cursor-pointer border-none bg-transparent"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>

              {/* Notification Items List */}
              <div className="max-h-72 overflow-y-auto divide-y divide-[#45464d]/10">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#c6c6cd]/50 flex flex-col items-center gap-2">
                    <Bell className="w-8 h-8 text-[#45464d]/30 animate-pulse" />
                    <p>No active alerts or updates</p>
                    <span className="text-[9px] font-mono opacity-60">All synchronized streams running normal</span>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    return (
                      <div
                        key={notif.id}
                        onClick={() => {
                          if (notif.patientId) {
                            setActiveTab('dashboard');
                          }
                          if (onMarkNotificationRead) {
                            onMarkNotificationRead(notif.id);
                          }
                          setNotificationsOpen(false);
                        }}
                        className={`p-3.5 flex items-start gap-2.5 hover:bg-[#1c2b3c]/40 transition-colors cursor-pointer relative group ${notif.read ? 'opacity-70' : 'bg-[#5adace]/5'}`}
                      >
                        {/* Red dot indicator for unread */}
                        {!notif.read && (
                          <span className="absolute left-2 top-[18px] w-1.5 h-1.5 rounded-full bg-[#5adace]"></span>
                        )}
                        
                        {/* Status Icon */}
                        <div className="mt-0.5 shrink-0">
                          {notif.type === 'low' && (
                            <div className="p-1 bg-[#93000a]/20 text-[#ffb4ab] rounded-lg">
                              <AlertCircle className="w-3.5 h-3.5" />
                            </div>
                          )}
                          {notif.type === 'high' && (
                            <div className="p-1 bg-amber-500/10 text-amber-400 rounded-lg">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </div>
                          )}
                          {notif.type === 'system' && (
                            <div className="p-1 bg-purple-500/10 text-purple-400 rounded-lg">
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </div>
                          )}
                          {notif.type === 'info' && (
                            <div className="p-1 bg-[#5adace]/10 text-[#5adace] rounded-lg">
                              <Info className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>

                        {/* Content text */}
                        <div className="flex-1 min-w-0 pl-1.5">
                          <p className="text-xs text-[#d4e4fa] font-medium leading-normal break-words">
                            {notif.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[9px] text-[#c6c6cd]/60 font-mono">
                            <span>{notif.patientName || 'System'}</span>
                            <span>•</span>
                            <span>{notif.timestamp}</span>
                          </div>
                        </div>

                        {/* Single Actions */}
                        <div className="flex items-center gap-1 shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notif.read && onMarkNotificationRead && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onMarkNotificationRead(notif.id);
                              }}
                              title="Mark as read"
                              className="p-1 bg-[#1c2b3c] hover:bg-[#2c3a4c] rounded text-[#5adace] cursor-pointer border-none"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-2 border-t border-[#45464d]/10 bg-[#0d1c2d]/25 text-center text-[10px] font-mono text-[#c6c6cd]/40">
                Secure Remote Telemetry Link Active
              </div>
            </div>
          )}
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
