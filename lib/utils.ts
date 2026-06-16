import type { Urgency, Status } from './types';

export function formatTime(ms: number): string {
  if (!ms || ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function parseTimeInput(val: string): number | null {
  const parts = val.trim().split(':').map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return ((parts[0] * 3600) + (parts[1] * 60) + parts[2]) * 1000;
  if (parts.length === 2) return ((parts[0] * 60) + parts[1]) * 60000;
  if (parts.length === 1) return parts[0] * 60000;
  return null;
}

export function getUrgency(eventDate: string | null): Urgency | null {
  if (!eventDate) return null;
  const days = Math.ceil(
    (new Date(eventDate).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000
  );
  if (days < 0) return null;
  if (days <= 6) return { level: 'danger', days, label: `🚨 ${days} ימים לאירוע!` };
  if (days <= 11) return { level: 'warn', days, label: `⚠️ ${days} ימים לאירוע` };
  return null;
}

export function formatEventDate(d: string | null): string {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export function linkifyContact(text: string): string {
  return text.replace(
    /[\w.+-]+@[\w-]+\.[a-z.]+/gi,
    email => `<a href="mailto:${email}" style="color:#4A7DFF;text-decoration:none;border-bottom:1px solid #8FB3FF">${email}</a>`
  );
}

const STATUS_PALETTE = [
  { bg: '#EBF1FF', color: '#1A4FCC' },
  { bg: '#E0F5FF', color: '#0077AA' },
  { bg: '#FFF9CC', color: '#8A6200' },
  { bg: '#FFE4CC', color: '#9A4000' },
  { bg: '#C0FFE4', color: '#0A6640' },
  { bg: '#FCE0FF', color: '#8800AA' },
  { bg: '#FFE5E5', color: '#CC0000' },
];

export function getStatusStyle(status: Status | undefined, statuses: Status[]): { bg: string; color: string } | null {
  if (!status) return null;
  if (status.name.includes('ננעל')) return { bg: '#F1EFE8', color: '#5F5E5A' };
  const idx = statuses.findIndex(s => s.id === status.id);
  if (idx >= 0) return STATUS_PALETTE[idx % STATUS_PALETTE.length];
  return null;
}

export function wid(name: string): string {
  return name.replace(/\s/g, '_');
}

export function exportToCsv(rows: string[][], filename: string): void {
  const BOM = '﻿';
  const csv = BOM + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = filename;
  a.click();
}
