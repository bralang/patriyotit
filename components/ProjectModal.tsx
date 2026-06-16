'use client';
import { useEffect, useState } from 'react';
import type { Client } from '@/lib/types';
import { useApp } from '@/context/AppContext';
import { saveProject } from '@/lib/projects';
import { logActivity } from '@/lib/activity';
import { getClients } from '@/lib/clients';
import ClientModal from './ClientModal';
import HebrewDate from './HebrewDate';

interface Props {
  projectId: number | null;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function ProjectModal({ projectId, open, onClose, onSave }: Props) {
  const { projects, settings, currentWorker } = useApp();
  const existing = projectId ? projects.find(p => p.id === projectId) : null;

  const [name, setName] = useState('');
  const [clientId, setClientId] = useState<number | ''>('');
  const [contact2, setContact2] = useState('');
  const [typeId, setTypeId] = useState<number | ''>('');
  const [statusId, setStatusId] = useState<number | ''>('');
  const [packageId, setPackageId] = useState<number | ''>('');
  const [driveUrl, setDriveUrl] = useState('');
  const [instructionsUrl, setInstructionsUrl] = useState('');
  const [templateUrl, setTemplateUrl] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<number[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientModalOpen, setClientModalOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    getClients().then(setClients);
    if (existing) {
      setName(existing.name);
      setClientId(existing.client_id ?? '');
      setContact2(existing.contact2 ?? '');
      setTypeId(existing.type_id ?? '');
      setStatusId(existing.status_id ?? '');
      setPackageId(existing.package_id ?? '');
      setDriveUrl(existing.drive_url ?? '');
      setInstructionsUrl(existing.instructions_url ?? '');
      setTemplateUrl(existing.template_url ?? '');
      setEventDate(existing.event_date ?? '');
      setNotes(existing.notes ?? '');
      setSelectedWorkerIds(existing.workers?.map(w => w.id) ?? []);
    } else {
      setName(''); setClientId(''); setContact2(''); setTypeId('');
      setStatusId(''); setPackageId(''); setDriveUrl('');
      setInstructionsUrl(''); setTemplateUrl(''); setEventDate('');
      setNotes(''); setSelectedWorkerIds([]);
    }
  }, [open, existing]);

  async function handleSave() {
    if (!name.trim()) return;
    const wasLocked = existing?.status?.name.includes('ננעל');
    const newStatus = settings.statuses.find(s => s.id === Number(statusId));
    const nowLocked = newStatus?.name.includes('ננעל');

    await saveProject(
      {
        id: existing?.id,
        name: name.trim(),
        client_id: clientId || null,
        contact2: contact2 || null,
        type_id: typeId || null,
        status_id: statusId || null,
        package_id: packageId || null,
        drive_url: driveUrl || null,
        instructions_url: instructionsUrl || null,
        template_url: templateUrl || null,
        event_date: eventDate || null,
        notes: notes || null,
        locked_at: nowLocked && !wasLocked ? new Date().toISOString() : (existing?.locked_at ?? null),
        stages: existing?.stages,
      },
      selectedWorkerIds
    );
    if (currentWorker) {
      logActivity(existing ? '✏️ עדכון פרויקט' : '➕ פרויקט חדש', name.trim(), currentWorker.id);
    }
    onSave();
    onClose();
  }

  function toggleWorker(id: number) {
    setSelectedWorkerIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  if (!open) return null;

  return (
    <div className={`modal-overlay${open ? ' open' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>{existing ? 'עריכת פרויקט' : 'פרויקט חדש'}</h2>
        <div className="form-grid">
          <div className="form-field full">
            <label>שם הפרויקט *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="שם הפרויקט" autoFocus />
          </div>
          <div className="form-field full">
            <label>לקוח</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={clientId} onChange={e => setClientId(e.target.value ? Number(e.target.value) : '')} style={{ flex: 1 }}>
                <option value="">בחרי לקוח...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.school_name}{c.city ? ` — ${c.city}` : ''}</option>
                ))}
              </select>
              <button
                type="button"
                className="btn-add-item"
                onClick={() => setClientModalOpen(true)}
                style={{ whiteSpace: 'nowrap', flex: 'none' }}
              >
                + לקוח חדש
              </button>
            </div>
          </div>
          <div className="form-field full">
            <label>איש קשר נוסף (שם + מייל/טלפון)</label>
            <input value={contact2} onChange={e => setContact2(e.target.value)} placeholder="שם name@email.com" />
          </div>
          <div className="form-field">
            <label>סוג הפרויקט</label>
            <select value={typeId} onChange={e => setTypeId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">בחרי סוג</option>
              {settings.types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>סטטוס</label>
            <select value={statusId} onChange={e => setStatusId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">בחרי סטטוס</option>
              {settings.statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>סוג חבילה</label>
            <select value={packageId} onChange={e => setPackageId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">בחרי חבילה</option>
              {settings.packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>תאריך אירוע</label>
            <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
            {eventDate && <HebrewDate date={eventDate} />}
          </div>
          <div className="form-field full">
            <label>תיקיית דרייב (קישור)</label>
            <input type="url" value={driveUrl} onChange={e => setDriveUrl(e.target.value)} placeholder="https://drive.google.com/..." />
          </div>
          <div className="form-field full">
            <label>קובץ הוראות (קישור)</label>
            <input type="url" value={instructionsUrl} onChange={e => setInstructionsUrl(e.target.value)} placeholder="https://docs.google.com/..." />
          </div>
          <div className="form-field full">
            <label>קובץ דפוס (קישור)</label>
            <input type="url" value={templateUrl} onChange={e => setTemplateUrl(e.target.value)} placeholder="https://docs.google.com/..." />
          </div>
          <div className="form-field full">
            <label>עובדות על הפרויקט</label>
            <div className="workers-check">
              {settings.workers.map(w => (
                <label key={w.id} className={`worker-label${selectedWorkerIds.includes(w.id) ? ' checked' : ''}`}>
                  <input type="checkbox" checked={selectedWorkerIds.includes(w.id)} onChange={() => toggleWorker(w.id)} />
                  {w.name}
                </label>
              ))}
            </div>
          </div>
          <div className="form-field full">
            <label>הערות</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="הערות נוספות..." />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>ביטול</button>
          <button className="btn-save" onClick={handleSave}>שמור</button>
        </div>
      </div>

      {clientModalOpen && (
        <ClientModal
          client={null}
          open={clientModalOpen}
          onClose={() => setClientModalOpen(false)}
          onSave={async (saved) => {
            const updated = await getClients();
            setClients(updated);
            setClientId(saved.id);
            setClientModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
