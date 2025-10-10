import React, { useRef, useCallback } from 'react';
import { HistoryItem } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { exportHistory, importHistory, mergeHistory } from '../utils/historyUtils';

interface HistoryListProps {
  items: HistoryItem[];
  onLoadItem: (item: HistoryItem) => void;
  onImportHistory: (mergedHistory: HistoryItem[]) => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ items, onLoadItem, onImportHistory }) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportHistory = useCallback(async () => {
    try {
      await exportHistory(items);
      alert(t('history.exportSuccess'));
    } catch (error) {
      console.error('Export failed:', error);
      alert(t('history.importError'));
    }
  }, [items, t]);

  const handleImportTrigger = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportHistory = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedHistory = await importHistory(file);
      const mergedHistory = mergeHistory(items, importedHistory);
      onImportHistory(mergedHistory);
      alert(t('history.importSuccess'));
    } catch (error) {
      console.error('Import failed:', error);
      alert(t('history.importError'));
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [items, onImportHistory, t]);

  if (items.length === 0) {
    return null;
  }
  
  const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
  );

  return (
    <div className="max-w-4xl mx-auto mt-16">
      <h3 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 mb-6 text-center">{t('history.title')}</h3>

      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={handleExportHistory}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors flex items-center gap-2"
          disabled={items.length === 0}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {t('history.exportButton')}
        </button>

        <button
          onClick={handleImportTrigger}
          className="px-4 py-2 bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 transition-colors flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17,8 12,3 7,8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          {t('history.importButton')}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportHistory}
          className="hidden"
        />
      </div>

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
