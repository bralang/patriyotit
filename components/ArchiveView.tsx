'use client';
import type { Project } from '@/lib/types';
import { MAILING_TYPE_NAME } from '@/lib/types';
import { archiveProject } from '@/lib/projects';
import { logActivity } from '@/lib/activity';
import { useApp } from '@/context/AppContext';
import HebrewDate from './HebrewDate';
import RetentionChecklist from './RetentionChecklist';

interface Props {
  projects: Project[];
  onUpdate: () => void;
}

export default function ArchiveView({ projects, onUpdate }: Props) {
  const { currentWorker } = useApp();
  const archived = projects.filter(p => p.archived).sort((a, b) =>
    (b.archived_at ? new Date(b.archived_at).getTime() : 0) -
    (a.archived_at ? new Date(a.archived_at).getTime() : 0)
  );

  if (!archived.length) return <div className="empty">אין פרויקטים בארכיון</div>;

  async function handleRestore(p: Project) {
    if (currentWorker) logActivity('♻️ שוחזר מהארכיון', p.name, currentWorker.id);
    await archiveProject(p.id, false);
    onUpdate();
  }

  return (
    <div>
      <div className="archive-section-title">🗄️ ארכיון פרויקטים ({archived.length})</div>
      {archived.map(p => {
        const archivedDate = p.archived_at
          ? new Date(p.archived_at).toLocaleDateString('he-IL')
          : '—';
        return (
          <div key={p.id} style={{ marginBottom: 8 }}>
            <div className="archive-banner-item" style={{ marginBottom: 0, borderBottomLeftRadius: p.type?.name !== MAILING_TYPE_NAME ? 0 : undefined, borderBottomRightRadius: p.type?.name !== MAILING_TYPE_NAME ? 0 : undefined }}>
              <div>
                <div className="archive-banner-name">🔒 {p.name}</div>
                <div className="archive-banner-meta">
                  {p.client?.school_name ?? ''}{p.client?.school_name && p.type ? ' · ' : ''}{p.type?.name ?? ''}
                  {' '}|{' '}הועבר לארכיון: {archivedDate}
                  {p.archived_at && <HebrewDate date={p.archived_at} />}
                </div>
              </div>
              <button className="btn-restore" onClick={() => handleRestore(p)}>♻️ שחזור</button>
            </div>
            {p.type?.name !== MAILING_TYPE_NAME && <RetentionChecklist project={p} />}
          </div>
        );
      })}
    </div>
  );
}
