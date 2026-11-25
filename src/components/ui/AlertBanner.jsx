'use client';

import React from 'react';
import AppIcon from './AppIcon.jsx';

const ICON_NAMES = {
  error: 'error',
  danger: 'error',
  warning: 'warning',
  success: 'success',
  info: 'info'
};

/**
 * Composant AlertBanner unifié pour la restitution d'erreurs et notifications (UI/UX)
 */
export default function AlertBanner({
  variant = 'info',
  title,
  message,
  children,
  onClose,
  action,
  style = {},
  className = ''
}) {
  const normalizedVariant = variant === 'danger' ? 'error' : variant;
  const iconName = ICON_NAMES[normalizedVariant] || 'info';

  return (
    <div
      role="alert"
      className={`alert alert-${normalizedVariant} ${className}`}
      style={{ ...style }}
    >
      <span className="alert-icon" aria-hidden="true">
        <AppIcon name={iconName} size="md" />
      </span>
      <div className="alert-body">
        {title && <div className="alert-title">{title}</div>}
        <div>{children || message}</div>
        {action && (
          <div style={{ marginTop: '8px' }}>
            {action}
          </div>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="alert-close"
          aria-label="Fermer l'alerte"
          title="Fermer"
        >
          <AppIcon name="close" size="sm" />
        </button>
      )}
    </div>
  );
}
