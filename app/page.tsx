'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { createClient } from '@/lib/supabase';
import { deleteProject } from '@/lib/projects';
import { logActivity } from '@/lib/activity';
import { getUrgency, exportToCsv, formatEventDate, formatTime } from '@/lib/utils';
import { WORK_STAGES } from '@/lib/types';
import ProjectCard from '@/components/ProjectCard';
import ProjectModal from '@/components/ProjectModal';
import TableView from '@/components/TableView';
import CalendarView from '@/components/CalendarView';
import ArchiveView from '@/components/ArchiveView';
import SettingsModal from '@/components/SettingsModal';
import ReportModal from '@/components/ReportModal';
import ActivityLogModal from '@/components/ActivityLogModal';
import MailingModal from '@/components/MailingModal';
import { getTodayRetentionAlerts } from '@/lib/retention';

type View = 'cards' | 'table' | 'cal' | 'archive';

export default function DashboardPage() {
  const { projects, settings, currentWorker, loading, darkMode, toggleDark, refresh } = useApp();

  const [view, setView] = useState<View>('cards');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showMine, setShowMine] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [mailingOpen, setMailingOpen] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState('');

  const active = useMemo(() => projects.filter(p => !p.archived), [projects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return active.filter(p => {
      const matchQ = !q || [p.name, p.client?.school_name, p.client?.city, p.client?.contact_name, p.notes].join(' ').toLowerCase().includes(q);
      const matchS = !statusFilter || p.status?.id === Number(statusFilter);
      const matchT = !typeFilter || p.type?.id === Number(typeFilter);
      const matchMe = !showMine || currentWorker == null || (p.workers ?? []).some(w => w.id === currentWorker.id);
      return matchQ && matchS && matchT && matchMe;
    }).sort((a, b) => {
      const aLocked = a.status?.name.includes('ננעל') ? 1 : 0;
      const bLocked = b.status?.name.includes('ננעל') ? 1 : 0;
      if (aLocked !== bLocked) return aLocked - bLocked;
      const aDate = a.event_date ? new Date(a.event_date).getTime() : 9999999999999;
      const bDate = b.event_date ? new Date(b.event_date).getTime() : 9999999999999;
      return aDate - bDate;
    });
  }, [active, search, statusFilter, typeFilter, showMine, currentWorker]);

  const urgentProjects = useMemo(() =>
    active.filter(p => !p.status?.name.includes('ננעל') && getUrgency(p.event_date)),
    [active]
  );

  const retentionAlerts = useMemo(() => {
    if (typeof window === 'undefined') return [];
    return getTodayRetentionAlerts(projects);
  }, [projects]);

  async function handleUpdate() {
    await refresh();
    setLastSaved('נשמר: ' + new Date().toLocaleTimeString('he-IL'));
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  async function handleDelete(id: number) {
    if (!confirm('למחוק את הפרויקט?')) return;
    const p = projects.find(x => x.id === id);
    if (currentWorker && p) logActivity('🗑️ מחיקת פרויקט', p.name, currentWorker.id);
    await deleteProject(id);
    handleUpdate();
  }

  function handleExcel() {
    const headers = [
      'שם פרויקט', 'לקוח', 'עיר', 'סוג', 'חבילה', 'סטטוס', 'תאריך אירוע', 'עובדות', 'הערות',
      ...WORK_STAGES.map(s => s.name + ' - ימי לקוח'),
      ...WORK_STAGES.map(s => s.name + ' - זמן יומן'),
    ];
    const rows = projects.map(p => [
      p.name, p.client?.school_name ?? '', p.client?.city ?? '',
      p.type?.name ?? '', p.package?.name ?? '', p.status?.name ?? '',
      p.event_date ? formatEventDate(p.event_date) : '',
      (p.workers ?? []).map(w => w.name).join(' / '), p.notes ?? '',
      ...(p.stages ?? []).map(s => String(s.client_days ?? '')),
      ...(p.stages ?? []).map(s => formatTime(
        (s.worker_times ?? []).reduce((t, wt) => t + wt.duration_ms, 0)
      )),
    ]);
    exportToCsv([headers, ...rows], `פרויקטים-${new Date().toLocaleDateString('he-IL').replace(/\//g, '-')}.csv`);
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontSize: 18, color: '#888' }}>
        טוענת...
      </div>
    );
  }

  return (
    <>
      <header>
        <div className="header-row header-row-top">
          <h1>📋 ניהול פרויקטים</h1>
          <div className="header-right">
            <span className="last-updated">{lastSaved}</span>
            {currentWorker && (
              <span className="worker-greeting">👋 שלום, {currentWorker.name}</span>
            )}
            <Link href="/clients" className="btn-settings" style={{ textDecoration: 'none', color: '#555' }}>👥 לקוחות</Link>
            {currentWorker && (
              <button
                onClick={() => setShowMine(v => !v)}
                className="btn-settings"
                style={{
                  border: '1px solid #EF32FF',
                  background: showMine ? '#EF32FF' : '#FCE0FF',
                  color: showMine ? '#fff' : '#B000C0',
                }}
              >
                ✨ הפרויקטים שלי
              </button>
            )}
            <button className="btn-settings" onClick={() => setSettingsOpen(true)}>⚙️ הגדרות</button>
            <button className="btn-settings" onClick={toggleDark}>{darkMode ? '☀️' : '🌙'}</button>
            <button className="btn-logout" onClick={handleLogout}>יציאה</button>
          </div>
        </div>
        <div className="header-row header-row-bottom">
          <div className="view-toggle">
            <button className={`view-btn${view === 'cards' ? ' active' : ''}`} onClick={() => setView('cards')} title="כרטיסיות">▦</button>
            <button className={`view-btn${view === 'table' ? ' active' : ''}`} onClick={() => setView('table')} title="טבלה">☰</button>
            <button className={`view-btn${view === 'cal' ? ' active' : ''}`} onClick={() => { setView('cal'); setCalOpen(true); }} title="לוח שנה">📅</button>
            <button className={`view-btn${view === 'archive' ? ' active' : ''}`} onClick={() => setView('archive')} title="ארכיון">🗄️</button>
          </div>
          <button className="btn-settings" style={{ color: '#0A6640', borderColor: '#32FF9D' }} onClick={handleExcel}>⬇️ Excel</button>
          <button className="btn-settings" style={{ color: '#32FF9D', borderColor: '#32FF9D' }} onClick={() => setReportOpen(true)}>📊 דוח</button>
          <button className="btn-settings" onClick={() => setLogOpen(true)}>📜 פעילות</button>
          <button className="btn-add" onClick={() => setTypePickerOpen(true)}>+ פרויקט חדש</button>
        </div>
      </header>

      {retentionAlerts.length > 0 && (
        <div className="urgent-banner retention-banner">
          <span style={{ fontWeight: 700, color: '#7A6500' }}>✨ תזכורת ציר שימור להיום:</span>
          {retentionAlerts.map((a, i) => (
            <span key={i} className="urgent-banner-item" style={{ color: '#7A6500' }}>
              {a.projectName} — תחנה {a.stationIndex}: {a.stationTitle}
            </span>
          ))}
        </div>
      )}

      {urgentProjects.length > 0 && (
        <div className="urgent-banner">
          <span style={{ fontWeight: 700, color: '#CC0000' }}>⚠️ פרויקטים דחופים:</span>
          {urgentProjects.map(p => {
            const u = getUrgency(p.event_date)!;
            return <span key={p.id} className="urgent-banner-item">{p.name} — {u.label}</span>;
          })}
        </div>
      )}

      <div className="container">
        <div className="stats">
          <div className="stat">
            <div className="stat-num">{active.length}</div>
            <div className="stat-label">סה&quot;כ פרויקטים</div>
          </div>
          <div className="stat">
            <div className="stat-num">{active.filter(p => p.status?.name.includes('5')).length}</div>
            <div className="stat-label">שלב 5 מאסטרפיס</div>
          </div>
          <div className="stat">
            <div className="stat-num">{active.filter(p => p.status?.name.includes('4')).length}</div>
            <div className="stat-label">שלב 4 פרוטוטייפ</div>
          </div>
          <div className="stat">
            <div className="stat-num">{active.filter(p => p.status?.name.includes('ננעל')).length}</div>
            <div className="stat-label">פרויקטים ננעלו</div>
          </div>
        </div>

        {view !== 'archive' && (
          <div className="filters">
            <input
              type="text"
              placeholder="🔍  חיפוש חופשי..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">כל הסטטוסים</option>
              {settings.statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">כל הסוגים</option>
              {settings.types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}

        {view === 'archive' && <ArchiveView projects={projects} onUpdate={handleUpdate} />}

        {view === 'table' && (
          <TableView
            projects={filtered}
            onEdit={id => { setEditId(id); setProjectModalOpen(true); }}
            onDelete={handleDelete}
          />
        )}

        {view === 'cards' && (
          filtered.length === 0 ? (
            <div className="empty">לא נמצאו פרויקטים תואמים</div>
          ) : (
            <div className="cards">
              {filtered.map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onEdit={id => { setEditId(id); setProjectModalOpen(true); }}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          )
        )}
      </div>

      <ProjectModal
        projectId={editId}
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onSave={handleUpdate}
      />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} />
      <ActivityLogModal open={logOpen} onClose={() => setLogOpen(false)} />
      <MailingModal open={mailingOpen} onClose={() => setMailingOpen(false)} onSave={handleUpdate} />

      {typePickerOpen && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setTypePickerOpen(false)}>
          <div className="modal" style={{ maxWidth: 380, textAlign: 'center' }}>
            <h2 style={{ marginBottom: 24 }}>איזה סוג פרויקט?</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                className="btn-save"
                style={{ padding: '16px', fontSize: 15 }}
                onClick={() => { setTypePickerOpen(false); setEditId(null); setProjectModalOpen(true); }}
              >
                🎨 תהליך יצירה
              </button>
              <button
                className="btn-save"
                style={{ padding: '16px', fontSize: 15, background: '#EF32FF' }}
                onClick={() => { setTypePickerOpen(false); setMailingOpen(true); }}
              >
                📧 כתיבת דיוור
              </button>
            </div>
          </div>
        </div>
      )}
      {calOpen && (
        <CalendarView
          projects={active}
          onEdit={id => { setEditId(id); setProjectModalOpen(true); setCalOpen(false); }}
          onClose={() => { setCalOpen(false); setView('cards'); }}
        />
      )}
    </>
  );
}
