import React from 'react';

/**
 * Signal permanent de délai réglementaire SLA (10 jours ouvrables).
 */
export default function SlaIndicator({ application }) {
  if (!application) return null;

  const { status, paymentValidated, slaPaused, slaDueAt } = application;

  if (status === 'VALIDE_DELIVRE') {
    return (
      <span className="sla-pill" style={{ background: '#e6f4ea', color: '#137333', borderColor: '#bbf7d0' }}>
        ✓ Délivré dans les délais
      </span>
    );
  }
  if (status === 'REVOQUE') {
    return (
      <span className="sla-pill" style={{ background: '#202124', color: '#ffffff' }}>
        ⛔ Acte révoqué
      </span>
    );
  }
  if (status === 'REJETE') {
    return (
      <span className="sla-pill" style={{ background: '#fef2f2', color: '#991b1b', borderColor: '#fecaca' }}>
        ✕ Clôturé (rejeté)
      </span>
    );
  }
  if (slaPaused || status === 'COMPLEMENT_REQUIS') {
    return (
      <span className="sla-pill" style={{ background: '#fffbeb', color: '#92400e', borderColor: '#fde68a' }}>
        ⏸ SLA en pause (complément)
      </span>
    );
  }
  if (!paymentValidated || !slaDueAt) {
    return (
      <span className="sla-pill" style={{ background: '#eff6ff', color: '#1e40af', borderColor: '#bfdbfe' }}>
        ⏳ SLA 10j démarre après quittance
      </span>
    );
  }

  const dueDate = new Date(slaDueAt);
  const diffDays = Math.ceil((dueDate.getTime() - Date.now()) / 86400000);
  const dateFr = Number.isNaN(dueDate.getTime()) ? '' : dueDate.toLocaleDateString('fr-FR');

  if (diffDays <= 0) {
    return (
      <span className="sla-pill" style={{ background: '#fef2f2', color: '#991b1b', borderColor: '#fca5a5' }}>
        🔴 SLA dépassé ({dateFr})
      </span>
    );
  }
  if (diffDays <= 2) {
    return (
      <span className="sla-pill" style={{ background: '#fef2f2', color: '#991b1b', borderColor: '#fecaca' }}>
        🔴 J-{diffDays} restant{diffDays > 1 ? 's' : ''} ({dateFr})
      </span>
    );
  }
  if (diffDays <= 5) {
    return (
      <span className="sla-pill" style={{ background: '#fff7ed', color: '#9a3412', borderColor: '#fed7aa' }}>
        🟠 J-{diffDays} restants ({dateFr})
      </span>
    );
  }
  return (
    <span className="sla-pill" style={{ background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }}>
      🟢 J-{diffDays} restants ({dateFr})
    </span>
  );
}
