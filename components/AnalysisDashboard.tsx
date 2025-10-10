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
          <div className="h-96 overflow-y-auto">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm">
              {/* Document statistics */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-700">
                <div className="flex items-center space-x-6 text-sm text-zinc-600 dark:text-zinc-400">
                  <span>📄 {Math.round(documentText.length / 1000)}k characters</span>
                  <span>📝 {documentText.split(/\s+/).length} words</span>
                  <span>🧾 {documentText.split(/\n\n|\n\r|\r/).length} paragraphs</span>
                </div>
              </div>

              {/* Document content with enhanced typography */}
              <div className="prose prose-zinc dark:prose-invert max-w-none">
                <div className="leading-relaxed text-zinc-800 dark:text-zinc-100">
                  {documentText.split('\n').map((paragraph, index) => {
                    const trimmed = paragraph.trim();
                    if (!trimmed) return null;

                    // Detect if it looks like a heading (starts with # or is short and ends with colon)
                    const isHeading = trimmed.startsWith('#') ||
                      (trimmed.length < 50 && trimmed.endsWith(':') && !trimmed.includes('.'));

                    // Detect bullet points
                    const isBulletPoint = trimmed.startsWith('- ') || trimmed.startsWith('* ') ||
                      trimmed.match(/^\d+\./);

                    return (
                      <div key={index} className={`${index > 0 ? 'mt-4' : ''}`}>
                        {isHeading ? (
                          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2 mt-6 first:mt-0">
                            {trimmed.replace(/^#+\s*/, '').replace(/:$/, '')}
                          </h3>
                        ) : isBulletPoint ? (
                          <div className="ml-4 text-sm leading-6">
                            {trimmed}
                          </div>
                        ) : (
                          <p className="text-base leading-7">
                            {trimmed}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </Card>
    </div>
  );
});

export default AnalysisDashboard;
