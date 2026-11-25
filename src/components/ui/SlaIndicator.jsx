import React from 'react';
import AppIcon from './AppIcon.jsx';

/**
 * Signal permanent de délai réglementaire SLA (10 jours ouvrables).
 */
export default function SlaIndicator({ application }) {
  if (!application) return null;

  const { status, paymentValidated, slaPaused, slaDueAt } = application;

  if (status === 'VALIDE_DELIVRE') {
    return (
      <span className="sla-pill" style={{ background: '#e6f4ea', color: '#137333', borderColor: '#bbf7d0' }}>
        <AppIcon name="check" size="xs" />
        <span>Délivré dans les délais</span>
      </span>
    );
  }
  if (status === 'REVOQUE') {
    return (
      <span className="sla-pill" style={{ background: '#202124', color: '#ffffff' }}>
        <AppIcon name="revoked" size="xs" />
        <span>Acte révoqué</span>
      </span>
    );
  }
  if (status === 'REJETE') {
    return (
      <span className="sla-pill" style={{ background: '#fef2f2', color: '#991b1b', borderColor: '#fecaca' }}>
        <AppIcon name="close" size="xs" />
        <span>Clôturé (rejeté)</span>
      </span>
    );
  }
  if (slaPaused || status === 'COMPLEMENT_REQUIS') {
    return (
      <span className="sla-pill" style={{ background: '#fffbeb', color: '#92400e', borderColor: '#fde68a' }}>
        <AppIcon name="pause" size="xs" />
        <span>SLA en pause (complément)</span>
      </span>
    );
  }
  if (!paymentValidated || !slaDueAt) {
    return (
      <span className="sla-pill" style={{ background: '#eff6ff', color: '#1e40af', borderColor: '#bfdbfe' }}>
        <AppIcon name="hourglass" size="xs" />
        <span>SLA 10j démarre après quittance</span>
      </span>
    );
  }

  const dueDate = new Date(slaDueAt);
  const diffDays = Math.ceil((dueDate.getTime() - Date.now()) / 86400000);
  const dateFr = Number.isNaN(dueDate.getTime()) ? '' : dueDate.toLocaleDateString('fr-FR');

  if (diffDays <= 0) {
    return (
      <span className="sla-pill" style={{ background: '#fef2f2', color: '#991b1b', borderColor: '#fca5a5' }}>
        <span className="status-dot status-dot-red" aria-hidden="true" />
        <span>SLA dépassé ({dateFr})</span>
      </span>
    );
  }
  if (diffDays <= 2) {
    return (
      <span className="sla-pill" style={{ background: '#fef2f2', color: '#991b1b', borderColor: '#fecaca' }}>
        <span className="status-dot status-dot-red" aria-hidden="true" />
        <span>J-{diffDays} restant{diffDays > 1 ? 's' : ''} ({dateFr})</span>
      </span>
    );
  }
  if (diffDays <= 5) {
    return (
      <span className="sla-pill" style={{ background: '#fff7ed', color: '#9a3412', borderColor: '#fed7aa' }}>
        <span className="status-dot status-dot-orange" aria-hidden="true" />
        <span>J-{diffDays} restants ({dateFr})</span>
      </span>
    );
  }
  return (
    <span className="sla-pill" style={{ background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }}>
      <span className="status-dot status-dot-green" aria-hidden="true" />
      <span>J-{diffDays} restants ({dateFr})</span>
    </span>
  );
}
