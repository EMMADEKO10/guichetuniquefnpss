import React from 'react';

/**
 * État vide standardisé et explicite pour listes, files et tables.
 */
export default function EmptyState({
  icon = '📂',
  title = 'Aucun élément à afficher',
  description = '',
  action = null
}) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '36px 20px',
        background: '#fafbfc',
        borderRadius: '10px',
        border: '1px dashed var(--border)'
      }}
    >
      <div aria-hidden="true" style={{ fontSize: '34px', marginBottom: '10px' }}>{icon}</div>
      <h4 style={{ fontSize: '15px', color: 'var(--fnpss-navy)', marginBottom: '6px' }}>{title}</h4>
      {description && (
        <p className="text-muted" style={{ fontSize: '13px', maxWidth: '420px', margin: '0 auto 14px' }}>
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
