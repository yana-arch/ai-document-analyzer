import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card: React.FC<CardProps> = ({
  title,
  children,
  className = '',
  actions,
  variant = 'default',
  size = 'md',
  padding = 'md'
}) => {
  const baseClasses = 'rounded-xl transition-all duration-200 overflow-hidden';

  const variantClasses = {
    default: 'bg-white dark:bg-zinc-800/50 shadow-lg border border-zinc-200 dark:border-zinc-700/50',
    elevated: 'bg-white dark:bg-zinc-800/50 shadow-xl border border-zinc-200 dark:border-zinc-700/50 transform hover:scale-[1.02] hover:shadow-2xl',
    outlined: 'bg-transparent border-2 border-zinc-200 dark:border-zinc-700 shadow-sm',
    ghost: 'bg-transparent border-none shadow-none',
    gradient: 'bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800/50 shadow-lg'
  };

  const sizeClasses = {
    sm: 'min-h-[160px] sm:min-h-[200px]',
    md: 'min-h-[240px] sm:min-h-[300px]',
    lg: 'min-h-[320px] sm:min-h-[400px]'
  };

  const paddingClasses = {
    none: '',
    sm: 'p-2 sm:p-3 lg:p-4',
    md: 'p-3 sm:p-4 lg:p-6',
    lg: 'p-4 sm:p-6 lg:p-8'
  };

  const cardClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${paddingClasses[padding]}
    ${className}
  `.trim();

  return (
    <div className={cardClasses}>
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0 mb-3 sm:mb-4">
          {title && (
            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
              {title}
            </h3>
          )}
          {actions && (
            <div className="flex items-center space-x-1 sm:space-x-2 sm:ml-4 self-start sm:self-center">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className={title || actions ? '' : ''}>
        {children}
      </div>
    </div>
  );
};

export default Card;
