'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getClientToken } from '../lib/client-auth.js';

const ROLE_LABELS = {
  REQUERANT: 'Requérant',
  AGENT: 'Agent instructeur',
  CHEF_DIVISION: 'Chef de division',
  DG: 'Direction Générale',
  MINISTERE: 'Ministère',
  ADMIN: 'Administrateur'
};

/**
 * Fil de discussion rattaché à un dossier (NOT-04) : échanges entre le requérant et les instructeurs FNPSS.
 */
export default function DossierThread({ referenceNumber, tokenOverride = '' }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);

  const headers = useCallback(() => {
    const token = tokenOverride || getClientToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }, [tokenOverride]);

  const load = useCallback(async () => {
    if (!referenceNumber) return;
    try {
      const res = await fetch(`/api/notifications?ref=${encodeURIComponent(referenceNumber)}`, { headers: headers() });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Impossible de charger les échanges.');
        return;
      }
      setError('');
      setMessages(data.messages || []);
    } catch {
      setError('Erreur réseau lors du chargement des échanges.');
    }
  }, [referenceNumber, headers]);

  useEffect(() => {
    setMessages([]);
    load();
  }, [load]);

  const send = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setIsSending(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ action: 'dossier-message', referenceNumber, message: draft.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Message non envoyé.');
      } else {
        setDraft('');
        setError('');
        await load();
      }
    } catch {
      setError('Erreur réseau : message non envoyé.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div>
      <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
        {messages.length === 0 && (
          <p className="text-muted" style={{ fontSize: '12.5px', margin: 0 }}>Aucun échange sur ce dossier pour le moment.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} style={{ background: m.authorRole === 'REQUERANT' ? '#eef6fc' : '#f8fafc', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
              <strong>{ROLE_LABELS[m.authorRole] || m.authorRole}</strong>
              <span>{m.timestamp ? new Date(m.timestamp).toLocaleString('fr-FR') : ''}</span>
            </div>
            <div style={{ fontSize: '12.5px' }}>{m.message}</div>
          </div>
        ))}
      </div>
      {error && (
        <div role="alert" style={{ background: '#fce8e6', color: '#b31412', borderLeft: '4px solid var(--fnpss-red)', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', marginBottom: '8px' }}>
          {error}
        </div>
      )}
      <form onSubmit={send} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          className="form-control"
          style={{ flex: 1 }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Écrire un message sur ce dossier…"
          aria-label="Message sur le dossier"
        />
        <button type="submit" className="btn btn-sm btn-primary" disabled={isSending || !draft.trim()}>
          Envoyer
        </button>
        <button type="button" className="btn btn-sm btn-outline" onClick={load} title="Actualiser les échanges">
          ↻
        </button>
      </form>
    </div>
  );
}

