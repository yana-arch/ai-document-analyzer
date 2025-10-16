import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CVInterview, InterviewQuestion, InterviewAnswer, UserSettings } from '../types';
import { InterviewService } from '../services/interviewService';
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

interface InterviewSessionProps {
  interview: CVInterview;
  settings: UserSettings;
  onComplete: (completedInterview: CVInterview) => void;
  onExit: () => void;
}

const InterviewSession: React.FC<InterviewSessionProps> = ({
  interview,
  settings,
  onComplete,
  onExit
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isAnswering, setIsAnswering] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<InterviewAnswer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t, locale } = useLanguage();
  const { isListening, transcript, startListening, stopListening, isSupported, error } = useSpeechRecognition({ lang: locale });
  const currentAnswerRef = useRef(currentAnswer);
  const listeningRef = useRef(isListening);

  useEffect(() => {
    currentAnswerRef.current = currentAnswer;
  }, [currentAnswer]);

  useEffect(() => {
    // When listening stops, append the final transcript to the answer.
    if (listeningRef.current && !isListening && transcript) {
      setCurrentAnswer(prev => (prev ? prev.trim() + ' ' : '') + transcript.trim());
    }
    listeningRef.current = isListening;
  }, [isListening, transcript]);

  const currentQuestion = interview.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === interview.questions.length - 1;
  const progress = ((currentQuestionIndex + 1) / interview.questions.length) * 100;

  const handleTimeUp = useCallback(async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Submit empty answer when time runs out
      const answer = currentAnswerRef.current.trim() || 'No answer provided (time expired)';

      const feedback = await InterviewService.evaluateAnswer(
        currentQuestion,
        answer,
        interview.cvContent,
        interview.targetPosition,
        settings
      );

      setCurrentFeedback(feedback);
      setShowFeedback(true);

      // Save answer to interview
      const updatedInterview = {
        ...interview,
        answers: [...interview.answers, feedback]
      };
      InterviewService.saveInterview(updatedInterview);

    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [currentQuestion, interview, settings, isSubmitting]);

  // Timer effect
  useEffect(() => {
    if (!currentQuestion || isAnswering || showFeedback) return;

    setTimeRemaining(currentQuestion.timeLimit);
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Auto-submit when time runs out
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestionIndex, isAnswering, showFeedback]);

  const handleSubmitAnswer = async () => {
    if (isSubmitting || !currentAnswer.trim()) return;

    setIsSubmitting(true);
    try {
      const feedback = await InterviewService.evaluateAnswer(
        currentQuestion,
        currentAnswer.trim(),
        interview.cvContent,
        interview.targetPosition,
        settings
      );

      setCurrentFeedback(feedback);
      setShowFeedback(true);

      // Save answer to interview
      const updatedInterview = {
        ...interview,
        answers: [...interview.answers, feedback]
      };
      InterviewService.saveInterview(updatedInterview);

    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteInterview = useCallback(async () => {
    // Prevent multiple calls
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Generate final feedback only if we have answers
      if (interview.answers.length > 0) {
        const finalFeedback = await InterviewService.generateInterviewFeedback(interview, settings);

        const completedInterview: CVInterview = {
          ...interview,
          answers: interview.answers,
          feedback: finalFeedback,
          completedAt: new Date().toISOString(),
          status: 'completed'
        };

        InterviewService.saveInterview(completedInterview);
        onComplete(completedInterview);
      } else {
        // Complete interview without feedback if no answers
        const completedInterview: CVInterview = {
          ...interview,
          answers: interview.answers,
          completedAt: new Date().toISOString(),
          status: 'completed'
        };
        onComplete(completedInterview);
      }
    } catch (error) {
      console.error('Error completing interview:', error);
      // Still complete the interview even if feedback generation fails
      const completedInterview: CVInterview = {
        ...interview,
        answers: interview.answers,
        completedAt: new Date().toISOString(),
        status: 'completed'
      };
      onComplete(completedInterview);
    } finally {
      setIsSubmitting(false);
    }
  }, [interview, settings, onComplete, isSubmitting]);

  const handleNextQuestion = useCallback(() => {
    if (isLastQuestion) {
      // Complete interview - only if not already completing
      if (!isSubmitting) {
        handleCompleteInterview();
      }
    } else {
      // Move to next question
      setCurrentQuestionIndex(prev => prev + 1);
      setCurrentAnswer('');
      setShowFeedback(false);
      setCurrentFeedback(null);
    }
  }, [isLastQuestion, isSubmitting, handleCompleteInterview]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = (): string => {
    if (timeRemaining > 60) return 'text-green-600 dark:text-green-400';
    if (timeRemaining > 30) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const ClockIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12,6 12,12 16,14"></polyline>
    </svg>
  );

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Loading interview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Interview Practice
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              {interview.targetPosition} • Question {currentQuestionIndex + 1} of {interview.questions.length}
            </p>
          </div>
          <button
            onClick={onExit}
            className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            Exit Interview
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 p-8 mb-8">
        {/* Timer */}
        <div className="flex items-center justify-center mb-6">
          <div className={`flex items-center space-x-2 text-lg font-mono ${getTimeColor()}`}>
            <ClockIcon className="w-5 h-5" />
            <span className="font-bold">{formatTime(timeRemaining)}</span>
          </div>
        </div>

        {/* Question */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-sm font-medium mb-4">
            {currentQuestion.type.charAt(0).toUpperCase() + currentQuestion.type.slice(1)} Question
          </div>
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 leading-relaxed">
            {currentQuestion.question}
          </h3>
          {currentQuestion.category && (
            <p className="text-zinc-600 dark:text-zinc-400 mt-2">
              Category: {currentQuestion.category}
            </p>
          )}
        </div>

        {/* Answer Input */}
        {!showFeedback && (
          <div>
            <label htmlFor="answer" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              Your Answer
            </label>
            <div className="relative w-full">
              <textarea
                id="answer"
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Take your time to provide a thoughtful answer, or use the microphone to speak..."
                className={`w-full h-48 px-4 py-3 pr-24 bg-zinc-50 dark:bg-zinc-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none ${
                  isListening ? 'border-indigo-500' : 'border-zinc-300 dark:border-zinc-600'
                }`}
                disabled={isSubmitting}
              />
              {isListening && (
                <div className="absolute inset-2 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm rounded-md p-4 pointer-events-none">
                  <p className="text-zinc-700 dark:text-zinc-300 italic">{transcript || 'Listening...'}</p>
                </div>
              )}
              {isSupported && (
                <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                  {isListening && (
                    <span className="text-sm text-indigo-600 dark:text-indigo-400 animate-pulse">Listening...</span>
                  )}
                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    className={`p-2 rounded-full transition-colors ${
                      isListening
                        ? 'bg-red-500 text-white'
                        : 'bg-indigo-500 text-white hover:bg-indigo-600'
                    }`}
                    aria-label={isListening ? 'Stop recording' : 'Start recording'}
                  >
                    <MicrophoneIcon className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
            {error && <p className="text-red-500 text-sm mt-2">Speech recognition error: {error}</p>}
            {!isSupported && <p className="text-yellow-600 text-sm mt-2">Speech recognition is not supported in your browser.</p>}

            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                {currentAnswer.length} characters
              </div>

              <button
                onClick={handleSubmitAnswer}
                disabled={!currentAnswer.trim() || isSubmitting}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Evaluating...
                  </div>
                ) : (
                  'Submit Answer'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Feedback Display */}
        {showFeedback && currentFeedback && (
          <div className="space-y-6">
            {/* Score */}
            <div className="text-center">
              <div className={`text-4xl font-bold mb-2 ${
                currentFeedback.score >= 80 ? 'text-green-600 dark:text-green-400' :
                currentFeedback.score >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {currentFeedback.score}/100
              </div>
              <div className="text-zinc-600 dark:text-zinc-400">
                {currentFeedback.score >= 90 ? 'Excellent' :
                 currentFeedback.score >= 80 ? 'Good' :
                 currentFeedback.score >= 70 ? 'Fair' :
                 currentFeedback.score >= 60 ? 'Needs Improvement' : 'Poor'}
              </div>
            </div>

            {/* Feedback */}
            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-6">
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Feedback</h4>
              <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {currentFeedback.feedback}
              </p>
            </div>

            {/* Strengths */}
            {currentFeedback.strengths && currentFeedback.strengths.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                <h4 className="font-semibold text-green-800 dark:text-green-300 mb-3">Strengths</h4>
                <ul className="space-y-2">
                  {currentFeedback.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-green-700 dark:text-green-300">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvements */}
            {currentFeedback.improvements && currentFeedback.improvements.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-3">Areas for Improvement</h4>
                <ul className="space-y-2">
                  {currentFeedback.improvements.map((improvement, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-blue-700 dark:text-blue-300">{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next Button */}
            <div className="text-center">
              <button
                onClick={handleNextQuestion}
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
              >
                {isLastQuestion ? 'Complete Interview' : 'Next Question'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Question Navigation */}
      <div className="flex justify-center space-x-2">
        {interview.questions.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              if (index <= currentQuestionIndex || showFeedback) {
                setCurrentQuestionIndex(index);
                setCurrentAnswer('');
                setShowFeedback(false);
                setCurrentFeedback(null);
              }
            }}
            disabled={index > currentQuestionIndex && !showFeedback}
            className={`w-10 h-10 rounded-full text-sm font-medium transition-all ${
              index === currentQuestionIndex
                ? 'bg-indigo-600 text-white'
                : index < currentQuestionIndex || (showFeedback && index <= currentQuestionIndex)
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 cursor-not-allowed'
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {/* Time Warning */}
      {timeRemaining <= 30 && timeRemaining > 0 && (
        <div className="fixed top-4 right-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 shadow-lg">
          <div className="flex items-center space-x-2">
            <ClockIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-red-800 dark:text-red-200 font-medium">
              {timeRemaining} seconds remaining!
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewSession;