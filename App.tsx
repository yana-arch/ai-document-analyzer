import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { AnalysisResult, HistoryItem, UserSettings, CVInterview, DocumentHistoryItem, InterviewHistoryItem, QuizQuestion } from './types';
import { extractTextFromSource } from './services/documentProcessor';
import { saveDocument, saveInterview, syncLocalHistoryToDatabase, checkForDuplicates, checkInterviewDuplicates } from './services/databaseService';
const PracticeCenter = lazy(() => import('./components/PracticeCenter'));
const OptimizedStudyModule = lazy(() => import('./components/OptimizedStudyModule'));
import UploadSkeleton from './components/skeletons/UploadSkeleton';
import { FocusManager } from './components/shared/FocusManager';
import { PracticeProvider, usePracticeSettingsHandler } from './components/PracticeStateManager';

const LearningHub = lazy(() => import('./components/LearningHub'));
const ContentUploader = lazy(() => import('./components/ContentUploader'));
import { ProcessResult } from './components/ContentUploader';
import Loader, { ProgressIndicator, AnalysisStep } from './components/shared/Loader';
import HistoryList from './components/HistoryList';
import SettingsModal from './components/SettingsModal';
import ErrorBoundary from './components/ErrorBoundary';
import PerformanceMonitor from './components/PerformanceMonitor';
import CVInterviewManager from './components/CVInterviewManager';
import { useLanguage } from './contexts/LanguageContext';
import { loadSettings, saveSettings } from './utils/settingsUtils';

const HISTORY_KEY = 'documentAnalysisHistory';

type ViewState = 'upload' | 'loading' | 'error' | 'analysis_result' | 'cv_interview' | 'practice_center';

