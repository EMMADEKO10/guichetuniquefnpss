'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getClientToken, getClientUser } from '../../lib/client-auth.js';
import AppIcon from './AppIcon.jsx';

const STAFF_ROLES = ['AGENT', 'CHEF_DIVISION', 'DG', 'MINISTERE', 'ADMIN'];

/**
 * Cloche de notifications globale dans l'en-tête (tous rôles : Requérant & Staff FNPSS).
 * Polling toutes les 30s + rafraîchissement sur événement 'fnpss-notif-refresh' et 'fnpss-auth-change'.
 */
export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [emailRetryQueued, setEmailRetryQueued] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const wrapperRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    const token = getClientToken();
    if (!token) {
      setHasSession(false);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    setHasSession(true);
    setIsLoading(true);
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(Number(data.unreadCount) || 0);
      setEmailRetryQueued(Number(data.emailRetryQueued) || 0);
    } catch {
      // Silencieux en mode hors-ligne
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    const onRefresh = () => loadNotifications();
    window.addEventListener('fnpss-notif-refresh', onRefresh);
    window.addEventListener('fnpss-auth-change', onRefresh);
    window.addEventListener('storage', onRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('fnpss-notif-refresh', onRefresh);
      window.removeEventListener('fnpss-auth-change', onRefresh);
      window.removeEventListener('storage', onRefresh);
    };
  }, [loadNotifications]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  if (!hasSession) return null;

  const markRead = async (notificationId) => {
    const token = getClientToken();
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notificationId, read: true })
      });
      if (res.ok) {
        await loadNotifications();
        window.dispatchEvent(new Event('fnpss-notif-refresh'));
      }
    } catch {
      // Ignore
    }
  };

  const markAllRead = async () => {
    const token = getClientToken();
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ markAllRead: true })
      });
      if (res.ok) {
        await loadNotifications();
        window.dispatchEvent(new Event('fnpss-notif-refresh'));
      }
    } catch {
      // Ignore
    }
  };

  const currentUser = getClientUser();
  const isStaffUser = currentUser && STAFF_ROLES.includes(currentUser.role);
  const targetWorkspaceHref = isStaffUser ? '/admin' : '/dashboard';

  return (
    <div className="notif-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className="notif-bell-btn"
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next) loadNotifications();
        }}
        aria-label={`Notifications (${unreadCount} non lue${unreadCount > 1 ? 's' : ''})`}
        aria-expanded={isOpen}
        title="Centre de notifications"
      >
        <AppIcon name="bell" size="md" />
        {unreadCount > 0 && (
          <span className="notif-count-pill">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notif-dropdown" role="dialog" aria-label="Centre de notifications">
          <div
            style={{
              padding: '12px 14px',
              background: '#f8fafc',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <div>
              <strong style={{ fontSize: '13px', color: 'var(--fnpss-navy)' }}>
                Notifications ({unreadCount} non lue{unreadCount > 1 ? 's' : ''})
              </strong>
              {emailRetryQueued > 0 && (
                <div style={{ fontSize: '11px', color: '#92400e', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <AppIcon name="warning" size="xs" />
                  <span>{emailRetryQueued} email(s) en file de reprise SMTP</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="btn btn-sm btn-outline"
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                >
                  Tout marquer lu
                </button>
              )}
              <button
                type="button"
                onClick={loadNotifications}
                className="btn btn-sm btn-outline"
                style={{ fontSize: '11px', padding: '3px 8px' }}
                title="Actualiser"
                aria-label="Actualiser les notifications"
              >
                <AppIcon name="refresh" size="xs" />
              </button>
            </div>
          </div>

          <div style={{ overflowY: 'auto', maxHeight: '350px', padding: '8px' }}>
            {isLoading && notifications.length === 0 ? (
              <p className="text-muted text-center" style={{ padding: '20px', fontSize: '12.5px' }}>
                Chargement des notifications...
              </p>
            ) : notifications.length === 0 ? (
              <p className="text-muted text-center" style={{ padding: '24px 12px', fontSize: '12.5px', margin: 0 }}>
                Aucune notification pour le moment.
              </p>
            ) : (
              notifications.slice(0, 12).map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    marginBottom: '6px',
                    border: '1px solid var(--border)',
                    background: n.read ? '#ffffff' : '#eef6fc'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ fontWeight: n.read ? 600 : 700, fontSize: '12px', color: 'var(--fnpss-navy)' }}>
                      {!n.read && <span style={{ color: 'var(--fnpss-orange-accessible)', marginRight: '4px' }}>●</span>}
                      {n.title}
                    </div>
                    {!n.read && (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--fnpss-blue)',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        Lu
                      </button>
                    )}
                  </div>
                  <div className="text-muted" style={{ fontSize: '11.5px', marginTop: '3px' }}>
                    {n.message}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                    <span>{n.createdAt ? new Date(n.createdAt).toLocaleString('fr-FR') : ''}</span>
                    {n.referenceNumber && (
                      <a
                        href={`${targetWorkspaceHref}?ref=${encodeURIComponent(n.referenceNumber)}`}
                        onClick={() => setIsOpen(false)}
                        style={{ color: 'var(--fnpss-blue)', fontWeight: 700, textDecoration: 'none' }}
                      >
                        Ouvrir {n.referenceNumber} &rarr;
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div
            style={{
              padding: '8px 14px',
              background: '#f8fafc',
              borderTop: '1px solid var(--border)',
              textAlign: 'center'
            }}
          >
            <a
              href={targetWorkspaceHref}
              onClick={() => setIsOpen(false)}
              style={{ fontSize: '12px', fontWeight: 700, color: 'var(--fnpss-blue)', textDecoration: 'none' }}
            >
              Ouvrir mon espace complet &rarr;
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
