'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import type { Lead, LeadStatus } from '@/lib/lead-types';
import { getLeads, deleteLead } from '@/lib/leads';
import LeadCard from '@/components/LeadCard';
import LeadModal from '@/components/LeadModal';

const STATUS_TABS: { key: LeadStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'כולם' },
  { key: 'open', label: 'פתוחים' },
  { key: 'won', label: 'נסגרו' },
  { key: 'lost', label: 'לא סגרו' },
];

export default function LeadsPage() {
  const { currentWorker, darkMode, toggleDark } = useApp();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [statusTab, setStatusTab] = useState<LeadStatus | 'all'>('open');
  const [search, setSearch] = useState('');

  async function load() {
    const data = await getLeads();
    setLeads(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter(l => {
      const matchTab = statusTab === 'all' || l.status === statusTab;
      const matchQ = !q || [l.name, l.school_name, l.city, l.notes].join(' ').toLowerCase().includes(q);
      return matchTab && matchQ;
    });
  }, [leads, statusTab, search]);

  const counts = useMemo(() => ({
    open: leads.filter(l => l.status === 'open').length,
    won: leads.filter(l => l.status === 'won').length,
    lost: leads.filter(l => l.status === 'lost').length,
  }), [leads]);

  async function handleDelete(id: number) {
    if (!confirm('למחוק את הליד?')) return;
    await deleteLead(id);
    await load();
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
          <h1>🎯 לידים</h1>
          <div className="header-right">
            {currentWorker && <span className="worker-greeting">👋 שלום, {currentWorker.name}</span>}
            <Link href="/" className="btn-settings" style={{ textDecoration: 'none', color: '#555' }}>📋 פרויקטים</Link>
            <Link href="/clients" className="btn-settings" style={{ textDecoration: 'none', color: '#555' }}>👥 לקוחות</Link>
            <button className="btn-settings" onClick={toggleDark}>{darkMode ? '☀️' : '🌙'}</button>
          </div>
        </div>
        <div className="header-row header-row-bottom">
          <div className="view-toggle">
            {STATUS_TABS.map(t => (
              <button
                key={t.key}
                className={`view-btn${statusTab === t.key ? ' active' : ''}`}
                onClick={() => setStatusTab(t.key)}
              >
                {t.label}
                {t.key !== 'all' && counts[t.key] > 0 && (
                  <span style={{ marginRight: 4, fontSize: 11, opacity: 0.7 }}>({counts[t.key]})</span>
                )}
              </button>
            ))}
          </div>
          <button className="btn-add" onClick={() => { setEditLead(null); setModalOpen(true); }}>+ ליד חדש</button>
        </div>
      </header>

      <div className="container">
        <div className="stats">
          <div className="stat">
            <div className="stat-num">{leads.length}</div>
            <div className="stat-label">סה"כ לידים</div>
          </div>
          <div className="stat">
            <div className="stat-num" style={{ color: '#4A7DFF' }}>{counts.open}</div>
            <div className="stat-label">פתוחים</div>
          </div>
          <div className="stat">
            <div className="stat-num" style={{ color: '#32FF9D' }}>{counts.won}</div>
            <div className="stat-label">נסגרו</div>
          </div>
          <div className="stat">
            <div className="stat-num" style={{ color: '#FF3232' }}>{counts.lost}</div>
            <div className="stat-label">לא סגרו</div>
          </div>
        </div>

        <div className="filters" style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="🔍  חיפוש..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            {statusTab === 'open' ? 'אין לידים פתוחים' : 'לא נמצאו לידים'}
          </div>
        ) : (
          <div className="cards">
            {filtered.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onEdit={() => { setEditLead(lead); setModalOpen(true); }}
                onDelete={() => handleDelete(lead.id)}
                onUpdate={load}
              />
            ))}
          </div>
        )}
      </div>

      <LeadModal
        lead={editLead}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={async () => { await load(); }}
      />
    </>
  );
}
