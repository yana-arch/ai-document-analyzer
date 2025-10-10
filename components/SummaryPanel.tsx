import React from 'react';
import Card from './shared/Card';
import { useLanguage } from '../contexts/LanguageContext';

interface SummaryPanelProps {
  summary: string;
}

const SummaryPanel: React.FC<SummaryPanelProps> = ({ summary }) => {
  const { t } = useLanguage();
  return (
    <Card title={t('summary.title')}>
      <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed text-base">
        {summary}
      </p>
    </Card>
  );
};

export default SummaryPanel;
