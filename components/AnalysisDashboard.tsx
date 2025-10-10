import React, { memo, Suspense, lazy } from 'react';
import { AnalysisResult, UserSettings } from '../types';
import SummaryPanel from './SummaryPanel';
import TopicsCloud from './TopicsCloud';
import EntityExtractor from './EntityExtractor';
import Card from './shared/Card';
import { useLanguage } from '../contexts/LanguageContext';

// Lazy load heavy components
const QnAChat = lazy(() => import('./QnAChat'));
const QuizGenerator = lazy(() => import('./QuizGenerator'));

interface AnalysisDashboardProps {
  analysis: AnalysisResult;
  documentText: string;
  fileName: string;
  settings: UserSettings;
}

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = memo(({ analysis, documentText, fileName, settings }) => {
  const { t } = useLanguage();

  const DocumentIcon: React.FC<React.SVGProps<SVGSVGElement>> = memo((props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
  ));

  const MemoizedSummaryPanel = memo(() => <SummaryPanel summary={analysis.summary} />);
  const MemoizedQnAChat = memo(() => <QnAChat documentText={documentText} fileName={fileName} />);
  const MemoizedQuizGenerator = memo(() => <QuizGenerator
    documentText={documentText}
    defaultMCQuestions={settings.ai.quizDefaultMCQuestions}
    defaultWrittenQuestions={settings.ai.quizDefaultWrittenQuestions}
  />);
  const MemoizedTopicsCloud = memo(() => <TopicsCloud topics={analysis.topics} />);
  const MemoizedEntityExtractor = memo(() => <EntityExtractor entities={analysis.entities} sentiment={analysis.sentiment} />);

  return (
    <div className="space-y-6">
       <div className="bg-white dark:bg-zinc-800/50 p-4 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-700/50 flex items-center">
        <DocumentIcon className="w-6 h-6 text-indigo-500 mr-3 shrink-0"/>
        <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 truncate" title={fileName}>
          {t('dashboard.analysisFor')} <span className="font-bold">{fileName}</span>
        </h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <MemoizedSummaryPanel />
          <Suspense fallback={<div className="flex items-center justify-center h-48 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse"><span className="text-zinc-500">Loading Chat...</span></div>}>
            <MemoizedQnAChat />
          </Suspense>
          <Suspense fallback={<div className="flex items-center justify-center h-48 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse"><span className="text-zinc-500">Loading Quiz...</span></div>}>
            <MemoizedQuizGenerator />
          </Suspense>
        </div>
        <div className="space-y-6">
          <MemoizedTopicsCloud />
          <MemoizedEntityExtractor />
        </div>
      </div>
       <Card title={t('dashboard.fullDocumentText')}>
          <div className="prose prose-zinc dark:prose-invert max-w-none h-96 overflow-y-auto p-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg ring-1 ring-inset ring-zinc-200 dark:ring-zinc-700">
            <pre className="whitespace-pre-wrap font-mono text-sm">{documentText}</pre>
          </div>
        </Card>
    </div>
  );
});

export default AnalysisDashboard;
