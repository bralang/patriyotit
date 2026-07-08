import { createClient } from './supabase';

export type RetentionStation = {
  id: number;
  project_id: number;
  station_index: number;
  done: boolean;
  done_at: string | null;
  notes: string | null;
};

export const STATION_DEFS = [
  {
    index: 1,
    title: 'בדיקת קבלת קבצים',
    desc: 'יומיים אחרי נעילה — הודעה שהסתדרת עם הקבצים',
    getDueDate: (lockedAt: string | null, _eventDate: string | null) =>
      lockedAt ? addDays(lockedAt, 2) : null,
  },
  {
    index: 2,
    title: 'משוב חוויתי',
    desc: 'שבוע אחרי האירוע — טופס משוב דיגיטלי',
    getDueDate: (_lockedAt: string | null, eventDate: string | null) =>
      eventDate ? addDays(eventDate, 7) : null,
  },
  {
    index: 3,
    title: 'ברכה + מתנה פיזית',
    desc: 'בוקר האירוע — ברכה חמה ומתנה (לפי חבילה)',
    getDueDate: (_lockedAt: string | null, eventDate: string | null) =>
      eventDate ? eventDate : null,
  },
  {
    index: 4,
    title: 'שיתוף ברשימת תפוצה',
    desc: 'עד שבועיים-שלושה אחרי — מייל שיתוף + הודעה אישית יום לפני',
    getDueDate: (_lockedAt: string | null, eventDate: string | null) =>
      eventDate ? addDays(eventDate, 14) : null,
  },
  {
    index: 5,
    title: 'ד"ש נוסטלגי',
    desc: 'תקופה מקבילה בשנה הבאה — תזכורת חמה על הפרויקט',
    getDueDate: (_lockedAt: string | null, eventDate: string | null) =>
      eventDate ? addDays(eventDate, 365) : null,
  },
] as const;

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDueDate(dateStr: string | null): { label: string; urgent: boolean; overdue: boolean } {
  if (!dateStr) return { label: 'אין תאריך', urgent: false, overdue: false };
  const due = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.round((due.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0) return { label: `באיחור ${Math.abs(diffDays)} ימים`, urgent: false, overdue: true };
  if (diffDays === 0) return { label: 'היום!', urgent: true, overdue: false };
  if (diffDays <= 3) return { label: `בעוד ${diffDays} ימים`, urgent: true, overdue: false };
  return {
    label: due.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' }),
    urgent: false,
    overdue: false,
  };
}

export async function getRetentionStations(projectId: number): Promise<RetentionStation[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('retention_stations')
    .select('*')
    .eq('project_id', projectId)
    .order('station_index');
  return data ?? [];
}

export async function toggleRetentionStation(
  projectId: number,
  stationIndex: number,
  done: boolean
): Promise<void> {
  const supabase = createClient();
  await supabase.from('retention_stations').upsert(
    {
      project_id: projectId,
      station_index: stationIndex,
      done,
      done_at: done ? new Date().toISOString() : null,
    },
    { onConflict: 'project_id,station_index' }
  );
}

export async function updateRetentionNote(
  projectId: number,
  stationIndex: number,
  notes: string
): Promise<void> {
  const supabase = createClient();
  await supabase.from('retention_stations').upsert(
    { project_id: projectId, station_index: stationIndex, notes },
    { onConflict: 'project_id,station_index' }
  );
}
