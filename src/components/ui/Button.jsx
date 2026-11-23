import React from 'react';

/**
 * Composant Bouton accessible du Design System FNPSS (UX-05)
 * @param {Object} props
 * @param {'primary'|'brand'|'accent'|'success'|'danger'|'outline'|'ghost'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.isLoading=false]
 * @param {string} [props.loadingText='Chargement...']
 * @param {string} [props.disabledReason]
 * @param {React.ReactNode} props.children
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText = 'Chargement...',
  disabledReason = '',
  className = '',
  disabled = false,
  type = 'button',
  title,
  onClick,
  ...rest
}) {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  const variantClass = `btn-${variant}`;
  const isDisabled = Boolean(disabled || isLoading);
  const resolvedTitle = isDisabled && disabledReason ? disabledReason : title;

  return (
    <button
      type={type}
      className={`btn ${variantClass} ${sizeClass} ${className}`.trim()}
      disabled={isDisabled}
      onClick={onClick}
      aria-busy={isLoading}
      title={resolvedTitle}
      {...rest}
    >
      {isLoading ? (
        <>
          <span
            className="spinner-border"
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: 14,
              height: 14,
              border: '2px solid currentColor',
              borderRightColor: 'transparent',
              borderRadius: '50%'
            }}
          />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
