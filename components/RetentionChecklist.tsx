'use client';
import { useEffect, useState } from 'react';
import type { Project } from '@/lib/types';
import {
  STATION_DEFS,
  RetentionStation,
  getRetentionStations,
  toggleRetentionStation,
  updateRetentionNote,
  formatDueDate,
} from '@/lib/retention';

interface Props {
  project: Project;
}

export default function RetentionChecklist({ project }: Props) {
  const [stations, setStations] = useState<RetentionStation[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) getRetentionStations(project.id).then(setStations);
  }, [open, project.id]);

  function getStation(index: number): RetentionStation | undefined {
    return stations.find(s => s.station_index === index);
  }

  async function handleToggle(index: number, done: boolean) {
    await toggleRetentionStation(project.id, index, done);
    setStations(prev => {
      const existing = prev.find(s => s.station_index === index);
      if (existing) return prev.map(s => s.station_index === index ? { ...s, done, done_at: done ? new Date().toISOString() : null } : s);
      return [...prev, { id: 0, project_id: project.id, station_index: index, done, done_at: done ? new Date().toISOString() : null, notes: null }];
    });
  }

  async function handleNote(index: number, notes: string) {
    await updateRetentionNote(project.id, index, notes);
  }

  const doneCount = STATION_DEFS.filter(d => getStation(d.index)?.done).length;

  return (
    <div className="retention-wrap">
      <button
        className="stages-toggle-btn retention-toggle"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span>{open ? '▲' : '▼'}</span>
        <span>ציר שימור</span>
        {!open && (
          <span className="stages-toggle-hint">{doneCount}/{STATION_DEFS.length} תחנות הושלמו</span>
        )}
      </button>

      <div className={`stages-collapsible${open ? ' open' : ''}`}>
        <div className="retention-list">
          {STATION_DEFS.map(def => {
            const station = getStation(def.index);
            const done = station?.done ?? false;
            const due = def.getDueDate(project.locked_at ?? null, project.event_date ?? null);
            const { label: dueLabel, urgent, overdue } = formatDueDate(due);

            return (
              <div key={def.index} className={`retention-station${done ? ' done' : ''}${overdue && !done ? ' overdue' : ''}`}>
                <div className="retention-station-top">
                  <input
                    type="checkbox"
                    className="stage-check"
                    checked={done}
                    onChange={e => handleToggle(def.index, e.target.checked)}
                  />
                  <div className="retention-station-info">
                    <span className="retention-station-title">
                      תחנה {def.index}: {def.title}
                    </span>
                    <span className="retention-station-desc">{def.desc}</span>
                  </div>
                  <span className={`retention-due${urgent ? ' urgent' : ''}${overdue ? ' overdue-label' : ''}`}>
                    {dueLabel}
                  </span>
                </div>
                <input
                  type="text"
                  className="retention-note"
                  placeholder="הערה..."
                  defaultValue={station?.notes ?? ''}
                  onBlur={e => handleNote(def.index, e.target.value)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
