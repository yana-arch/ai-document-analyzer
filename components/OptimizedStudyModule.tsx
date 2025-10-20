import React, { memo, Suspense, lazy, useState, useMemo, useEffect, useCallback } from 'react';
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

type ActiveTab = 'overview' | 'qa' | 'practice';

const OptimizedStudyModule: React.FC<StudyModuleProps> = memo(({ analysis, documentText, fileName, settings }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [showFullText, setShowFullText] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+1 for Overview
      if (e.ctrlKey && e.key === '1') {
        e.preventDefault();
        setActiveTab('overview');
      }
      // Ctrl+2 for Q&A
      else if (e.ctrlKey && e.key === '2') {
        e.preventDefault();
        setActiveTab('qa');
      }
      // Ctrl+3 for Practice
      else if (e.ctrlKey && e.key === '3') {
        e.preventDefault();
        setActiveTab('practice');
      }
      // Ctrl+F for Full Text toggle
      else if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        setShowFullText(!showFullText);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFullText]);

  const breadcrumbItems = useMemo(() => [
    { label: t('breadcrumb.home') || 'Home', onClick: () => window.location.reload() },
    { label: fileName, current: true }
  ], [fileName, t]);

  const renderOverviewContent = () => {
    return (
      <div className="space-y-6">
        {/* 2-column layout on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card title={t('dashboard.summaryTitle') || 'Document Summary'}>
              <SummaryPanel summary={analysis.summary} />
            </Card>
            
            {/* Full Text section collapsible */}
            <Card 
              title={t('dashboard.fullDocumentText') || 'Full Document Text'} 
              actions={
                <button 
                  onClick={() => setShowFullText(!showFullText)}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                >
                  {showFullText ? t('overview.hideText') || 'Hide' : t('overview.showText') || 'Show'} 
                  ({documentText.length} chars)
                </button>
              }
            >
              {showFullText && (
                <div className="prose prose-zinc dark:prose-invert max-w-none p-4 h-96 overflow-y-auto bg-zinc-50 dark:bg-zinc-900/30 rounded-lg">
                  {documentText}
                </div>
              )}
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card title={t('dashboard.topicsTitle') || 'Key Topics'}>
              <TopicsCloud topics={analysis.topics} />
            </Card>
            <Card title={t('dashboard.entitiesTitle') || 'Entities & Sentiment'}>
              <EntityExtractor entities={analysis.entities} sentiment={analysis.sentiment} />
            </Card>
            
            {/* Quick stats */}
            <Card title={t('overview.quickStats') || 'Quick Stats'}>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {t('overview.totalWords') || 'Total Words'}
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {documentText.split(/\s+/).length.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {t('overview.readingTime') || 'Reading Time'}
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {Math.ceil(documentText.split(/\s+/).length / 200)} min
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {t('overview.topicsCount') || 'Topics Identified'}
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {analysis.topics.length}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewContent();
      case 'qa':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-zinc-600 dark:text-zinc-400">Loading Q&A Interface...</p>
            </div>
          </div>}>
            <Card title={t('dashboard.chatTitle') || 'Ask Questions'}>
              <QnAChat documentText={documentText} fileName={fileName} settings={settings} analysis={analysis} />
            </Card>
          </Suspense>
        );
      case 'practice':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-zinc-600 dark:text-zinc-400">Loading Practice Exercises...</p>
            </div>
          </div>}>
            <ExerciseGenerator documentText={documentText} settings={settings} />
          </Suspense>
        );
      default:
        return null;
    }
  };

  const TabButton: React.FC<{ 
    tabName: ActiveTab; 
    label: string; 
    icon: React.ReactNode;
    shortcut?: string;
  }> = ({ tabName, label, icon, shortcut }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all relative group ${
        activeTab === tabName
          ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
      }`}
    >
      {icon}
      <span>{label}</span>
      {shortcut && (
        <span className="ml-1 text-xs opacity-50 group-hover:opacity-100 transition-opacity">
          {shortcut}
        </span>
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      <Breadcrumb items={breadcrumbItems} />
      
      <div className="bg-white dark:bg-zinc-800 p-4 sm:p-6 rounded-2xl shadow-md border border-zinc-200 dark:border-zinc-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">{fileName}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Your study module is ready.</p>
          </div>
          
          {/* Mobile action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowFullText(!showFullText)}
              className="px-3 py-1.5 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-800/40 transition-colors hidden sm:flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {showFullText ? t('overview.hideText') || 'Hide' : t('overview.showText') || 'Show'} Text
            </button>
            <button
              onClick={() => setActiveTab('qa')}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors hidden sm:flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Ask Questions
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-zinc-200 dark:border-zinc-700">
        <nav className="-mb-px flex space-x-1 sm:space-x-4 overflow-x-auto" aria-label="Tabs">
            <TabButton 
              tabName='overview' 
              label={t('overview.tab') || 'Overview'} 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              shortcut="1"
            />
            <TabButton 
              tabName='qa' 
              label={t('overview.qaTab') || 'Q&A'} 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
              shortcut="2"
            />
            <TabButton 
              tabName='practice' 
              label={t('overview.practiceTab') || 'Practice'} 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
              shortcut="3"
            />
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {renderTabContent()}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-8 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
        <p className="text-sm text-indigo-700 dark:text-indigo-300">
          <span className="font-medium">{t('overview.shortcuts') || 'Keyboard Shortcuts'}:</span> 
          {` ${t('overview.overviewShortcut') || 'Ctrl+1'} | ${t('overview.qaShortcut') || 'Ctrl+2'} | ${t('overview.practiceShortcut') || 'Ctrl+3'} | ${t('overview.fullTextShortcut') || 'Ctrl+F'}`}
        </p>
      </div>
    </div>
  );
});

export default OptimizedStudyModule;
