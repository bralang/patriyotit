'use client';
import { useState, useEffect, useRef } from 'react';
import type { Lead } from '@/lib/lead-types';
import { PIPELINE_STEPS, LEAD_SOURCE_LABELS } from '@/lib/lead-types';
import { useApp } from '@/context/AppContext';
import { upsertLeadStep, upsertLeadWorkerTime, saveLead } from '@/lib/leads';

interface Props {
  lead: Lead;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: () => void;
}

const STAGE_LABELS = { conversion: 'המרה', finance: 'פיננסים' };
const STATUS_COLORS: Record<string, string> = {
  open: '#4A7DFF',
  won: '#32FF9D',
  lost: '#FF3232',
};
const STATUS_LABELS: Record<string, string> = {
  open: 'פתוח',
  won: 'נסגר',
  lost: 'לא סגר',
};

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function LeadCard({ lead, onEdit, onDelete, onUpdate }: Props) {
  const { currentWorker } = useApp();
  const [open, setOpen] = useState(false);
  const [lostReason, setLostReason] = useState(lead.lost_reason ?? '');
  const [showLostForm, setShowLostForm] = useState(false);

  // Per-step timers: stepKey → start timestamp
  const [runningStep, setRunningStep] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerStartRef = useRef<number>(0);

  useEffect(() => {
    if (runningStep !== null) {
      timerStartRef.current = Date.now() - elapsed;
      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - timerStartRef.current);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [runningStep]);

  const steps = lead.steps ?? [];
  const workerTimes = lead.worker_times ?? [];

  function getStep(key: string) {
    return steps.find(s => s.step_key === key);
  }

  function getWorkerMs(stepKey: string): number {
    if (!currentWorker) return 0;
    const stored = workerTimes.find(wt => wt.step_key === stepKey && wt.worker_id === currentWorker.id)?.duration_ms ?? 0;
    const live = runningStep === stepKey ? elapsed : 0;
    return stored + live;
  }

  async function handleToggleStep(key: string, done: boolean) {
    await upsertLeadStep(lead.id, key, done);
    onUpdate();
  }

  async function handleClientDays(key: string, value: string) {
    const num = value === '' ? null : Number(value);
    const step = getStep(key);
    await upsertLeadStep(lead.id, key, step?.done ?? false, num);
    onUpdate();
  }

  async function handleTimer(stepKey: string) {
    if (!currentWorker) return;
    if (runningStep === stepKey) {
      const total = getWorkerMs(stepKey);
      setRunningStep(null);
      setElapsed(0);
      await upsertLeadWorkerTime(lead.id, stepKey, currentWorker.id, total);
      onUpdate();
    } else {
      if (runningStep !== null) {
        const prev = getWorkerMs(runningStep);
        await upsertLeadWorkerTime(lead.id, runningStep, currentWorker.id, prev);
      }
      setElapsed(workerTimes.find(wt => wt.step_key === stepKey && wt.worker_id === currentWorker.id)?.duration_ms ?? 0);
      setRunningStep(stepKey);
    }
  }

  async function handleMarkLost() {
    await saveLead({ ...lead, status: 'lost', lost_reason: lostReason });
    setShowLostForm(false);
    onUpdate();
  }

  async function handleMarkWon() {
    await saveLead({ ...lead, status: 'won' });
    onUpdate();
  }

  async function handleReopen() {
    await saveLead({ ...lead, status: 'open', lost_reason: null });
    onUpdate();
  }

  const doneCount = PIPELINE_STEPS.filter(def => getStep(def.key)?.done).length;
  const totalCount = PIPELINE_STEPS.length;
  const progressPct = Math.round((doneCount / totalCount) * 100);
  const statusColor = STATUS_COLORS[lead.status] ?? '#4A7DFF';

  const conversionSteps = PIPELINE_STEPS.filter(s => s.stage === 'conversion');
  const financeSteps = PIPELINE_STEPS.filter(s => s.stage === 'finance');

  function renderSteps(defs: typeof PIPELINE_STEPS) {
    return defs.map(def => {
      const step = getStep(def.key);
      const ms = def.trackTime ? getWorkerMs(def.key) : 0;
      const isRunning = runningStep === def.key;

      return (
        <div key={def.key} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '4px 6px',
          borderRadius: 6, marginBottom: 2,
        }}>
          <input
            type="checkbox"
            className="stage-check"
            checked={step?.done ?? false}
            onChange={e => handleToggleStep(def.key, e.target.checked)}
          />
          <span style={{
            flex: 1, fontSize: 13,
            color: step?.done ? '#00994D' : 'var(--text-primary)',
            textDecoration: step?.done ? 'line-through' : undefined,
          }}>
            {def.label}
          </span>
          {!def.mandatory && <span style={{ fontSize: 10, color: '#bbb' }}>רשות</span>}
          {def.trackTime && currentWorker && (
            <>
              <button
                onClick={() => handleTimer(def.key)}
                style={{
                  padding: '2px 7px', borderRadius: 20, fontSize: 10, cursor: 'pointer',
                  border: `1px solid ${isRunning ? '#FF3232' : '#4A7DFF'}`,
                  color: isRunning ? '#FF3232' : '#4A7DFF',
                  background: 'transparent', whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                {isRunning ? `⏹ ${formatMs(ms)}` : ms > 0 ? `▶ ${formatMs(ms)}` : '▶ התחל'}
              </button>
              <div style={{ width: 1, height: 12, background: 'var(--border)', flexShrink: 0 }} />
            </>
          )}
          <input
            type="number"
            min={0}
            placeholder="0"
            title="ימי לקוח"
            defaultValue={step?.client_days ?? ''}
            onBlur={e => handleClientDays(def.key, e.target.value)}
            style={{
              width: 22, padding: '1px 2px', borderRadius: 4,
              border: '0.5px solid var(--border)', background: 'var(--surface-1)',
              fontSize: 11, color: 'var(--text-primary)', textAlign: 'center', flexShrink: 0,
            }}
          />
        </div>
      );
    });
  }

  return (
    <div className="project-card" style={{ borderTop: `3px solid ${statusColor}` }}>
      <div className="card-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="card-name" style={{ fontSize: 15, fontWeight: 600 }}>{lead.name}</span>
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 20,
              background: statusColor + '22', color: statusColor, fontWeight: 600,
            }}>
              {STATUS_LABELS[lead.status]}
            </span>
          </div>
          {(lead.school_name || lead.city) && (
            <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
              {[lead.school_name, lead.city].filter(Boolean).join(' — ')}
            </div>
          )}
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
            {LEAD_SOURCE_LABELS[lead.source]}
            {lead.source === 'referral' && lead.referrer_name && ` (${lead.referrer_name})`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexShrink: 0 }}>
          <button className="btn-edit" onClick={onEdit} title="עריכה">✏️</button>
          <button className="btn-delete" onClick={onDelete} title="מחיקה">🗑️</button>
        </div>
      </div>

      <div style={{ margin: '8px 0 4px', background: '#f0f0f0', borderRadius: 4, height: 5, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progressPct}%`, background: statusColor, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>{doneCount}/{totalCount} שלבים הושלמו</div>

      <button
        className="stages-toggle-btn"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        style={{ borderTopColor: '#e5e7eb' }}
      >
        <span>{open ? '▲' : '▼'}</span>
        <span>ציר מכירה</span>
        {!open && <span className="stages-toggle-hint" style={{ marginRight: 'auto', fontSize: 11, color: '#aaa' }}>
          {doneCount}/{totalCount}
        </span>}
      </button>

      <div className={`stages-collapsible${open ? ' open' : ''}`}>
        <div style={{ padding: '6px 0' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 1, margin: '4px 6px 4px', }}>
            המרה
          </div>
          {renderSteps(conversionSteps)}
          <div style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 1, margin: '8px 6px 4px', }}>
            פיננסים
          </div>
          {renderSteps(financeSteps)}
        </div>

        {lead.status === 'open' && (
          <div style={{ display: 'flex', gap: 8, padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
            <button
              className="btn-save"
              style={{ flex: 1, padding: '7px', fontSize: 13, background: '#32FF9D', color: '#006B3A', border: 'none' }}
              onClick={handleMarkWon}
            >
              ✓ נסגר!
            </button>
            <button
              className="btn-cancel"
              style={{ flex: 1, padding: '7px', fontSize: 13, color: '#CC0000', borderColor: '#FF3232' }}
              onClick={() => setShowLostForm(v => !v)}
            >
              ✕ לא סגר
            </button>
          </div>
        )}

        {lead.status !== 'open' && (
          <div style={{ padding: '8px 0', borderTop: '1px solid #f0f0f0' }}>
            <button className="btn-cancel" style={{ fontSize: 12, width: '100%' }} onClick={handleReopen}>
              פתח מחדש
            </button>
          </div>
        )}

        {showLostForm && (
          <div style={{ marginTop: 8 }}>
            <input
              placeholder="סיבת אי-סגירה (אופציונלי)..."
              value={lostReason}
              onChange={e => setLostReason(e.target.value)}
              style={{ width: '100%', fontSize: 13, padding: '6px 10px', border: '1px solid #fca5a5', borderRadius: 6, marginBottom: 6 }}
            />
            <button className="btn-save" style={{ background: '#FF3232', width: '100%', fontSize: 13 }} onClick={handleMarkLost}>
              אשרי — לא סגר
            </button>
          </div>
        )}

        {lead.status === 'lost' && lead.lost_reason && (
          <div style={{ fontSize: 12, color: '#888', padding: '4px 0', fontStyle: 'italic' }}>
            סיבה: {lead.lost_reason}
          </div>
        )}
      </div>
    </div>
  );
}
