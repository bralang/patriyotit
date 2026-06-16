'use client';
import { useEffect, useState } from 'react';
import type { ActivityLogEntry } from '@/lib/types';
import { getActivityLog, clearActivityLog } from '@/lib/activity';
import HebrewDate from './HebrewDate';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ActivityLogModal({ open, onClose }: Props) {
  const [log, setLog] = useState<ActivityLogEntry[]>([]);

  useEffect(() => {
    if (open) getActivityLog().then(setLog);
  }, [open]);

  async function handleClear() {
    if (!confirm('למחוק את כל היומן?')) return;
    await clearActivityLog();
    setLog([]);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600 }}>
        <h2>📜 יומן פעילות</h2>
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {!log.length ? (
            <p style={{ color: '#888', textAlign: 'center', padding: 20 }}>אין פעילות עדיין</p>
          ) : log.map(e => (
            <div key={e.id} className="log-entry">
              <span className="log-time">{new Date(e.created_at).toLocaleString('he-IL')}<HebrewDate date={e.created_at} /></span>
              <span className="log-user">{e.worker?.name ?? 'אורח'}</span>
              <span className="log-action">{e.action} — <strong>{e.project_name ?? ''}</strong></span>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" style={{ color: '#FF3232', borderColor: '#FF3232' }} onClick={handleClear}>נקה יומן</button>
          <button className="btn-cancel" onClick={onClose}>סגירה</button>
        </div>
      </div>
    </div>
  );
}
