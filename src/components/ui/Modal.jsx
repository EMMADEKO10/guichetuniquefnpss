import React, { useEffect } from 'react';

/**
 * Modale accessible du Design System FNPSS (UX-05, WCAG AA)
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {string} props.title
 * @param {React.ReactNode} props.children
 * @param {React.ReactNode} [props.footer]
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = '540px'
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop open"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 37, 64, 0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="modal-card"
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth,
          boxShadow: '0 16px 36px rgba(0,0,0,0.3)',
          border: '1px solid var(--border)',
          overflow: 'hidden'
        }}
      >
        <div
          className="modal-header"
          style={{
            background: 'var(--fnpss-navy)',
            color: '#ffffff',
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <h3 id="modal-title" style={{ fontSize: '15px', color: '#ffffff', margin: 0 }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la boîte de dialogue"
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              fontSize: '22px',
              cursor: 'pointer',
              lineHeight: 1
            }}
          >
            &times;
          </button>
        </div>
        <div className="modal-body" style={{ padding: '18px' }}>
          {children}
        </div>
        {footer && (
          <div
            className="modal-footer"
            style={{
              padding: '12px 18px',
              borderTop: '1px solid #eef2f6',
              background: '#f8fafc',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px'
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
