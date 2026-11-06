import React from 'react';

/**
 * Composant Card du Design System FNPSS (UX-05)
 * @param {Object} props
 * @param {string|React.ReactNode} [props.title]
 * @param {React.ReactNode} [props.actions]
 * @param {React.ReactNode} props.children
 */
export default function Card({
  title,
  actions,
  children,
  className = '',
  ...rest
}) {
  return (
    <div className={`card ${className}`.trim()} {...rest}>
      {(title || actions) && (
        <div className="card-header">
          {title && (typeof title === 'string' ? <h2>{title}</h2> : title)}
          {actions && <div className="card-actions flex gap-2 items-center">{actions}</div>}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}

