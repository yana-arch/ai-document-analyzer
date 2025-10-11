import React, { useState } from 'react';
import { QuizQuestion, GradedWrittenAnswer, MultipleChoiceQuestion, WrittenAnswerQuestion, UserSettings } from '../types';
import { aiService } from '../services/aiService';
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
    
    setScore({ mc: correctMC, written: totalWrittenScore, maxWritten: maxWrittenScore });
    setQuizState('finished');
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
      <div className="mb-6 text-sm text-zinc-500 dark:text-zinc-400 font-medium text-center">
        {t('quiz.totalQuestions')}: {questions.length} | {t('quiz.completed')}: {Object.keys(selectedMCAnswers).length + Object.keys(writtenAnswers).filter(q => q.trim()).length}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {questions.map((question, index) => (
          <div key={index} className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
            selectedMCAnswers[index] !== undefined || (writtenAnswers[index] && writtenAnswers[index].trim())
              ? 'bg-green-50 dark:bg-green-900/20 border-green-400 ring-2 ring-green-400'
              : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-600 hover:border-indigo-400'
          }`} onClick={() => setCurrentQuestionIndex(index)}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                {t('quiz.question')} {index + 1}
              </span>
              {selectedMCAnswers[index] !== undefined && (
                <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">
                  ✓ {t('quiz.answered')}
                </span>
              )}
              {writtenAnswers[index] && writtenAnswers[index].trim() && (
                <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                  ✓ {t('quiz.answered')}
                </span>
              )}
            </div>
            <h4 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 line-clamp-3">
              {question.question}
            </h4>
          </div>
        ))}
      </div>

      {currentQuestionIndex >= 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border-l-4 border-blue-500 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <h4 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
              {t('quiz.question')} {currentQuestionIndex + 1}
            </h4>
            <button
              onClick={() => setCurrentQuestionIndex(-1)}
              className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              ✕
            </button>
          </div>

          <div className="mb-6 text-zinc-700 dark:text-zinc-300">
            {currentQuestion.question}
          </div>

          {currentQuestion.type === 'multiple-choice' ? (
            <div className="space-y-3">
              {(currentQuestion as MultipleChoiceQuestion).options.map((option, index) => (
                <label key={index} className={`flex items-center p-4 rounded-lg border transition-colors cursor-pointer ${
                  selectedMCAnswers[currentQuestionIndex] === index
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 ring-2 ring-indigo-500'
                    : 'bg-zinc-100 dark:bg-zinc-700/50 border-zinc-200 dark:border-zinc-600 hover:bg-zinc-200/70 dark:hover:bg-zinc-700'
                }`}>
                  <input
                    type="radio"
                    name={`question-${currentQuestionIndex}`}
                    className="h-4 w-4 text-indigo-600 border-zinc-300 focus:ring-indigo-500"
                    checked={selectedMCAnswers[currentQuestionIndex] === index}
                    onChange={() => handleSelectMCAnswer(currentQuestionIndex, index)}
                  />
                  <span className="ml-3 text-zinc-700 dark:text-zinc-200">{option}</span>
                </label>
              ))}
            </div>
          ) : (
            <div>
              <textarea
                value={writtenAnswers[currentQuestionIndex] || ''}
                onChange={(e) => handleWrittenAnswerChange(currentQuestionIndex, e.target.value)}
                rows={6}
                placeholder={t('quiz.writtenPlaceholder')}
                className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-700/50 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-800 focus:ring-indigo-500 transition-colors"
              />
            </div>
          )}
        </div>
      )}

      <div className="text-center">
        <button
          onClick={handleFinishQuiz}
          className="px-6 py-2 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-800 focus:ring-green-500"
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
