/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AssessmentRecord, Clinician, ClinicalEvent, Patient } from './types';

export const INITIAL_CLINICIAN: Clinician = {
  fullName: 'Dr. Sarah Jenkins',
  medicalId: 'MED-8924-XXL',
  specialization: 'Endocrinologist',
  primaryFacility: 'Mercy General Hospital - North Wing',
  avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDl5T3Q35e_5_uY_Se47_AB9a1u1QTxoRb4vSL0ypz837J0dPoz3HvJDFTRLSi5TyE9ExjAWN9ImxQNsQITfK9Xo3QPfaC2XmL6R1fYG6rFSYwcHPDcAk7_mpnDcHB5-KFYkDNCj5Pm7c_07Q-g-AaYozf_9eMVuKZjo2IKasg0-cONKBIZm3svNkfsyT9siTf6Eg9tT4BCCmZ1CnkuT8NNbEeilHJjqqJXJE6qTGDXUV4liddKuAyGDyaJZ0_t_L65btCsYRksVEY',
};

export const CLINICAL_PATIENT: Patient = {
  id: 'GS-8821',
  name: 'Sarah Jenkins',
  age: 42,
  type: 'Type 2',
  avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDz-QKHmgjB-ETlXBg0RJ4qZxhtVseGDORvro4aZAZXXAuI8ua6v0WnoaB5LzDymMIknOAdBf2vagGnJ6MQPMZ_DuMgfmbcjcyi4V0yVfo_kPk_AwcYFmXVgseboKPeJYUFUbG_AP_K58HWIPhsTEo72tE7HsrtfoDuC_gJYdNmdLG7RzRs7e9JAkG422C9ToV8ZSVXHvf-VnyQEti2ErsqyB9VQpPkU1C1Z4TxSb-mMwZqGxl2FNpbkpntuUXd_JzWXSun_ny5r1c',
};

export const INITIAL_ASSESSMENT_HISTORY: AssessmentRecord[] = [
  {
    id: 'REC-001',
    timestamp: 'Oct 24, 09:15 AM',
    patientId: 'GS-8821',
    patientName: 'Sarah Jenkins',
    avatarInitials: 'SJ',
    avgGlucose: 94,
    riskLevel: 'Normal',
    confidence: 98.2,
  },
  {
    id: 'REC-002',
    timestamp: 'Oct 24, 08:30 AM',
    patientId: 'GS-5012',
    patientName: 'Marcus Reyes',
    avatarInitials: 'MR',
    avgGlucose: 162,
    riskLevel: 'Type 2',
    confidence: 94.7,
  },
  {
    id: 'REC-003',
    timestamp: 'Oct 23, 16:45 PM',
    patientId: 'GS-4299',
    patientName: 'Emma Lin',
    avatarInitials: 'EL',
    avgGlucose: 115,
    riskLevel: 'Prediabetes',
    confidence: 89.4,
  },
  {
    id: 'REC-004',
    timestamp: 'Oct 23, 11:20 AM',
    patientId: 'GS-9912',
    patientName: 'David Jones',
    avatarInitials: 'DJ',
    avgGlucose: 88,
    riskLevel: 'Normal',
    confidence: 99.1,
  },
  {
    id: 'REC-005',
    timestamp: 'Oct 22, 14:10 PM',
    patientId: 'GS-2384',
    patientName: 'Anna Kowalski',
    avatarInitials: 'AK',
    avgGlucose: 92,
    riskLevel: 'Normal',
    confidence: 96.5,
  },
  {
    id: 'REC-006',
    timestamp: 'Oct 22, 09:05 AM',
    patientId: 'GS-1182',
    patientName: 'Thomas Wright',
    avatarInitials: 'TW',
    avgGlucose: 121,
    riskLevel: 'Prediabetes',
    confidence: 82.3,
  },
];

export const RECENT_CLINICAL_EVENTS: ClinicalEvent[] = [
  {
    time: '14:30',
    title: 'Post-prandial spike detected',
    description: 'Glucose rose to 165 mg/dL following recorded lunch. Remained elevated for 45 mins before stabilizing.',
    tags: ['Meal', 'Alert'],
    type: 'alert',
  },
  {
    time: '10:15',
    title: 'Patient reported exercise',
    description: '45 minutes of moderate aerobic activity. Baseline glucose levels remained stable.',
    tags: ['Activity'],
    type: 'activity',
  },
];

export const NETWORK_LAYERS = [
  {
    name: 'Conv1D',
    details: 'filters: 64, kernel_size: 3',
    highlight: false,
  },
  {
    name: 'MaxPooling1D',
    details: 'pool_size: 2',
    highlight: false,
  },
  {
    name: 'LSTM',
    details: 'units: 128, return_sequences: True',
    highlight: true,
  },
  {
    name: 'LSTM',
    details: 'units: 64',
    highlight: true,
  },
  {
    name: 'Dense',
    details: 'units: 32, activation: relu',
    highlight: false,
  },
  {
    name: 'Dropout',
    details: 'rate: 0.2',
    highlight: false,
  },
  {
    name: 'Dense (Output)',
    details: 'units: 1, activation: linear',
    highlight: true,
    isOutput: true,
  },
];

export const PROTOCOL_RECOMMENDATIONS = [
  {
    id: 'rec-1',
    title: 'Adjust Basal Rate (Nighttime)',
    priority: 'High Priority',
    priorityType: 'error',
    confidence: 94,
    description: 'Patient has exhibited consistent nocturnal hypoglycemia between 0200 and 0400 over the past 3 days. Recommend a 15% reduction in basal insulin delivery during this window to mitigate risk.',
    currentProtocol: '1.2 U/hr (0000 - 0600)',
    proposedProtocol: '1.0 U/hr (0000 - 0600)',
    actionLabel: 'Review & Approve',
    dismissLabel: 'Dismiss',
    icon: 'warning',
  },
  {
    id: 'rec-2',
    title: 'Review Carb Ratio (Breakfast)',
    priority: 'Moderate Priority',
    priorityType: 'warning',
    confidence: 82,
    description: 'Post-prandial spikes observed following breakfast over the last week. Consider strengthening the insulin-to-carb ratio to better cover morning meals.',
    actionLabel: 'View Data',
    icon: 'restaurant',
  },
  {
    id: 'rec-3',
    title: 'Exercise Profile Optimization',
    priority: 'Low Priority',
    priorityType: 'info',
    confidence: 68,
    description: "Suggest enabling 'Exercise Mode' 30 minutes prior to anticipated afternoon physical activity to preemptively reduce basal delivery and prevent exercise-induced lows.",
    icon: 'directions_run',
  },
];
