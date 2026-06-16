'use client';
import { useEffect, useState } from 'react';
import type { Client } from '@/lib/types';
import { saveClient } from '@/lib/clients';

interface Props {
  client: Client | null;
  open: boolean;
  onClose: () => void;
  onSave: (saved: Client) => void;
}

export default function ClientModal({ client, open, onClose, onSave }: Props) {
  const [schoolName, setSchoolName] = useState('');
  const [city, setCity] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [institutionType, setInstitutionType] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    if (client) {
      setSchoolName(client.school_name);
      setCity(client.city ?? '');
      setContactName(client.contact_name ?? '');
      setPhone(client.phone ?? '');
      setEmail(client.email ?? '');
      setInstitutionType(client.institution_type ?? '');
      setNotes(client.notes ?? '');
    } else {
      setSchoolName(''); setCity(''); setContactName('');
      setPhone(''); setEmail(''); setInstitutionType(''); setNotes('');
    }
  }, [open, client]);

  async function handleSave() {
    if (!schoolName.trim()) return;
    const saved = await saveClient({
      id: client?.id,
      school_name: schoolName.trim(),
      city: city || null,
      contact_name: contactName || null,
      phone: phone || null,
      email: email || null,
      institution_type: institutionType || null,
      notes: notes || null,
    });
    onSave(saved);
  }

  if (!open) return null;

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()} style={{ zIndex: 200 }}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <h2>{client ? 'עריכת לקוח' : 'לקוח חדש'}</h2>
        <div className="form-grid">
          <div className="form-field full">
            <label>שם בית הספר / מוסד *</label>
            <input value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="שם המוסד" autoFocus />
          </div>
          <div className="form-field">
            <label>עיר</label>
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="עיר" />
          </div>
          <div className="form-field">
            <label>סוג מוסד</label>
            <input value={institutionType} onChange={e => setInstitutionType(e.target.value)} placeholder="בית ספר / גן / ישיבה..." />
          </div>
          <div className="form-field">
            <label>שם איש קשר</label>
            <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="שם" />
          </div>
          <div className="form-field">
            <label>טלפון</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="05X-XXXXXXX" dir="ltr" />
          </div>
          <div className="form-field full">
            <label>מייל</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" dir="ltr" />
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
