'use client';
import type { Project } from '@/lib/types';
import { useApp } from '@/context/AppContext';
import { formatTime } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ReportModal({ open, onClose }: Props) {
  const { projects, settings, getElapsed } = useApp();

  if (!open) return null;

  const workers = settings.workers;
  const active = projects.filter(p => !p.archived);

  function totalWorkerMs(workerId: number): number {
    return active.reduce((total, p) => {
      return total + (p.stages ?? []).reduce((t, s) => {
        const stored = s.worker_times?.find(wt => wt.worker_id === workerId)?.duration_ms ?? 0;
        const elapsed = getElapsed(p.id, s.stage_index, workerId);
        return t + stored + elapsed;
      }, 0);
    }, 0);
  }

  function projectWorkerMs(p: Project, workerId: number): number {
    return (p.stages ?? []).reduce((t, s) => {
      const stored = s.worker_times?.find(wt => wt.worker_id === workerId)?.duration_ms ?? 0;
      const elapsed = getElapsed(p.id, s.stage_index, workerId);
      return t + stored + elapsed;
    }, 0);
  }

  const rows = active.map(p => ({
    name: p.name,
    totals: workers.map(w => projectWorkerMs(p, w.id)),
    grand: workers.reduce((t, w) => t + projectWorkerMs(p, w.id), 0),
  })).sort((a, b) => b.grand - a.grand);

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 700 }}>
        <h2>📊 דוח זמנים</h2>
        <div className="report-grid">
          {workers.map(w => (
            <div key={w.id} className="report-card">
              <h4>{w.name}</h4>
              <div className="report-num">{formatTime(totalWorkerMs(w.id))}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>סה&quot;כ בכל הפרויקטים</div>
            </div>
          ))}
        </div>
        <table className="report-table">
          <thead>
            <tr>
              <th>פרויקט</th>
              {workers.map(w => <th key={w.id}>{w.name}</th>)}
              <th>סה&quot;כ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.name}>
                <td><strong>{r.name}</strong></td>
                {r.totals.map((t, i) => <td key={i}>{formatTime(t)}</td>)}
                <td style={{ fontWeight: 700, color: '#4A7DFF' }}>{formatTime(r.grand)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>סגירה</button>
        </div>
      </div>
    </div>
  );
}
