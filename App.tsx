
import React, { useState, useCallback, useEffect } from 'react';
import { AnalysisResult, HistoryItem, UserSettings } from './types';
import { extractTextFromSource } from './services/documentProcessor';
import DocumentUploader from './components/DocumentUploader';
import AnalysisDashboard from './components/AnalysisDashboard';
import Loader, { ProgressIndicator, AnalysisStep } from './components/shared/Loader';
import HistoryList from './components/HistoryList';
import SettingsModal from './components/SettingsModal';
import ErrorBoundary from './components/ErrorBoundary';
import PerformanceMonitor from './components/PerformanceMonitor';
import { useLanguage } from './contexts/LanguageContext';
import { loadSettings, saveSettings, getAISettings } from './utils/settingsUtils';
import { aiService } from './services/aiService';

const HISTORY_KEY = 'documentAnalysisHistory';

const App: React.FC = () => {
  const [documentText, setDocumentText] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings());
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([
    { label: 'Extracting document text...', status: 'waiting' },
    { label: 'Analyzing content with AI...', status: 'waiting' },
    { label: 'Generating summary...', status: 'waiting' },
    { label: 'Extracting topics...', status: 'waiting' },
    { label: 'Analyzing entities and sentiment...', status: 'waiting' },
    { label: 'Saving results...', status: 'waiting' },
  ]);
  const { t, locale, setLocale } = useLanguage();

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(HISTORY_KEY);
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (err) {
      console.error("Failed to load history from localStorage", err);
    }
  }, []);

  const handleDocumentProcess = useCallback(async (source: File | string) => {
    // Reset analysis steps
    setAnalysisSteps([
      { label: 'Extracting document text...', status: 'waiting' },
      { label: 'Analyzing content with AI...', status: 'waiting' },
      { label: 'Generating summary...', status: 'waiting' },
      { label: 'Extracting topics...', status: 'waiting' },
      { label: 'Analyzing entities and sentiment...', status: 'waiting' },
      { label: 'Saving results...', status: 'waiting' },
    ]);

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setDocumentText(null);
    const currentFileName = source instanceof File ? source.name : source;
    setFileName(currentFileName);

    try {
      // Step 1: Extract document text
      setAnalysisSteps(prev => prev.map((step, idx) =>
        idx === 0 ? { ...step, status: 'in-progress' as const } : step
      ));

      const text = await extractTextFromSource(source);
      setDocumentText(text);

      setAnalysisSteps(prev => prev.map((step, idx) =>
        idx === 0 ? { ...step, status: 'completed' as const } :
        idx === 1 ? { ...step, status: 'in-progress' as const } : step
      ));

      // Step 2-5: AI analysis (we'll mark these as completed together for now)
      const result = await aiService.analyzeDocument(text, settings);
      setAnalysisResult(result);

      setAnalysisSteps(prev => prev.map((step, idx) => ({
        ...step,
        status: idx >= 1 && idx <= 4 ? 'completed' as const : step.status
      })));

      // Step 6: Save results
      setAnalysisSteps(prev => prev.map((step, idx) =>
        idx === 5 ? { ...step, status: 'in-progress' as const } : step
      ));

      const newHistoryItem: HistoryItem = {
        fileName: currentFileName,
        analysis: result,
        documentText: text,
        date: new Date().toISOString(),
      };

      setHistory(prevHistory => {
        const updatedHistory = [newHistoryItem, ...prevHistory.filter(item => item.fileName !== currentFileName)];
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
        } catch (err) {
          console.error("Failed to save history to localStorage", err);
        }
        return updatedHistory;
      });

      setAnalysisSteps(prev => prev.map((step, idx) =>
        idx === 5 ? { ...step, status: 'completed' as const } : step
      ));

    } catch (err) {
      console.error("Processing failed:", err);
      // Mark all steps as error if anything fails
      setAnalysisSteps(prev => prev.map(step => ({ ...step, status: 'error' as const })));
      if (err instanceof Error && err.message.startsWith('error.')) {
        setError(err.message);
      } else {
        setError('error.unknown');
      }
    } finally {
      setIsLoading(false);
    }
  }, [settings.apis, settings.ui]);
  
  const handleLoadHistory = useCallback(async (item: HistoryItem) => {
    // Set the document immediately for display - tips will be generated in AnalysisDashboard if needed
    setAnalysisResult(item.analysis);
    setDocumentText(item.documentText);
    setFileName(item.fileName);
    setError(null);
    setIsLoading(false);
  }, []);

  const handleImportHistory = (mergedHistory: HistoryItem[]) => {
    setHistory(mergedHistory);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(mergedHistory));
    } catch (err) {
      console.error("Failed to save imported history to localStorage", err);
    }
  };

  const handleReset = () => {
    setDocumentText(null);
    setAnalysisResult(null);
    setIsLoading(false);
    setError(null);
    setFileName(null);
  };

  const handleSaveSettings = useCallback((newSettings: UserSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    // Update AI service providers when settings change
    aiService.updateProviders(newSettings.apis);
  }, []);

  // Initialize AI service providers when component mounts
  useEffect(() => {
    aiService.updateProviders(settings.apis);
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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <svg className="w-8 h-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{t('header.title')}</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              title={t('header.settingsTooltip')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <LanguageSwitcher />
            {analysisResult && (
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900 focus:ring-indigo-500 transition-all shadow-sm hover:shadow-md"
              >
                {t('header.analyzeAnother')}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('App Error:', error, errorInfo);
        // Here you could send error to tracking service
      }}
    >
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 font-sans">
        <Header />
        <main className="container mx-auto p-4 sm:p-6 lg:p-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)]">
              <div className="bg-white dark:bg-zinc-800 p-8 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 max-w-2xl w-full">
                <Loader size="lg" />
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-6 mb-4 text-center">{t('loader.analyzing')}</h3>
                <ProgressIndicator steps={analysisSteps} currentStep={0} />
              </div>
            </div>
          ) : error ? (
             <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] text-center">
               <div className="bg-white dark:bg-zinc-800 p-8 rounded-2xl shadow-xl border border-red-500/30 text-center max-w-md w-full">
                  <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                      <ErrorIcon className="w-7 h-7 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{t('error.title')}</h3>
                  <p className="mt-2 text-zinc-600 dark:text-zinc-400">{t(error)}</p>
                   <button
                      onClick={handleReset}
                      className="mt-6 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-800 focus:ring-indigo-500 transition-all shadow-sm hover:shadow-md"
                  >
                      {t('error.tryAgain')}
                  </button>
              </div>
            </div>
          ) : analysisResult && documentText ? (
            <AnalysisDashboard
              analysis={analysisResult}
              documentText={documentText}
              fileName={fileName || 'Uploaded Document'}
              settings={settings}
            />
          ) : (
            <>
              <DocumentUploader onProcess={handleDocumentProcess} />
              <HistoryList items={history} onLoadItem={handleLoadHistory} onImportHistory={handleImportHistory} />
            </>
          )}
        </main>

        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          settings={settings}
          onSaveSettings={handleSaveSettings}
          t={t}
        />

        {/* Performance Monitor - chỉ hiển thị ở development mode */}
        {process.env.NODE_ENV === 'development' && <PerformanceMonitor />}
      </div>
    </ErrorBoundary>
  );
};

export default App;
