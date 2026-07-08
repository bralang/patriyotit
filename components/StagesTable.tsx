'use client';
import { useEffect, useRef, useState } from 'react';
import type { Project, ProjectStage } from '@/lib/types';
import { WORK_STAGES, MAILING_TYPE_NAME } from '@/lib/types';
import { useApp } from '@/context/AppContext';
import { toggleStageDone, updateStageField, upsertWorkerTime } from '@/lib/stages';
import { setProjectStatus } from '@/lib/projects';
import { logActivity } from '@/lib/activity';
import { formatTime, parseTimeInput } from '@/lib/utils';

interface Props {
  project: Project;
  onUpdate: () => void;
}

export default function StagesTable({ project, onUpdate }: Props) {
  const { settings, currentWorker, startTimer, stopTimer, getElapsed, activeTimers } = useApp();
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update timer displays every second
  useEffect(() => {
    intervalRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const isMailing = project.type?.name === MAILING_TYPE_NAME;
  const stages = project.stages ?? [];
  const visibleWorkers = isMailing
    ? settings.workers.filter(w => w.name === 'חיה רבקה' || w.name === 'נחמה')
    : settings.workers;

  function getStoredMs(stage: ProjectStage, workerId: number): number {
    return stage.worker_times?.find(wt => wt.worker_id === workerId)?.duration_ms ?? 0;
  }

  function getTotalMs(stage: ProjectStage, workerId: number): number {
    const stored = getStoredMs(stage, workerId);
    const elapsed = getElapsed(project.id, stage.stage_index, workerId);
    return stored + elapsed;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }

  function isRunning(stage: ProjectStage, workerId: number): boolean {
    return `${project.id}-${stage.stage_index}-${workerId}` in activeTimers;
  }

  async function handleTimerToggle(stage: ProjectStage, workerId: number) {
    if (isRunning(stage, workerId)) {
      const elapsed = stopTimer(project.id, stage.stage_index, workerId);
      const newMs = getStoredMs(stage, workerId) + elapsed;
      await upsertWorkerTime(stage.id, workerId, newMs);
      onUpdate();
    } else {
      startTimer(project.id, stage.stage_index, workerId);
    }
  }

  async function handleEditTimer(stage: ProjectStage, workerId: number, workerName: string) {
    const current = formatTime(getTotalMs(stage, workerId));
    const val = prompt(
      `עריכת זמן יומן עבור ${workerName} — שלב "${stage.name}"\nפורמט: שע:דק:שנ (למשל 01:30:00)`,
      current
    );
    if (val === null) return;
    const ms = parseTimeInput(val);
    if (ms === null || ms < 0) { alert('פורמט לא תקין, נסי שוב'); return; }
    await upsertWorkerTime(stage.id, workerId, ms);
    onUpdate();
  }

  async function handleStageDone(stage: ProjectStage, done: boolean) {
    await toggleStageDone(stage.id, done);
    // Advance status when completing a stage (not for mailing projects)
    if (!isMailing && done && settings.statuses.length && project.status_id !== null) {
      const idx = settings.statuses.findIndex(s => s.id === project.status_id);
      const next = settings.statuses[idx + 1];
      if (next && !next.name.includes('ננעל')) {
        await setProjectStatus(project.id, next.id);
        if (currentWorker) logActivity(`🔄 סטטוס עודכן אוטומטית ל-${next.name}`, project.name, currentWorker.id);
      }
    }
    onUpdate();
    // Check if all done → suggest lock
    const stagesAfter = stages.map(s => s.id === stage.id ? { ...s, done } : s);
    if (done && stagesAfter.every(s => s.done)) {
      setTimeout(() => {
        if (confirm(`✅ כל השלבים של "${project.name}" הושלמו!\nלנעול את הפרויקט?`)) {
          const lockStatus = settings.statuses.find(s => s.name.includes('ננעל'));
          if (lockStatus) setProjectStatus(project.id, lockStatus.id).then(onUpdate);
        }
      }, 300);
    }
  }

  function calcProjectTotal(): number {
    return stages.reduce((total, stage) => {
      return total + visibleWorkers.reduce((wTotal, w) => wTotal + getTotalMs(stage, w.id), 0);
    }, 0);
  }

  return (
    <div className="stages-section">
      <div className="stages-title">מעקב זמן עבודה</div>
      <table className="stages-table">
        <thead>
          <tr>
            <th></th>
            <th>שלב</th>
            <th>הערה</th>
            {!isMailing && <th>זמן לקוח</th>}
            {visibleWorkers.map(w => (
              <th key={w.id} style={{ textAlign: 'center' }}>⏱ {w.name}</th>
            ))}
            <th title="יעד לזמן יומן">🎯 יעד</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((stage, i) => {
            const inter = WORK_STAGES[i]?.intermediate ?? false;
            const actualMs = settings.workers.reduce((t, w) => t + getStoredMs(stage, w.id), 0);
            const targetMs = stage.target_hours ? stage.target_hours * 3600000 : 0;
            const overTarget = !!targetMs && actualMs > targetMs;
            return (
              <tr key={stage.id} className={`${stage.done ? 'stage-done' : ''} ${overTarget ? 'over-target-row' : ''}`}>
                <td style={{ textAlign: 'center', width: 28 }}>
                  <input
                    type="checkbox"
                    className="stage-check"
                    checked={stage.done}
                    onChange={e => handleStageDone(stage, e.target.checked)}
                  />
                </td>
                <td className={`stage-name-cell${inter ? ' intermediate' : ''}`}>{stage.name}</td>
                <td>
                  <input
                    type="text"
                    placeholder="הערה..."
                    defaultValue={stage.notes ?? ''}
                    style={{ fontSize: 11, border: '1px solid #dce6ff', borderRadius: 5, padding: '2px 6px', width: 110, outline: 'none', background: 'transparent' }}
                    onBlur={e => updateStageField(stage.id, 'notes', e.target.value)}
                  />
                </td>
                {!isMailing && (
                  <td>
                    <div className="client-days-wrap">
                      <input
                        type="number"
                        className="client-days-input"
                        defaultValue={stage.client_days ?? ''}
                        step={0.5}
                        min={0}
                        placeholder="0"
                        onBlur={e => updateStageField(stage.id, 'client_days', e.target.value ? Number(e.target.value) : null)}
                      />
                      <span style={{ color: '#888', fontSize: 11 }}>ימים</span>
                    </div>
                  </td>
                )}
                {visibleWorkers.map(w => {
                  const running = isRunning(stage, w.id);
                  const total = getTotalMs(stage, w.id);
                  const canControl = currentWorker?.id === w.id;
                  return (
                    <td key={w.id}>
                      <div className="timer-cell">
                        <span
                          className={`timer-disp${running ? ' running' : ''}`}
                          title="לחצי פעמיים לעריכה ידנית"
                          onDoubleClick={() => handleEditTimer(stage, w.id, w.name)}
                          style={{ cursor: 'pointer' }}
                        >
                          {formatTime(total)}
                        </span>
                        <button
                          className={`btn-timer${running ? ' running' : ''}`}
                          onClick={() => handleTimerToggle(stage, w.id)}
                          disabled={!canControl}
                          title={canControl ? '' : `רק ${w.name} יכולה להפעיל`}
                        >
                          {running ? '⏸' : '▶'}
                        </button>
                        <button
                          className="btn-timer"
                          onClick={() => handleEditTimer(stage, w.id, w.name)}
                          title="עריכה ידנית"
                          style={{ fontSize: 10, padding: '2px 5px' }}
                        >
                          ✏️
                        </button>
                      </div>
                    </td>
                  );
                })}
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
                    <input
                      type="number"
                      className="client-days-input"
                      defaultValue={stage.target_hours ?? ''}
                      step={0.5}
                      min={0}
                      placeholder="—"
                      title="יעד שעות לזמן יומן"
                      onBlur={e => updateStageField(stage.id, 'target_hours', e.target.value ? Number(e.target.value) : null)}
                      style={{ width: 44 }}
                    />
                    <span style={{ fontSize: 10, color: overTarget ? '#FF3232' : '#888' }}>{overTarget ? '⚠️' : 'שע'}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={(isMailing ? 4 : 5) + visibleWorkers.length} style={{ paddingTop: 7, borderTop: '1px solid #eee' }}>
              <span style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>סה&quot;כ זמן יומן: </span>
              <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#4A7DFF', fontWeight: 700 }}>
                {formatTime(calcProjectTotal())}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
