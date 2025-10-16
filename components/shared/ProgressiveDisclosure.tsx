import React, { useState, ReactNode } from 'react';

interface ProgressiveDisclosureProps {
  title: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  variant?: 'default' | 'minimal' | 'card';
  size?: 'sm' | 'md' | 'lg';
  headerActions?: ReactNode;
  icon?: ReactNode;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  onToggle?: (expanded: boolean) => void;
}

const ProgressiveDisclosure: React.FC<ProgressiveDisclosureProps> = ({
  title,
  children,
  defaultExpanded = false,
  variant = 'default',
  size = 'md',
  headerActions,
  icon,
  className = '',
  triggerClassName = '',
  contentClassName = '',
  onToggle
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    onToggle?.(!isExpanded);
  };

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const variantClasses = {
    default: 'border-zinc-200 dark:border-zinc-700',
    minimal: 'border-zinc-100 dark:border-zinc-800',
    card: 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 rounded-2xl shadow-lg'
  };

  const triggerVariants = {
    default: 'text-zinc-900 dark:text-zinc-100 hover:text-zinc-700 dark:hover:text-zinc-300',
    minimal: 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100',
    card: 'text-zinc-900 dark:text-zinc-100 hover:text-zinc-700 dark:hover:text-zinc-300'
  };

  return (
    <div className={`transition-all ease-in-out ${className}`}>
      <button
        onClick={handleToggle}
        className={`
          w-full flex items-center justify-between p-4 group
          ${variant !== 'default' ? 'border border-b-0' : 'border-b'}
          ${variantClasses[variant]}
          ${triggerVariants[variant]}
          ${sizeClasses[size]}
          ${triggerClassName}
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-inset
        `}
        aria-expanded={isExpanded}
        aria-controls={`content-${title}`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {icon}
          <span className="font-medium truncate">{title}</span>
        </div>

        {headerActions && (
          <div className="flex items-center gap-2 mr-2">{headerActions}</div>
        )}

        <svg
          className={`w-5 h-5 transform transition-transform duration-200 flex-shrink-0 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        id={`content-${title}`}
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}
          ${variant !== 'default' ? 'border-l border-r border-b rounded-b-2xl' : 'border-b'}
          ${variantClasses[variant]}
        `}
        style={{ transitionProperty: 'max-height, opacity' }}
      >
        <div className={`p-4 ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default ProgressiveDisclosure;
