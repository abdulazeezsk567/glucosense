/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  HelpCircle, 
  Send, 
  CheckCircle2, 
  MessageSquare, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Activity, 
  ShieldCheck 
} from 'lucide-react';

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBot?: () => void;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  icon: any;
}

export default function HelpSupportModal({ isOpen, onClose, onOpenBot }: HelpSupportModalProps) {
  const [activeTab, setActiveTab] = useState<'faq' | 'ticket'>('faq');
  const [expandedFaq, setExpandedFaq] = useState<string | null>('faq-1');
  
  // Ticket form state
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('General Clinical Inquiry');
  const [ticketPriority, setTicketPriority] = useState('Medium');
  const [ticketDescription, setTicketDescription] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState<{ id: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const faqs: FaqItem[] = [
    {
      id: 'faq-1',
      question: 'How does the ML Risk prediction calculate risk?',
      answer: 'GlucoSense utilizes an integrated multi-variable hazard analysis leveraging patient demographic metrics, age, BMI, HbA1c, and real-time continuous glucose trends. Predictions offer a 92.4% statistical confidence interval for active risk stratification.',
      category: 'ML & PREDICTION',
      icon: Activity
    },
    {
      id: 'faq-2',
      question: 'How can I customize low and high target glucose thresholds?',
      answer: 'Clinicians can configure personalized hypoglycemia (low) and hyperglycemia (high) goals via the "Settings & Prefs" tab. Threshold overrides are instantly synchronized across real-time widgets and visual charts.',
      category: 'THRESHOLD LIMITS',
      icon: FileText
    },
    {
      id: 'faq-3',
      question: 'How are HIPAA requirements satisfied?',
      answer: 'All continuous patient telemetry feeds are securely transmitted through our encrypted HIPAA-compliant gateway. Data at rest is structured under strict database rules and is encrypted using AES-256 standard protocols.',
      category: 'SECURITY & GATEWAY',
      icon: ShieldCheck
    },
    {
      id: 'faq-4',
      question: 'What happens when an SOS Emergency alert is triggered?',
      answer: 'Triggering an SOS starts a 5-second countdown override. Once completed, a high-priority dispatch is routed to the designated clinician or primary care team, GPS telemetry is logged, and emergency contacts are alerted instantly.',
      category: 'EMERGENCY PROTOCOLS',
      icon: AlertTriangle
    }
  ];

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDescription.trim()) return;

    setIsSubmitting(true);
    // Simulate API delay
    setTimeout(() => {
      setIsSubmitting(false);
      const ticketId = `GS-TKT-${Math.floor(100000 + Math.random() * 900000)}`;
      setSubmittedTicket({ id: ticketId });
    }, 800);
  };

  const handleResetTicket = () => {
    setTicketSubject('');
    setTicketDescription('');
    setTicketPriority('Medium');
    setTicketCategory('General Clinical Inquiry');
    setSubmittedTicket(null);
  };

  return (
    <div 
      id="help-support-modal"
      className="fixed inset-0 bg-[#051424]/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-[#122131] border border-[#45464d]/40 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Close button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 bg-[#1c2b3c] hover:bg-[#2c3a4c] rounded-full text-[#c6c6cd] hover:text-white transition-all cursor-pointer"
          title="Close help desk"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-[#45464d]/20 bg-[#0d1c2d]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5adace] to-[#42e09a] flex items-center justify-center shadow-md shadow-[#5adace]/10 shrink-0">
              <HelpCircle className="w-5 h-5 text-[#051424]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#d4e4fa] tracking-tight">Clinical Help &amp; Support Desk</h3>
              <p className="text-xs text-[#c6c6cd]/80">Access FAQs, open dynamic troubleshooting tickets, or consult AI assistance.</p>
            </div>
          </div>
        </div>

        {/* Modal Tabs Navigation */}
        <div className="px-6 pt-3 pb-1 border-b border-[#45464d]/10 flex gap-4 bg-[#0d1c2d]/10">
          <button
            onClick={() => setActiveTab('faq')}
            className={`pb-2.5 text-xs font-semibold tracking-wide border-b-2 transition-all cursor-pointer ${
              activeTab === 'faq' 
                ? 'text-[#5adace] border-[#5adace]' 
                : 'text-[#c6c6cd]/60 border-transparent hover:text-[#c6c6cd]'
            }`}
          >
            Clinical FAQs &amp; Knowledge Base
          </button>
          <button
            onClick={() => setActiveTab('ticket')}
            className={`pb-2.5 text-xs font-semibold tracking-wide border-b-2 transition-all cursor-pointer ${
              activeTab === 'ticket' 
                ? 'text-[#5adace] border-[#5adace]' 
                : 'text-[#c6c6cd]/60 border-transparent hover:text-[#c6c6cd]'
            }`}
          >
            Submit Support Ticket Inquiry
          </button>
        </div>

        {/* Modal Body / Content */}
        <div className="p-6 overflow-y-auto flex-1 min-h-[300px]">
          {activeTab === 'faq' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#c6c6cd]/50">
                  Select a topic below for clinical system explanations:
                </span>
              </div>

              <div className="space-y-3">
                {faqs.map((faq) => {
                  const FaqIcon = faq.icon;
                  const isExpanded = expandedFaq === faq.id;
                  return (
                    <div 
                      key={faq.id}
                      className={`border rounded-xl transition-all ${
                        isExpanded 
                          ? 'border-[#5adace]/40 bg-[#1c2b3c]/30 shadow-lg shadow-[#5adace]/5' 
                          : 'border-[#45464d]/20 bg-[#0d1c2d]/20 hover:border-[#45464d]/40'
                      }`}
                    >
                      <button
                        onClick={() => setExpandedFaq(isExpanded ? null : faq.id)}
                        className="w-full text-left p-4 flex items-start justify-between gap-3 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg shrink-0 ${isExpanded ? 'bg-[#5adace]/20 text-[#5adace]' : 'bg-[#1c2b3c] text-[#c6c6cd]'}`}>
                            <FaqIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[9px] font-mono font-bold text-[#5adace] tracking-wide block uppercase">
                              {faq.category}
                            </span>
                            <span className="text-xs md:text-sm font-bold text-white mt-0.5 block leading-tight">
                              {faq.question}
                            </span>
                          </div>
                        </div>
                        <div className="text-[#c6c6cd]/60 shrink-0">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-[#45464d]/10 text-xs md:text-sm text-[#d4e4fa] leading-relaxed animate-in fade-in slide-in-from-top-1 duration-150">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bot consultation action card */}
              <div className="mt-6 p-4 bg-gradient-to-r from-[#5adace]/10 to-[#42e09a]/5 border border-[#5adace]/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-start gap-3 text-center sm:text-left">
                  <div className="p-2 bg-[#5adace]/20 text-[#5adace] rounded-xl shrink-0 hidden sm:block">
                    <MessageSquare className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider">Consult AI GlucoBot Assistant</h5>
                    <p className="text-[11px] text-[#c6c6cd] mt-0.5">Have specific questions about medical metrics, CNN predictions, or data sync?</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    if (onOpenBot) onOpenBot();
                  }}
                  className="px-4 py-2 bg-[#5adace] hover:bg-[#43c4b9] text-[#051424] font-bold text-xs rounded-xl shadow transition-all cursor-pointer whitespace-nowrap"
                >
                  Initiate AI Chat
                </button>
              </div>
            </div>
          ) : (
            /* Ticket Submission Tab */
            submittedTicket ? (
              <div className="flex flex-col items-center text-center p-8 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-[#42e09a]/20 text-[#42e09a] flex items-center justify-center shadow-lg shadow-[#42e09a]/10">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">Support Ticket Submitted Successfully</h4>
                  <p className="text-xs text-[#c6c6cd] mt-2 max-w-md">
                    Ticket <strong className="text-[#5adace] font-mono">{submittedTicket.id}</strong> has been logged in our secure clinical queue. An integration specialist will contact you or update your console within 1 hour.
                  </p>
                </div>
                <div className="p-3.5 bg-[#0d1c2d] border border-[#45464d]/20 rounded-xl text-left max-w-sm w-full space-y-1.5 font-mono text-[10px] text-[#c6c6cd]">
                  <p><span className="text-[#5adace] font-semibold">TICKET ID:</span> {submittedTicket.id}</p>
                  <p><span className="text-[#5adace] font-semibold">CATEGORY:</span> {ticketCategory}</p>
                  <p><span className="text-[#5adace] font-semibold">PRIORITY:</span> {ticketPriority}</p>
                  <p><span className="text-[#5adace] font-semibold">ENCRYPTED KEY:</span> {Math.random().toString(36).substring(2, 10).toUpperCase()}-HIPAA</p>
                </div>
                <div className="pt-4 flex gap-3">
                  <button
                    onClick={handleResetTicket}
                    className="px-4 py-2 bg-[#1c2b3c] hover:bg-[#2c3a4c] text-[#d4e4fa] font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Submit Another Inquiry
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-[#5adace] hover:bg-[#43c4b9] text-[#051424] font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
                  >
                    Dismiss Help Desk
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleTicketSubmit} className="space-y-4">
                <p className="text-[11px] text-[#c6c6cd]/70 leading-relaxed font-mono">
                  Submit an incident report or inquiry directly to our engineering support desk. Your submission is packaged securely under strict encryption standards.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-[#c6c6cd] mb-1.5 font-semibold">
                      Inquiry Category
                    </label>
                    <select
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value)}
                      className="w-full bg-[#0d1c2d] border border-[#45464d]/30 rounded-xl px-3.5 py-2.5 text-xs text-[#d4e4fa] outline-none focus:border-[#5adace] transition-colors"
                    >
                      <option value="CGM Connectivity Issue">CGM Connectivity Issue</option>
                      <option value="Threshold Configuration Support">Threshold Configuration Support</option>
                      <option value="ML Model Calibrations">ML Model Calibrations</option>
                      <option value="General Clinical Inquiry">General Clinical Inquiry</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] uppercase font-mono tracking-wider text-[#c6c6cd] mb-1.5 font-semibold">
                      Urgency Priority Level
                    </label>
                    <select
                      value={ticketPriority}
                      onChange={(e) => setTicketPriority(e.target.value)}
                      className="w-full bg-[#0d1c2d] border border-[#45464d]/30 rounded-xl px-3.5 py-2.5 text-xs text-[#d4e4fa] outline-none focus:border-[#5adace] transition-colors"
                    >
                      <option value="Low">Low - System Optimization</option>
                      <option value="Medium">Medium - Clinical Flow Interruption</option>
                      <option value="Critical">Critical - Downstream Ingress Failure</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-[#c6c6cd] mb-1.5 font-semibold">
                    Inquiry Subject Line
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Short summary of the system issue..."
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    className="w-full bg-[#0d1c2d] border border-[#45464d]/30 rounded-xl px-3.5 py-2.5 text-xs text-[#d4e4fa] outline-none focus:border-[#5adace] transition-colors placeholder:text-[#c6c6cd]/30"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-[#c6c6cd] mb-1.5 font-semibold">
                    Detailed Diagnostics / Context
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide a detailed description of the error code, device type, patient reference ID, or general assistance needed..."
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    className="w-full bg-[#0d1c2d] border border-[#45464d]/30 rounded-xl px-3.5 py-2.5 text-xs text-[#d4e4fa] outline-none focus:border-[#5adace] transition-colors placeholder:text-[#c6c6cd]/30 resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 bg-[#1c2b3c] hover:bg-[#2c3a4c] text-[#d4e4fa] font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-[#5adace] hover:bg-[#43c4b9] disabled:opacity-50 text-[#051424] font-bold text-xs rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-[#051424]/30 border-t-[#051424] animate-spin"></div>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Ticket Request</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#45464d]/10 bg-[#0d1c2d]/20 text-center text-[10px] font-mono text-[#c6c6cd]/40">
          GlucoSense Enterprise Security • HIPAA Protected Stream • AES-256 Enabled
        </div>
      </div>
    </div>
  );
}
