import React from 'react';
import { HistoryItem } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface HistoryListProps {
  items: HistoryItem[];
  onLoadItem: (item: HistoryItem) => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ items, onLoadItem }) => {
  const { t } = useLanguage();

  if (items.length === 0) {
    return null;
  }
  
  const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
  );

  return (
    <div className="max-w-4xl mx-auto mt-16">
      <h3 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 mb-6 text-center">{t('history.title')}</h3>
      <div className="bg-white dark:bg-zinc-800/50 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700/50 p-6 space-y-4">
        {items.map((item) => (
          <button
            key={item.fileName + item.date}
            onClick={() => onLoadItem(item)}
            className="w-full text-left p-4 rounded-xl flex justify-between items-center hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-800 focus:ring-indigo-500"
          >
            <div>
              <p className="font-semibold text-indigo-600 dark:text-indigo-400 truncate max-w-md" title={item.fileName}>{item.fileName}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {t('history.analyzedOn')} {new Date(item.date).toLocaleString()}
              </p>
            </div>
            <ClockIcon className="w-5 h-5 text-zinc-400 dark:text-zinc-500 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default HistoryList;
