'use client';
import { useState } from 'react';
import type { Project } from '@/lib/types';
import { getUrgency } from '@/lib/utils';
import HebrewDate from './HebrewDate';

interface Props {
  projects: Project[];
  onEdit: (id: number) => void;
  onClose: () => void;
}

const MONTH_NAMES = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const DAY_NAMES = ['א','ב','ג','ד','ה','ו','ש'];

export default function CalendarView({ projects, onEdit, onClose }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const today = new Date();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dateMap: Record<number, Project[]> = {};
  projects.forEach(p => {
    if (!p.event_date) return;
    const [y, m, d] = p.event_date.split('-').map(Number);
    if (y === year && m === month + 1) {
      if (!dateMap[d]) dateMap[d] = [];
      dateMap[d].push(p);
    }
  });

  function prev() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function next() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 800 }}>
        <h2>📅 לוח שנה</h2>
        <div className="cal-header">
          <button className="cal-nav" onClick={prev}>◄</button>
          <strong style={{ fontSize: 16 }}>{MONTH_NAMES[month]} {year}</strong>
          <button className="cal-nav" onClick={next}>►</button>
        </div>
        <div className="cal-grid">
          {DAY_NAMES.map(d => <div key={d} className="cal-day-name">{d}</div>)}
          {Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} className="cal-day other-month" />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = i + 1;
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
            return (
              <div key={d} className={`cal-day${isToday ? ' today' : ''}`}>
                <div className="cal-day-num">{d}<HebrewDate date={`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`} /></div>
                {(dateMap[d] ?? []).map(p => {
                  const u = getUrgency(p.event_date);
                  return (
                    <div
                      key={p.id}
                      className={`cal-event${u?.level === 'danger' ? ' urgent' : u?.level === 'warn' ? ' warn' : ''}`}
                      onClick={() => onEdit(p.id)}
                      title={p.name}
                    >
                      {p.name}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>סגירה</button>
        </div>
      </div>
    </div>
  );
}
