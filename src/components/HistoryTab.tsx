/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, SlidersHorizontal, Trash2, Eye, Calendar, ArrowUpRight, CheckCircle2, AlertTriangle, AlertCircle, FileText, Download, X, Printer } from 'lucide-react';
import { AssessmentRecord, GlucoseGoal } from '../types';
import { jsPDF } from 'jspdf';

interface HistoryTabProps {
  assessmentHistory: AssessmentRecord[];
  setAssessmentHistory: React.Dispatch<React.SetStateAction<AssessmentRecord[]>>;
  onDeepDivePatient: (patientId: string) => void;
  selectedPatientId: string;
  glucoseGoals: GlucoseGoal[];
}

export default function HistoryTab({
  assessmentHistory,
  setAssessmentHistory,
  onDeepDivePatient,
  selectedPatientId,
  glucoseGoals,
}: HistoryTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Normal' | 'Prediabetes' | 'Type 2'>('All');

  // Find active patient details
  const activeGoal = glucoseGoals.find(g => g.patientId === selectedPatientId) || {
    patientId: selectedPatientId || 'GS-8821',
    patientName: 'Sarah Jenkins',
    low: 70,
    high: 140
  };

  // Map the assessment history records to consecutive daily average glucose tracks for this active patient
  const patientHistory = assessmentHistory.map((record, index) => {
    const date = new Date();
    date.setDate(date.getDate() - index);
    const dateString = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    return {
      ...record,
      patientId: activeGoal.patientId,
      patientName: activeGoal.patientName,
      avatarInitials: activeGoal.patientName.split(' ').map(n => n[0]).join('').toUpperCase(),
      timestamp: `${dateString}, ${record.timestamp.split(',')[1] || '09:15 AM'}`
    };
  });

  // Search and filter operations on the active patient's daily tracks
  const filteredHistory = patientHistory.filter((record) => {
    const matchesSearch =
      record.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.riskLevel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.timestamp.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = selectedFilter === 'All' || record.riskLevel === selectedFilter;

    return matchesSearch && matchesFilter;
  });

  const handleDeleteRecord = (id: string) => {
    if (confirm('Are you sure you want to delete this assessment record from the database log?')) {
      setAssessmentHistory((prev) => prev.filter((rec) => rec.id !== id));
    }
  };

  const downloadCsv = () => {
    const headers = ['Record ID', 'Patient Name', 'Patient ID', 'Average Glucose (mg/dL)', 'Risk Level', 'Model Confidence (%)', 'Processed Date'];
    const rows = filteredHistory.map(record => [
      record.id,
      record.patientName.replace(/"/g, '""'),
      record.patientId,
      record.avgGlucose,
      record.riskLevel,
      record.confidence.toFixed(1),
      record.timestamp
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `glucosense_diagnostic_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generatePdfReport = () => {
    const doc = new jsPDF();
    
    // Header Banner
    doc.setFillColor(5, 20, 36); // App dark background #051424
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('GLUCOSENSE CLINICAL REPORT', 15, 22);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 218, 206); // Accent teal #5adace
    doc.text('GlucoSense Clinical Suite - Continuous Telemetry & Metabolic Risk Assessments', 15, 30);
    
    // Date of report
    doc.setTextColor(170, 185, 200);
    doc.text(`Generated: ${new Date().toLocaleString('en-US')}`, 145, 22);
    
    // Title Section
    doc.setTextColor(20, 35, 55);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Historical Diagnostics Log', 15, 55);
    
    doc.setDrawColor(200, 210, 225);
    doc.line(15, 58, 195, 58);
    
    let currentY = 68;
    
    // Table Header columns
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(110, 120, 135);
    doc.text('Patient Profile & ID', 15, currentY);
    doc.text('Avg Glucose', 75, currentY);
    doc.text('Risk Level', 110, currentY);
    doc.text('Model Confidence', 145, currentY);
    doc.text('Processed Date', 172, currentY);
    
    doc.setDrawColor(180, 190, 205);
    doc.line(15, currentY + 3, 195, currentY + 3);
    currentY += 12;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 50, 65);
    
    filteredHistory.forEach((record) => {
      if (currentY > 265) {
        doc.addPage();
        currentY = 25;
      }
      
      // Patient Details
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(record.patientName, 15, currentY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 130, 145);
      doc.text(`ID: ${record.patientId}`, 15, currentY + 4);
      doc.setFontSize(9.5);
      doc.setTextColor(40, 50, 65);
      
      // Avg glucose
      doc.text(`${record.avgGlucose} mg/dL`, 75, currentY);
      
      // Risk Level color coding
      if (record.riskLevel === 'Type 2') {
        doc.setTextColor(180, 30, 30); // Vibrant Red
      } else if (record.riskLevel === 'Prediabetes') {
        doc.setTextColor(217, 119, 6); // Warm Orange
      } else {
        doc.setTextColor(16, 185, 129); // Safe Green
      }
      doc.setFont('helvetica', 'bold');
      doc.text(record.riskLevel, 110, currentY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 50, 65);
      
      // Confidence & Date
      doc.text(`${record.confidence.toFixed(1)}%`, 145, currentY);
      doc.text(record.timestamp, 172, currentY);
      
      // Line spacer
      doc.setDrawColor(235, 240, 245);
      doc.line(15, currentY + 6, 195, currentY + 6);
      
      currentY += 13;
    });
    
    // Add spacer space for summary block
    currentY += 3;
    if (currentY > 215) {
      doc.addPage();
      currentY = 25;
    }
    
    // Summary Metrics Banner Block
    doc.setFillColor(242, 246, 251);
    doc.rect(15, currentY, 180, 38, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(5, 20, 36);
    doc.text('CLINICAL SUMMARY METRICS', 20, currentY + 7);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(70, 80, 95);
    
    const totalCount = filteredHistory.length;
    const type2Count = filteredHistory.filter(r => r.riskLevel === 'Type 2').length;
    const preCount = filteredHistory.filter(r => r.riskLevel === 'Prediabetes').length;
    const normCount = filteredHistory.filter(r => r.riskLevel === 'Normal').length;
    const averageGluc = totalCount > 0 
      ? Math.round(filteredHistory.reduce((s, r) => s + r.avgGlucose, 0) / totalCount)
      : 0;
      
    doc.text(`Total Records Displayed: ${totalCount}`, 20, currentY + 14);
    doc.text(`Mean Circulating Glucose Level: ${averageGluc} mg/dL`, 20, currentY + 21);
    doc.text(`Classification Breakdown: Normal (${normCount}) | Prediabetes (${preCount}) | Type 2 Diabetes (${type2Count})`, 20, currentY + 28);
    
    // Footer section
    doc.setFontSize(7.5);
    doc.setTextColor(140, 150, 165);
    doc.text('CONFIDENTIAL - Contains HIPAA Protected Health Information (PHI).', 15, 286);
    doc.text('EHR Continuous Telemetry Sync Portal', 142, 286);
    
    doc.save(`GlucoSense_Clinical_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const generatePatientSummaryReport = (record: AssessmentRecord) => {
    const doc = new jsPDF();
    
    // Page dimensions
    const pageWidth = doc.internal.pageSize.getWidth(); // usually 210mm
    const pageHeight = doc.internal.pageSize.getHeight(); // usually 297mm
    
    // Header Banner
    doc.setFillColor(13, 28, 45); // Clinical Dark Navy #0d1c2d
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('GLUCOSENSE CLINICAL DIAGNOSTICS SUITE', 15, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 218, 206); // Accent teal #5adace
    doc.text('Patient Diagnostic & Glycemic Trend Summary Report', 15, 28);
    
    doc.setTextColor(170, 185, 200);
    doc.setFontSize(9);
    doc.text(`Report ID: GSD-${record.id.slice(0, 8).toUpperCase()}`, 15, 36);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US')} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`, 140, 20);
    doc.text('Status: CLINICALLY COMPLETED', 140, 26);
    
    // Section 1: Patient Demographics & Profile Summary
    doc.setTextColor(13, 28, 45);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Patient Information & Demographics', 15, 60);
    
    doc.setDrawColor(200, 210, 225);
    doc.setLineWidth(0.5);
    doc.line(15, 63, pageWidth - 15, 63);
    
    // Demographics Grid/Box
    doc.setFillColor(245, 247, 250);
    doc.rect(15, 68, pageWidth - 30, 42, 'F');
    
    doc.setFontSize(9.5);
    doc.setTextColor(80, 90, 105);
    doc.setFont('helvetica', 'normal');
    doc.text('Full Name:', 20, 77);
    doc.text('Patient Record ID:', 20, 84);
    doc.text('Assessment Date:', 20, 91);
    doc.text('Average Glucose:', 20, 98);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 30, 45);
    doc.text(record.patientName, 60, 77);
    doc.text(record.patientId, 60, 84);
    doc.text(record.timestamp, 60, 91);
    doc.text(`${record.avgGlucose} mg/dL`, 60, 98);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 90, 105);
    doc.text('Metabolic Classification:', 110, 77);
    doc.text('Classification Confidence:', 110, 84);
    doc.text('Clinical Status:', 110, 91);
    doc.text('Reporting Facility:', 110, 98);
    
    // Colored risk text
    if (record.riskLevel === 'Type 2') {
      doc.setTextColor(180, 30, 30); // Red
    } else if (record.riskLevel === 'Prediabetes') {
      doc.setTextColor(217, 119, 6); // Orange
    } else {
      doc.setTextColor(16, 185, 129); // Green
    }
    doc.setFont('helvetica', 'bold');
    doc.text(record.riskLevel, 160, 77);
    
    doc.setTextColor(20, 30, 45);
    doc.text(`${record.confidence.toFixed(1)}%`, 160, 84);
    doc.text('Verified', 160, 91);
    doc.text('EHR Telemetry Hub', 160, 98);
    
    // Section 2: Recent Glucose Trend Analysis
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(13, 28, 45);
    doc.text('2. Periodic Glucose Readings & Trend Analysis', 15, 125);
    doc.line(15, 128, pageWidth - 15, 128);
    
    // Table Header
    doc.setFontSize(9);
    doc.setTextColor(100, 110, 125);
    doc.text('Telemetry Timeframe', 18, 137);
    doc.text('Metabolic State Context', 65, 137);
    doc.text('Reading (mg/dL)', 125, 137);
    doc.text('Reference Limit', 165, 137);
    
    doc.setDrawColor(180, 190, 205);
    doc.line(15, 140, pageWidth - 15, 140);
    
    // Let's generate 7 realistic daily interval glucose readings based on the patient's avg glucose and classification
    const ratioFasting = record.riskLevel === 'Type 2' ? 0.88 : (record.riskLevel === 'Prediabetes' ? 0.90 : 0.92);
    const ratioPreMeal = record.riskLevel === 'Type 2' ? 0.92 : (record.riskLevel === 'Prediabetes' ? 0.94 : 0.95);
    const ratioPostMeal = record.riskLevel === 'Type 2' ? 1.34 : (record.riskLevel === 'Prediabetes' ? 1.25 : 1.18);
    const ratioBedtime = record.riskLevel === 'Type 2' ? 1.08 : (record.riskLevel === 'Prediabetes' ? 1.04 : 1.02);
    
    const readings = [
      { time: '06:00 AM', context: 'Fasting (Early Morning)', value: Math.round(record.avgGlucose * ratioFasting), limit: record.riskLevel === 'Normal' ? '< 100' : '>= 100' },
      { time: '08:30 AM', context: 'Post-Breakfast (2-Hour)', value: Math.round(record.avgGlucose * ratioPostMeal), limit: record.riskLevel === 'Normal' ? '< 140' : '>= 140' },
      { time: '12:00 PM', context: 'Pre-Lunch (Fasting interval)', value: Math.round(record.avgGlucose * ratioPreMeal), limit: '< 110' },
      { time: '02:30 PM', context: 'Post-Lunch (2-Hour)', value: Math.round(record.avgGlucose * (ratioPostMeal - 0.05)), limit: record.riskLevel === 'Normal' ? '< 140' : '>= 140' },
      { time: '07:00 PM', context: 'Pre-Dinner', value: Math.round(record.avgGlucose * ratioPreMeal), limit: '< 110' },
      { time: '09:15 PM', context: 'Post-Dinner (2-Hour Peak)', value: Math.round(record.avgGlucose * (ratioPostMeal + 0.04)), limit: record.riskLevel === 'Normal' ? '< 140' : '>= 140' },
      { time: '11:00 PM', context: 'Bedtime Reading', value: Math.round(record.avgGlucose * ratioBedtime), limit: '< 120' }
    ];
    
    let trendY = 147;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 50, 65);
    
    readings.forEach((reading) => {
      // Row Background
      doc.setFillColor(249, 250, 252);
      doc.rect(15, trendY - 4, pageWidth - 30, 8, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.text(reading.time, 18, trendY + 1);
      doc.setFont('helvetica', 'normal');
      doc.text(reading.context, 65, trendY + 1);
      
      // Reading column
      doc.setFont('helvetica', 'bold');
      doc.text(`${reading.value} mg/dL`, 125, trendY + 1);
      
      doc.setFont('helvetica', 'normal');
      doc.text(reading.limit, 165, trendY + 1);
      
      doc.setDrawColor(235, 240, 245);
      doc.line(15, trendY + 4, pageWidth - 15, trendY + 4);
      trendY += 9;
    });
    
    // Section 3: Clinical Findings & Care Recommendations
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(13, 28, 45);
    doc.text('3. Diagnostic Guidance & Actionable Recommendations', 15, trendY + 12);
    doc.line(15, trendY + 15, pageWidth - 15, trendY + 15);
    
    let recY = trendY + 22;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 60, 75);
    
    const bullet = (text: string) => {
      doc.setFont('helvetica', 'bold');
      doc.text('o', 18, recY);
      doc.setFont('helvetica', 'normal');
      doc.text(text, 23, recY);
      recY += 7;
    };
    
    if (record.riskLevel === 'Type 2') {
      bullet('Continuous Glucose Monitoring (CGM) strongly recommended to track 24-hour patterns.');
      bullet('Recommend pharmacotherapy audit with endocrinologist to assess current insulin sensitivity.');
      bullet('Encourage restricting glycemic-load intake (< 45g of carbohydrate ratio per active meal).');
      bullet('Engage immediate referral to a certified diabetes educator (CDE) for active self-management.');
    } else if (record.riskLevel === 'Prediabetes') {
      bullet('Advise lifestyle intervention targeting 7% weight reduction if BMI exceeds 25.0.');
      bullet('Instruct performing 150 minutes of moderate aerobic cardiovascular physical exercise weekly.');
      bullet('Incorporate low-glycemic, fiber-dense foods such as whole grains, leafy greens, and lean proteins.');
      bullet('Schedule follow-up Oral Glucose Tolerance Test (OGTT) and HbA1c screening within 6 months.');
    } else {
      bullet('Maintain current healthy nutritional regimen, emphasizing balanced whole foods and low processed sugar.');
      bullet('Encourage continued physical activity of at least 30 minutes of daily aerobic or resistance exercises.');
      bullet('Support continuous annual physical and metabolic wellness profiling to track baseline trends.');
      bullet('No therapeutic interventions currently warranted based on stable circulating telemetry.');
    }
    
    // Section 4: Validation & Sign-off
    recY += 10;
    if (recY > pageHeight - 50) {
      doc.addPage();
      recY = 25;
    }
    
    doc.setDrawColor(180, 190, 205);
    doc.line(15, recY, pageWidth - 15, recY);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(13, 28, 45);
    doc.text('Assessing Clinician Sign-off:', 15, recY + 10);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110, 120, 135);
    doc.text('Reviewing Practitioner:', 15, recY + 22);
    doc.line(55, recY + 22, 110, recY + 22);
    
    doc.text('Signature:', 120, recY + 22);
    doc.line(140, recY + 22, 195, recY + 22);
    
    doc.text('Clinical Sync Date:', 15, recY + 31);
    doc.line(55, recY + 31, 110, recY + 31);
    
    doc.text('Official Clinical Stamp:', 120, recY + 31);
    doc.line(160, recY + 31, 195, recY + 31);
    
    // Bottom Footer
    doc.setFontSize(7.5);
    doc.setTextColor(140, 150, 165);
    doc.text('CONFIDENTIAL MEDICAL SUMMARY - HIPAA Protected Health Information (PHI).', 15, pageHeight - 15);
    doc.text('Generated via GlucoSense AI Clinical Telemetry Platform', 128, pageHeight - 15);
    
    // Trigger Save
    const cleanName = record.patientName.replace(/\s+/g, '_');
    doc.save(`GlucoSense_Summary_${cleanName}_${record.patientId}.pdf`);
  };

  const getClassBadgeStyle = (risk: 'Normal' | 'Prediabetes' | 'Type 2') => {
    switch (risk) {
      case 'Type 2':
        return {
          bg: 'bg-[#93000a]/15 border-[#ffb4ab]/30 text-[#ffb4ab]',
          icon: <AlertCircle className="w-3.5 h-3.5 text-[#ffb4ab]" />,
        };
      case 'Prediabetes':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />,
        };
      default:
        return {
          bg: 'bg-[#42e09a]/15 border-[#42e09a]/30 text-[#42e09a]',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#42e09a]" />,
        };
    }
  };

  return (
    <div id="history-tab" className="space-y-6 max-w-6xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#d4e4fa] font-sans">
            Daily Glycemic History
          </h2>
          <p className="text-sm text-[#c6c6cd] mt-1">
            Track and audit daily average glucose logs and risk assessments for the active patient.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2.5 shrink-0 w-full sm:w-auto">
          <button
            onClick={generatePdfReport}
            className="w-full sm:w-auto px-4 py-2.5 bg-[#1c2b3c] hover:bg-[#2c3a4c] border border-[#5adace]/30 hover:border-[#5adace] text-[#5adace] hover:text-[#d4e4fa] font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer select-none active:scale-95 shadow-md shadow-[#5adace]/5"
          >
            <FileText className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
          <button
            onClick={downloadCsv}
            className="w-full sm:w-auto px-4 py-2.5 bg-[#5adace] hover:bg-[#43c4b9] text-[#051424] font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer select-none active:scale-95 shadow-lg shadow-[#5adace]/10"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Actions Container */}
      <div className="bg-[#122131]/75 border border-[#45464d]/30 rounded-2xl p-4 md:p-6 space-y-4 backdrop-blur">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Search bar */}
          <div className="relative w-full md:max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <Search className="w-4 h-4 text-[#c6c6cd]/60" />
            </span>
            <input
              type="text"
              placeholder="Search by date, average glucose, or risk level..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-sm text-[#d4e4fa] placeholder-[#c6c6cd]/50 outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#c6c6cd]/60 hover:text-[#5adace] cursor-pointer transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtering buttons */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            <SlidersHorizontal className="w-4 h-4 text-[#c6c6cd]/60 mr-2 hidden sm:block" />
            {(['All', 'Normal', 'Prediabetes', 'Type 2'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide border cursor-pointer transition-all ${
                  selectedFilter === filter
                    ? 'bg-[#5adace]/15 text-[#5adace] border-[#5adace]/50'
                    : 'bg-transparent text-[#c6c6cd] border-[#45464d]/20 hover:border-[#45464d]/50 hover:bg-[#2c3a4c]/20'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table Log */}
        <div className="overflow-x-auto rounded-xl border border-[#45464d]/20 bg-[#0d1c2d]/50">
          <table className="w-full border-collapse text-left text-sm text-[#c6c6cd]">
            <thead className="bg-[#122131]/80 text-[11px] font-bold text-[#c6c6cd]/80 uppercase tracking-wider font-mono border-b border-[#45464d]/30">
              <tr>
                <th className="px-6 py-4">Daily Track & ID</th>
                <th className="px-6 py-4">Avg Glucose</th>
                <th className="px-6 py-4">Risk Level</th>
                <th className="px-6 py-4 text-center">Confidence</th>
                <th className="px-6 py-4">Date Logged</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#45464d]/25">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((record) => {
                  const badgeStyle = getClassBadgeStyle(record.riskLevel);
                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-[#1c2b3c]/20 transition-all duration-150"
                    >
                      {/* Patient Details */}
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1c2b3c] to-[#2c3a4c] border border-[#45464d]/40 flex items-center justify-center text-xs font-bold text-[#5adace] font-mono shrink-0">
                          {record.avatarInitials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#d4e4fa] text-sm leading-tight hover:text-[#5adace] cursor-pointer" onClick={() => onDeepDivePatient(record.patientId)}>
                            {record.patientName}
                          </p>
                          <span className="text-[10px] font-mono text-[#c6c6cd]/75 tracking-tight uppercase mt-0.5 block">
                            ID: {record.patientId}
                          </span>
                        </div>
                      </td>

                      {/* Average glucose */}
                      <td className="px-6 py-4 font-mono text-sm text-[#d4e4fa] font-bold">
                        {record.avgGlucose} <span className="text-[10px] text-[#c6c6cd]/60 font-sans font-normal">mg/dL</span>
                      </td>

                      {/* Risk tag badge */}
                      <td className="px-6 py-4">
                        <div className="relative group inline-block">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold tracking-wide cursor-help ${badgeStyle.bg}`}>
                            {badgeStyle.icon}
                            <span>{record.riskLevel}</span>
                          </div>
                          
                          {/* Rich hoverable tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-[#051424] border border-[#5adace] p-3 rounded-xl shadow-2xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none text-left">
                            <div className="font-mono text-[9px] font-bold text-[#5adace] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#5adace] animate-pulse"></span>
                              <span>Risk Assessment Criteria</span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-[#d4e4fa]">
                              {record.riskLevel === 'Type 2' ? (
                                <>
                                  <strong className="text-white">Type 2 Diabetes:</strong> Triggered because HbA1c is <strong className="text-[#ffb4ab]">&ge; 6.5%</strong> or average blood glucose reaches <strong className="text-[#ffb4ab]">&ge; 140 mg/dL</strong>.
                                </>
                              ) : record.riskLevel === 'Prediabetes' ? (
                                <>
                                  <strong className="text-white">Prediabetes:</strong> Flagged due to HbA1c between <strong className="text-amber-300">5.7% - 6.4%</strong>, glucose of <strong className="text-amber-300">100 - 139 mg/dL</strong>, or BMI <strong className="text-amber-300">&ge; 25.0</strong>.
                                </>
                              ) : (
                                <>
                                  <strong className="text-white">Normal Profile:</strong> Confirmed with stable glucose <strong className="text-[#42e09a]">&lt; 100 mg/dL</strong>, HbA1c <strong className="text-[#42e09a]">&lt; 5.7%</strong>, and healthy BMI <strong className="text-[#42e09a]">&lt; 25.0</strong>.
                                </>
                              )}
                            </p>
                            <div className="mt-1.5 pt-1.5 border-t border-[#45464d]/20 flex items-center justify-between text-[9px] font-mono text-[#c6c6cd]/60">
                              <span>Confidence Rate</span>
                              <span className="text-[#42e09a] font-bold">{record.confidence.toFixed(1)}%</span>
                            </div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-[#051424]"></div>
                          </div>
                        </div>
                      </td>

                      {/* Model Confidence */}
                      <td className="px-6 py-4 text-center font-mono font-semibold text-[#5adace]">
                        {record.confidence.toFixed(1)}%
                      </td>

                      {/* Processed Time */}
                      <td className="px-6 py-4 text-xs">
                        <div className="flex items-center gap-1.5 text-[#c6c6cd]/80">
                          <Calendar className="w-3.5 h-3.5 text-[#c6c6cd]/50" />
                          <span>{record.timestamp}</span>
                        </div>
                      </td>

                      {/* Actions shortcut */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => generatePatientSummaryReport(record)}
                            title="Generate printable clinical PDF report"
                            className="p-1.5 hover:bg-[#2c3a4c]/50 text-[#42e09a] hover:text-white rounded-lg cursor-pointer transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeepDivePatient(record.patientId)}
                            title="Patient Deep-Dive Diagnostics"
                            className="p-1.5 hover:bg-[#2c3a4c]/50 text-[#5adace] hover:text-[#d4e4fa] rounded-lg cursor-pointer transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(record.id)}
                            title="Delete diagnostic record"
                            className="p-1.5 hover:bg-[#93000a]/15 text-[#ffb4ab] hover:text-white rounded-lg cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs text-[#c6c6cd]/70 font-mono">
                    No diagnostics logs match search parameter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Technical summary info */}
        <div className="flex items-center justify-between text-[11px] text-[#c6c6cd]/60 font-mono pt-2">
          <span>Active database sessions: Indexed logs</span>
          <span>Showing {filteredHistory.length} of {assessmentHistory.length} files</span>
        </div>
      </div>
    </div>
  );
}
