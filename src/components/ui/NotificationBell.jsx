'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getClientToken, getClientUser, clearClientSession } from '../../lib/client-auth.js';
import AppIcon from './AppIcon.jsx';

const STAFF_ROLES = ['AGENT', 'CHEF_DIVISION', 'DG', 'MINISTERE', 'ADMIN'];

/**
 * Cloche de notifications globale dans l'en-tête (tous rôles : Requérant & Staff FNPSS).
 * Supporte lecture, marquage lu, suppression unitaire, par sélection et suppression totale.
 */
export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [emailRetryQueued, setEmailRetryQueued] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const wrapperRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    const token = getClientToken();
    if (!token) {
      setHasSession(false);
      setNotifications([]);
      setUnreadCount(0);
      setSelectedIds([]);
      setConfirmDeleteAll(false);
      return;
    }
    setHasSession(true);
    setIsLoading(true);
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        clearClientSession();
        setHasSession(false);
        setNotifications([]);
        setUnreadCount(0);
        setSelectedIds([]);
        setConfirmDeleteAll(false);
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      const nextList = data.notifications || [];
      setNotifications(nextList);
      setUnreadCount(Number(data.unreadCount) || 0);
      setEmailRetryQueued(Number(data.emailRetryQueued) || 0);
      const validIds = new Set(nextList.map((n) => n.id));
      setSelectedIds((prev) => prev.filter((id) => validIds.has(id)));
      if (nextList.length === 0) setConfirmDeleteAll(false);
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
        setConfirmDeleteAll(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setConfirmDeleteAll(false);
      }
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

  const visibleNotifications = notifications.slice(0, 20);
  const allVisibleSelected =
    visibleNotifications.length > 0 && visibleNotifications.every((n) => selectedIds.includes(n.id));

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleNotifications.map((n) => n.id));
    }
  };

  const sendNotifMutation = async (method, payload) => {
    const token = getClientToken();
    if (!token) return false;
    setIsMutating(true);
    try {
      const res = await fetch('/api/notifications', {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.status === 401) {
        clearClientSession();
        setHasSession(false);
        setNotifications([]);
        setUnreadCount(0);
        setSelectedIds([]);
        return false;
      }
      if (res.ok) {
        await loadNotifications();
        window.dispatchEvent(new Event('fnpss-notif-refresh'));
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setIsMutating(false);
    }
  };

  const markRead = (notificationId) => sendNotifMutation('PUT', { notificationId, read: true });
  const markAllRead = () => sendNotifMutation('PUT', { markAllRead: true });

  const deleteOne = async (notificationId) => {
    const ok = await sendNotifMutation('DELETE', { notificationId });
    if (ok) {
      setSelectedIds((prev) => prev.filter((id) => id !== notificationId));
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const ok = await sendNotifMutation('DELETE', { notificationIds: selectedIds });
    if (ok) setSelectedIds([]);
  };

  const deleteAll = async () => {
    const ok = await sendNotifMutation('DELETE', { deleteAll: true });
    if (ok) {
      setSelectedIds([]);
      setConfirmDeleteAll(false);
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
          if (!next) setConfirmDeleteAll(false);
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
                  disabled={isMutating}
                  className="btn btn-sm btn-outline"
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                >
                  Tout marquer lu
                </button>
              )}
              <button
                type="button"
                onClick={loadNotifications}
                disabled={isMutating}
                className="btn btn-sm btn-outline"
                style={{ fontSize: '11px', padding: '3px 8px' }}
                title="Actualiser"
                aria-label="Actualiser les notifications"
              >
                <AppIcon name="refresh" size="xs" />
              </button>
            </div>
          </div>

          {notifications.length > 0 && (
            <div className="notif-toolbar">
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600, color: 'var(--fnpss-navy)', margin: 0 }}>
                <input
                  type="checkbox"
                  className="notif-checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  aria-label="Sélectionner toutes les notifications affichées"
                />
                <span>Tout sélectionner</span>
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={deleteSelected}
                    disabled={isMutating}
                    className="btn btn-sm btn-danger"
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                  >
                    <AppIcon name="delete" size="xs" />
                    <span>Supprimer ({selectedIds.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setConfirmDeleteAll((v) => !v)}
                  disabled={isMutating}
                  className="btn btn-sm btn-outline"
                  style={{ fontSize: '11px', padding: '3px 8px', color: '#991b1b', borderColor: '#fecaca' }}
                >
                  <AppIcon name="delete" size="xs" />
                  <span>Tout supprimer</span>
                </button>
              </div>
            </div>
          )}

          {confirmDeleteAll && notifications.length > 0 && (
            <div className="notif-confirm-bar" role="alert">
              <span>
                Supprimer définitivement toutes vos notifications ({notifications.length}) ?
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={deleteAll}
                  disabled={isMutating}
                  className="btn btn-sm btn-danger"
                  style={{ fontSize: '11px', padding: '3px 10px' }}
                >
                  Confirmer la suppression
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteAll(false)}
                  disabled={isMutating}
                  className="btn btn-sm btn-outline"
                  style={{ fontSize: '11px', padding: '3px 10px' }}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          <div style={{ overflowY: 'auto', maxHeight: '320px', padding: '8px' }}>
            {isLoading && notifications.length === 0 ? (
              <p className="text-muted text-center" style={{ padding: '20px', fontSize: '12.5px' }}>
                Chargement des notifications...
              </p>
            ) : notifications.length === 0 ? (
              <p className="text-muted text-center" style={{ padding: '24px 12px', fontSize: '12.5px', margin: 0 }}>
                Aucune notification pour le moment.
              </p>
            ) : (
              visibleNotifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    marginBottom: '6px',
                    border: '1px solid var(--border)',
                    background: n.read ? '#ffffff' : '#eef6fc',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px'
                  }}
                >
                  <input
                    type="checkbox"
                    className="notif-checkbox"
                    style={{ marginTop: '3px' }}
                    checked={selectedIds.includes(n.id)}
                    onChange={() => toggleSelect(n.id)}
                    aria-label={`Sélectionner la notification : ${n.title}`}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                      <div style={{ fontWeight: n.read ? 600 : 700, fontSize: '12px', color: 'var(--fnpss-navy)', wordBreak: 'break-word' }}>
                        {!n.read && <span className="status-dot status-dot-orange" aria-hidden="true" style={{ marginRight: '6px' }} />}
                        {n.title}
                      </div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        {!n.read && (
                          <button
                            type="button"
                            onClick={() => markRead(n.id)}
                            disabled={isMutating}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--fnpss-blue)',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Lu
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteOne(n.id)}
                          disabled={isMutating}
                          className="notif-delete-btn"
                          title="Supprimer cette notification"
                          aria-label={`Supprimer la notification : ${n.title}`}
                        >
                          <AppIcon name="delete" size="xs" />
                        </button>
                      </div>
                    </div>
                    <div className="text-muted" style={{ fontSize: '11.5px', marginTop: '3px', wordBreak: 'break-word' }}>
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
