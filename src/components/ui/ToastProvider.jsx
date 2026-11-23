'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

const TOAST_ICONS = {
  success: '✅',
  error: '🛑',
  warning: '⚠️',
  info: 'ℹ️'
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type, message, title = '', durationMs) => {
    if (!message) return;
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const timeout = durationMs ?? (type === 'error' ? 8000 : 5000);
    setToasts((prev) => [...prev.slice(-4), { id, type, title, message }]);
    if (timeout > 0 && typeof window !== 'undefined') {
      setTimeout(() => dismiss(id), timeout);
    }
    return id;
  }, [dismiss]);

  const api = {
    success: (msg, title = 'Succès') => push('success', msg, title),
    error: (msg, title = 'Erreur') => push('error', msg, title),
    warning: (msg, title = 'Attention') => push('warning', msg, title),
    info: (msg, title = 'Information') => push('info', msg, title),
    dismiss
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-container" role="region" aria-label="Notifications système" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-item toast-${t.type}`} role="status">
            <span aria-hidden="true" style={{ fontSize: '16px', flexShrink: 0 }}>
              {TOAST_ICONS[t.type] || 'ℹ️'}
            </span>
            <div style={{ flex: 1 }}>
              {t.title && <div style={{ fontWeight: 700, color: 'var(--fnpss-navy)', marginBottom: '2px' }}>{t.title}</div>}
              <div style={{ color: 'var(--text-main)' }}>{t.message}</div>
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Fermer la notification"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: '14px',
                padding: '0 2px'
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const NOOP_TOAST = {
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
  dismiss: () => {}
};

export function useToast() {
  return useContext(ToastContext) || NOOP_TOAST;
}
