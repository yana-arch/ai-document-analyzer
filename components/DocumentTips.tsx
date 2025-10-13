import React, { memo, useState } from 'react';
import { DocumentTip } from '../types';
import Card from './shared/Card';
import { useLanguage } from '../contexts/LanguageContext';

interface DocumentTipsProps {
  tips: DocumentTip[];
  onRefresh?: () => void;
  onRefreshLoading?: boolean;
}

const DocumentTips: React.FC<DocumentTipsProps> = memo(({ tips, onRefresh, onRefreshLoading }) => {
  const { t } = useLanguage();
  const [expandedTip, setExpandedTip] = useState<string | null>(null);

  const getTipTypeIcon = (type: DocumentTip['type']) => {
    switch (type) {
      case 'factual':
        return '📚';
      case 'story':
        return '📖';
      case 'example':
        return '💡';
      default:
        return '💭';
    }
  };

  const getImportanceColor = (importance: DocumentTip['importance']) => {
    switch (importance) {
      case 'high':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'medium':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
      case 'low':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  if (!tips || tips.length === 0) {
    return null;
  }

  return (
    <Card title={t('tips.title') || 'AI-Generated Document Tips'}>
      <div className="space-y-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={onRefreshLoading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Refresh document tips"
            >
              {onRefreshLoading ? (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {t('tips.description') || 'Factual insights and related information from verified sources, stories, and real-world examples.'}
          </div>
        </div>

        {tips.map((tip) => (
          <div
            key={tip.id}
            className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl shrink-0 mt-1">
                {getTipTypeIcon(tip.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {t('tips.type.' + tip.type) || tip.type}
                  </span>

                  {tip.importance && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getImportanceColor(tip.importance)}`}>
                      {tip.importance} {t('tips.importance') || 'importance'}
                    </span>
                  )}

                  {tip.category && (
                    <span className="px-2 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-full">
                      {tip.category}
                    </span>
                  )}
                </div>

                <div className="text-sm text-zinc-800 dark:text-zinc-100 mb-2 leading-relaxed">
                  {tip.content.length > 150 && expandedTip !== tip.id ? (
                    <>
                      {tip.content.substring(0, 150)}...
                      <button
                        onClick={() => setExpandedTip(tip.id)}
                        className="ml-1 text-blue-600 dark:text-blue-400 hover:underline text-xs"
                      >
                        {t('common.readMore') || 'Read more'}
                      </button>
                    </>
                  ) : tip.content.length > 150 && expandedTip === tip.id ? (
                    <>
                      {tip.content}
                      <button
                        onClick={() => setExpandedTip(null)}
                        className="ml-1 text-blue-600 dark:text-blue-400 hover:underline text-xs"
                      >
                        {t('common.showLess') || 'Show less'}
                      </button>
                    </>
                  ) : (
                    tip.content
                  )}
                </div>

                {tip.source && (
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                    <span className="font-medium">{t('tips.source') || 'Source'}:</span> {tip.source}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 text-sm">ℹ️</span>
            <div className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              <div className="font-medium mb-1">{t('tips.disclaimer') || 'Disclaimer:'}</div>
              <div>
                {t('tips.disclaimerText') ||
                  'AI-generated tips are based on available information. For critical decisions, consult primary sources or domain experts. Factual accuracy is prioritized over entertainment value.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});

export default DocumentTips;
