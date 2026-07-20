'use client';
import { useState } from 'react';
import type { Project, Status } from '@/lib/types';
import { useApp } from '@/context/AppContext';
import { setProjectStatus, archiveProject, duplicateProject, deleteProject, createMailingProject } from '@/lib/projects';
import { logActivity } from '@/lib/activity';
import { getUrgency, formatEventDate, linkifyContact, getStatusStyle } from '@/lib/utils';
import { MAILING_TYPE_NAME, MAILING_SUBTYPE_COLORS } from '@/lib/types';
import { upsertWorkerTime } from '@/lib/stages';
import StagesTable from './StagesTable';
import RetentionChecklist from './RetentionChecklist';
import HebrewDate from './HebrewDate';

interface Props {
  project: Project;
  onEdit: (id: number) => void;
  onUpdate: () => void;
}

export default function ProjectCard({ project, onEdit, onUpdate }: Props) {
  const { settings, currentWorker, startTimer, stopTimer, activeTimers } = useApp();
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [stagesOpen, setStagesOpen] = useState(false);
  const [folderCopied, setFolderCopied] = useState(false);

  const isMe = currentWorker && project.workers?.some(w => w.id === currentWorker.id);
  const isLocked = project.status?.name.includes('ננעל');
  const isMailing = project.type?.name === MAILING_TYPE_NAME;
  const mailingColors = isMailing && project.package ? MAILING_SUBTYPE_COLORS[project.package.name] : null;
  const urgency = getUrgency(project.event_date ?? null);
  const stages = project.stages ?? [];
  const stageCount = stages.length || (isMailing ? 4 : 7);
  const doneCount = stages.filter(s => s.done).length;
  const pct = Math.round((doneCount / stageCount) * 100);

  // Quick timer: first non-done stage for current worker
  const currentStage = stages.find(s => !s.done);
  const timerKey = currentStage && currentWorker ? `${project.id}-${currentStage.stage_index}-${currentWorker.id}` : null;
  const timerRunning = timerKey ? timerKey in activeTimers : false;

  async function handleQuickTimer() {
    if (!currentStage || !currentWorker) return;
    if (timerRunning) {
      const elapsed = stopTimer(project.id, currentStage.stage_index, currentWorker.id);
      const stored = currentStage.worker_times?.find(wt => wt.worker_id === currentWorker.id)?.duration_ms ?? 0;
      await upsertWorkerTime(currentStage.id, currentWorker.id, stored + elapsed);
      onUpdate();
    } else {
      startTimer(project.id, currentStage.stage_index, currentWorker.id);
    }
  }


  async function handleQuickStatus(status: Status) {
    const wasLocked = isLocked;
    await setProjectStatus(project.id, status.id);
    const nowLocked = status.name.includes('ננעל');
    if (nowLocked && !wasLocked) {
      showLockToast(project.name);
      if (!isMailing) {
        createMailingProject(project.name, settings, 'שיתוף', true).then(onUpdate);
      }
    }
    if (currentWorker) logActivity(`🔄 שינוי סטטוס ל-${status.name}`, project.name, currentWorker.id);
    setStatusDropdownOpen(false);
    onUpdate();
  }

  async function handleCopyFolderPath() {
    if (!project.local_folder_path) return;
    try {
      await navigator.clipboard.writeText(project.local_folder_path);
      setFolderCopied(true);
      setTimeout(() => setFolderCopied(false), 2500);
    } catch {
      window.prompt('נתיב התיקייה — סמני הכל (Ctrl+A) והעתיקי (Ctrl+C):', project.local_folder_path);
    }
  }

  async function handleDelete() {
    if (!confirm('למחוק את הפרויקט?')) return;
    if (currentWorker) logActivity('🗑️ מחיקת פרויקט', project.name, currentWorker.id);
    await deleteProject(project.id);
    onUpdate();
  }

  async function handleDuplicate() {
    if (currentWorker) logActivity('📋 שכפול פרויקט', project.name + ' (עותק)', currentWorker.id);
    await duplicateProject(project.id);
    onUpdate();
  }

  async function handleArchive() {
    if (currentWorker) logActivity('🗄️ הועבר לארכיון', project.name, currentWorker.id);
    await archiveProject(project.id, true);
    onUpdate();
  }

  const statusStyle = getStatusStyle(project.status, settings.statuses);
  const eventDateDisplay = project.event_date && !urgency ? (
    <span className="event-date-label">📅 {formatEventDate(project.event_date)}<HebrewDate date={project.event_date} /></span>
  ) : null;

  return (
    <div className={`card${isMe ? ' mine' : ''}${isLocked ? ' locked' : ''}${isMailing ? ' mailing' : ''}`}>
      {isMailing && (
        <span className="mailing-banner" style={{ background: mailingColors?.banner ?? '#EF32FF' }} />
      )}
      <div className="card-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div className="card-name">
            {isMailing && <span className="mailing-name-icon" style={{ color: mailingColors?.icon ?? '#880099' }}>✉</span>}
            {isMailing && project.package && (
              <span style={{ color: mailingColors?.icon ?? '#880099', fontWeight: 600 }}>כתיבת דיוור {project.package.name}: </span>
            )}
            {project.name}
          </div>
          {isLocked && <span className="locked-banner">🔒 ננעל</span>}
          {urgency && <span className={`urgency-${urgency.level}`}>{urgency.label}<HebrewDate date={project.event_date} /></span>}
          {project.package && !isMailing && (
            <span className="badge badge-package">{project.package.name}</span>
          )}
          {eventDateDisplay}
        </div>
        <div className="card-right">
          <div className="badges">
            {project.type && !isMailing && <span className="badge badge-type">{project.type.name}</span>}
            <div className="badge-wrap" onClick={() => setStatusDropdownOpen(v => !v)}>
              {project.status ? (
                <span
                  className="badge"
                  style={statusStyle ? { background: statusStyle.bg, color: statusStyle.color } : {}}
                >
                  {project.status.name}
                </span>
              ) : (
                <span className="badge badge-none">—</span>
              )}
              {statusDropdownOpen && (
                <div className="status-dropdown">
                  {(isMailing
                    ? settings.statuses.filter(s => s.name.includes('ננעל') || ['יצירת הדמיות','כתיבה','בדיקה','תזמון'].includes(s.name))
                    : settings.statuses
                  ).map(s => (
                    <button key={s.id} onClick={e => { e.stopPropagation(); handleQuickStatus(s); }}>
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="card-actions">
            <button className="btn-edit" onClick={() => onEdit(project.id)}>✏️ עריכה</button>
            <button className="btn-edit" onClick={handleDuplicate} title="שכפול">📋</button>
            {isLocked && (
              <button className="btn-edit" onClick={handleArchive} title="העבר לארכיון" style={{ color: '#888', borderColor: '#ccc' }}>🗄️</button>
            )}
            <button className="btn-delete" onClick={handleDelete}>🗑️</button>
          </div>
        </div>
      </div>

      <div className="card-meta">
        {project.client && (
          <div className="meta-item">🏢 <strong>{project.client.school_name}</strong>
            {project.client.city && <span style={{ color: '#888' }}> · {project.client.city}</span>}
          </div>
        )}
        {project.client?.contact_name && (
          <div className="meta-item">👤 {project.client.contact_name}
            {project.client.phone && <span> · {project.client.phone}</span>}
            {project.client.email && (
              <a href={`mailto:${project.client.email}`} style={{ color: '#4A7DFF', textDecoration: 'none', borderBottom: '1px solid #8FB3FF', marginRight: 4 }}>
                {project.client.email}
              </a>
            )}
          </div>
        )}
        {project.contact2 && (
          <div className="meta-item" dangerouslySetInnerHTML={{ __html: '👥 ' + linkifyContact(project.contact2) }} />
        )}
        {project.workers && project.workers.length > 0 && (
          <div className="meta-item">
            ✏️ {project.workers.map(w => (
              <span key={w.id} className={`worker-badge${currentWorker?.id === w.id ? ' me' : ''}`}>{w.name}</span>
            ))}
          </div>
        )}
      </div>

      <div className="progress-wrap">
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="progress-label">{doneCount}/{stageCount} שלבים הושלמו{pct === 100 ? ' ✅' : ''}</div>
      </div>

      {project.notes && (
        <div style={{ fontSize: 13, color: '#666', marginBottom: 10, padding: '8px 10px', background: '#fafaf8', borderRadius: 7 }}>
          {project.notes}
        </div>
      )}

      {(project.drive_url || project.local_folder_path || project.instructions_url || project.template_url) && (
        <div className="card-links">
          {project.drive_url && <a href={project.drive_url} className="link-btn" target="_blank" rel="noreferrer">📁 תיקיית דרייב</a>}
          {project.local_folder_path && (
            <button type="button" className="link-btn" onClick={handleCopyFolderPath} title={project.local_folder_path}>
              {folderCopied ? '✅ הועתק! הדביקי בסייר הקבצים (Ctrl+V) ואנטר' : '💻 העתקת נתיב תיקייה'}
            </button>
          )}
          {project.instructions_url && <a href={project.instructions_url} className="link-btn" target="_blank" rel="noreferrer">📄 הוראות</a>}
          {project.template_url && <a href={project.template_url} className="link-btn" target="_blank" rel="noreferrer">📋 קובץ דפוס</a>}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          className="stages-toggle-btn"
          style={{ flex: 1 }}
          onClick={() => setStagesOpen(v => !v)}
          aria-expanded={stagesOpen}
        >
          <span>{stagesOpen ? '▲' : '▼'}</span>
          <span>שלבים ומעקב זמן</span>
          {!stagesOpen && (
            <span className="stages-toggle-hint">{doneCount}/{stageCount} הושלמו</span>
          )}
        </button>
        {currentStage && currentWorker && !isLocked && (
          <button
            className={`btn-quick-timer${timerRunning ? ' running' : ''}`}
            onClick={handleQuickTimer}
            title={timerRunning ? `עצור טיימר — ${currentStage.name}` : `התחל טיימר — ${currentStage.name}`}
          >
            {timerRunning ? '⏸' : '▶'}
          </button>
        )}
      </div>

      <div className={`stages-collapsible${stagesOpen ? ' open' : ''}`}>
        <StagesTable project={project} onUpdate={onUpdate} />
      </div>

      {isLocked && !isMailing && <RetentionChecklist project={project} />}
    </div>
  );
}

function showLockToast(name: string) {
  const toast = document.createElement('div');
  toast.className = 'lock-toast';
  toast.textContent = `🔒 פטריוטי ליצור פרויקט, ועוד יותר פטריוטי לנעול אותו. ברכות לסיום! 🎉`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}
