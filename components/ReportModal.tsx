'use client';
import { useState } from 'react';
import type { Project } from '@/lib/types';
import { useApp } from '@/context/AppContext';
import { formatTime } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
}

function getPrice(projectId: number): number {
  try { return Number(localStorage.getItem(`price_${projectId}`) ?? '') || 0; }
  catch { return 0; }
}

function setPrice(projectId: number, value: number) {
  localStorage.setItem(`price_${projectId}`, String(value));
}

export default function ReportModal({ open, onClose }: Props) {
  const { projects, settings, getElapsed } = useApp();
  const [tab, setTab] = useState<'time' | 'profit'>('time');
  const [, forceRender] = useState(0);

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

  function projectTotalMs(p: Project): number {
    return workers.reduce((t, w) => t + projectWorkerMs(p, w.id), 0);
  }

  const timeRows = active.map(p => ({
    name: p.name,
    totals: workers.map(w => projectWorkerMs(p, w.id)),
    grand: projectTotalMs(p),
  })).sort((a, b) => b.grand - a.grand);

  const profitRows = active.map(p => {
    const totalMs = projectTotalMs(p);
    const totalHours = totalMs / 3600000;
    const price = getPrice(p.id);
    const perHour = price > 0 && totalHours > 0 ? price / totalHours : null;
    return { id: p.id, name: p.name, price, totalMs, totalHours, perHour };
  }).sort((a, b) => (b.perHour ?? -1) - (a.perHour ?? -1));

  const totalRevenue = profitRows.reduce((t, r) => t + r.price, 0);
  const totalHours = profitRows.reduce((t, r) => t + r.totalHours, 0);
  const avgPerHour = totalHours > 0 ? totalRevenue / totalHours : 0;

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 700 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <button
            className={tab === 'time' ? 'btn-save' : 'btn-cancel'}
            style={{ flex: 1, padding: '8px' }}
            onClick={() => setTab('time')}
          >⏱ דוח זמנים</button>
          <button
            className={tab === 'profit' ? 'btn-save' : 'btn-cancel'}
            style={{ flex: 1, padding: '8px' }}
            onClick={() => setTab('profit')}
          >💰 רווחיות</button>
        </div>

        {tab === 'time' && <>
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
              {timeRows.map(r => (
                <tr key={r.name}>
                  <td><strong>{r.name}</strong></td>
                  {r.totals.map((t, i) => <td key={i}>{formatTime(t)}</td>)}
                  <td style={{ fontWeight: 700, color: '#4A7DFF' }}>{formatTime(r.grand)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>}

        {tab === 'profit' && <>
          <div className="report-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            <div className="report-card">
              <h4>סה&quot;כ הכנסות</h4>
              <div className="report-num" style={{ color: '#32FF9D', fontSize: 20 }}>
                ₪{totalRevenue.toLocaleString('he-IL')}
              </div>
            </div>
            <div className="report-card">
              <h4>סה&quot;כ שעות</h4>
              <div className="report-num" style={{ fontSize: 20 }}>{totalHours.toFixed(1)} שע׳</div>
            </div>
            <div className="report-card">
              <h4>ממוצע ₪ לשעה</h4>
              <div className="report-num" style={{ color: avgPerHour >= 200 ? '#32FF9D' : avgPerHour >= 100 ? '#FFEA32' : '#FF3232', fontSize: 20 }}>
                ₪{avgPerHour.toFixed(0)}
              </div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>הזיני מחיר לכל פרויקט לחישוב רווחיות:</p>
          <table className="report-table">
            <thead>
              <tr>
                <th>פרויקט</th>
                <th>מחיר (₪)</th>
                <th>שעות יומן</th>
                <th style={{ color: '#4A7DFF' }}>₪ לשעה</th>
              </tr>
            </thead>
            <tbody>
              {profitRows.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.name}</strong></td>
                  <td>
                    <input
                      type="number"
                      className="client-days-input"
                      style={{ width: 90 }}
                      defaultValue={r.price || ''}
                      placeholder="0"
                      min={0}
                      onBlur={e => {
                        setPrice(r.id, Number(e.target.value) || 0);
                        forceRender(v => v + 1);
                      }}
                    />
                  </td>
                  <td>{r.totalHours.toFixed(1)}</td>
                  <td style={{
                    fontWeight: 700,
                    color: r.perHour === null ? '#ccc' : r.perHour >= 200 ? '#00994D' : r.perHour >= 100 ? '#B07800' : '#CC0000'
                  }}>
                    {r.perHour !== null ? `₪${r.perHour.toFixed(0)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 11, color: '#aaa', marginTop: 8 }}>
            הטבלה ממוינת מהרווחי ביותר לפחות. ירוק = מעל ₪200/שע׳, צהוב = ₪100–200, אדום = מתחת ל-₪100.
          </p>
        </>}

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>סגירה</button>
        </div>
      </div>
    </div>
  );
}
