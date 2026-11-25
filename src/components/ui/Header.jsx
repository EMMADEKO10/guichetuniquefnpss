'use client';

import React, { useState, useEffect } from 'react';
import { getClientToken, getClientUser, clearClientSession } from '../../lib/client-auth.js';
import NotificationBell from './NotificationBell.jsx';
import AppIcon from './AppIcon.jsx';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
    const expiryCheckInterval = setInterval(syncUser, 60000);
    window.addEventListener('fnpss-auth-change', syncUser);
    window.addEventListener('storage', syncUser);
    window.addEventListener('focus', syncUser);
    window.addEventListener('online', syncOnline);
    window.addEventListener('offline', syncOnline);
    return () => {
      clearInterval(expiryCheckInterval);
      window.removeEventListener('fnpss-auth-change', syncUser);
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('focus', syncUser);
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
        <div className="site-header-top">
          <a
            href="/"
            style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit', minWidth: 0, flex: '1 1 auto' }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
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
                width={36}
                height={36}
                style={{ objectFit: 'contain', display: 'block' }}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', margin: 0, lineHeight: 1.2 }}>
                Guichet Unique Dématérialisé
              </h1>
              <p style={{ fontSize: '11.5px', color: '#cbd5e1', margin: 0, lineHeight: 1.2 }}>
                FNPSS &bull; <span style={{ color: '#fdba74', fontWeight: 600 }}>Le social dans la solidarité</span> &bull; RDC
              </p>
            </div>
          </a>

          <div className="header-mobile-controls">
            <NotificationBell />
            <button
              type="button"
              className="header-menu-toggle"
              aria-label={mobileMenuOpen ? 'Fermer le menu de navigation' : 'Ouvrir le menu de navigation'}
              aria-expanded={mobileMenuOpen}
              aria-controls="main-nav-menu"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              <AppIcon name={mobileMenuOpen ? 'close' : 'menu'} size="md" />
            </button>
          </div>
        </div>

        {/* Navigation & Contrôles statut */}
        <nav
          id="main-nav-menu"
          aria-label="Navigation principale"
          className={`site-header-nav ${mobileMenuOpen ? 'is-open' : ''}`}
        >
          {activeUser && (
            <>
              <a
                href={isStaffUser ? '/admin' : '/dashboard'}
                onClick={() => setMobileMenuOpen(false)}
                className="nav-link-icon"
                style={{ color: '#f7d618', fontSize: '12.5px', fontWeight: 700, textDecoration: 'none' }}
              >
                <AppIcon name={isStaffUser ? 'institution' : 'dashboard'} size="sm" />
                <span>{isStaffUser ? 'Console Back-Office' : 'Mon Tableau de Bord'}</span>
              </a>
              {!isStaffUser && (
                <a
                  href="/applications/new"
                  onClick={() => setMobileMenuOpen(false)}
                  className="nav-link-icon"
                  style={{ color: '#fed7aa', fontSize: '12.5px', fontWeight: 700, textDecoration: 'none' }}
                >
                  <AppIcon name="add" size="sm" />
                  <span>Déposer un dossier</span>
                </a>
              )}
            </>
          )}
          <a
            href="/guide"
            onClick={() => setMobileMenuOpen(false)}
            className="nav-link-icon"
            style={{ color: '#e2e8f0', fontSize: '12.5px', fontWeight: 600, textDecoration: 'none' }}
          >
            <AppIcon name="guide" size="sm" />
            <span>Guide ONG</span>
          </a>
          <a
            href="/verifier"
            onClick={() => setMobileMenuOpen(false)}
            className="nav-link-icon"
            style={{ color: '#e2e8f0', fontSize: '12.5px', fontWeight: 600, textDecoration: 'none' }}
          >
            <AppIcon name="verify" size="sm" />
            <span>Contrôle Douane DGDA</span>
          </a>
          <span
            className="net-pill nav-link-icon"
            role="status"
            style={{
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '11.5px',
              fontWeight: 600,
              alignSelf: 'flex-start',
              background: isOnline ? '#e6f4ea' : '#fef7e0',
              color: isOnline ? '#137333' : '#92400e'
            }}
          >
            <span className={`status-dot ${isOnline ? 'status-dot-green' : 'status-dot-orange'}`} aria-hidden="true" />
            <span>{isOnline ? 'En ligne' : 'Hors-ligne (PWA)'}</span>
          </span>

          <span className="header-desktop-bell">
            <NotificationBell />
          </span>

          {activeUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <a
                href={isStaffUser ? '/admin' : '/profile'}
                onClick={() => setMobileMenuOpen(false)}
                className="nav-link-icon"
                style={{ fontSize: '12px', color: '#e2e8f0', textDecoration: 'none', wordBreak: 'break-word' }}
                title="Accéder à mon profil"
              >
                <AppIcon name="user" size="sm" />
                <span><strong>{displayName}</strong> <span style={{ color: '#94a3b8' }}>({activeUser.role})</span></span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="btn btn-sm btn-outline"
                style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.3)', background: 'transparent' }}
              >
                Déconnexion
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogin();
              }}
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
