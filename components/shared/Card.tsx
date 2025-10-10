import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, children, className, actions }) => {
  return (
    <div className={`bg-white dark:bg-zinc-800/50 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-700/50 overflow-hidden ${className}`}>
      <div className="p-4 sm:p-6">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
            {actions && <div className="flex items-center">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
};

export default Card;