import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, RefreshCw } from 'lucide-react';
import { patientApi, type PatientData } from '../../services/api/patientApi';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TEMPLATES = [
  { id: 'custom', name: 'Manual Entry' },
  { id: 'cardiac_emergency', name: 'Critical Cardiac Emergency' },
  { id: 'allergy_conflict', name: 'Severe Allergy Conflict' },
  { id: 'icu_candidate', name: 'ICU Candidate' },
  { id: 'respiratory_failure', name: 'Respiratory Failure' },
  { id: 'stroke_risk', name: 'Stroke Risk' },
  { id: 'asthma_attack', name: 'Severe Asthma Attack' },
  { id: 'oncology', name: 'Oncology Patient' },
  { id: 'general_ward', name: 'General Ward Patient' },
  { id: 'routine_observation', name: 'Routine Observation (Low Risk)' },
  { id: 'minor_infection', name: 'Minor Infection (Low Risk)' }
];

const TEMPLATE_DATA: Record<string, Partial<PatientData>> = {
  cardiac_emergency: {
    name: 'James Wilson',
    age: 62,
    gender: 'Male',
    diseases: ['Hypertension', 'Coronary Artery Disease'],
    symptoms: ['Severe chest pain', 'Shortness of breath', 'Diaphoresis'],
    allergies: ['Aspirin'],
    medications: ['Lisinopril', 'Atorvastatin'],
    vitals: { heart_rate: 115, systolic_bp: 180, diastolic_bp: 110, oxygen_saturation: 92, respiratory_rate: 24, temperature: 36.8 }
  },
  allergy_conflict: {
    name: 'Emma Davis',
    age: 34,
    gender: 'Female',
    diseases: ['Migraine'],
    symptoms: ['Facial swelling', 'Hives', 'Difficulty swallowing'],
    allergies: ['Penicillin', 'Peanuts', 'Latex'],
    medications: ['Sumatriptan'],
    vitals: { heart_rate: 125, systolic_bp: 90, diastolic_bp: 60, oxygen_saturation: 94, respiratory_rate: 26, temperature: 37.1 }
  },
  icu_candidate: {
    name: 'Robert Miller',
    age: 75,
    gender: 'Male',
    diseases: ['Type 2 Diabetes', 'Chronic Kidney Disease', 'Heart Failure'],
    symptoms: ['Altered mental status', 'Anuria', 'Peripheral edema'],
    allergies: ['Sulfa drugs'],
    medications: ['Metformin', 'Furosemide', 'Metoprolol'],
    vitals: { heart_rate: 130, systolic_bp: 85, diastolic_bp: 50, oxygen_saturation: 88, respiratory_rate: 30, temperature: 38.5 }
  },
  respiratory_failure: {
    name: 'Maria Garcia',
    age: 68,
    gender: 'Female',
    diseases: ['COPD'],
    symptoms: ['Extreme shortness of breath', 'Cyanosis', 'Confusion'],
    allergies: [],
    medications: ['Albuterol inhaler', 'Fluticasone'],
    vitals: { heart_rate: 110, systolic_bp: 150, diastolic_bp: 90, oxygen_saturation: 82, respiratory_rate: 32, temperature: 37.4 }
  },
  stroke_risk: {
    name: 'William Chen',
    age: 58,
    gender: 'Male',
    diseases: ['Atrial Fibrillation', 'Hypertension'],
    symptoms: ['Sudden weakness on right side', 'Slurred speech', 'Facial droop'],
    allergies: ['Iodine contrast'],
    medications: ['Warfarin', 'Amlodipine'],
    vitals: { heart_rate: 95, systolic_bp: 195, diastolic_bp: 115, oxygen_saturation: 96, respiratory_rate: 18, temperature: 36.9 }
  },
  asthma_attack: {
    name: 'Sarah Johnson',
    age: 22,
    gender: 'Female',
    diseases: ['Asthma', 'Allergic Rhinitis'],
    symptoms: ['Severe wheezing', 'Chest tightness', 'Inability to speak in full sentences'],
    allergies: ['Pollen', 'Dust mites'],
    medications: ['Symbicort', 'Montelukast'],
    vitals: { heart_rate: 120, systolic_bp: 135, diastolic_bp: 85, oxygen_saturation: 89, respiratory_rate: 28, temperature: 37.0 }
  },
  oncology: {
    name: 'Michael Brown',
    age: 55,
    gender: 'Male',
    diseases: ['Lung Cancer', 'Neutropenia'],
    symptoms: ['High fever', 'Chills', 'Fatigue', 'Productive cough'],
    allergies: ['Morphine'],
    medications: ['Chemotherapy', 'Ondansetron'],
    vitals: { heart_rate: 118, systolic_bp: 100, diastolic_bp: 65, oxygen_saturation: 93, respiratory_rate: 22, temperature: 39.4 }
  },
  general_ward: {
    name: 'Jessica Taylor',
    age: 41,
    gender: 'Female',
    diseases: ['Appendicitis (Suspected)'],
    symptoms: ['RLQ Abdominal pain', 'Nausea', 'Loss of appetite'],
    allergies: [],
    medications: ['Ibuprofen'],
    vitals: { heart_rate: 90, systolic_bp: 125, diastolic_bp: 80, oxygen_saturation: 98, respiratory_rate: 16, temperature: 37.8 }
  },
  routine_observation: {
    name: 'David Smith',
    age: 28,
    gender: 'Male',
    diseases: ['Mild Dehydration'],
    symptoms: ['Fatigue', 'Dizziness'],
    allergies: [],
    medications: [],
    vitals: { heart_rate: 85, systolic_bp: 115, diastolic_bp: 75, oxygen_saturation: 99, respiratory_rate: 16, temperature: 37.0 }
  },
  minor_infection: {
    name: 'Anna Lee',
    age: 45,
    gender: 'Female',
    diseases: ['Localized Cellulitis'],
    symptoms: ['Redness on arm', 'Localized swelling'],
    allergies: [],
    medications: ['Cephalexin'],
    vitals: { heart_rate: 78, systolic_bp: 120, diastolic_bp: 80, oxygen_saturation: 98, respiratory_rate: 14, temperature: 37.5 }
  }
};

