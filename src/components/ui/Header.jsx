'use client';

import React, { useState, useEffect } from 'react';
import { getClientToken, getClientUser, clearClientSession } from '../../lib/client-auth.js';

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
  user: userProp,
  onRoleChange,
  onLoginClick,
  onLogoutClick
}) {
  const [clientUser, setClientUser] = useState(null);

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
    syncUser();
    window.addEventListener('fnpss-auth-change', syncUser);
    window.addEventListener('storage', syncUser);
    return () => {
      window.removeEventListener('fnpss-auth-change', syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, []);

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
        <a
          href="/"
          style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit' }}
        >
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
        </a>

        {/* Contrôles statut & réseau */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {activeUser && (
            <a
              href={isStaffUser ? '/admin' : '/dashboard'}
              style={{ color: '#f7d618', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}
            >
              {isStaffUser ? '🏛️ Console Back-Office' : '📋 Mon Tableau de Bord'}
            </a>
          )}
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

          {activeUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#e2e8f0' }}>
                👤 <strong>{displayName}</strong> ({activeUser.role})
              </span>
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

