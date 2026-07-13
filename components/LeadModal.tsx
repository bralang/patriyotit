'use client';
import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { saveLead } from '@/lib/leads';
import type { Lead, LeadSource } from '@/lib/lead-types';
import { LEAD_SOURCE_LABELS } from '@/lib/lead-types';

interface Props {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onSave: (lead: Lead) => void;
}

export default function LeadModal({ lead, open, onClose, onSave }: Props) {
  const { currentWorker } = useApp();

  const [name, setName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState<LeadSource>('organic');
  const [referrerName, setReferrerName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    if (lead) {
      setName(lead.name);
      setSchoolName(lead.school_name ?? '');
      setCity(lead.city ?? '');
      setPhone(lead.phone ?? '');
      setEmail(lead.email ?? '');
      setSource(lead.source);
      setReferrerName(lead.referrer_name ?? '');
      setNotes(lead.notes ?? '');
    } else {
      setName(''); setSchoolName(''); setCity(''); setPhone('');
      setEmail(''); setSource('organic'); setReferrerName(''); setNotes('');
    }
  }, [open, lead]);

  async function handleSave() {
    if (!name.trim()) return;
    const saved = await saveLead({
      id: lead?.id,
      name: name.trim(),
      school_name: schoolName || null,
      city: city || null,
      phone: phone || null,
      email: email || null,
      source,
      referrer_name: source === 'referral' ? referrerName || null : null,
      notes: notes || null,
      status: lead?.status ?? 'open',
    });
    onSave(saved);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <h2>{lead ? 'עריכת ליד' : 'ליד חדש'}</h2>
        <div className="form-grid">
          <div className="form-field full">
            <label>שם איש קשר *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="שם" autoFocus />
          </div>
          <div className="form-field">
            <label>שם בית הספר / מוסד</label>
            <input value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="שם המוסד" />
          </div>
          <div className="form-field">
            <label>עיר</label>
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="עיר" />
          </div>
          <div className="form-field">
            <label>טלפון</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="050-0000000" />
          </div>
          <div className="form-field">
            <label>מייל</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@email.com" />
          </div>
          <div className="form-field full">
            <label>מקור הפניה</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(Object.entries(LEAD_SOURCE_LABELS) as [LeadSource, string][]).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSource(key)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                    border: '1.5px solid',
                    background: source === key ? '#4A7DFF' : 'transparent',
                    borderColor: source === key ? '#4A7DFF' : '#d1d5db',
                    color: source === key ? '#fff' : 'var(--text-secondary)',
                    fontWeight: source === key ? 500 : 400,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {source === 'referral' && (
              <input
                style={{ marginTop: 8 }}
                value={referrerName}
                onChange={e => setReferrerName(e.target.value)}
                placeholder="שם הממליץ"
              />
            )}
          </div>
          <div className="form-field full">
            <label>הערות</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="הערות..." />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>ביטול</button>
          <button className="btn-save" onClick={handleSave}>שמור</button>
        </div>
      </div>
    </div>
  );
}
