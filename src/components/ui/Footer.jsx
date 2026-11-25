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
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <img
            src="/brand/logo-fnpss.png"
            alt="Logo FNPSS"
            width={40}
            height={40}
            style={{ objectFit: 'contain', borderRadius: '6px', flexShrink: 0 }}
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
        <div className="site-footer-meta">
          <span>Sécurisé par SHA-256, AES-256-GCM &amp; Polygon Amoy Blockchain</span>
          <span>SLA légal : 10 jours ouvrables &bull; Vérification douanière DGDA 24/7</span>
          <div className="site-footer-links">
            <a href="/guide" style={{ color: 'var(--fnpss-blue)', textDecoration: 'none', fontWeight: 600 }}>Guide ONG</a>
            <a href="/verifier" style={{ color: 'var(--fnpss-blue)', textDecoration: 'none', fontWeight: 600 }}>Vérification Douane</a>
            <a href="/design-system" style={{ color: 'var(--fnpss-blue)', textDecoration: 'none', fontWeight: 600 }}>Design System UI</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
