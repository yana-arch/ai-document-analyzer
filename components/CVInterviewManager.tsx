import React, { useState, useEffect, Suspense, lazy } from 'react';
import { CVInterview, UserSettings } from '../types';
import { InterviewService } from '../services/interviewService';
import PreparationStep from './PreparationStep';
import InterviewSession from './InterviewSession';
import InterviewResults from './InterviewResults';
import { useLanguage } from '../contexts/LanguageContext';
import UploadSkeleton from './skeletons/UploadSkeleton';

const CVUploader = lazy(() => import('./CVUploader'));

type InterviewStep = 'upload' | 'preparation' | 'session' | 'results';

interface CVInterviewManagerProps {
  settings: UserSettings;
  initialInterview?: CVInterview | null;
  onInterviewComplete?: (interview: CVInterview) => void;
}

const CVInterviewManager: React.FC<CVInterviewManagerProps> = ({ settings, initialInterview, onInterviewComplete }) => {
  const [currentStep, setCurrentStep] = useState<InterviewStep>(initialInterview ? 'results' : 'upload');
  const [currentInterview, setCurrentInterview] = useState<CVInterview | null>(initialInterview || null);
  const [cvContent, setCvContent] = useState(initialInterview?.cvContent || '');
  const [targetPosition, setTargetPosition] = useState(initialInterview?.targetPosition || '');
  const [interviewType, setInterviewType] = useState<'technical' | 'behavioral' | 'situational' | 'comprehensive'>(initialInterview?.interviewType || 'comprehensive');
  const [customPrompt, setCustomPrompt] = useState(initialInterview?.customPrompt || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t, locale } = useLanguage();

  useEffect(() => {
    if (initialInterview) {
      setCurrentInterview(initialInterview);
      setCurrentStep('results');
      setCvContent(initialInterview.cvContent);
      setTargetPosition(initialInterview.targetPosition);
      setInterviewType(initialInterview.interviewType);
      setCustomPrompt(initialInterview.customPrompt || '');
    }
  }, [initialInterview]);

  const handleCVProcess = async (content: string, fileName?: string) => {
    setCvContent(content);
    setIsLoading(true);
    setError(null);

    try {
      const interview = await InterviewService.createInterview(
        content,
        targetPosition,
        interviewType,
        customPrompt,
        settings
      );

      InterviewService.saveInterview(interview);

      setCurrentInterview(interview);
      setCurrentStep('preparation');

    } catch (error) {
      console.error('Error creating interview:', error);
      if (error.message.includes('No active AI provider')) {
        setError('Please configure an AI provider (Gemini or OpenRouter) in Settings before starting an interview.');
      } else if (error.message.includes('API')) {
        setError('API configuration issue. Please check your API keys in Settings.');
      } else {
        setError('Failed to create interview. Please check your CV content and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInterviewCompleteInternal = (completedInterview: CVInterview) => {
    setCurrentInterview(completedInterview);
    setCurrentStep('results');
    if (onInterviewComplete) {
      onInterviewComplete(completedInterview);
    }
  };

  const handleNewInterview = () => {
    setCurrentStep('upload');
    setCurrentInterview(null);
    setCvContent('');
    setTargetPosition('');
    setInterviewType('comprehensive');
    setCustomPrompt('');
    setError(null);
  };

  const handleBackToMain = () => {
    setCurrentStep('upload');
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <Suspense fallback={<UploadSkeleton />}>
            <CVUploader
              onCVProcess={handleCVProcess}
              onTargetPositionChange={setTargetPosition}
              onInterviewTypeChange={setInterviewType}
              onCustomPromptChange={setCustomPrompt}
            />
          </Suspense>
        );

      case 'preparation':
        return currentInterview ? (
          <PreparationStep
            cvContent={cvContent}
            targetPosition={targetPosition}
            interviewType={interviewType}
            settings={settings}
            onStartInterview={() => setCurrentStep('session')}
            onBack={handleBackToMain}
          />
        ) : (
          <div>Error: No interview data available</div>
        );

      case 'session':
        return currentInterview ? (
          <InterviewSession
            interview={currentInterview}
            settings={settings}
            onComplete={handleInterviewCompleteInternal}
            onExit={handleBackToMain}
          />
        ) : (
          <div>Error: No interview data available</div>
        );

      case 'results':
        return currentInterview ? (
          <InterviewResults
            interview={currentInterview}
            onNewInterview={handleNewInterview}
            onViewHistory={() => { /* This will be handled by App.tsx now */ }}
          />
        ) : (
          <div>Error: No interview results available</div>
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            {currentStep === 'upload' ? 'Creating Interview...' : 'Loading...'}
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400">
            Please wait while we prepare your interview experience.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900">
      {renderCurrentStep()}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 shadow-lg max-w-md">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-red-800 dark:text-red-200 text-sm font-medium">Error</p>
              <p className="text-red-700 dark:text-red-300 text-sm mt-1">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CVInterviewManager;