const DEFAULT_FORM = {
  name: '',
  age: 30,
  gender: 'Unknown',
  diseases: '',
  symptoms: '',
  allergies: '',
  medications: '',
  heart_rate: 80,
  systolic_bp: 120,
  diastolic_bp: 80,
  oxygen_saturation: 98,
  respiratory_rate: 16,
  temperature: 37.0
};

export default function AddPatientModal({ isOpen, onClose, onSuccess }: AddPatientModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('custom');
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedTemplate('custom');
      setFormData(DEFAULT_FORM);
      setError(null);
    }
  }, [isOpen]);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tmplId = e.target.value;
    setSelectedTemplate(tmplId);
    if (tmplId === 'custom') {
      setFormData(DEFAULT_FORM);
    } else {
      const data = TEMPLATE_DATA[tmplId];
      if (data) {
        setFormData({
          name: data.name || '',
          age: data.age || 30,
          gender: data.gender || 'Unknown',
          diseases: data.diseases?.join(', ') || '',
          symptoms: data.symptoms?.join(', ') || '',
          allergies: data.allergies?.join(', ') || '',
          medications: data.medications?.join(', ') || '',
          heart_rate: data.vitals?.heart_rate || 80,
          systolic_bp: data.vitals?.systolic_bp || 120,
          diastolic_bp: data.vitals?.diastolic_bp || 80,
          oxygen_saturation: data.vitals?.oxygen_saturation || 98,
          respiratory_rate: data.vitals?.respiratory_rate || 16,
          temperature: data.vitals?.temperature || 37.0
        });
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['age', 'heart_rate', 'systolic_bp', 'diastolic_bp', 'oxygen_saturation', 'respiratory_rate', 'temperature'].includes(name) 
              ? Number(value) 
              : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setError('Patient name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const stringToArray = (str: string) => str.split(',').map(s => s.trim()).filter(s => s.length > 0);

    const payload: PatientData = {
      name: formData.name,
      age: formData.age,
      gender: formData.gender,
      status: 'registered',
      diseases: stringToArray(formData.diseases),
      symptoms: stringToArray(formData.symptoms),
      allergies: stringToArray(formData.allergies),
      medications: stringToArray(formData.medications),
      vitals: {
        heart_rate: formData.heart_rate,
        systolic_bp: formData.systolic_bp,
        diastolic_bp: formData.diastolic_bp,
        oxygen_saturation: formData.oxygen_saturation,
        respiratory_rate: formData.respiratory_rate,
        temperature: formData.temperature
      }
    };

    try {
      await patientApi.createPatient(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to create patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
      <div className="glass-card" style={{ width: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
          <X size={24} />
        </button>
        
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
           Create New Patient
        </h2>

        {error && (
          <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#fca5a5', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', color: '#cbd5e1', fontSize: '13px', marginBottom: '8px', fontWeight: 600 }}>Use Clinical Template</label>
          <select 
            value={selectedTemplate} 
            onChange={handleTemplateChange}
            style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f8fafc', fontSize: '14px', outline: 'none' }}
          >
            {TEMPLATES.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            {/* Basic Info */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ fontSize: '16px', color: '#e2e8f0', marginBottom: '16px' }}>Demographics</h3>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Full Name *</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} required style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Age</label>
                  <input type="number" name="age" value={formData.age} onChange={handleInputChange} min="0" max="150" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleInputChange} style={inputStyle}>
                    <option value="Unknown">Unknown</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Vitals */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ fontSize: '16px', color: '#e2e8f0', marginBottom: '16px' }}>Current Vitals</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Heart Rate (bpm)</label>
                  <input type="number" name="heart_rate" value={formData.heart_rate} onChange={handleInputChange} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>SpO2 (%)</label>
                  <input type="number" name="oxygen_saturation" value={formData.oxygen_saturation} onChange={handleInputChange} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Systolic BP</label>
                  <input type="number" name="systolic_bp" value={formData.systolic_bp} onChange={handleInputChange} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Diastolic BP</label>
                  <input type="number" name="diastolic_bp" value={formData.diastolic_bp} onChange={handleInputChange} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Resp Rate</label>
                  <input type="number" name="respiratory_rate" value={formData.respiratory_rate} onChange={handleInputChange} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Temp (°C)</label>
                  <input type="number" name="temperature" value={formData.temperature} onChange={handleInputChange} step="0.1" style={inputStyle} />
                </div>
              </div>
            </div>
          </div>

          {/* Clinical Info */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '16px', color: '#e2e8f0', marginBottom: '16px' }}>Clinical Information <span style={{fontSize:'12px', color:'#64748b', fontWeight:'normal'}}>(comma separated)</span></h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Medical Conditions</label>
                <input type="text" name="diseases" value={formData.diseases} onChange={handleInputChange} placeholder="e.g. Hypertension, COPD" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Presenting Symptoms</label>
                <input type="text" name="symptoms" value={formData.symptoms} onChange={handleInputChange} placeholder="e.g. Chest pain, Fever" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Known Allergies</label>
                <input type="text" name="allergies" value={formData.allergies} onChange={handleInputChange} placeholder="e.g. Penicillin, Peanuts" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Current Medications</label>
                <input type="text" name="medications" value={formData.medications} onChange={handleInputChange} placeholder="e.g. Lisinopril, Aspirin" style={inputStyle} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 24px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#cbd5e1', cursor: 'pointer', fontWeight: 600 }}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #14b8a6, #06b6d4)', border: 'none', borderRadius: '8px', color: 'white', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', opacity: isSubmitting ? 0.7 : 1 }}>
              {isSubmitting ? <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={18} />}
              {isSubmitting ? 'Creating...' : 'Create Patient'}
            </button>
          </div>
        </form>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const inputStyle = {
  width: '100%', 
  padding: '10px', 
  background: 'rgba(0,0,0,0.2)', 
  border: '1px solid rgba(255,255,255,0.08)', 
  borderRadius: '6px', 
  color: '#f8fafc', 
  fontSize: '13px', 
  outline: 'none' 
};
