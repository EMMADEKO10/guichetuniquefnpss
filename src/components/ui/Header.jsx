import React from 'react';

/**
 * En-tête officiel souverain FNPSS (UX-05, WCAG AA)
 * @param {Object} props
 * @param {string} [props.currentRole='requerant']
 * @param {boolean} [props.isOnline=true]
 * @param {Object} [props.user]
 * @param {(role: string) => void} [props.onRoleChange]
 * @param {() => void} [props.onLoginClick]
 * @param {() => void} [props.onLogoutClick]
 */
export default function Header({
  currentRole = 'requerant',
  isOnline = true,
  user,
  onRoleChange,
  onLoginClick,
  onLogoutClick
}) {
  return (
    <>
      <div className="drc-ribbon" role="presentation" />
      <header
        style={{
          background: 'var(--fnpss-navy)',
          color: '#ffffff',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #007fff, #065a82)',
              border: '2px solid #f7d618',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '14px',
              letterSpacing: '0.5px',
              color: '#ffffff'
            }}
            aria-hidden="true"
          >
            FNPSS
          </div>
          <div>
            <h1 style={{ fontSize: '17px', fontWeight: 700, color: '#ffffff', margin: 0, lineHeight: 1.2 }}>
              Guichet Unique Dématérialisé
            </h1>
            <p style={{ fontSize: '11.5px', color: '#b0c4de', margin: 0, lineHeight: 1.2 }}>
              Fonds National de Promotion et de Service Social &bull; RDC
            </p>
          </div>
        </div>

        {/* Contrôles statut & réseau */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <a
            href="/guide"
            style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}
          >
            📘 Guide ONG &amp; Formations
          </a>
          <a
            href="/verifier"
            style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}
          >
            🔍 Contrôle Douane DGDA
          </a>
          <span
            className="net-pill"
            style={{
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '11.5px',
              fontWeight: 600,
              background: isOnline ? '#e6f4ea' : '#fef7e0',
              color: isOnline ? '#137333' : '#b06000'
            }}
          >
            {isOnline ? '🟢 En ligne (Sync active)' : '🟠 Mode Hors-ligne (PWA)'}
          </span>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#e2e8f0' }}>
                👤 <strong>{user.name}</strong> ({user.role})
              </span>
              <button
                type="button"
                onClick={onLogoutClick}
                className="btn btn-sm btn-outline"
                style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.3)', background: 'transparent' }}
              >
                Déconnexion
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLoginClick}
              className="btn btn-sm btn-accent"
            >
              Connexion Requérant
            </button>
          )}
        </div>
      </header>
    </>
  );
}

