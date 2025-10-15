import React, { useState, useEffect } from 'react';
import { CVInterview, UserSettings } from '../types';
import { InterviewService } from '../services/interviewService';
import CVUploader from './CVUploader';
import PreparationStep from './PreparationStep';
import InterviewSession from './InterviewSession';
import InterviewResults from './InterviewResults';
import { useLanguage } from '../contexts/LanguageContext';

type InterviewStep = 'upload' | 'preparation' | 'session' | 'results' | 'history';

interface CVInterviewManagerProps {
  settings: UserSettings;
}

const CVInterviewManager: React.FC<CVInterviewManagerProps> = ({ settings }) => {
  const [currentStep, setCurrentStep] = useState<InterviewStep>('upload');
  const [currentInterview, setCurrentInterview] = useState<CVInterview | null>(null);
  const [cvContent, setCvContent] = useState('');
  const [targetPosition, setTargetPosition] = useState('');
  const [interviewType, setInterviewType] = useState<'technical' | 'behavioral' | 'situational' | 'comprehensive'>('comprehensive');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t, locale } = useLanguage();

  // Load interview history on component mount
  useEffect(() => {
    // Any initialization if needed
  }, []);

  const handleCVProcess = async (content: string, fileName?: string) => {
    setCvContent(content);
    setIsLoading(true);
    setError(null);

    try {
      // Create new interview
      const interview = await InterviewService.createInterview(
        content,
        targetPosition,
        interviewType,
        customPrompt,
        settings
      );

      // Save to localStorage
      InterviewService.saveInterview(interview);

      setCurrentInterview(interview);
      setCurrentStep('preparation');

    } catch (error) {
      console.error('Error creating interview:', error);

      // Provide more specific error messages
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

  const handleInterviewComplete = (completedInterview: CVInterview) => {
    setCurrentInterview(completedInterview);
    setCurrentStep('results');
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

  const handleViewHistory = () => {
    setCurrentStep('history');
  };

  const handleBackToMain = () => {
    setCurrentStep('upload');
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <CVUploader
            onCVProcess={handleCVProcess}
            onTargetPositionChange={setTargetPosition}
            onInterviewTypeChange={setInterviewType}
            onCustomPromptChange={setCustomPrompt}
          />
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
            onComplete={handleInterviewComplete}
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
            onViewHistory={handleViewHistory}
          />
        ) : (
          <div>Error: No interview results available</div>
        );

      case 'history':
        return (
          <InterviewHistory
            onSelectInterview={(interview) => {
              setCurrentInterview(interview);
              setCurrentStep('results');
            }}
            onBack={handleBackToMain}
          />
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

      {/* Error Display */}
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

// Interview History Component
interface InterviewHistoryProps {
  onSelectInterview: (interview: CVInterview) => void;
  onBack: () => void;
}

const InterviewHistory: React.FC<InterviewHistoryProps> = ({ onSelectInterview, onBack }) => {
  const [interviews, setInterviews] = useState<CVInterview[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const { t, locale } = useLanguage();

  useEffect(() => {
    loadInterviews();
  }, []);

  const loadInterviews = () => {
    const allInterviews = InterviewService.getAllInterviews();
    setInterviews(allInterviews);
  };

  const filteredInterviews = interviews.filter(interview => {
    const matchesSearch = interview.targetPosition.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         interview.cvFileName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterType === 'all' || interview.interviewType === filterType;

    return matchesSearch && matchesFilter && interview.status === 'completed';
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 80) return 'text-blue-600 dark:text-blue-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 60) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const CalendarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  );

  const TargetIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );

  return (
    <div className="max-w-6xl mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Interview History
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            View and analyze your past interview performances
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          ← Back to Interview
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by position or CV name..."
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Filter by Type */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Interview Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="technical">Technical</option>
              <option value="behavioral">Behavioral</option>
              <option value="situational">Situational</option>
              <option value="comprehensive">Comprehensive</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-end">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              {filteredInterviews.length} interview{filteredInterviews.length !== 1 ? 's' : ''} found
            </div>
          </div>
        </div>
      </div>

      {/* Interview List */}
      {filteredInterviews.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarIcon className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            No interviews found
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            {searchTerm || filterType !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Complete your first interview to see it here.'}
          </p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Start New Interview
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInterviews.map((interview) => (
            <div
              key={interview.id}
              className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 p-6 hover:shadow-2xl transition-all cursor-pointer"
              onClick={() => onSelectInterview(interview)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {interview.targetPosition}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      interview.interviewType === 'technical' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                      interview.interviewType === 'behavioral' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                      interview.interviewType === 'situational' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                      'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300'
                    }`}>
                      {interview.interviewType.charAt(0).toUpperCase() + interview.interviewType.slice(1)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center">
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      {formatDate(interview.completedAt || interview.createdAt)}
                    </div>
                    <div className="flex items-center">
                      <TargetIcon className="w-4 h-4 mr-1" />
                      {interview.answers.length} questions
                    </div>
                    {interview.cvFileName && (
                      <div className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                        {interview.cvFileName}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-2xl font-bold ${getScoreColor(interview.feedback?.overallScore || 0)}`}>
                    {interview.feedback?.overallScore || 0}%
                  </div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    {interview.feedback?.positionFit ?
                      `${interview.feedback.positionFit.charAt(0).toUpperCase() + interview.feedback.positionFit.slice(1)} fit` :
                      'In progress'
                    }
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CVInterviewManager;
