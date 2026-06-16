'use client';
import { useEffect, useState } from 'react';
import type { Status, ProjectType, Worker, Package } from '@/lib/types';
import { useApp } from '@/context/AppContext';
import { saveSettings, updateWorkerNames, deleteWorker } from '@/lib/settings';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: Props) {
  const { settings, setSettings, refresh } = useApp();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [types, setTypes] = useState<ProjectType[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);

  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [inviteError, setInviteError] = useState('');

  useEffect(() => {
    if (!open) return;
    setStatuses([...settings.statuses]);
    setTypes([...settings.types]);
    setWorkers([...settings.workers]);
    setPackages([...settings.packages]);
    setInviteName('');
    setInviteEmail('');
    setInviteStatus('idle');
    setInviteError('');
  }, [open, settings]);

  async function handleSave() {
    const namedWorkers = workers.filter(w => w.name.trim());
    const newSettings = {
      statuses: statuses.filter(s => s.name.trim()),
      types: types.filter(t => t.name.trim()),
      packages: packages.filter(p => p.name.trim()),
    };
    await Promise.all([
      saveSettings(newSettings),
      updateWorkerNames(namedWorkers),
    ]);
    setSettings({ ...newSettings, workers: namedWorkers });
    onClose();
  }

  async function handleRemoveWorker(worker: Worker, idx: number) {
    if (!confirm(`למחוק את ${worker.name}?`)) return;
    if (worker.id) await deleteWorker(worker.id);
    setWorkers(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleInvite() {
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    setInviteStatus('loading');
    setInviteError('');
    try {
      const res = await fetch('/api/invite-worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: inviteName.trim(), email: inviteEmail.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setInviteError(json.error ?? 'שגיאה');
        setInviteStatus('error');
      } else {
        setInviteStatus('success');
        setInviteName('');
        setInviteEmail('');
        await refresh();
      }
    } catch {
      setInviteError('שגיאת רשת');
      setInviteStatus('error');
    }
  }

  type LookupItem = { id?: number; name: string; sort_order: number };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type LookupSetter = React.Dispatch<React.SetStateAction<any[]>>;

  function addItem(setter: LookupSetter, sort_order: number) {
    setter((prev: LookupItem[]) => [...prev, { name: '', sort_order }]);
  }

  function removeItem(setter: LookupSetter, idx: number) {
    setter((prev: LookupItem[]) => prev.filter((_, i) => i !== idx));
  }

  function updateName(setter: LookupSetter, idx: number, name: string) {
    setter((prev: LookupItem[]) => prev.map((item, i) => i === idx ? { ...item, name } : item));
  }

  function renderList(
    items: LookupItem[],
    setter: LookupSetter,
    title: string,
    addLabel: string
  ) {
    return (
      <div className="settings-section">
        <h3>{title}</h3>
        <div className="tag-list">
          {items.map((item, i) => (
            <div key={item.id ?? `new-${i}`} className="tag-row">
              <input
                type="text"
                value={item.name}
                onChange={e => updateName(setter, i, e.target.value)}
              />
              <button className="btn-remove" onClick={() => removeItem(setter, i)}>×</button>
            </div>
          ))}
        </div>
        <button className="btn-add-item" onClick={() => addItem(setter, items.length)}>{addLabel}</button>
      </div>
    );
  }

  if (!open) return null;

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal settings-modal">
        <h2>⚙️ הגדרות</h2>
        {renderList(statuses, setStatuses, 'סטטוסים', '+ הוספת סטטוס')}
        {renderList(types, setTypes, 'סוגי פרויקטים', '+ הוספת סוג')}
        {renderList(packages, setPackages, 'סוגי חבילות', '+ הוספת חבילה')}

        <div className="settings-section">
          <h3>עובדות</h3>
          <div className="tag-list">
            {workers.map((worker, i) => (
              <div key={worker.id ?? `new-${i}`} className="tag-row">
                <input
                  type="text"
                  value={worker.name}
                  onChange={e => updateName(setWorkers, i, e.target.value)}
                />
                {worker.email && (
                  <span className="worker-email-label" dir="ltr">{worker.email}</span>
                )}
                <button className="btn-remove" onClick={() => handleRemoveWorker(worker, i)}>×</button>
              </div>
            ))}
          </div>

          <div className="invite-worker-form">
            <input
              type="text"
              placeholder="שם העובדת"
              value={inviteName}
              onChange={e => setInviteName(e.target.value)}
            />
            <input
              type="email"
              placeholder="כתובת מייל"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              dir="ltr"
            />
            <button
              className="btn-invite"
              onClick={handleInvite}
              disabled={inviteStatus === 'loading' || !inviteName.trim() || !inviteEmail.trim()}
            >
              {inviteStatus === 'loading' ? 'שולחת...' : '✉️ הזמן עובדת'}
            </button>
            {inviteStatus === 'success' && (
              <span className="invite-success">ההזמנה נשלחה! העובדת תקבל מייל להגדרת סיסמה.</span>
            )}
            {inviteStatus === 'error' && (
              <span className="invite-error">{inviteError}</span>
            )}
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
