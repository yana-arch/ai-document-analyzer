import React, { memo, Suspense, lazy, useState, useMemo } from 'react';
import { AnalysisResult, UserSettings } from '../types';
import SummaryPanel from './SummaryPanel';
import TopicsCloud from './TopicsCloud';
import EntityExtractor from './EntityExtractor';
import Card from './shared/Card';
import Breadcrumb from './shared/Breadcrumb';
import { useLanguage } from '../contexts/LanguageContext';

// Lazy load heavy components
const QnAChat = lazy(() => import('./QnAChat'));
const QuizGenerator = lazy(() => import('./QuizGenerator'));
const ExerciseGenerator = lazy(() => import('./ExerciseGenerator'));

interface StudyModuleProps {
  analysis: AnalysisResult;
  documentText: string;
  fileName: string;
  settings: UserSettings;
}

type ActiveTab = 'overview' | 'qa' | 'practice' | 'fulltext';

const StudyModule: React.FC<StudyModuleProps> = memo(({ analysis, documentText, fileName, settings }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  const breadcrumbItems = useMemo(() => [
    { label: t('breadcrumb.home') || 'Home', onClick: () => window.location.reload() }, // A simple way to go back to the hub
    { label: fileName, current: true }
  ], [fileName, t]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card title={t('dashboard.summaryTitle') || 'Document Summary'}>
                <SummaryPanel summary={analysis.summary} />
              </Card>
            </div>
            <div className="space-y-6">
              <Card title={t('dashboard.topicsTitle') || 'Key Topics'}>
                <TopicsCloud topics={analysis.topics} />
              </Card>
              <Card title={t('dashboard.entitiesTitle') || 'Entities & Sentiment'}>
                <EntityExtractor entities={analysis.entities} sentiment={analysis.sentiment} />
              </Card>
            </div>
          </div>
        );
      case 'qa':
        return (
          <Suspense fallback={<div>Loading Chat...</div>}>
            <Card title={t('dashboard.chatTitle') || 'Ask Questions'}>
              <QnAChat documentText={documentText} fileName={fileName} settings={settings} analysis={analysis} />
            </Card>
          </Suspense>
        );
      case 'practice':
        return (
          <Suspense fallback={<div>Loading...</div>}>
            <ExerciseGenerator documentText={documentText} settings={settings} />
          </Suspense>
        );
      case 'fulltext':
        return (
            <Card title={t('dashboard.fullDocumentText')}>
                <div className="prose prose-zinc dark:prose-invert max-w-none p-4 h-96 overflow-y-auto">
                    {documentText}
                </div>
            </Card>
        );
      default:
        return null;
    }
  };

  const TabButton: React.FC<{ tabName: ActiveTab; label: string; icon: React.ReactNode }> = ({ tabName, label, icon }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
        activeTab === tabName
          ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <Breadcrumb items={breadcrumbItems} />
      
      <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-md border border-zinc-200 dark:border-zinc-700">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">{fileName}</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Your study module is ready.</p>
      </div>

      <div className="border-b border-zinc-200 dark:border-zinc-700">
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
            <TabButton tabName='overview' label='Overview' icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            <TabButton tabName='qa' label='Q&A' icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>} />
            <TabButton tabName='practice' label='Practice' icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>} />
            <TabButton tabName='fulltext' label='Full Text' icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
        </nav>
      </div>

      <div className="mt-6">
        {renderTabContent()}
      </div>
    </div>
  );
});

export default StudyModule;