import React, { memo, Suspense, lazy, useState, useCallback } from 'react';
import { AnalysisResult, UserSettings } from '../types';
import SummaryPanel from './SummaryPanel';
import TopicsCloud from './TopicsCloud';
import EntityExtractor from './EntityExtractor';
import DocumentTips from './DocumentTips';
import Card from './shared/Card';
import ProgressiveDisclosure from './shared/ProgressiveDisclosure';
import Breadcrumb from './shared/Breadcrumb';
import { useLanguage } from '../contexts/LanguageContext';

// Lazy load heavy components
const QnAChat = lazy(() => import('./QnAChat'));
const QuizGenerator = lazy(() => import('./QuizGenerator'));
const ExerciseGenerator = lazy(() => import('./ExerciseGenerator'));
const ExerciseGrader = lazy(() => import('./ExerciseGrader'));

interface AnalysisDashboardProps {
  analysis: AnalysisResult;
  documentText: string;
  fileName: string;
  settings: UserSettings;
}

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = memo(({ analysis, documentText, fileName, settings }) => {
  const { t } = useLanguage();
  const [refreshingTips, setRefreshingTips] = React.useState(false);
  const [tipsGenerated, setTipsGenerated] = React.useState(!!analysis.tips?.length);

  // Progressive disclosure states for focus management
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary', 'chat']));

  const handleSectionToggle = useCallback((sectionKey: string) => (expanded: boolean) => {
    const newExpanded = new Set(expandedSections);
    if (expanded) {
      newExpanded.add(sectionKey);
    } else {
      newExpanded.delete(sectionKey);
    }
    setExpandedSections(newExpanded);
  }, [expandedSections]);

  // Generate tips for documents without tips when settings are enabled
  React.useEffect(() => {
    const generateTipsIfNeeded = async () => {
      if (settings.ui.enableDocumentTips &&
          !tipsGenerated &&
          (!analysis.tips || analysis.tips.length === 0)) {
        setRefreshingTips(true);
        try {
          const { aiService } = await import('../services/aiService');
          const newTips = await aiService.analyzeDocument(documentText, settings)
            .then(result => result.tips.slice(0, settings.documentTips.maxTipsCount));

          if (newTips && newTips.length > 0) {
            analysis.tips = newTips;
            setTipsGenerated(true);
            console.log(`Generated ${newTips.length} tips for ${fileName}`);
          }
        } catch (error) {
          console.warn('Failed to generate tips for document:', error);
        } finally {
          setRefreshingTips(false);
        }
      }
    };

    // Wait a bit before generating tips to allow the component to render first
    const timeoutId = setTimeout(generateTipsIfNeeded, 500);

    return () => clearTimeout(timeoutId);
  }, [settings.ui.enableDocumentTips, analysis, documentText, settings, fileName, tipsGenerated]);

  const handleRefreshTips = React.useCallback(async () => {
    if (refreshingTips) return;

    setRefreshingTips(true);
    try {
      // Import AI service dynamically
      const { aiService } = await import('../services/aiService');
      const newTips = await aiService.analyzeDocument(documentText, settings).then(result => result.tips.slice(0, settings.documentTips.maxTipsCount));

      // Update analysis with new tips based on refresh behavior
      let updatedTips = newTips;
      if (settings.documentTips.refreshBehavior === 'append') {
        const currentTips = analysis.tips || [];
        updatedTips = [...currentTips, ...newTips].slice(0, settings.documentTips.maxTipsCount);
      }

      // Update analysis with new tips
      analysis.tips = updatedTips;

      // Force re-render by calling parent component refresh handler if available
      // This is a basic implementation - in a more advanced app you might use context
      console.log(`Tips refreshed: ${updatedTips.length} tips now available`);

    } catch (error) {
      console.error('Failed to refresh tips:', error);
    } finally {
      setRefreshingTips(false);
    }
  }, [refreshingTips, documentText, settings, analysis]);

  const DocumentIcon: React.FC<React.SVGProps<SVGSVGElement>> = memo((props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
  ));

  const MemoizedSummaryPanel = memo(() => <SummaryPanel summary={analysis.summary} />);
  const MemoizedQnAChat = memo(() => <QnAChat documentText={documentText} fileName={fileName} settings={settings} analysis={analysis} />);
  const MemoizedQuizGenerator = memo(() =>
    <QuizGenerator
      documentText={documentText}
      settings={settings}
      defaultMCQuestions={settings.ai.quizDefaultMCQuestions}
      defaultWrittenQuestions={settings.ai.quizDefaultWrittenQuestions}
    />
  );
  const MemoizedExerciseGenerator = memo(() =>
    <ExerciseGenerator
      documentText={documentText}
      settings={settings}
      defaultPracticeExercises={settings.ai.exerciseDefaultPracticeExercises}
      defaultSimulationExercises={settings.ai.exerciseDefaultSimulationExercises}
      defaultAnalysisExercises={settings.ai.exerciseDefaultAnalysisExercises}
      defaultApplicationExercises={settings.ai.exerciseDefaultApplicationExercises}
      defaultFillableExercises={settings.ai.exerciseDefaultFillableExercises}
    />
  );
  const MemoizedExerciseGrader = memo(() => {
    // For now, we'll show a message that Exercise Grader is available
    // In a full implementation, we'd need to get exercises from ExerciseGenerator
    // or maintain a separate state for exercises
    return (
      <Card title={t('exercises.grading.title')}>
        <div className="text-center py-8">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
            {t('exercises.grading.ready')}
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            {t('exercises.grading.description')}
          </p>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 mb-4">
            <p className="text-sm text-indigo-800 dark:text-indigo-300">
              <strong>{t('exercises.grading.note')}:</strong> {t('exercises.grading.integrationNote')}
            </p>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            {t('exercises.grading.instructions')}
          </p>
        </div>
      </Card>
    );
  });
  const MemoizedTopicsCloud = memo(() => <TopicsCloud topics={analysis.topics} />);
  const MemoizedEntityExtractor = memo(() => <EntityExtractor entities={analysis.entities} sentiment={analysis.sentiment} />);

  // Breadcrumb context-sensitive navigation
  const breadcrumbItems = React.useMemo(() => [
    { label: t('breadcrumb.home') || 'Home', onClick: () => window.history.back() },
    { label: t('breadcrumb.analysis') || 'Document Analysis', onClick: () => {/* navigate to analysis */} },
    { label: fileName, current: true }
  ], [fileName, t]);

  return (
    <div className="space-y-6">
       {/* Breadcrumb Navigation with context */}
       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
         <Breadcrumb items={breadcrumbItems} className="mb-2" />
         <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
           <span className="flex items-center gap-1">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M7 11h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
             </svg>
             {new Date(analysis.timestamp || Date.now()).toLocaleDateString()}
           </span>
           <span className="flex items-center gap-1">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
             </svg>
             {Math.round(documentText.length / 1000)}K chars
           </span>
         </div>
       </div>

       {/* Header với status indicators */}
       <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 p-4 rounded-2xl shadow-lg border border-indigo-200 dark:border-indigo-800/50">
         <div className="flex items-start gap-4">
           <div className="flex-shrink-0">
             <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
               <DocumentIcon className="w-6 h-6 text-white" aria-hidden="true" />
             </div>
           </div>
           <div className="flex-1 min-w-0">
             <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">{fileName}</h2>
             <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
               {t('dashboard.analysisComplete') || 'Analysis completed'} • {t('dashboard.readyToUse') || 'Ready for interaction'}
             </p>
             {/* Status badges */}
             <div className="flex flex-wrap gap-2">
               <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                 <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                   <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                 </svg>
                 Analysis Complete
               </span>
               <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                 <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                   <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                 </svg>
                 AI Chat Ready
               </span>
               {analysis.entities && analysis.entities.length > 0 && (
                 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                   <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                     <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                   </svg>
                   {analysis.entities.length} Entities Found
                 </span>
               )}
             </div>
           </div>
         </div>
       </div>

      {/* Responsive grid với Progressive Disclosure để giảm cognitive load */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Summary Section - Always visible để người dùng hiểu overview ngay */}
          <ProgressiveDisclosure
            title={
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t('dashboard.summaryTitle') || 'Document Summary'}
              </div>
            }
            defaultExpanded={true}
            variant="card"
            onToggle={handleSectionToggle('summary')}
          >
            <MemoizedSummaryPanel />
          </ProgressiveDisclosure>

          {/* Primary Actions - Chat để hỏi đáp ngay */}
          <ProgressiveDisclosure
            title={
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-滨8 9-8s9 3.582 9 8z" />
                </svg>
                {t('dashboard.chatTitle') || 'Ask Questions'}
              </div>
            }
            defaultExpanded={true}
            variant="card"
            onToggle={handleSectionToggle('chat')}
          >
            <Suspense fallback={
              <div className="flex items-center justify-center h-48 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg animate-pulse border border-purple-200 dark:border-purple-700">
                <div className="text-center text-purple-600 dark:text-purple-300">
                  <svg className="w-8 h-8 mx-auto mb-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M12 13.489a10.473 10.473 0 01-7.719-3.342M12 13.489a10.477 10.477 0 007.719-3.342m-7.719 3.342V6.75" />
                  </svg>
                  Loading AI Chat...
                </div>
              </div>
            }>
              <MemoizedQnAChat analysis={analysis} />
            </Suspense>
          </ProgressiveDisclosure>

          {/* Learning Tools - Collapsed by default để không làm người dùng mất tập trung */}
          <ProgressiveDisclosure
            title={
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {t('dashboard.learningTools') || 'Learning Tools'} <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">Collapsed</span>
              </div>
            }
            defaultExpanded={false}
            variant="card"
            onToggle={handleSectionToggle('learning')}
          >
            <div className="space-y-4">
              <Suspense fallback={<div className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />}>
                <MemoizedQuizGenerator />
              </Suspense>
              <Suspense fallback={<div className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />}>
                <MemoizedExerciseGenerator />
              </Suspense>
              <Suspense fallback={<div className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />}>
                <MemoizedExerciseGrader />
              </Suspense>
            </div>
          </ProgressiveDisclosure>
        </div>

        {/* Sidebar với quick insights */}
        <div className="space-y-4">
          <ProgressiveDisclosure
            title={
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {t('dashboard.topicsTitle') || 'Key Topics'}
              </div>
            }
            defaultExpanded={true}
            variant="card"
            onToggle={handleSectionToggle('topics')}
          >
            <MemoizedTopicsCloud />
          </ProgressiveDisclosure>

          <ProgressiveDisclosure
            title={
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                {t('dashboard.entitiesTitle') || 'Entities & Sentiment'}
              </div>
            }
            defaultExpanded={false}
            variant="card"
            onToggle={handleSectionToggle('entities')}
          >
            <MemoizedEntityExtractor />
          </ProgressiveDisclosure>

          {settings.ui.enableDocumentTips && (
            <>
              {refreshingTips ? (
                <ProgressiveDisclosure
                  title={
                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating AI Tips...
                    </div>
                  }
                  defaultExpanded={true}
                  variant="card"
                >
                  <div className="flex items-center justify-center py-6">
                    <div className="text-center space-y-2">
                      <div className="animate-pulse h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4 mx-auto"></div>
                      <div className="animate-pulse h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-1/2 mx-auto"></div>
                    </div>
                  </div>
                </ProgressiveDisclosure>
              ) : (
                analysis.tips && analysis.tips.length > 0 && (
                  <ProgressiveDisclosure
                    title={
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        {t('dashboard.tipsTitle') || 'AI Document Tips'}
                      </div>
                    }
                    defaultExpanded={false}
                    variant="card"
                    onToggle={handleSectionToggle('tips')}
                  >
                    <Suspense fallback={<div className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />}>
                      <DocumentTips
                        tips={analysis.tips}
                        onRefresh={handleRefreshTips}
                        onRefreshLoading={refreshingTips}
                      />
                    </Suspense>
                  </ProgressiveDisclosure>
                )
              )}
            </>
          )}
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
