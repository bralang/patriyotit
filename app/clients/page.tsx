'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Client } from '@/lib/types';
import { getClientWithProjectCount, deleteClient } from '@/lib/clients';
import ClientModal from '@/components/ClientModal';

export default function ClientsPage() {
  const [clients, setClients] = useState<(Client & { project_count: number })[]>([]);
  const [search, setSearch] = useState('');
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const data = await getClientWithProjectCount();
    setClients(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = clients.filter(c => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [c.school_name, c.city, c.contact_name, c.email, c.phone].join(' ').toLowerCase().includes(q);
  });

  async function handleDelete(c: Client) {
    if (!confirm(`למחוק את הלקוח "${c.school_name}"?\n(הפרויקטים המקושרים יישארו ללא לקוח)`)) return;
    await deleteClient(c.id);
    load();
  }

  return (
    <>
      <header>
        <h1>👥 ניהול לקוחות</h1>
        <div className="header-right">
          <Link href="/" className="btn-settings" style={{ textDecoration: 'none', color: '#555' }}>← חזרה לפרויקטים</Link>
          <button className="btn-add" onClick={() => { setEditClient(null); setModalOpen(true); }}>+ לקוח חדש</button>
        </div>
      </header>

      <div className="container">
        <div className="filters" style={{ marginBottom: 20 }}>
          <input
            type="text"
            placeholder="🔍  חיפוש לקוחות..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="empty">טוענת...</div>
        ) : filtered.length === 0 ? (
          <div className="empty">לא נמצאו לקוחות</div>
        ) : (
          <div className="clients-grid">
            {filtered.map(c => (
              <div key={c.id} className="client-card">
                <div className="client-card-name">{c.school_name}</div>
                <div className="client-card-meta">
                  {c.city && <span>📍 {c.city}</span>}
                  {c.institution_type && <span>🏫 {c.institution_type}</span>}
                  {c.contact_name && <span>👤 {c.contact_name}</span>}
                  {c.phone && <span>📞 <a href={`tel:${c.phone}`} style={{ color: '#4A7DFF', textDecoration: 'none' }}>{c.phone}</a></span>}
                  {c.email && <span>✉️ <a href={`mailto:${c.email}`} style={{ color: '#4A7DFF', textDecoration: 'none' }}>{c.email}</a></span>}
                  {c.notes && <span style={{ color: '#888', marginTop: 4 }}>{c.notes}</span>}
                </div>
                <div className="client-card-footer">
                  <span className="project-count">📋 {c.project_count} פרויקטים</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-edit" onClick={() => { setEditClient(c); setModalOpen(true); }}>✏️</button>
                    <button className="btn-delete" onClick={() => handleDelete(c)}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ClientModal
        client={editClient}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={() => { setModalOpen(false); load(); }}
      />
    </>
  );
}
