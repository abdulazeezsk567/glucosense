import React, { useState, useEffect } from 'react';
import { 
  Pill, 
  Clock, 
  Trash2, 
  Plus, 
  Calendar, 
  User, 
  Check, 
  CheckSquare, 
  Bell, 
  AlertTriangle,
  Info,
  Activity,
  Clipboard
} from 'lucide-react';
import { MedicationReminder } from '../types';

interface MedicationSchedulerProps {
  selectedPatientId?: string;
  onReminderAdded?: () => void;
}

const PRESET_PATIENTS = [
  { id: 'GS-8821', name: 'Sarah Jenkins' },
  { id: 'GS-5012', name: 'Marcus Reyes' },
  { id: 'GS-4299', name: 'Emma Lin' },
  { id: 'GS-9912', name: 'David Jones' },
  { id: 'GS-2384', name: 'Anna Kowalski' },
  { id: 'GS-1182', name: 'Thomas Wright' },
];

const PRESET_MEDICATIONS = [
  { name: 'Metformin', typicalDosage: '500 mg', defaultInstructions: 'Take with food to minimize GI discomfort' },
  { name: 'Lantus (Insulin Glargine)', typicalDosage: '10 units', defaultInstructions: 'Inject subcutaneously once daily at the same time' },
  { name: 'Humalog (Insulin Lispro)', typicalDosage: '6 units', defaultInstructions: 'Inject subcutaneously 15 minutes before meal' },
  { name: 'Jardiance (Empagliflozin)', typicalDosage: '10 mg', defaultInstructions: 'Take in the morning with or without food' },
  { name: 'Ozempic (Semaglutide)', typicalDosage: '0.25 mg', defaultInstructions: 'Inject subcutaneously once weekly' },
  { name: 'Januvia (Sitagliptin)', typicalDosage: '100 mg', defaultInstructions: 'Take once daily in the morning' },
];

