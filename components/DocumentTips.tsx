import React, { memo, useState } from 'react';
import { DocumentTip } from '../types';
import Card from './shared/Card';
import { useLanguage } from '../contexts/LanguageContext';

interface DocumentTipsProps {
  tips: DocumentTip[];
}

const DocumentTips: React.FC<DocumentTipsProps> = memo(({ tips }) => {
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
        <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          {t('tips.description') || 'Factual insights and related information from verified sources, stories, and real-world examples.'}
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
