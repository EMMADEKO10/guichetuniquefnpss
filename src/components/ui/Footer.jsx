import React from 'react';

/**
 * Pied de page officiel souverain FNPSS (aligné sur https://www.fnpss.org/)
 */
export default function Footer() {
  return (
    <footer
      style={{
        background: '#ffffff',
        borderTop: '4px solid var(--fnpss-blue)',
        padding: '28px 20px 20px',
        marginTop: 'auto',
        fontSize: '12.5px',
        color: 'var(--text-muted)'
      }}
    >
      <div className="site-footer-grid">
        <div>
          <img
            src="/brand/logo-fnpss-horizontal.webp"
            alt="Logo officiel horizontal FNPSS — Fonds National de Promotion et de Service Social"
            width={230}
            height={78}
            style={{ objectFit: 'contain', maxWidth: '100%', height: 'auto', display: 'block', marginBottom: '10px' }}
          />
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: '12px' }}>
            Établissement Public (Décret n°13/007 du 23 janvier 2013) placé sous la tutelle du{' '}
            <strong style={{ color: 'var(--fnpss-navy)' }}>
              Ministère des Affaires Sociales, Actions Humanitaires et Solidarité Nationale
            </strong>{' '}
            &mdash; République Démocratique du Congo.
          </p>
          <div
            style={{
              display: 'inline-block',
              background: '#ffffff',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '6px 10px'
            }}
          >
            <div className="ministere-logo-crop">
              <img
                src="/brand/logo-ministere-affaires-sociales.webp"
                alt="Logo officiel du Ministère des Affaires Sociales, Actions Humanitaires et Solidarité Nationale"
                width={210}
                height={74}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '13.5px', color: 'var(--fnpss-navy)', marginBottom: '10px' }}>
            Siège Social &amp; Contact Officiel
          </h3>
          <div style={{ display: 'grid', gap: '6px', fontSize: '12.5px', lineHeight: 1.5 }}>
            <div>
              <strong style={{ color: 'var(--fnpss-navy)' }}>Adresse :</strong>{' '}
              Croisement Boulevard du 30 Juin &amp; Avenue Batetela, Kinshasa-Gombe, RDC
            </div>
            <div>
              <strong style={{ color: 'var(--fnpss-navy)' }}>Email :</strong>{' '}
              <a href="mailto:contact@fnpss.org" style={{ color: 'var(--fnpss-blue)', textDecoration: 'none', fontWeight: 600 }}>
                contact@fnpss.org
              </a>
            </div>
            <div>
              <strong style={{ color: 'var(--fnpss-navy)' }}>Téléphone :</strong>{' '}
              <span className="mono">+243 808 998 117</span>
            </div>
            <div>
              <strong style={{ color: 'var(--fnpss-navy)' }}>Portail institutionnel :</strong>{' '}
              <a
                href="https://www.fnpss.org/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--fnpss-blue)', textDecoration: 'none', fontWeight: 700 }}
              >
                www.fnpss.org
              </a>
            </div>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '13.5px', color: 'var(--fnpss-navy)', marginBottom: '10px' }}>
            Guichet Unique &amp; Garanties
          </h3>
          <div style={{ display: 'grid', gap: '6px', marginBottom: '12px' }}>
            <a href="/applications/new" style={{ color: 'var(--fnpss-blue)', textDecoration: 'none', fontWeight: 600 }}>
              Déposer un dossier en ligne (S1–S6)
            </a>
            <a href="/verifier" style={{ color: 'var(--fnpss-blue)', textDecoration: 'none', fontWeight: 600 }}>
              Contrôle Douane DGDA (Scan QR)
            </a>
            <a href="/guide" style={{ color: 'var(--fnpss-blue)', textDecoration: 'none', fontWeight: 600 }}>
              Guide pratique ONG &amp; ASBL
            </a>
            <a href="/design-system" style={{ color: 'var(--fnpss-blue)', textDecoration: 'none', fontWeight: 600 }}>
              Charte Graphique &amp; Design System UI
            </a>
          </div>
          <div style={{ fontSize: '11.5px', lineHeight: 1.5, background: 'var(--surface-subtle)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            Sécurisé par SHA-256, AES-256-GCM &amp; Polygon Amoy Blockchain.
            <br />
            SLA légal : 10 jours ouvrables &bull; Vérification douanière DGDA 24/7.
          </div>
        </div>
      </div>

      <div className="site-footer-bottom">
        <span>Fonds National de Promotion et de Service Social (FNPSS) &mdash; &laquo; Le social dans la solidarité &raquo;</span>
        <span>Investissements sociaux, Partenariats &amp; Dons en République Démocratique du Congo</span>
      </div>
    </footer>
  );
}