export default function MedicationScheduler({ selectedPatientId, onReminderAdded }: MedicationSchedulerProps) {
  const [reminders, setReminders] = useState<MedicationReminder[]>([]);
  
  // Form state
  const [patientId, setPatientId] = useState(selectedPatientId || 'GS-8821');
  const [medicationName, setMedicationName] = useState('Metformin');
  const [customMedName, setCustomMedName] = useState('');
  const [isCustomMed, setIsCustomMed] = useState(false);
  const [dosage, setDosage] = useState('500 mg');
  const [frequency, setFrequency] = useState('Once daily');
  const [timeOfDay, setTimeOfDay] = useState('08:00 AM');
  const [instructions, setInstructions] = useState('Take with food to minimize GI discomfort');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [lastAddedMed, setLastAddedMed] = useState('');

  // Load reminders
  useEffect(() => {
    const stored = localStorage.getItem('medication_reminders');
    if (stored) {
      try {
        setReminders(JSON.parse(stored));
      } catch (err) {
        console.error('Failed to parse medication reminders', err);
      }
    }
  }, []);

  // Update selected patient if prop changes
  useEffect(() => {
    if (selectedPatientId) {
      setPatientId(selectedPatientId);
    }
  }, [selectedPatientId]);

  // Handle preset medication select
  const handleMedPresetChange = (name: string) => {
    if (name === 'custom') {
      setIsCustomMed(true);
      setMedicationName('');
      setDosage('');
      setInstructions('');
    } else {
      setIsCustomMed(false);
      setMedicationName(name);
      const preset = PRESET_MEDICATIONS.find(m => m.name === name);
      if (preset) {
        setDosage(preset.typicalDosage);
        setInstructions(preset.defaultInstructions);
      }
    }
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    const finalMedName = isCustomMed ? customMedName.trim() : medicationName;
    if (!finalMedName) return;

    const patientObj = PRESET_PATIENTS.find(p => p.id === patientId) || { name: 'Unknown Patient', id: patientId };

    const newReminder: MedicationReminder = {
      id: `MED-${Date.now()}`,
      patientId: patientObj.id,
      patientName: patientObj.name,
      medicationName: finalMedName,
      dosage: dosage.trim() || 'as prescribed',
      frequency,
      timeOfDay,
      instructions: instructions.trim() || 'Take as directed',
      createdAt: new Date().toISOString(),
      isActive: true
    };

    const updatedReminders = [newReminder, ...reminders];
    setReminders(updatedReminders);
    localStorage.setItem('medication_reminders', JSON.stringify(updatedReminders));

    // Reset form fields slightly
    if (isCustomMed) {
      setCustomMedName('');
    }
    setLastAddedMed(finalMedName);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 4000);

    if (onReminderAdded) {
      onReminderAdded();
    }
  };

  const handleDeleteReminder = (id: string) => {
    const updated = reminders.filter(r => r.id !== id);
    setReminders(updated);
    localStorage.setItem('medication_reminders', JSON.stringify(updated));
  };

  const toggleReminderStatus = (id: string) => {
    const updated = reminders.map(r => {
      if (r.id === id) {
        return { ...r, isActive: !r.isActive };
      }
      return r;
    });
    setReminders(updated);
    localStorage.setItem('medication_reminders', JSON.stringify(updated));
  };

  // Filter reminders for currently selected patient to show in details
  const filteredReminders = reminders.filter(r => r.patientId === patientId);

  return (
    <div id="medication-scheduler-card" className="bg-[#122131]/75 border border-[#45464d]/30 rounded-2xl p-6 backdrop-blur space-y-6 shadow-xl">
      <div className="flex items-center justify-between border-b border-[#45464d]/20 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#5adace]/10 flex items-center justify-center text-[#5adace]">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[#d4e4fa] uppercase tracking-wider font-mono">
              Clinical Medication Scheduler
            </h3>
            <p className="text-[11px] text-[#c6c6cd]">
              Set and push real-time daily dosage reminders to patient wearable feeds.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono bg-[#0d1c2d] px-2.5 py-1 rounded-full text-[#42e09a] border border-[#42e09a]/20 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#42e09a] animate-pulse" />
          Active Feed Link
        </span>
      </div>

      {showSuccessToast && (
        <div className="bg-[#42e09a]/10 border border-[#42e09a]/30 p-3.5 rounded-xl flex items-center gap-2.5 text-[#42e09a] text-xs font-mono animate-in fade-in slide-in-from-top-2 duration-300">
          <Check className="w-4 h-4 shrink-0" />
          <span>Reminded! Daily dosage of <strong className="text-white">{lastAddedMed}</strong> scheduled and synced to patient's notification feed.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scheduler Form (5 cols) */}
        <form onSubmit={handleAddReminder} className="lg:col-span-5 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-[#c6c6cd] uppercase font-semibold block">Select Target Patient</label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none cursor-pointer"
            >
              {PRESET_PATIENTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-[#c6c6cd] uppercase font-semibold block">Medication Prescription</label>
            <select
              value={isCustomMed ? 'custom' : medicationName}
              onChange={(e) => handleMedPresetChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none cursor-pointer"
            >
              {PRESET_MEDICATIONS.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
              <option value="custom">✏️ Enter Custom Medication...</option>
            </select>
          </div>

          {isCustomMed && (
            <div className="space-y-1 animate-in fade-in duration-200">
              <label className="text-[10px] text-[#c6c6cd] uppercase font-semibold block">Custom Medication Name</label>
              <input
                type="text"
                required
                value={customMedName}
                onChange={(e) => setCustomMedName(e.target.value)}
                placeholder="e.g. Metformin Extended Release"
                className="w-full px-3 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-[#c6c6cd] uppercase font-semibold block">Target Dosage</label>
              <input
                type="text"
                required
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="e.g. 500 mg, 10 units"
                className="w-full px-3 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-[#c6c6cd] uppercase font-semibold block">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none cursor-pointer"
              >
                <option value="Once daily">Once daily</option>
                <option value="Twice daily">Twice daily</option>
                <option value="Three times daily">Three times daily</option>
                <option value="Before every meal">Before every meal</option>
                <option value="At bedtime">At bedtime</option>
                <option value="Every 12 hours">Every 12 hours</option>
                <option value="Once weekly">Once weekly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-[#c6c6cd] uppercase font-semibold block">Time of Day</label>
              <input
                type="text"
                required
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                placeholder="e.g. 08:00 AM"
                className="w-full px-3 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-[#c6c6cd] uppercase font-semibold block">Instructions</label>
              <input
                type="text"
                required
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Take with food"
                className="w-full px-3 py-2.5 bg-[#0d1c2d] border border-[#45464d]/30 focus:border-[#5adace] rounded-xl text-xs text-[#d4e4fa] outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3 bg-[#5adace] hover:bg-[#43c4b9] text-[#051424] font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-md shadow-[#5adace]/10"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Daily Dosage Reminder</span>
          </button>
        </form>

        {/* Reminders List (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#c6c6cd]/70 uppercase tracking-wider block">
                Active Dosage reminders for {(PRESET_PATIENTS.find(p => p.id === patientId)?.name) || 'Selected Patient'}
              </span>
              <span className="text-[10px] font-mono text-[#5adace] bg-[#5adace]/10 px-2 py-0.5 rounded border border-[#5adace]/20">
                {filteredReminders.length} scheduled
              </span>
            </div>

            {filteredReminders.length === 0 ? (
              <div className="bg-[#0d1c2d]/50 border border-[#45464d]/20 rounded-xl p-8 text-center flex flex-col items-center justify-center space-y-3">
                <Bell className="w-8 h-8 text-[#c6c6cd]/30 animate-pulse" />
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-[#d4e4fa]">No medication reminders scheduled</h4>
                  <p className="text-[10px] text-[#c6c6cd]/60 max-w-xs leading-relaxed">
                    Use the compiler form to create structured daily medication dosage reminders for this patient.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1 scrollbar-thin">
                {filteredReminders.map((reminder) => (
                  <div 
                    key={reminder.id} 
                    className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                      reminder.isActive 
                        ? 'bg-[#0d1c2d] border-[#45464d]/30' 
                        : 'bg-[#0d1c2d]/40 border-[#45464d]/10 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`p-2 rounded-lg mt-0.5 ${reminder.isActive ? 'bg-[#5adace]/10 text-[#5adace]' : 'bg-gray-800 text-gray-500'}`}>
                        <Pill className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-[#d4e4fa]">{reminder.medicationName}</h4>
                          <span className="text-[9px] font-mono bg-[#1c2b3c] px-1.5 py-0.5 rounded text-[#5adace]">
                            {reminder.dosage}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-[#c6c6cd]">
                          <span className="flex items-center gap-1 font-mono text-[#42e09a]">
                            <Clock className="w-3 h-3 text-[#42e09a]/70" /> {reminder.timeOfDay}
                          </span>
                          <span className="text-[#c6c6cd]/60">|</span>
                          <span>{reminder.frequency}</span>
                          <span className="text-[#c6c6cd]/60">|</span>
                          <span className="italic truncate max-w-[200px]" title={reminder.instructions}>
                            {reminder.instructions}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => toggleReminderStatus(reminder.id)}
                        className={`text-[9px] font-mono px-2 py-1 rounded transition-colors cursor-pointer border ${
                          reminder.isActive
                            ? 'bg-[#42e09a]/10 border-[#42e09a]/30 text-[#42e09a] hover:bg-[#42e09a]/20'
                            : 'bg-[#ffb4ab]/15 border-[#ffb4ab]/30 text-[#ffb4ab] hover:bg-[#ffb4ab]/25'
                        }`}
                      >
                        {reminder.isActive ? 'ACTIVE' : 'MUTED'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteReminder(reminder.id)}
                        className="p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-[#c6c6cd]/40 hover:border hover:border-red-500/20 transition-all cursor-pointer"
                        title="Delete reminder"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#0d1c2d]/40 p-3 rounded-xl border border-[#45464d]/15 text-[10px] text-[#c6c6cd] flex items-start gap-2 mt-4">
            <Info className="w-3.5 h-3.5 text-[#5adace] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Synchronized Care Feed:</strong> Scheduled reminders will automatically trigger high-priority alerts in the selected patient's personal portal feed and push notifications.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
