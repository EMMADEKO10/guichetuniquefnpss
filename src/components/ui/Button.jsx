import React from 'react';

/**
 * Composant Bouton accessible du Design System FNPSS (UX-05)
 * @param {Object} props
 * @param {'primary'|'accent'|'success'|'danger'|'outline'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.isLoading=false]
 * @param {React.ReactNode} props.children
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled = false,
  type = 'button',
  onClick,
  ...rest
}) {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  const variantClass = `btn-${variant}`;

  return (
    <button
      type={type}
      className={`btn ${variantClass} ${sizeClass} ${className}`.trim()}
      disabled={disabled || isLoading}
      onClick={onClick}
      aria-busy={isLoading}
      {...rest}
    >
      {isLoading ? (
        <>
          <span className="spinner-border" aria-hidden="true" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid currentColor', borderRightColor: 'transparent', borderRadius: '50%' }} />
          <span>Chargement...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
