import React from 'react';
import Card from './shared/Card';
import { useLanguage } from '../contexts/LanguageContext';
import { createMarkdownHtml } from '../utils/markdownUtils';

interface SummaryPanelProps {
  summary: string;
}

const SummaryPanel: React.FC<SummaryPanelProps> = ({ summary }) => {
  const { t } = useLanguage();
  return (
    <Card title={t('summary.title')}>
      <div
        className="text-zinc-600 dark:text-zinc-300 leading-relaxed text-base prose prose-zinc dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={createMarkdownHtml(summary)}
      />
    </Card>
  );
};

export default SummaryPanel;
