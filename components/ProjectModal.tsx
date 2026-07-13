'use client';
import { useEffect, useRef, useState } from 'react';
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
  const [price, setPrice] = useState('');
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<number[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!clientDropdownOpen) return;
    function handleOutsideClick(e: MouseEvent) {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setClientDropdownOpen(false);
        setClientSearch('');
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [clientDropdownOpen]);

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
      try { setPrice(localStorage.getItem(`price_${existing.id}`) ?? ''); } catch { setPrice(''); }
    } else {
      setName(''); setClientId(''); setContact2(''); setTypeId('');
      setStatusId(''); setPackageId(''); setDriveUrl('');
      setInstructionsUrl(''); setTemplateUrl(''); setEventDate('');
      setNotes(''); setPrice(''); setSelectedWorkerIds([]);
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
    if (existing?.id && price) {
      try { localStorage.setItem(`price_${existing.id}`, price); } catch {}
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
            <div style={{ position: 'relative' }} ref={clientDropdownRef}>
              <button
                type="button"
                onClick={() => { setClientDropdownOpen(o => !o); setClientSearch(''); }}
                style={{
                  width: '100%', textAlign: 'right', cursor: 'pointer',
                  padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6,
                  background: 'white', fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  color: clientId ? 'inherit' : '#9ca3af',
                }}
              >
                <span>{clients.find(c => c.id === clientId)
                  ? `${clients.find(c => c.id === clientId)!.school_name}${clients.find(c => c.id === clientId)!.city ? ` — ${clients.find(c => c.id === clientId)!.city}` : ''}`
                  : 'בחרי לקוח...'}</span>
                <span style={{ fontSize: 10, color: '#6b7280' }}>▾</span>
              </button>
              {clientDropdownOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 2px)', right: 0, left: 0,
                  zIndex: 9999, background: 'white', border: '1px solid #d1d5db',
                  borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  maxHeight: 280, overflowY: 'auto',
                }}>
                  <div style={{ padding: 8, borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, background: 'white' }}>
                    <input
                      autoFocus
                      placeholder="חיפוש לקוח..."
                      value={clientSearch}
                      onChange={e => setClientSearch(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '5px 8px', border: '1px solid #e5e7eb', borderRadius: 4, fontSize: 13 }}
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                  <div
                    onMouseDown={() => { setClientModalOpen(true); setClientDropdownOpen(false); setClientSearch(''); }}
                    style={{ padding: '9px 12px', cursor: 'pointer', color: '#2563eb', fontWeight: 600, fontSize: 13, borderBottom: '1px solid #f0f0f0' }}
                  >
                    + לקוח חדש
                  </div>
                  {clientId !== '' && (
                    <div
                      onMouseDown={() => { setClientId(''); setClientDropdownOpen(false); setClientSearch(''); }}
                      style={{ padding: '9px 12px', cursor: 'pointer', color: '#6b7280', fontSize: 13, borderBottom: '1px solid #f0f0f0' }}
                    >
                      ללא לקוח
                    </div>
                  )}
                  {clients
                    .filter(c => !clientSearch || c.school_name.includes(clientSearch) || (c.city ?? '').includes(clientSearch))
                    .map(c => (
                      <div
                        key={c.id}
                        onMouseDown={() => { setClientId(c.id); setClientDropdownOpen(false); setClientSearch(''); }}
                        style={{
                          padding: '9px 12px', cursor: 'pointer', fontSize: 13,
                          background: clientId === c.id ? '#eff6ff' : undefined,
                          fontWeight: clientId === c.id ? 600 : undefined,
                        }}
                      >
                        {c.school_name}{c.city ? ` — ${c.city}` : ''}
                      </div>
                    ))}
                  {clients.filter(c => !clientSearch || c.school_name.includes(clientSearch) || (c.city ?? '').includes(clientSearch)).length === 0 && (
                    <div style={{ padding: '9px 12px', color: '#9ca3af', fontSize: 13 }}>לא נמצאו תוצאות</div>
                  )}
                </div>
              )}
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
          <div className="form-field">
            <label>מחיר הפרויקט (₪)</label>
            <input type="number" min={0} placeholder="0" value={price} onChange={e => setPrice(e.target.value)} />
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
