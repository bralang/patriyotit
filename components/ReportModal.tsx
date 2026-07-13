'use client';
import { useState } from 'react';
import type { Project } from '@/lib/types';
import { useApp } from '@/context/AppContext';
import { formatTime, exportToCsv } from '@/lib/utils';

interface Props { open: boolean; onClose: () => void; }

function getPrice(projectId: number): number {
  try { return Number(localStorage.getItem(`price_${projectId}`) ?? '') || 0; }
  catch { return 0; }
}
function setPrice(projectId: number, value: number) {
  localStorage.setItem(`price_${projectId}`, String(value));
}

function monthRange(offset: number): [string, string] {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const to = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
  return [from, to];
}

function monthLabel(offset: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
}

export default function ReportModal({ open, onClose }: Props) {
  const { projects, settings, getElapsed } = useApp();
  const [tab, setTab] = useState<'time' | 'profit'>('time');
  const [, forceRender] = useState(0);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  if (!open) return null;

  const workers = settings.workers;
  const allProjects = projects; // include archived for profit
  const active = projects.filter(p => !p.archived);

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

  function totalWorkerMs(workerId: number): number {
    return active.reduce((total, p) =>
      total + (p.stages ?? []).reduce((t, s) => {
        const stored = s.worker_times?.find(wt => wt.worker_id === workerId)?.duration_ms ?? 0;
        const elapsed = getElapsed(p.id, s.stage_index, workerId);
        return t + stored + elapsed;
      }, 0), 0);
  }

  // Filter projects for profit by event_date range
  const profitFiltered = allProjects.filter(p => {
    if (!dateFrom && !dateTo) return true;
    const d = p.event_date ?? p.locked_at?.slice(0, 10) ?? p.created_at.slice(0, 10);
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;
    return true;
  });

  const profitRows = profitFiltered.map(p => {
    const totalMs = projectTotalMs(p);
    const totalHours = totalMs / 3600000;
    const price = getPrice(p.id);
    const perHour = price > 0 && totalHours > 0 ? price / totalHours : null;
    const dateKey = p.event_date ?? p.locked_at?.slice(0, 10) ?? p.created_at.slice(0, 10);
    return { id: p.id, name: p.name, price, totalMs, totalHours, perHour, dateKey };
  }).sort((a, b) => (b.perHour ?? -1) - (a.perHour ?? -1));

  const timeRows = active.map(p => ({
    name: p.name,
    totals: workers.map(w => projectWorkerMs(p, w.id)),
    grand: projectTotalMs(p),
  })).sort((a, b) => b.grand - a.grand);

  const totalRevenue = profitRows.reduce((t, r) => t + r.price, 0);
  const totalHoursAll = profitRows.reduce((t, r) => t + r.totalHours, 0);
  const avgPerHour = totalHoursAll > 0 ? totalRevenue / totalHoursAll : 0;

  function setQuickRange(offset: number) {
    const [f, t] = monthRange(offset);
    setDateFrom(f); setDateTo(t);
  }

  function clearRange() { setDateFrom(''); setDateTo(''); }

  function handleExport() {
    const rangeLabel = dateFrom || dateTo
      ? `${dateFrom || ''}—${dateTo || ''}`
      : 'כל הזמן';
    const headers = ['פרויקט', 'תאריך אירוע', 'מחיר (₪)', 'שעות יומן', '₪ לשעה'];
    const rows = profitRows.map(r => [
      r.name,
      r.dateKey,
      r.price ? String(r.price) : '',
      r.totalHours.toFixed(1),
      r.perHour !== null ? r.perHour.toFixed(0) : '',
    ]);
    rows.push(['', '', '', '', '']);
    rows.push(['סה"כ', '', String(totalRevenue), totalHoursAll.toFixed(1), avgPerHour.toFixed(0)]);
    exportToCsv([headers, ...rows], `רווחיות-${rangeLabel}.csv`);
  }

  const isFiltered = !!(dateFrom || dateTo);

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 720 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <button className={tab === 'time' ? 'btn-save' : 'btn-cancel'} style={{ flex: 1, padding: '8px' }} onClick={() => setTab('time')}>⏱ דוח זמנים</button>
          <button className={tab === 'profit' ? 'btn-save' : 'btn-cancel'} style={{ flex: 1, padding: '8px' }} onClick={() => setTab('profit')}>💰 רווחיות</button>
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
            <thead><tr><th>פרויקט</th>{workers.map(w => <th key={w.id}>{w.name}</th>)}<th>סה&quot;כ</th></tr></thead>
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
          {/* Date range filter */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            <button className="btn-settings" onClick={() => setQuickRange(0)}>החודש ({monthLabel(0)})</button>
            <button className="btn-settings" onClick={() => setQuickRange(-1)}>חודש שעבר ({monthLabel(-1)})</button>
            <button className="btn-settings" onClick={() => setQuickRange(-2)}>{monthLabel(-2)}</button>
            {isFiltered && <button className="btn-settings" style={{ color: '#888' }} onClick={clearRange}>✕ כל הזמן</button>}
            <span style={{ color: '#bbb', fontSize: 12 }}>או בחרי טווח:</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ fontSize: 13, border: '1px solid #dce6ff', borderRadius: 6, padding: '4px 8px' }} />
            <span style={{ color: '#888' }}>—</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ fontSize: 13, border: '1px solid #dce6ff', borderRadius: 6, padding: '4px 8px' }} />
          </div>

          {/* Summary cards */}
          <div className="report-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            <div className="report-card">
              <h4>סה&quot;כ הכנסות</h4>
              <div className="report-num" style={{ color: '#32FF9D', fontSize: 20 }}>₪{totalRevenue.toLocaleString('he-IL')}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{profitRows.filter(r => r.price > 0).length} פרויקטים עם מחיר</div>
            </div>
            <div className="report-card">
              <h4>סה&quot;כ שעות</h4>
              <div className="report-num" style={{ fontSize: 20 }}>{totalHoursAll.toFixed(1)} שע׳</div>
            </div>
            <div className="report-card">
              <h4>ממוצע ₪ לשעה</h4>
              <div className="report-num" style={{ color: avgPerHour >= 400 ? '#32FF9D' : avgPerHour >= 200 ? '#FFEA32' : '#FF3232', fontSize: 20 }}>
                ₪{avgPerHour.toFixed(0)}
              </div>
            </div>
          </div>

          {/* Export button */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
            <button className="btn-settings" style={{ color: '#0A6640', borderColor: '#32FF9D' }} onClick={handleExport}>
              ⬇️ יצוא Excel{isFiltered ? ` (${dateFrom}—${dateTo})` : ''}
            </button>
          </div>

          <table className="report-table">
            <thead>
              <tr>
                <th>פרויקט</th>
                <th>תאריך</th>
                <th>מחיר (₪)</th>
                <th>שעות יומן</th>
                <th style={{ color: '#4A7DFF' }}>₪ לשעה</th>
              </tr>
            </thead>
            <tbody>
              {profitRows.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.name}</strong></td>
                  <td style={{ fontSize: 12, color: '#888' }}>{r.dateKey}</td>
                  <td>
                    <input
                      type="number"
                      className="client-days-input"
                      style={{ width: 90 }}
                      defaultValue={r.price || ''}
                      placeholder="0"
                      min={0}
                      onBlur={e => { setPrice(r.id, Number(e.target.value) || 0); forceRender(v => v + 1); }}
                    />
                  </td>
                  <td>{r.totalHours.toFixed(1)}</td>
                  <td style={{ fontWeight: 700, color: r.perHour === null ? '#ccc' : r.perHour >= 400 ? '#00994D' : r.perHour >= 200 ? '#B07800' : '#CC0000' }}>
                    {r.perHour !== null ? `₪${r.perHour.toFixed(0)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 11, color: '#aaa', marginTop: 8 }}>
            ירוק = מעל ₪400/שע׳ · צהוב = ₪200–400 · אדום = מתחת ל-₪200 · כולל פרויקטים בארכיון
          </p>
        </>}

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>סגירה</button>
        </div>
      </div>
    </div>
  );
}
