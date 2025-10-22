import React, { Suspense, useMemo } from 'react';
import { HistoryItem } from '../types';
import UploadSkeleton from './skeletons/UploadSkeleton';
import { ProcessResult } from './WizardContentUploader';
import Card from './shared/Card';
import { useLanguage } from '../contexts/LanguageContext';

const WizardContentUploader = React.lazy(() => import('./WizardContentUploader'));
const HistoryList = React.lazy(() => import('./HistoryList'));

interface LearningHubProps {
  history: HistoryItem[];
  onProcess: (result: ProcessResult) => void;
  onLoadHistory: (item: HistoryItem) => void;
  onImportHistory: (mergedHistory: HistoryItem[]) => void;
  onSyncToDatabase?: () => void;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <Card className="p-6">
    <div className="flex items-center">
      <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
        {icon}
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 truncate">{title}</p>
        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
      </div>
    </div>
  </Card>
);

const LearningHub: React.FC<LearningHubProps> = ({ history, onProcess, onLoadHistory, onImportHistory, onSyncToDatabase }) => {
  const { locale, t } = useLanguage();

  const stats = useMemo(() => {
    const documentCount = history.filter(item => item.type === 'document').length;
    const interviewCount = history.filter(item => item.type === 'interview').length;
    return { documentCount, interviewCount };
  }, [history]);

  const DocumentIcon = <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
  const InterviewIcon = <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2V4a2 2 0 012-2h8a2 2 0 012 2v4z" /></svg>;

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-12">
      <div className="px-2">
        <h1 className="text-2xl sm:text-3xl text-center font-bold text-zinc-900 dark:text-zinc-100">{t('hub.title')}</h1>
        <p className="mt-1 sm:mt-2 text-base sm:text-lg text-center text-zinc-600 dark:text-zinc-400">{t('hub.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-4 sm:gap-6 lg:gap-8 items-start">
        <div className="lg:col-span-2">
          <Suspense fallback={<UploadSkeleton />}>
            <WizardContentUploader onProcess={onProcess} />
          </Suspense>
        </div>
        {/* <div className="lg:col-span-1 space-y-6">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{t('hub.statsTitle')}</h2>
            <StatCard title={t('hub.docsAnalyzed')} value={stats.documentCount} icon={DocumentIcon} />
            <StatCard title={t('hub.interviewsPracticed')} value={stats.interviewCount} icon={InterviewIcon} />
        </div> */}
      </div>

      <div>
        {/* <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">{t('hub.historyTitle')}</h2> */}
        <Suspense fallback={<div className='h-32 sm:h-48 lg:h-64 w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse' />}>
          <HistoryList items={history} onLoadItem={onLoadHistory} onImportHistory={onImportHistory} onSyncToDatabase={onSyncToDatabase} />
        </Suspense>
      </div>
    </div>
  );
};

export default LearningHub;
