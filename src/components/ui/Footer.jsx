import React from 'react';

/**
 * Pied de page officiel souverain FNPSS (UX-05)
 */
export default function Footer() {
  return (
    <footer
      style={{
        background: '#ffffff',
        borderTop: '3px solid var(--fnpss-orange)',
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
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/brand/logo-fnpss.png"
            alt="Logo FNPSS"
            width={40}
            height={40}
            style={{ objectFit: 'contain', borderRadius: '6px' }}
          />
          <div>
            <strong style={{ color: 'var(--fnpss-navy)' }}>Fonds National de Promotion et de Service Social (FNPSS)</strong>
            <span style={{ color: 'var(--fnpss-orange-accessible)', fontWeight: 700, marginLeft: '8px' }}>
              &laquo; Le social dans la solidarité &raquo;
            </span>
            <br />
            Sous tutelle du Ministère des Affaires Sociales, Actions Humanitaires et Solidarité Nationale &bull; République Démocratique du Congo
          </div>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span>Sécurisé par SHA-256, AES-256-GCM &amp; Polygon Amoy Blockchain</span>
          <span>SLA légal : 10 jours ouvrables &bull; Vérification douanière DGDA 24/7</span>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: '2px' }}>
            <a href="/guide" style={{ color: 'var(--fnpss-blue)', textDecoration: 'none', fontWeight: 600 }}>Guide ONG</a>
            <a href="/verifier" style={{ color: 'var(--fnpss-blue)', textDecoration: 'none', fontWeight: 600 }}>Vérification Douane</a>
            <a href="/design-system" style={{ color: 'var(--fnpss-blue)', textDecoration: 'none', fontWeight: 600 }}>Design System UI</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