const AppContent: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>('upload');
  const [documentText, setDocumentText] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings());
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [activeInterview, setActiveInterview] = useState<CVInterview | null>(null);
  const [questionBank, setQuestionBank] = useState<QuizQuestion[]>([]);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([]);
  const { t, locale, setLocale } = useLanguage();
  
  // Handle settings changes for practice state
  usePracticeSettingsHandler(settings);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(HISTORY_KEY);
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        // Ensure all history items have unique IDs
        const historyWithIds = parsedHistory.map((item: any) => {
          if (!item.id) {
            item.id = `${item.type}-${item.fileName || item.interview?.targetPosition || 'unknown'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          }
          return item;
        });
        setHistory(historyWithIds);
      }

      const savedBank = localStorage.getItem('questionBank');
      if (savedBank) setQuestionBank(JSON.parse(savedBank));
    } catch (err) {
      console.error("Failed to load data from localStorage", err);
    }
  }, []);

  const handleProcess = useCallback(async (result: ProcessResult) => {
    if (result.contentType === 'document') {
      await handleDocumentAnalysis(result.source);
    } else if (result.contentType === 'cv') {
      handleCvInterview(result);
    }
  }, [settings]);

  const handleDocumentAnalysis = async (source: File | string) => {
    setViewState('loading');
    setError(null);
    setAnalysisResult(null);
    setDocumentText(null);
    const currentFileName = source instanceof File ? source.name : 'Pasted Text';
    setFileName(currentFileName);

    const steps: AnalysisStep[] = [
      { label: 'Extracting document text...', status: 'in-progress' },
      { label: 'Analyzing content with AI...', status: 'waiting' },
      { label: 'Generating summary...', status: 'waiting' },
      { label: 'Extracting topics...', status: 'waiting' },
      { label: 'Saving results to database...', status: 'waiting' },
      { label: 'Saving to local history...', status: 'waiting' },
    ];
    setAnalysisSteps(steps);

    try {
      const text = await extractTextFromSource(source);
      setDocumentText(text);
      setAnalysisSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'completed' } : i === 1 ? { ...s, status: 'in-progress' } : s));

      const { aiService } = await import('./services/aiService');
      const result = await aiService.analyzeDocument(text, settings);
      setAnalysisResult(result);
      setAnalysisSteps(prev => prev.map((s, i) => i > 0 && i < 4 ? { ...s, status: 'completed' } : s));
      setAnalysisSteps(prev => prev.map((s, i) => i === 4 ? { ...s, status: 'in-progress' } : s));

      // Save to database
      try {
        await saveDocument(currentFileName, text, result);
        setAnalysisSteps(prev => prev.map((s, i) => i === 4 ? { ...s, status: 'completed' } : s));
        setAnalysisSteps(prev => prev.map((s, i) => i === 5 ? { ...s, status: 'in-progress' } : s));
      } catch (dbError) {
        console.error('Failed to save to database:', dbError);
        // Show user notification for database error
        if (typeof window !== 'undefined') {
          alert('Analysis completed successfully, but failed to save to database. Results are saved locally.');
        }
        // Continue even if DB save fails
      }

      const newHistoryItem: DocumentHistoryItem = {
        type: 'document',
        fileName: currentFileName,
        analysis: result,
        documentText: text,
        date: new Date().toISOString(),
      };
      updateHistory(newHistoryItem);
      setAnalysisSteps(prev => prev.map(s => ({ ...s, status: 'completed' })));
      setViewState('analysis_result');

    } catch (err) {
      console.error("Processing failed:", err);
      setError(err instanceof Error ? err.message : 'error.unknown');
      setViewState('error');
    }
  };

  const handleCvInterview = async (result: ProcessResult) => {
    setViewState('loading');
    try {
        const cvText = await extractTextFromSource(result.source);
                const newInterview: CVInterview = {
                    id: `cv-${Date.now()}`,
                    cvContent: cvText,
                    cvFileName: result.source instanceof File ? result.source.name : undefined,
                    targetPosition: result.targetPosition!,
                    interviewType: result.interviewType!,
                    customPrompt: result.customPrompt,
                    questions: [],
                    answers: [],
                    feedback: { 
                        overallScore: 0,
                        positionFit: 'fair',
                        strengths: [],
                        weaknesses: [],
                        recommendations: [],
                        summary: ''
                    },
                    createdAt: new Date().toISOString(),
                    status: 'preparing'
                };

                // Save to database
                try {
                    await saveInterview({
                        cvContent: cvText,
                        cvFileName: newInterview.cvFileName,
                        targetPosition: newInterview.targetPosition,
                        interviewType: newInterview.interviewType,
                        customPrompt: newInterview.customPrompt,
                        questions: newInterview.questions,
                        answers: newInterview.answers,
                        overallScore: newInterview.feedback.overallScore,
                        feedback: newInterview.feedback,
                        completedAt: newInterview.completedAt,
                        status: newInterview.status
                    });
                } catch (dbError) {
                    console.error('Failed to save interview to database:', dbError);
                    if (typeof window !== 'undefined') {
                        alert('Interview setup completed, but failed to save to database. Data is saved locally.');
                    }
                    // Continue even if DB save fails
                }

                setActiveInterview(newInterview);
                setViewState('cv_interview');
    } catch (err) {
        console.error("CV processing failed:", err);
        setError(err instanceof Error ? err.message : 'error.unknown');
        setViewState('error');
    }
  };
  
  const updateHistory = (newItem: HistoryItem) => {
    setHistory(prevHistory => {
      const updatedHistory = [newItem, ...prevHistory.filter(item => {
        if (newItem.type === 'document' && item.type === 'document') {
          return item.fileName !== newItem.fileName;
        }
        if (newItem.type === 'interview' && item.type === 'interview') {
          return item.interview.id !== newItem.interview.id;
        }
        return true;
      })];
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
      } catch (err) {
        console.error("Failed to save history to localStorage", err);
      }
      return updatedHistory;
    });
  };

  const handleLoadHistory = useCallback((item: HistoryItem) => {
    setError(null);
    if (item.type === 'document') {
        setAnalysisResult(item.analysis);
        setDocumentText(item.documentText);
        setFileName(item.fileName);
        setActiveInterview(null);
        setViewState('analysis_result');
    } else if (item.type === 'interview') {
        setActiveInterview(item.interview);
        setViewState('cv_interview');
    }
  }, []);

  const handleInterviewComplete = async (interview: CVInterview) => {
    // Save completed interview to database
    try {
        await saveInterview({
            cvContent: interview.cvContent,
            cvFileName: interview.cvFileName,
            targetPosition: interview.targetPosition,
            interviewType: interview.interviewType,
            customPrompt: interview.customPrompt,
            questions: interview.questions,
            answers: interview.answers,
            overallScore: interview.feedback.overallScore,
            feedback: interview.feedback,
            completedAt: interview.completedAt || new Date().toISOString(),
            status: interview.status
        });
    } catch (dbError) {
        console.error('Failed to save completed interview to database:', dbError);
        if (typeof window !== 'undefined') {
            alert('Interview completed, but failed to save to database. Results are saved locally.');
        }
        // Continue even if DB save fails
    }

    const newHistoryItem: InterviewHistoryItem = {
        type: 'interview',
        interview: interview,
        date: new Date().toISOString(),
    };
    updateHistory(newHistoryItem);
  };

  const handleDeleteQuestion = (questionText: string) => {
    setQuestionBank(prevBank => {
      const updatedBank = prevBank.filter(q => q.question !== questionText);
      try {
        localStorage.setItem('questionBank', JSON.stringify(updatedBank));
      } catch (err) {
        console.error("Failed to save question bank to localStorage", err);
      }
      return updatedBank;
    });
  };

  const handleEditQuestion = (oldText: string, newText: string) => {
    setQuestionBank(prevBank => {
      const updatedBank = prevBank.map(q => q.question === oldText ? { ...q, question: newText } : q);
      try {
        localStorage.setItem('questionBank', JSON.stringify(updatedBank));
        const { spacedRepetitionService } = require('./services/spacedRepetitionService');
        spacedRepetitionService.updateQuestionText(oldText, newText);
      } catch (err) {
        console.error("Failed to save updated question bank to localStorage", err);
      }
      return updatedBank;
    });
  };

  const handleImportHistory = (mergedHistory: HistoryItem[]) => {
    setHistory(mergedHistory);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(mergedHistory));
    } catch (err) {
      console.error("Failed to save imported history to localStorage", err);
    }
  };

  const handleSyncToDatabase = useCallback(async () => {
    try {
      const results = await syncLocalHistoryToDatabase(history);
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (failCount === 0) {
        alert(`Successfully synced ${successCount} items to database!`);
      } else {
        alert(`Synced ${successCount} items successfully. ${failCount} items failed (likely duplicates).`);
      }
    } catch (error) {
      console.error('Failed to sync to database:', error);
      alert('Failed to sync to database. Please check your connection.');
    }
  }, [history]);

  const handleReset = () => {
    setViewState('upload');
    setDocumentText(null);
    setAnalysisResult(null);
    setError(null);
    setFileName(null);
    setActiveInterview(null);
  };

  const handleSaveSettings = useCallback(async (newSettings: UserSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    const { aiService } = await import('./services/aiService');
    aiService.updateProviders(newSettings.apis);
  }, []);

  useEffect(() => {
    const updateProviders = async () => {
      const { aiService } = await import('./services/aiService');
      aiService.updateProviders(settings.apis);
    };
    updateProviders();
  }, [settings.apis]);
  
  const ErrorIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
  );

  const LanguageSwitcher: React.FC = () => (
    <div className="relative">
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as 'en' | 'vi')}
        className="appearance-none bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md py-2 pl-3 pr-8 text-sm font-semibold text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
        aria-label="Select language"
      >
        <option value="en">English</option>
        <option value="vi">Tiếng Việt</option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-700 dark:text-zinc-200">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
      </div>
    </div>
  );

  const Header: React.FC = () => (
    <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
      <div className="container mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
            <button
              onClick={() => setViewState('upload')}
              className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${viewState === 'upload' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
            >
              <span className="sm:hidden">📊</span>
              <span className="hidden sm:inline">Hub</span>
            </button>
            <button
              onClick={() => setViewState('practice_center')}
              className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${viewState === 'practice_center' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
            >
              <span className="sm:hidden">🎯</span>
              <span className="hidden sm:inline">Practice</span>
            </button>

            <div className="hidden sm:flex items-center space-x-2">
              <svg className="w-6 sm:w-8 h-6 sm:h-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
              <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 truncate">{t('header.title')}</h1>
            </div>

            {/* Mobile-only brand icon */}
            <div className="sm:hidden flex items-center">
              <svg className="w-6 h-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-4">
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-1.5 sm:p-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors touch-manipulation"
              title={t('header.settingsTooltip')}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            {viewState !== 'upload' && (
              <button
                onClick={handleReset}
                className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900 focus:ring-indigo-500 transition-all shadow-sm hover:shadow-md touch-manipulation"
              >
                {t('header.startOver')}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );

  const renderContent = () => {
    switch (viewState) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)]">
            <div className="bg-white dark:bg-zinc-800 p-8 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 max-w-2xl w-full">
              <Loader size="lg" />
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-6 mb-4 text-center">{t('loader.analyzing')}</h3>
              <ProgressIndicator steps={analysisSteps} currentStep={0} />
            </div>
          </div>
        );
      case 'error':
        return (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] text-center">
            <div className="bg-white dark:bg-zinc-800 p-8 rounded-2xl shadow-xl border border-red-500/30 text-center max-w-md w-full">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <ErrorIcon className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{t('error.title')}</h3>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">{t(error || 'error.unknown')}</p>
              <button
                onClick={handleReset}
                className="mt-6 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                {t('error.tryAgain')}
              </button>
            </div>
          </div>
        );
      case 'analysis_result':
        if (analysisResult && documentText) {
          return (
            <Suspense fallback={<div className='h-screen w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse' />}>
              <OptimizedStudyModule
                analysis={analysisResult}
                documentText={documentText}
                fileName={fileName || 'Uploaded Document'}
                settings={settings}
              />
            </Suspense>
          );
        }
        handleReset(); // Should not happen, reset if it does
        return null;
      case 'cv_interview':
        return (
          <CVInterviewManager
            settings={settings}
            initialInterview={activeInterview}
            onInterviewComplete={handleInterviewComplete}
          />
        );
      case 'practice_center':
        return (
          <Suspense fallback={<UploadSkeleton />}>
            <PracticeCenter questionBank={questionBank} onDeleteQuestion={handleDeleteQuestion} onEditQuestion={handleEditQuestion} />
          </Suspense>
        );
      case 'upload':
      default:
        return (
          <Suspense fallback={<UploadSkeleton />}>
            <LearningHub
              history={history}
              onProcess={handleProcess}
              onLoadHistory={handleLoadHistory}
              onImportHistory={handleImportHistory}
              onSyncToDatabase={handleSyncToDatabase}
            />
          </Suspense>
        );
    }
  };

  return (
    <ErrorBoundary onError={(e, i) => console.error('App Error:', e, i)}>
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 font-sans">
        <FocusManager />
        <Header />
        <main className="container mx-auto p-2 sm:p-4 lg:p-6 max-w-full overflow-x-hidden">
          {renderContent()}
        </main>
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          settings={settings}
          onSaveSettings={handleSaveSettings}
          onSyncToDatabase={handleSyncToDatabase}
          t={t}
        />
        {process.env.NODE_ENV === 'development' && <PerformanceMonitor />}
      </div>
    </ErrorBoundary>
  );
};

const App: React.FC = () => {
  return (
    <PracticeProvider>
      <AppContent />
    </PracticeProvider>
  );
};

export default App;
