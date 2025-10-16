import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  className?: string;
  itemClassName?: string;
  activeClassName?: string;
  separatorClassName?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator,
  className = '',
  itemClassName = '',
  activeClassName = '',
  separatorClassName = ''
}) => {
  const { t } = useLanguage();

  const defaultSeparator = (
    <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );

  return (
    <nav aria-label="Breadcrumb" className={`flex ${className}`}>
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <span
                className={`mx-2 ${separatorClassName}`}
                aria-hidden="true"
              >
                {separator || defaultSeparator}
              </span>
            )}

            {item.href ? (
              <a
                href={item.href}
                className={`
                  text-sm font-medium transition-colors
                  ${item.current
                    ? `text-indigo-600 dark:text-indigo-400 cursor-default ${activeClassName}`
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }
                  ${itemClassName}
                `}
                aria-current={item.current ? 'page' : undefined}
              >
                {item.label}
              </a>
            ) : (
              <button
                onClick={item.onClick}
                className={`
                  text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900 rounded
                  ${item.current
                    ? `text-indigo-600 dark:text-indigo-400 cursor-default ${activeClassName}`
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }
                  ${itemClassName}
                `}
                aria-current={item.current ? 'page' : undefined}
                disabled={item.current}
              >
                {item.label}
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
