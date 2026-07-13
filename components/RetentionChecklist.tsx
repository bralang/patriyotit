'use client';
import { useState, useEffect } from 'react';
import type { Project } from '@/lib/types';
import { STATION_DEFS, formatDueDate } from '@/lib/retention';

interface StationState { done: boolean; notes: string }

function loadStations(projectId: number): Record<number, StationState> {
  try {
    const raw = localStorage.getItem(`retention_${projectId}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveStations(projectId: number, data: Record<number, StationState>) {
  localStorage.setItem(`retention_${projectId}`, JSON.stringify(data));
}

interface Props { project: Project }

function isDisabled(projectId: number): boolean {
  try { return localStorage.getItem(`retention_disabled_${projectId}`) === '1'; } catch { return false; }
}

export default function RetentionChecklist({ project }: Props) {
  const [open, setOpen] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [data, setData] = useState<Record<number, StationState>>({});

  useEffect(() => {
    if (open) setData(loadStations(project.id));
  }, [open, project.id]);

  function getStation(index: number): StationState {
    return data[index] ?? { done: false, notes: '' };
  }

  function handleToggle(index: number, done: boolean) {
    const next = { ...data, [index]: { ...getStation(index), done } };
    setData(next);
    saveStations(project.id, next);
  }

  function handleNote(index: number, notes: string) {
    const next = { ...data, [index]: { ...getStation(index), notes } };
    setData(next);
    saveStations(project.id, next);
  }

  const doneCount = STATION_DEFS.filter(d => getStation(d.index).done).length;

  useEffect(() => {
    setData(loadStations(project.id));
    setDisabled(isDisabled(project.id));
  }, [project.id]);

  function handleDisable() {
    if (!confirm('להסתיר את ציר השימור לפרויקט זה?')) return;
    localStorage.setItem(`retention_disabled_${project.id}`, '1');
    setDisabled(true);
  }

  function handleEnable() {
    localStorage.removeItem(`retention_disabled_${project.id}`);
    setDisabled(false);
  }

  if (disabled) {
    return (
      <div className="retention-wrap">
        <button className="stages-toggle-btn retention-toggle" style={{ color: '#bbb', borderTopColor: '#eee' }} onClick={handleEnable}>
          <span>ציר שימור מושבת</span>
          <span style={{ marginRight: 'auto', fontSize: 11, color: '#4A7DFF', textDecoration: 'underline' }}>הפעל מחדש</span>
        </button>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  let alertLevel: 'overdue' | 'today' | null = null;
  for (const def of STATION_DEFS) {
    if (data[def.index]?.done) continue;
    const due = def.getDueDate(project.locked_at ?? null, project.event_date ?? null);
    if (!due) continue;
    if (due < today) { alertLevel = 'overdue'; break; }
    if (due === today && !alertLevel) alertLevel = 'today';
  }

  return (
    <div className="retention-wrap">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button
        className="stages-toggle-btn retention-toggle"
        style={{ flex: 1 }}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span>{open ? '▲' : '▼'}</span>
        <span>✨ ציר שימור</span>
        {alertLevel && (
          <span className="retention-alert-dot" style={{ background: alertLevel === 'overdue' ? '#FF3232' : '#FFEA32', color: alertLevel === 'overdue' ? '#fff' : '#7A6500' }}>
            {alertLevel === 'overdue' ? '⚠️ באיחור' : '● היום'}
          </span>
        )}
        {!alertLevel && !open && (
          <span className="stages-toggle-hint">{doneCount}/{STATION_DEFS.length} תחנות הושלמו</span>
        )}
      </button>
      <button
        className="btn-retention-disable"
        onClick={handleDisable}
        title="הסתר ציר שימור לפרויקט זה"
      >✕</button>
      </div>

      <div className={`stages-collapsible${open ? ' open' : ''}`}>
        <div className="retention-list">
          {STATION_DEFS.map(def => {
            const station = getStation(def.index);
            const due = def.getDueDate(project.locked_at ?? null, project.event_date ?? null);
            const { label: dueLabel, urgent, overdue } = formatDueDate(due);

            return (
              <div key={def.index} className={`retention-station${station.done ? ' done' : ''}${overdue && !station.done ? ' overdue' : ''}`}>
                <div className="retention-station-top">
                  <input
                    type="checkbox"
                    className="stage-check"
                    checked={station.done}
                    onChange={e => handleToggle(def.index, e.target.checked)}
                  />
                  <div className="retention-station-info">
                    <span className="retention-station-title">תחנה {def.index}: {def.title}</span>
                    <span className="retention-station-desc">{def.desc}</span>
                  </div>
                  {due && (
                    <span className={`retention-due${urgent ? ' urgent' : ''}${overdue ? ' overdue-label' : ''}`}>
                      {dueLabel}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  className="retention-note"
                  placeholder="הערה..."
                  value={station.notes}
                  onChange={e => handleNote(def.index, e.target.value)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
