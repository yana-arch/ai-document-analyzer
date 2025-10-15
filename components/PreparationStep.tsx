import React, { useState, useEffect } from 'react';
import { PreparationResource, PracticeQuestion, PracticeAttempt, PreparationSession, UserSettings } from '../types';
import { PreparationService } from '../services/preparationService';
import { useLanguage } from '../contexts/LanguageContext';
import useSpeechRecognition from '../hooks/useSpeechRecognition';

// Microphone Icon Component
const MicrophoneIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="22"></line>
  </svg>
);

interface PreparationStepProps {
  cvContent: string;
  targetPosition: string;
  interviewType: 'technical' | 'behavioral' | 'situational' | 'comprehensive';
  settings: UserSettings;
  onStartInterview: () => void;
  onBack: () => void;
}

const PreparationStep: React.FC<PreparationStepProps> = ({
  cvContent,
  targetPosition,
  interviewType,
  settings,
  onStartInterview,
  onBack
}) => {
  const [resources, setResources] = useState<PreparationResource[]>([]);
  const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestion[]>([]);
  const [practiceAttempts, setPracticeAttempts] = useState<PracticeAttempt[]>([]);
  const [selectedResource, setSelectedResource] = useState<PreparationResource | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<PracticeQuestion | null>(null);
  const [practiceAnswer, setPracticeAnswer] = useState('');
  const [showPracticeResult, setShowPracticeResult] = useState(false);
  const [currentPracticeResult, setCurrentPracticeResult] = useState<PracticeAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'resources' | 'practice'>('resources');
  const { t, locale } = useLanguage();
  const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition({ lang: locale });

  useEffect(() => {
    if (transcript) {
      setPracticeAnswer(prev => (prev ? prev + ' ' : '') + transcript);
    }
  }, [transcript]);

  useEffect(() => {
    loadPreparationData();
  }, [cvContent, targetPosition, interviewType, settings]);

  const loadPreparationData = async () => {
    setIsLoading(true);
    try {
      // Load preparation resources
      const resourcesData = await PreparationService.generatePreparationResources(
        cvContent,
        targetPosition,
        interviewType,
        settings
      );
      setResources(resourcesData);

      // Load practice questions
      const questionsData = await PreparationService.generatePracticeQuestions(
        cvContent,
        targetPosition,
        interviewType,
        settings
      );
      setPracticeQuestions(questionsData);

    } catch (error) {
      console.error('Error loading preparation data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePracticeSubmit = async () => {
    if (!selectedQuestion || !practiceAnswer.trim()) return;

    try {
      const result = await PreparationService.evaluatePracticeAnswer(
        selectedQuestion,
        practiceAnswer.trim(),
        cvContent,
        targetPosition,
        settings
      );

      setCurrentPracticeResult(result);
      setShowPracticeResult(true);
      setPracticeAttempts(prev => [...prev, result]);

    } catch (error) {
      console.error('Error evaluating practice answer:', error);
    }
  };

  const handleNextQuestion = () => {
    setSelectedQuestion(null);
    setPracticeAnswer('');
    setShowPracticeResult(false);
    setCurrentPracticeResult(null);
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'article': return '📄';
      case 'video': return '🎥';
      case 'guide': return '📚';
      case 'tips': return '💡';
      case 'checklist': return '✅';
      case 'course': return '🎓';
      case 'book': return '📖';
      case 'website': return '🌐';
      default: return '📋';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'intermediate': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'advanced': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default: return 'bg-zinc-100 dark:bg-zinc-900/30 text-zinc-800 dark:text-zinc-300';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 80) return 'text-blue-600 dark:text-blue-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 60) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Loading preparation materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Interview Preparation
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Prepare for your {targetPosition} interview with tailored resources and practice questions
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-8">
        <div className="bg-white dark:bg-zinc-800 rounded-lg p-1 shadow-sm border border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => setActiveTab('resources')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'resources'
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            📚 Study Resources
          </button>
          <button
            onClick={() => setActiveTab('practice')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'practice'
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            🎯 Practice Questions
          </button>
        </div>
      </div>

      {/* Resources Tab */}
      {activeTab === 'resources' && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              Study Resources
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Curated materials to help you prepare for your interview
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {resources.map((resource) => (
              <div
                key={resource.id}
                onClick={() => setSelectedResource(resource)}
                className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 p-6 hover:shadow-2xl transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-3xl">{getResourceIcon(resource.type)}</div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(resource.difficulty)}`}>
                    {resource.difficulty}
                  </span>
                </div>

                <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                  {resource.title}
                </h4>

                <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-3 line-clamp-3">
                  {resource.content}
                </p>

                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    resource.category === 'technical' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                    resource.category === 'behavioral' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                    resource.category === 'industry-specific' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                    'bg-zinc-100 dark:bg-zinc-900/30 text-zinc-800 dark:text-zinc-300'
                  }`}>
                    {resource.category}
                  </span>

                  <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Practice Tab */}
      {activeTab === 'practice' && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              Practice Questions
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Practice with questions tailored to your CV and target position
            </p>
          </div>

          {/* Question Selection */}
          {!selectedQuestion && !showPracticeResult && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {practiceQuestions.map((question) => (
                <button
                  key={question.id}
                  onClick={() => setSelectedQuestion(question)}
                  className="p-4 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                      {question.difficulty}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {question.type}
                    </span>
                  </div>

                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                    {question.question}
                  </h4>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Category: {question.category}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* Practice Interface */}
          {selectedQuestion && !showPracticeResult && (
            <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 p-8">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(selectedQuestion.difficulty)}`}>
                      {selectedQuestion.difficulty}
                    </span>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {selectedQuestion.category}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedQuestion(null)}
                    className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  >
                    ← Back to questions
                  </button>
                </div>

                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                  {selectedQuestion.question}
                </h3>

                {/* Sample Answer */}
                {selectedQuestion.sampleAnswer && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Sample Answer</h4>
                    <p className="text-blue-700 dark:text-blue-300 text-sm">
                      {selectedQuestion.sampleAnswer}
                    </p>
                  </div>
                )}

                {/* Key Points */}
                {selectedQuestion.keyPoints && selectedQuestion.keyPoints.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">Key Points to Cover</h4>
                    <ul className="text-green-700 dark:text-green-300 text-sm space-y-1">
                      {selectedQuestion.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="practice-answer" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                  Your Practice Answer
                </label>
                <div className="relative w-full">
                  <textarea
                    id="practice-answer"
                    value={practiceAnswer}
                    onChange={(e) => setPracticeAnswer(e.target.value)}
                    placeholder="Practice your answer here, or use the microphone to speak..."
                    className="w-full h-48 px-4 py-3 pr-12 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                  />
                  {isSupported && (
                    <button
                      type="button"
                      onClick={isListening ? stopListening : startListening}
                      className={`absolute bottom-3 right-3 p-2 rounded-full transition-colors ${
                        isListening
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-indigo-500 text-white hover:bg-indigo-600'
                      }`}
                      aria-label={isListening ? 'Stop recording' : 'Start recording'}
                    >
                      <MicrophoneIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    {practiceAnswer.length} characters
                  </div>

                  <button
                    onClick={handlePracticeSubmit}
                    disabled={!practiceAnswer.trim()}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Submit for Evaluation
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Practice Result */}
          {showPracticeResult && currentPracticeResult && (
            <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 p-8">
              <div className="text-center mb-6">
                <div className={`text-4xl font-bold mb-2 ${getScoreColor(currentPracticeResult.score)}`}>
                  {currentPracticeResult.score}/100
                </div>
                <div className="text-zinc-600 dark:text-zinc-400">
                  Practice Score
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-6 mb-6">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Feedback</h4>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {currentPracticeResult.feedback}
                </p>
              </div>

              <div className="text-center">
                <button
                  onClick={handleNextQuestion}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
                >
                  Try Another Question
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resource Detail Modal */}
      {selectedResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">{getResourceIcon(selectedResource.type)}</span>
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                      {selectedResource.title}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(selectedResource.difficulty)}`}>
                        {selectedResource.difficulty}
                      </span>
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {selectedResource.category}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedResource(null)}
                  className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="prose prose-zinc dark:prose-invert max-w-none">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {selectedResource.content}
                </p>
              </div>

              {selectedResource.url && (
                <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
                  <a
                    href={selectedResource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View External Resource
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4 mt-12">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-zinc-600 text-white rounded-lg hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 transition-all"
        >
          ← Back to CV Upload
        </button>

        <button
          onClick={onStartInterview}
          className="px-8 py-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all shadow-lg hover:shadow-xl"
        >
          Start Real Interview →
        </button>
      </div>

      {/* Progress Summary */}
      {practiceAttempts.length > 0 && (
        <div className="mt-8 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-4">Practice Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {practiceAttempts.length}
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">Questions Attempted</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${getScoreColor(practiceAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / practiceAttempts.length)}`}>
                {Math.round(practiceAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / practiceAttempts.length)}%
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">Average Score</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {Math.round(practiceAttempts.reduce((sum, attempt) => sum + attempt.timeSpent, 0) / practiceAttempts.length)}s
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">Avg Response Time</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreparationStep;
