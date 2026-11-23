import React from 'react';

/**
 * Frise de progression permanente du dossier (6 étapes).
 * Toujours accompagnée d'icônes et de libellés (jamais la couleur seule).
 */
export default function StatusStepper({ application, compact = false }) {
  if (!application) return null;

  const isRejected = application.status === 'REJETE';
  const isRevoked = application.status === 'REVOQUE';
  const isComplement = application.status === 'COMPLEMENT_REQUIS';
  const isDelivered = application.status === 'VALIDE_DELIVRE';

  const hasPayment = Boolean(application.paymentValidated);
  const hasOpinion = Boolean(application.divisionOpinion);
  const hasCert = Boolean(application.certificate);
  const hasCosign = Boolean(application.ministryCoSigned);

  const steps = [
    {
      key: 'depot',
      label: 'Dépôt',
      state: 'done',
      icon: '✓'
    },
    {
      key: 'quittance',
      label: 'Quittance',
      state: hasPayment ? 'done' : isRejected ? 'error' : isComplement ? 'paused' : 'current',
      icon: hasPayment ? '✓' : isRejected ? '✕' : isComplement ? '⏸' : '2'
    },
    {
      key: 'division',
      label: 'Avis Division',
      state: hasOpinion ? 'done' : isRejected && hasPayment ? 'error' : isComplement && hasPayment ? 'paused' : hasPayment ? 'current' : 'pending',
      icon: hasOpinion ? '✓' : isRejected && hasPayment ? '✕' : isComplement && hasPayment ? '⏸' : '3'
    },
    {
      key: 'dg',
      label: isRejected ? 'Rejeté DG' : 'Décision DG',
      state: isRejected ? 'error' : (isDelivered || isRevoked) ? 'done' : hasOpinion ? 'current' : 'pending',
      icon: isRejected ? '✕' : (isDelivered || isRevoked) ? '✓' : '4'
    },
    {
      key: 'seal',
      label: isRevoked ? 'Révoqué' : 'Scellement',
      state: isRevoked ? 'error' : hasCert ? 'done' : 'pending',
      icon: isRevoked ? '!' : hasCert ? '⛓' : '5'
    },
    {
      key: 'cosign',
      label: 'Co-signature',
      state: hasCosign ? 'done' : hasCert && !isRevoked ? 'current' : 'pending',
      icon: hasCosign ? '✓' : '6'
    }
  ];

  return (
    <div
      className="stepper"
      role="list"
      aria-label={`Progression du dossier ${application.referenceNumber || ''}`}
      style={compact ? { gap: '2px' } : undefined}
    >
      {steps.map((s) => {
        const cls =
          s.state === 'done'
            ? 'is-done'
            : s.state === 'current'
            ? 'is-current'
            : s.state === 'paused'
            ? 'is-paused'
            : s.state === 'error'
            ? 'is-error'
            : '';

        return (
          <div
            key={s.key}
            role="listitem"
            className={`stepper-step ${cls}`}
            style={compact ? { minWidth: '58px' } : undefined}
          >
            <div className="stepper-dot" aria-hidden="true" style={compact ? { width: '20px', height: '20px', fontSize: '10px' } : undefined}>
              {s.icon}
            </div>
            <span className="stepper-label" style={compact ? { fontSize: '10px' } : undefined}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
