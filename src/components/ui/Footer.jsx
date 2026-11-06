import React from 'react';

/**
 * Pied de page officiel souverain FNPSS (UX-05)
 */
export default function Footer() {
  return (
    <footer
      style={{
        background: '#ffffff',
        borderTop: '1px solid var(--border)',
        padding: '24px 20px',
        marginTop: 'auto',
        fontSize: '12.5px',
        color: 'var(--text-muted)'
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <strong style={{ color: 'var(--fnpss-navy)' }}>Fonds National de Promotion et de Service Social (FNPSS)</strong>
          <br />
          Sous tutelle du Ministère des Affaires Sociales, Actions Humanitaires et Solidarité Nationale &bull; République Démocratique du Congo
        </div>
        <div style={{ textAlign: 'right' }}>
          <span>Sécurisé par SHA-256 & Polygon Amoy Blockchain</span>
          <br />
          <span>SLA légal : 10 jours ouvrables &bull; Vérification douanière DGDA 24/7</span>
        </div>
      </div>
    </footer>
  );
}
