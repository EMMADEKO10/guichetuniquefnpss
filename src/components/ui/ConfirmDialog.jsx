'use client';

import React, { useState, useEffect } from 'react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';

/**
 * Boîte de dialogue de confirmation standardisée (remplace window.confirm).
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmer l\'action',
  message = '',
  details = null,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  isLoading = false,
  requireCheckLabel = ''
}) {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isOpen) setChecked(false);
  }, [isOpen]);

  const canConfirm = !isLoading && (!requireCheckLabel || checked);

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onClose}
      title={title}
      maxWidth="500px"
      footer={
        <>
          <Button variant="outline" disabled={isLoading} onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            isLoading={isLoading}
            loadingText="Traitement..."
            disabled={!canConfirm}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p style={{ fontSize: '13.5px', lineHeight: 1.5, color: 'var(--text-main)', marginBottom: details || requireCheckLabel ? '12px' : 0 }}>
        {message}
      </p>
      {details && (
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '10px 12px',
            fontSize: '12.5px',
            marginBottom: requireCheckLabel ? '12px' : 0
          }}
        >
          {details}
        </div>
      )}
      {requireCheckLabel && (
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            fontSize: '12.5px',
            fontWeight: 700,
            color: variant === 'danger' ? 'var(--fnpss-red)' : 'var(--fnpss-navy)',
            cursor: 'pointer'
          }}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            style={{ marginTop: '3px' }}
          />
          <span>{requireCheckLabel}</span>
        </label>
      )}
    </Modal>
  );
}
