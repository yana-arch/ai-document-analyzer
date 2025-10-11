import React from 'react';
import { keyCodes, ariaLabels } from '../../utils/accessibilityUtils';
import { buttonAnimations } from '../../utils/animationUtils';

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  ariaLabel,
  ariaDescribedBy,
  disabled,
  onClick,
  onKeyDown,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

  const variantClasses = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
    secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 focus:ring-zinc-500 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'bg-transparent text-zinc-700 hover:bg-zinc-100 focus:ring-zinc-500 dark:text-zinc-300 dark:hover:bg-zinc-800'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const widthClass = fullWidth ? 'w-full' : '';

  const buttonClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${widthClass}
    ${className}
  `.trim();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === keyCodes.ENTER || e.key === keyCodes.SPACE) {
      e.preventDefault();
      if (!disabled && !loading && onClick) {
        onClick(e as any);
      }
    }

    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  const getAccessibilityProps = () => {
    const accessibilityProps: Record<string, any> = {};

    if (ariaLabel) {
      accessibilityProps['aria-label'] = ariaLabel;
    }

    if (ariaDescribedBy) {
      accessibilityProps['aria-describedby'] = ariaDescribedBy;
    }

    if (loading) {
      accessibilityProps['aria-busy'] = 'true';
      accessibilityProps['aria-live'] = 'polite';
    }

    if (disabled) {
      accessibilityProps['aria-disabled'] = 'true';
    }

    return accessibilityProps;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            {...buttonAnimations.loading}
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
        </>
      );
    }

    return (
      <>
        {icon && iconPosition === 'left' && (
          <span className="mr-2">{icon}</span>
        )}
        {children}
        {icon && iconPosition === 'right' && (
          <span className="ml-2">{icon}</span>
        )}
      </>
    );
  };

  return (
    <button
      className={buttonClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled || loading}
      {...getAccessibilityProps()}
      {...buttonAnimations.tap}
      {...props}
    >
      {renderContent()}
    </button>
  );
};

export default AccessibleButton;
