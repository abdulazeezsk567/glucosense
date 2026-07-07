/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TabId =
  | 'dashboard'
  | 'prediction'
  | 'history'
  | 'recommendations'
  | 'diagnostics'
  | 'settings'
  | 'active-patient'
  | 'care-guidance';

export interface Clinician {
  fullName: string;
  medicalId: string;
  specialization: string;
  primaryFacility: string;
  avatarUrl: string;
  email?: string;
  authProvider?: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  type: string;
  avatarUrl: string;
  email?: string;
  authProvider?: string;
}

export interface AssessmentRecord {
  id: string;
  timestamp: string;
  patientId: string;
  patientName: string;
  avatarInitials: string;
  avgGlucose: number;
  riskLevel: 'Normal' | 'Prediabetes' | 'Type 2';
  confidence: number;
}

export interface PredictionInput {
  glucose: number;
  age: number;
  bmi: number;
  hba1c: number;
}

export interface PredictionOutput {
  classification: 'Normal' | 'Prediabetes' | 'Type 2';
  confidence: number;
  probabilities: {
    normal: number;
    prediabetes: number;
    type2: number;
  };
  recommendations: string[];
}

export interface ClinicalEvent {
  time: string;
  title: string;
  description: string;
  tags: string[];
  type: 'alert' | 'activity' | 'meal';
}

export interface GlucoseGoal {
  patientId: string;
  patientName: string;
  low: number;
  high: number;
}

export interface MedicationReminder {
  id: string;
  patientId: string;
  patientName: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  timeOfDay: string;
  instructions: string;
  createdAt: string;
  isActive: boolean;
}


