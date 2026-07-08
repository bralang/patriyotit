'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { createMailingProject } from '@/lib/projects';
import { logActivity } from '@/lib/activity';
import { MAILING_SUBTYPES } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function MailingModal({ open, onClose, onSave }: Props) {
  const { settings, currentWorker } = useApp();
  const [name, setName] = useState('');
  const [subtype, setSubtype] = useState(MAILING_SUBTYPES[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await createMailingProject(name.trim(), settings, subtype);
    if (currentWorker) logActivity('📧 פרויקט דיוור חדש', name.trim(), currentWorker.id);
    setSaving(false);
    setName(''); setSubtype(MAILING_SUBTYPES[0]); setNotes('');
    onSave();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <h2>📧 פרויקט דיוור חדש</h2>
        <div className="form-grid">
          <div className="form-field full">
            <label>שם הדיוור *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="שם הדיוור"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>
          <div className="form-field full">
            <label>סוג דיוור</label>
            <select value={subtype} onChange={e => setSubtype(e.target.value)}>
              {MAILING_SUBTYPES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-field full">
            <label>הערות</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="הערות נוספות..." />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>ביטול</button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {saving ? 'שומר...' : 'שמור'}
          </button>
        </div>
      </div>
    </div>
  );
}
