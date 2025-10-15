import React, { useState } from 'react';
import {
  QuizQuestion,
  GradedWrittenAnswer,
  MultipleChoiceQuestion,
  WrittenAnswerQuestion,
  UserSettings,
  QuizAttempt,
  EnhancedQuizQuestion
} from '../types';
import { adaptiveLearningService } from '../services/adaptiveLearningService';
import Card from './shared/Card';
import Loader from './shared/Loader';
import { useLanguage } from '../contexts/LanguageContext';

interface QuizGeneratorProps {
  documentText: string;
  settings: UserSettings;
  defaultMCQuestions?: number;
  defaultWrittenQuestions?: number;
}

const QuizGenerator: React.FC<QuizGeneratorProps> = ({ documentText, settings, defaultMCQuestions = 5, defaultWrittenQuestions = 0 }) => {
  const [quizState, setQuizState] = useState<'idle' | 'generating' | 'taking' | 'grading' | 'finished'>('idle');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  // Config
  const [mcCount, setMcCount] = useState(defaultMCQuestions);
  const [writtenCount, setWrittenCount] = useState(defaultWrittenQuestions);
  // Answers
  const [selectedMCAnswers, setSelectedMCAnswers] = useState<Record<number, number>>({});
  const [writtenAnswers, setWrittenAnswers] = useState<Record<number, string>>({});
  const [gradedAnswers, setGradedAnswers] = useState<Record<number, GradedWrittenAnswer>>({});
  
  const [score, setScore] = useState({ mc: 0, written: 0, maxWritten: 0 });
  const [error, setError] = useState<string | null>(null);
  const { t, locale } = useLanguage();

  const handleGenerateQuiz = async () => {
    if (mcCount === 0 && writtenCount === 0) {
        setError('quiz.error.noQuestions');
        return;
    }
    setQuizState('generating');
    setError(null);
    try {
      const { aiService } = await import('../services/aiService');
      const generatedQuestions = await aiService.generateQuiz(documentText, locale, settings, mcCount, writtenCount);
      if (generatedQuestions && generatedQuestions.length > 0) {
        // Simple shuffle
        generatedQuestions.sort(() => Math.random() - 0.5);
        setQuestions(generatedQuestions);
        setQuizState('taking');
        setCurrentQuestionIndex(-1);
        setSelectedMCAnswers({});
        setWrittenAnswers({});
        setGradedAnswers({});
        setScore({ mc: 0, written: 0, maxWritten: 0 });
      } else {
        throw new Error("The AI didn't return any questions.");
      }
    } catch (err) {
      setError('quiz.error.api');
      setQuizState('idle');
    }
  };

  const handleSelectMCAnswer = (questionIndex: number, answerIndex: number) => {
    setSelectedMCAnswers(prev => ({ ...prev, [questionIndex]: answerIndex }));
  };

  const handleWrittenAnswerChange = (questionIndex: number, text: string) => {
    setWrittenAnswers(prev => ({...prev, [questionIndex]: text}));
  }

  const handleFinishQuiz = async () => {
    setQuizState('grading');

    const startTime = Date.now();

    // 1. Grade multiple choice
    let correctMC = 0;
    questions.forEach((q, index) => {
      if (q.type === 'multiple-choice' && selectedMCAnswers[index] === q.correctAnswerIndex) {
        correctMC++;
      }
    });

    // 2. Grade written questions
    const writtenQuestionsToGrade = questions.map((q, i) => ({...q, originalIndex: i}))
        .filter(q => q.type === 'written') as (WrittenAnswerQuestion & { originalIndex: number })[];

    let totalWrittenScore = 0;
    let maxWrittenScore = 0;

    if (writtenQuestionsToGrade.length > 0) {
        const { aiService } = await import('../services/aiService');
        const gradingPromises = writtenQuestionsToGrade.map(q => {
            const userAnswer = writtenAnswers[q.originalIndex] || "";
            return aiService.gradeWrittenAnswer(documentText, q.question, userAnswer, locale, settings);
        });

        const results = await Promise.all(gradingPromises);

        const newGradedAnswers: Record<number, GradedWrittenAnswer> = {};
        results.forEach((result, i) => {
            const originalIndex = writtenQuestionsToGrade[i].originalIndex;
            newGradedAnswers[originalIndex] = result;
            totalWrittenScore += result.score;
            maxWrittenScore += result.maxScore;
        });
        setGradedAnswers(newGradedAnswers);
    }

    const finalScore = correctMC + totalWrittenScore;
    const maxScore = questions.filter(q => q.type === 'multiple-choice').length + maxWrittenScore;
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    setScore({ mc: correctMC, written: totalWrittenScore, maxWritten: maxWrittenScore });
    setQuizState('finished');

    // Record quiz attempt for adaptive learning
    const questionResults = questions.map((q, index) => {
      let isCorrect = false;
      let timeForQuestion = Math.floor(timeSpent / questions.length); // Simplified time distribution

      if (q.type === 'multiple-choice') {
        isCorrect = selectedMCAnswers[index] === q.correctAnswerIndex;
      } else if (q.type === 'written') {
        const graded = gradedAnswers[index];
        isCorrect = graded ? graded.score >= graded.maxScore * 0.7 : false; // 70% threshold for written answers
      }

      return {
        questionIndex: index,
        isCorrect,
        timeSpent: timeForQuestion,
        attempts: 1 // Simplified - in real implementation, track actual attempts per question
      };
    });

    const quizAttempt = {
      timestamp: new Date().toISOString(),
      score: finalScore,
      maxScore,
      timeSpent,
      answers: { ...selectedMCAnswers, ...writtenAnswers },
      questionResults
    };

    // Record attempt for adaptive learning
    adaptiveLearningService.recordQuizAttempt(quizAttempt);
  };
  
  const handleRetakeQuiz = () => {
    setQuizState('taking');
    setCurrentQuestionIndex(-1);
    setSelectedMCAnswers({});
    setWrittenAnswers({});
    setGradedAnswers({});
    setScore({ mc: 0, written: 0, maxWritten: 0 });
    setError(null);
  };

  const currentQuestion = questions[currentQuestionIndex];

  const renderIdle = () => (
    <div className="text-center py-8">
      <h4 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">{t('quiz.idleTitle')}</h4>
      <p className="mt-2 text-zinc-500 dark:text-zinc-400">{t('quiz.idleSubtitle')}</p>
      
      <div className="mt-8 max-w-sm mx-auto grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="mc-count" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('quiz.options.mc')}</label>
          <select id="mc-count" value={mcCount} onChange={e => setMcCount(Number(e.target.value))} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
            <option>3</option>
            <option>5</option>
            <option>10</option>
            <option>30</option>
          </select>
        </div>
        <div>
          <label htmlFor="written-count" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('quiz.options.written')}</label>
          <select id="written-count" value={writtenCount} onChange={e => setWrittenCount(Number(e.target.value))} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
            <option>0</option>
            <option>2</option>
            <option>3</option>
          </select>
        </div>
      </div>
      
      <button
        onClick={handleGenerateQuiz}
        className="mt-8 px-6 py-3 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-800 focus:ring-indigo-500 transition-all shadow-sm hover:shadow-md"
      >
        {t('quiz.generateButton')}
      </button>
      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{t(error)}</p>}
    </div>
  );

  const renderGenerating = (message: string) => (
    <div className="flex flex-col items-center justify-center h-48">
      <Loader />
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">{message}</p>
    </div>
  );

  const renderTakingQuizGrid = () => (
    <div>
      {/* Simplified progress indicator */}
      <div className="mb-6 text-center">
        <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mb-2">
          {Object.keys(selectedMCAnswers).length + Object.keys(writtenAnswers).filter(i => writtenAnswers[Number(i)] && writtenAnswers[Number(i)].trim()).length} / {questions.length} {t('quiz.completed')}
        </div>
        <div className="flex justify-center">
          <div className="flex space-x-1">
            {questions.slice(0, 20).map((_, index) => { // Show max 20 questions in progress bar
              const isAnswered = selectedMCAnswers[index] !== undefined || (writtenAnswers[index] && writtenAnswers[index].trim());
              const isCurrent = currentQuestionIndex === index;

              return (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                    isCurrent
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                      : isAnswered
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                  }`}
                  title={`${t('quiz.question')} ${index + 1}`}
                >
                  {index + 1}
                </button>
              );
            })}
            {questions.length > 20 && (
              <span className="w-8 h-8 flex items-center justify-center text-xs text-zinc-500">
                ...
              </span>
            )}
          </div>
        </div>
      </div>

      {currentQuestionIndex >= 0 && (() => {
        const currentQuestion = questions[currentQuestionIndex];
        return (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border-l-4 border-blue-500 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
                  {t('quiz.question')} {currentQuestionIndex + 1} {t('quiz.of')} {questions.length}
                </h4>
                <span className={`px-2 py-1 text-xs rounded ${
                  currentQuestion.type === 'multiple-choice'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                    : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                }`}>
                  {currentQuestion.type === 'multiple-choice' ? t('quiz.options.mc') : t('quiz.options.written')}
                </span>
              </div>
              <button
                onClick={() => setCurrentQuestionIndex(-1)}
                className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 text-xl font-bold"
                title="Close question"
              >
                ✕
              </button>
            </div>

            <div className="mb-6 text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {currentQuestion.question}
            </div>

            {currentQuestion.type === 'multiple-choice' ? (
              <div className="space-y-3">
                {(currentQuestion as MultipleChoiceQuestion).options.map((option, index) => (
                  <label
                    key={index}
                    className={`flex items-center p-4 rounded-lg border transition-all cursor-pointer ${
                      selectedMCAnswers[currentQuestionIndex] === index
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 ring-2 ring-indigo-500 shadow-sm'
                        : 'bg-zinc-100 dark:bg-zinc-700/50 border-zinc-200 dark:border-zinc-600 hover:bg-zinc-200/70 dark:hover:bg-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 hover:shadow-sm'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestionIndex}`}
                      className="h-4 w-4 text-indigo-600 border-zinc-300 focus:ring-indigo-500"
                      checked={selectedMCAnswers[currentQuestionIndex] === index}
                      onChange={() => handleSelectMCAnswer(currentQuestionIndex, index)}
                    />
                    <span className="ml-3 text-zinc-700 dark:text-zinc-200 flex-1">{option}</span>
                    {selectedMCAnswers[currentQuestionIndex] === index && (
                      <span className="ml-2 text-indigo-600 dark:text-indigo-400">✓</span>
                    )}
                  </label>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={writtenAnswers[currentQuestionIndex] || ''}
                  onChange={(e) => handleWrittenAnswerChange(currentQuestionIndex, e.target.value)}
                  rows={6}
                  placeholder={t('quiz.writtenPlaceholder')}
                  className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-700/50 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-800 focus:ring-indigo-500 transition-colors resize-vertical"
                />
                {writtenAnswers[currentQuestionIndex] && writtenAnswers[currentQuestionIndex].trim() && (
                  <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                    ✓ {t('quiz.answered')}
                  </div>
                )}
              </div>
            )}

            {/* Navigation buttons for current question */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-600">
              <button
                onClick={() => setCurrentQuestionIndex(Math.max(-1, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
                className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← {t('quiz.previous')}
              </button>

              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                {currentQuestionIndex + 1} {t('quiz.of')} {questions.length}
              </div>

              <button
                onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                disabled={currentQuestionIndex === questions.length - 1}
                className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('quiz.next')} →
              </button>
            </div>
          </div>
        );
      })()}

      <div className="text-center">
        <button
          onClick={handleFinishQuiz}
          className="px-6 py-2 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-800 focus:ring-green-500 transition-all shadow-sm hover:shadow-md"
        >
          {t('quiz.finishQuiz')}
        </button>
      </div>
    </div>
  );

  const renderTakingQuiz = () => renderTakingQuizGrid();

  const renderFinished = () => (
    <div>
      <div className="text-center p-6 bg-zinc-100 dark:bg-zinc-900/50 rounded-lg mb-8">
        <h3 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">{t('quiz.completeTitle')}</h3>
        <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-300">
          {t('quiz.totalScore')} <span className="font-bold text-indigo-600 dark:text-indigo-400">{score.mc + score.written}</span> {t('quiz.outOf')} <span className="font-bold">{questions.filter(q => q.type==='multiple-choice').length + score.maxWritten}</span>
        </p>
      </div>
      <div className="space-y-6">
        {questions.map((q, index) => {
          if (q.type === 'multiple-choice') {
            const userAnswer = selectedMCAnswers[index];
            const isCorrect = userAnswer === q.correctAnswerIndex;
            return (
                <div key={index} className="p-4 border-l-4 rounded-r-lg bg-zinc-50 dark:bg-zinc-800/50" style={{borderLeftColor: isCorrect ? '#22c55e' : '#ef4444'}}>
                <p className="font-semibold text-zinc-800 dark:text-zinc-200">{index + 1}. {q.question}</p>
                <div className="mt-3 space-y-2 text-sm">
                    {q.options.map((option, optIndex) => {
                    const isUserAnswer = userAnswer === optIndex;
                    const isCorrectAnswer = q.correctAnswerIndex === optIndex;
                    let optionClass = 'text-zinc-600 dark:text-zinc-400';
                    let icon = null;

                    if (isCorrectAnswer) {
                        optionClass = 'font-semibold text-green-700 dark:text-green-400';
                        icon = <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2 shrink-0" />;
                    }
                    if (isUserAnswer && !isCorrect) {
                        optionClass = 'font-semibold text-red-700 dark:text-red-400 line-through';
                        icon = <XCircleIcon className="w-5 h-5 text-red-500 mr-2 shrink-0" />;
                    }
                    
                    return (
                        <div key={optIndex} className="flex items-start">
                        {icon || <span className="w-5 mr-2 shrink-0">&nbsp;</span>}
                        <span className={optionClass}>{option}</span>
                        </div>
                    )
                    })}
                </div>
                <div className="mt-3 p-3 bg-zinc-100 dark:bg-zinc-700/50 rounded-lg text-sm">
                    <p><span className="font-bold">{t('quiz.explanation')}</span> {q.explanation}</p>
                </div>
                </div>
            )
          } else { // Written question
            const userAnswer = writtenAnswers[index] || t('quiz.noAnswer');
            const graded = gradedAnswers[index];
            const scoreColor = graded ? `hsl(${graded.score * 24}, 80%, 50%)` : '#9ca3af'; // red to green
            return (
                <div key={index} className="p-4 border-l-4 rounded-r-lg bg-zinc-50 dark:bg-zinc-800/50" style={{ borderLeftColor: scoreColor }}>
                    <div className="flex justify-between items-start">
                        <p className="font-semibold text-zinc-800 dark:text-zinc-200 flex-1">{index + 1}. {q.question}</p>
                        {graded && <span className="ml-4 px-3 py-1 text-sm font-bold text-white rounded-full" style={{ backgroundColor: scoreColor }}>{graded.score}/{graded.maxScore}</span>}
                    </div>
                    <div className="mt-3 p-3 bg-zinc-100 dark:bg-zinc-700/50 rounded-lg text-sm">
                        <p className="font-bold text-zinc-600 dark:text-zinc-300">{t('quiz.yourAnswer')}</p>
                        <p className="mt-1 whitespace-pre-wrap">{userAnswer}</p>
                    </div>
                    {graded && (
                        <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-sm">
                            <p className="font-bold text-indigo-800 dark:text-indigo-300">{t('quiz.aiFeedback')}</p>
                            <p className="mt-1 text-indigo-700 dark:text-indigo-200">{graded.feedback}</p>
                        </div>
                    )}
                </div>
            )
          }
        })}
      </div>
       <div className="mt-8 text-center">
         <button
            onClick={handleRetakeQuiz}
            className="px-6 py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-800 focus:ring-indigo-500"
         >
            {t('quiz.retake')}
         </button>
       </div>
    </div>
  );
  
  const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
  );

  const XCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
  );


  const renderContent = () => {
    switch(quizState) {
      case 'generating': return renderGenerating(t('quiz.generating'));
      case 'grading': return renderGenerating(t('quiz.grading'));
      case 'taking': return renderTakingQuiz();
      case 'finished': return renderFinished();
      case 'idle':
      default:
        return renderIdle();
    }
  };

  return (
    <Card title={t('quiz.title')}>
      {renderContent()}
    </Card>
  );
};

export default QuizGenerator;
