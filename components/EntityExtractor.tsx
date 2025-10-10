import React from 'react';
import { Entity } from '../types';
import Card from './shared/Card';
import { useLanguage } from '../contexts/LanguageContext';

interface EntityExtractorProps {
  entities: Entity[];
  sentiment: string;
}

const entityColors: { [key: string]: string } = {
  PERSON: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300',
  ORGANIZATION: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
  LOCATION: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  DATE: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300',
  default: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200',
};

const sentimentStyles: { [key: string]: { icon: React.ReactElement, color: string } } = {
    Positive: {
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>,
        color: 'text-green-500'
    },
    Negative: {
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293z" clipRule="evenodd" /></svg>,
        color: 'text-red-500'
    },
    Neutral: {
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>,
        color: 'text-yellow-500'
    }
};

const EntityExtractor: React.FC<EntityExtractorProps> = ({ entities, sentiment }) => {
  const sentimentStyle = sentimentStyles[sentiment] || sentimentStyles.Neutral;
  const { t } = useLanguage();

  return (
    <Card title={t('entities.title')}>
        <div className="mb-4">
            <h4 className="font-semibold text-base text-zinc-600 dark:text-zinc-400 mb-2">{t('entities.overallSentiment')}</h4>
            <div className={`flex items-center font-bold ${sentimentStyle.color}`}>
                {sentimentStyle.icon}
                <span>{sentiment}</span>
            </div>
        </div>

      <div>
        <h4 className="font-semibold text-base text-zinc-600 dark:text-zinc-400 mb-2">{t('entities.namedEntities')}</h4>
        <div className="flex flex-wrap gap-2">
            {entities.length > 0 ? entities.map((entity, index) => (
            <div key={index} className="flex items-center text-sm">
                <span className={`px-2.5 py-1 rounded-l-lg font-medium ${entityColors[entity.type] || entityColors.default}`}>
                    {entity.text}
                </span>
                <span className="px-2 py-1 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-r-lg uppercase font-bold text-xs">
                    {entity.type}
                </span>
            </div>
            )) : <p className="text-sm text-zinc-500">{t('entities.noEntities')}</p>}
        </div>
      </div>
    </Card>
  );
};

export default EntityExtractor;
