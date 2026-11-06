import React from 'react';

/**
 * Composant Badge accessible du Design System FNPSS (UX-05)
 * @param {Object} props
 * @param {'soumis'|'instruction'|'valide'|'revoque'|'danger'|'default'} [props.status='default']
 * @param {React.ReactNode} props.children
 */
export default function Badge({
  children,
  status = 'default',
  className = '',
  ...rest
}) {
  const statusMap = {
    soumis: 'badge-soumis',
    instruction: 'badge-instruction',
    valide: 'badge-valide',
    revoque: 'badge-revoque',
    danger: 'badge-danger',
    default: 'badge-soumis'
  };

  const statusClass = statusMap[status] || 'badge-soumis';

  return (
    <span className={`badge ${statusClass} ${className}`.trim()} role="status" {...rest}>
      {children}
    </span>
  );
}

