'use client';

import React, { useState, useEffect } from 'react';
import { getClientToken, getClientUser, clearClientSession } from '../../lib/client-auth.js';
import NotificationBell from './NotificationBell.jsx';

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
  isOnline: isOnlineProp,
  user: userProp,
  onRoleChange,
  onLoginClick,
  onLogoutClick
}) {
  const [clientUser, setClientUser] = useState(null);
  const [networkOnline, setNetworkOnline] = useState(true);

  useEffect(() => {
    const syncUser = () => {
      const token = getClientToken();
      const storedUser = getClientUser();
      if (token && storedUser && (storedUser.email || storedUser.id)) {
        setClientUser(storedUser);
      } else {
        setClientUser(null);
      }
    };
    const syncOnline = () => {
      if (typeof navigator !== 'undefined') {
        setNetworkOnline(navigator.onLine !== false);
      }
    };

    syncUser();
    syncOnline();
    window.addEventListener('fnpss-auth-change', syncUser);
    window.addEventListener('storage', syncUser);
    window.addEventListener('online', syncOnline);
    window.addEventListener('offline', syncOnline);
    return () => {
      window.removeEventListener('fnpss-auth-change', syncUser);
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('online', syncOnline);
      window.removeEventListener('offline', syncOnline);
    };
  }, []);

  const isOnline = isOnlineProp !== undefined ? isOnlineProp : networkOnline;
  const activeUser = userProp || clientUser;
  const displayName = activeUser
    ? activeUser.name || activeUser.organizationName || [activeUser.firstName, activeUser.lastName].filter(Boolean).join(' ') || activeUser.email
    : '';
  const isStaffUser = activeUser && ['AGENT', 'CHEF_DIVISION', 'DG', 'MINISTERE', 'ADMIN'].includes(activeUser.role);

  const handleLogin = () => {
    if (onLoginClick) {
      onLoginClick();
      return;
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
  };

  const handleLogout = async () => {
    if (onLogoutClick) {
      onLogoutClick();
      return;
    }
    try {
      const token = getClientToken();
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken: token })
        });
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      clearClientSession();
      setClientUser(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
  };

  return (
    <div className="site-header-sticky">
      <div className="drc-ribbon" role="presentation" />
      <header className="site-header-bar">
        <a
          href="/"
          style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit' }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              background: '#ffffff',
              border: '2px solid var(--fnpss-orange)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3px',
              flexShrink: 0
            }}
          >
            <img
              src="/brand/logo-fnpss.png"
              alt="Logo officiel FNPSS"
              width={38}
              height={38}
              style={{ objectFit: 'contain', display: 'block' }}
            />
          </div>
          <div>
            <h1 style={{ fontSize: '16.5px', fontWeight: 800, color: '#ffffff', margin: 0, lineHeight: 1.2 }}>
              Guichet Unique Dématérialisé
            </h1>
            <p style={{ fontSize: '11.5px', color: '#cbd5e1', margin: 0, lineHeight: 1.2 }}>
              FNPSS &bull; <span style={{ color: '#fdba74', fontWeight: 600 }}>Le social dans la solidarité</span> &bull; RDC
            </p>
          </div>
        </a>

        {/* Navigation & Contrôles statut */}
        <nav aria-label="Navigation principale" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {activeUser && (
            <>
              <a
                href={isStaffUser ? '/admin' : '/dashboard'}
                style={{ color: '#f7d618', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}
              >
                {isStaffUser ? '🏛️ Console Back-Office' : '📋 Mon Tableau de Bord'}
              </a>
              {!isStaffUser && (
                <a
                  href="/applications/new"
                  style={{ color: '#fed7aa', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}
                >
                  ➕ Déposer un dossier
                </a>
              )}
            </>
          )}
          <a
            href="/guide"
            style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}
          >
            📘 Guide ONG
          </a>
          <a
            href="/verifier"
            style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}
          >
            🔍 Contrôle Douane DGDA
          </a>
          <span
            className="net-pill"
            role="status"
            style={{
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '11.5px',
              fontWeight: 600,
              background: isOnline ? '#e6f4ea' : '#fef7e0',
              color: isOnline ? '#137333' : '#92400e'
            }}
          >
            {isOnline ? '🟢 En ligne' : '🟠 Hors-ligne (PWA)'}
          </span>

          <NotificationBell />

          {activeUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <a
                href={isStaffUser ? '/admin' : '/profile'}
                style={{ fontSize: '12px', color: '#e2e8f0', textDecoration: 'none' }}
                title="Accéder à mon profil"
              >
                👤 <strong>{displayName}</strong> <span style={{ color: '#94a3b8' }}>({activeUser.role})</span>
              </a>
              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-sm btn-outline"
                style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.3)', background: 'transparent' }}
              >
                Déconnexion
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleLogin}
              className="btn btn-sm btn-brand"
            >
              Connexion
            </button>
          )}
        </nav>
      </header>
    </div>
  );
}
