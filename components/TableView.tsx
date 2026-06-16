'use client';
import type { Project } from '@/lib/types';
import { useApp } from '@/context/AppContext';
import { getUrgency, formatEventDate, getStatusStyle } from '@/lib/utils';
import HebrewDate from './HebrewDate';

interface Props {
  projects: Project[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function TableView({ projects, onEdit, onDelete }: Props) {
  const { settings, currentWorker } = useApp();

  if (!projects.length) return <div className="empty">לא נמצאו פרויקטים</div>;

  return (
    <table className="table-view">
      <thead>
        <tr>
          <th>שם פרויקט</th>
          <th>לקוח</th>
          <th>סוג</th>
          <th>סטטוס</th>
          <th>חבילה</th>
          <th>תאריך אירוע</th>
          <th>עובדות</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {projects.map(p => {
          const isMe = currentWorker && p.workers?.some(w => w.id === currentWorker.id);
          const isLocked = p.status?.name.includes('ננעל');
          const urgency = getUrgency(p.event_date);
          const statusStyle = getStatusStyle(p.status, settings.statuses);
          return (
            <tr key={p.id} className={`${isMe ? 'mine-row' : ''} ${isLocked ? 'locked-row' : ''}`}>
              <td><strong>{p.name}</strong>{isLocked ? ' 🔒' : ''}</td>
              <td>{p.client ? `${p.client.school_name}${p.client.city ? ` · ${p.client.city}` : ''}` : '—'}</td>
              <td>{p.type ? <span className="badge badge-type">{p.type.name}</span> : ''}</td>
              <td>
                {p.status ? (
                  <span className="badge" style={statusStyle ? { background: statusStyle.bg, color: statusStyle.color } : {}}>
                    {p.status.name}
                  </span>
                ) : <span className="badge badge-none">—</span>}
              </td>
              <td>{p.package ? <span className="badge badge-package">{p.package.name}</span> : ''}</td>
              <td>
                {p.event_date ? (
                  urgency ? (
                    <span className={`urgency-${urgency.level}`}>{urgency.label}<HebrewDate date={p.event_date} /></span>
                  ) : (
                    <span className="event-date-label">📅 {formatEventDate(p.event_date)}<HebrewDate date={p.event_date} /></span>
                  )
                ) : '—'}
              </td>
              <td>
                {(p.workers ?? []).map(w => (
                  <span key={w.id} className={`worker-badge${currentWorker?.id === w.id ? ' me' : ''}`}>{w.name}</span>
                ))}
              </td>
              <td>
                <button className="btn-edit" onClick={() => onEdit(p.id)}>✏️</button>
                {' '}
                <button className="btn-delete" onClick={() => onDelete(p.id)}>🗑️</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
