import React, { useState } from 'react';
import { Exercise, ExerciseSubmission, ExerciseGrade, UserSettings, ExerciseGradingSession } from '../types';
import Card from './shared/Card';
import Loader from './shared/Loader';
import { useLanguage } from '../contexts/LanguageContext';

interface ExerciseGraderProps {
  documentText: string;
  exercises: Exercise[];
  settings: UserSettings;
}

const ExerciseGrader: React.FC<ExerciseGraderProps> = ({
  documentText,
  exercises,
  settings
}) => {
  const [gradingState, setGradingState] = useState<'idle' | 'grading' | 'completed'>('idle');
  const [gradingSession, setGradingSession] = useState<ExerciseGradingSession | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const { t, locale } = useLanguage();

  const handleStartGrading = () => {
    if (exercises.length === 0) {
      setError('exercises.error.noExercises');
      return;
    }

    const session: ExerciseGradingSession = {
      id: `session-${Date.now()}`,
      documentText,
      exercises,
      submissions: [],
      grades: [],
      startedAt: new Date().toISOString()
    };

    setGradingSession(session);
    setGradingState('grading');
    setCurrentExerciseIndex(0);
    setUserAnswers({});
    setError(null);
  };

  const handleAnswerChange = (exerciseId: string, answer: any) => {
    setUserAnswers(prev => ({
      ...prev,
      [exerciseId]: answer
    }));
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
    }
  };

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1);
    }
  };

  const handleSubmitExercise = async (exercise: Exercise) => {
    if (!gradingSession) return;

    const submission: ExerciseSubmission = {
      id: `submission-${Date.now()}`,
      exerciseId: exercise.id,
      exerciseType: exercise.type,
      userAnswers: userAnswers[exercise.id] || {},
      submittedAt: new Date().toISOString()
    };

    const updatedSession = {
      ...gradingSession,
      submissions: [...gradingSession.submissions, submission]
    };

    setGradingSession(updatedSession);
  };

  const handleFinishGrading = async () => {
    if (!gradingSession) return;

    setGradingState('grading');

    try {
      // Grade all submissions
      const grades: ExerciseGrade[] = [];

      const { aiService } = await import('../services/aiService');
      for (const submission of gradingSession.submissions) {
        const exercise = exercises.find(ex => ex.id === submission.exerciseId);
        if (!exercise) continue;

        const grade = await aiService.gradeExercise(
          documentText,
          exercise,
          submission,
          locale,
          settings
        );

        grades.push(grade);
      }

      const completedSession = {
        ...gradingSession,
        grades,
        completedAt: new Date().toISOString()
      };

      setGradingSession(completedSession);
      setGradingState('completed');
    } catch (err) {
      setError('exercises.grading.error.api');
      setGradingState('idle');
    }
  };

  const renderExerciseForm = (exercise: Exercise) => {
    const currentAnswers = userAnswers[exercise.id] || {};

    switch (exercise.type) {
      case 'practice':
        return (
          <div className="space-y-4">
            <textarea
              value={currentAnswers.practiceAnswer || ''}
              onChange={(e) => handleAnswerChange(exercise.id, {
                ...currentAnswers,
                practiceAnswer: e.target.value
              })}
              placeholder={t('exercises.grading.practicePlaceholder')}
              className="w-full h-32 p-3 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-vertical"
            />
          </div>
        );

      case 'analysis':
        return (
          <div className="space-y-4">
            <textarea
              value={currentAnswers.analysisAnswer || ''}
              onChange={(e) => handleAnswerChange(exercise.id, {
                ...currentAnswers,
                analysisAnswer: e.target.value
              })}
              placeholder={t('exercises.grading.analysisPlaceholder')}
              className="w-full h-40 p-3 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-vertical"
            />
          </div>
        );

      case 'application':
        return (
          <div className="space-y-4">
            <textarea
              value={currentAnswers.applicationAnswer || ''}
              onChange={(e) => handleAnswerChange(exercise.id, {
                ...currentAnswers,
                applicationAnswer: e.target.value
              })}
              placeholder={t('exercises.grading.applicationPlaceholder')}
              className="w-full h-36 p-3 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-vertical"
            />
          </div>
        );

      case 'fillable':
        return (
          <div className="space-y-4">
            {/* Render fillable elements for grading */}
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              {t('exercises.grading.fillableInstructions')}
            </div>
            <textarea
              value={currentAnswers.fillableAnswer || ''}
              onChange={(e) => handleAnswerChange(exercise.id, {
                ...currentAnswers,
                fillableAnswer: e.target.value
              })}
              placeholder={t('exercises.grading.fillablePlaceholder')}
              className="w-full h-32 p-3 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-vertical"
            />
          </div>
        );

      default:
        return (
          <div className="text-zinc-600 dark:text-zinc-400">
            {t('exercises.grading.notSupported')}
          </div>
        );
    }
  };

  const renderGradingProgress = () => (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t('exercises.grading.progress')} {currentExerciseIndex + 1} / {exercises.length}
        </span>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {gradingSession?.submissions.length || 0} / {exercises.length} {t('exercises.grading.completed')}
        </span>
      </div>
      <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
        <div
          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentExerciseIndex + 1) / exercises.length) * 100}%` }}
        />
      </div>
    </div>
  );

  const renderGradingSession = () => {
    if (!gradingSession) return null;

    const currentExercise = exercises[currentExerciseIndex];
    const isLastExercise = currentExerciseIndex === exercises.length - 1;
    const hasSubmittedCurrent = gradingSession.submissions.some(s => s.exerciseId === currentExercise.id);

    return (
      <div className="space-y-6">
        {renderGradingProgress()}

        <Card title={`${t('exercises.grading.exercise')} ${currentExerciseIndex + 1}: ${currentExercise.title}`}>
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 px-2 py-1 rounded">
                {t(`exercises.types.${currentExercise.type}`)}
              </span>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {currentExercise.estimatedTime}
              </span>
            </div>

            <p className="text-zinc-700 dark:text-zinc-300 mb-4">
              <strong>{t('exercises.objective')}:</strong> {currentExercise.objective}
            </p>

            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg mb-4">
              <h6 className="font-medium text-zinc-800 dark:text-zinc-200 mb-2">
                {t('exercises.instructions')}:
              </h6>
              <ol className="list-decimal list-inside space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                {currentExercise.instructions.map((instruction, i) => (
                  <li key={i}>{instruction}</li>
                ))}
              </ol>
            </div>

            {renderExerciseForm(currentExercise)}
          </div>

          <div className="flex justify-between">
            <button
              onClick={handlePreviousExercise}
              disabled={currentExerciseIndex === 0}
              className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← {t('exercises.grading.previous')}
            </button>

            {hasSubmittedCurrent ? (
              <div className="px-4 py-2 text-sm font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded-lg">
                ✓ {t('exercises.grading.submitted')}
              </div>
            ) : (
              <button
                onClick={() => handleSubmitExercise(currentExercise)}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {t('exercises.grading.submitExercise')}
              </button>
            )}

            {isLastExercise ? (
              <button
                onClick={handleFinishGrading}
                disabled={gradingSession.submissions.length === 0}
                className="px-6 py-2 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('exercises.grading.finishGrading')}
              </button>
            ) : (
              <button
                onClick={handleNextExercise}
                className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
              >
                {t('exercises.grading.next')} →
              </button>
            )}
          </div>
        </Card>
      </div>
    );
  };

  const renderCompletedGrading = () => {
    if (!gradingSession) return null;

    const totalScore = gradingSession.grades.reduce((sum, grade) => sum + grade.overallScore, 0);
    const maxScore = gradingSession.grades.reduce((sum, grade) => sum + grade.maxScore, 0);
    const averageScore = gradingSession.grades.length > 0 ? totalScore / gradingSession.grades.length : 0;

    return (
      <div className="space-y-6">
        <Card title={t('exercises.grading.results')}>
          <div className="text-center mb-6">
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
              {totalScore.toFixed(1)} / {maxScore}
            </div>
            <div className="text-lg text-zinc-600 dark:text-zinc-400">
              {t('exercises.grading.averageScore')}: {averageScore.toFixed(1)}%
            </div>
          </div>

          <div className="space-y-4">
            {gradingSession.grades.map((grade, index) => {
              const exercise = exercises.find(ex => ex.id === grade.exerciseId);
              const percentage = (grade.overallScore / grade.maxScore) * 100;

              return (
                <div key={grade.id} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h5 className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {exercise?.title || `Exercise ${index + 1}`}
                      </h5>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {t(`exercises.types.${exercise?.type}`)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
                        {grade.overallScore} / {grade.maxScore}
                      </div>
                      <div className={`text-sm font-medium ${
                        percentage >= 80 ? 'text-green-600 dark:text-green-400' :
                        percentage >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {percentage.toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    {grade.criteriaGrades.map((criteria, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-zinc-600 dark:text-zinc-400">{criteria.criterion}</span>
                        <span className="font-medium">{criteria.score} / {criteria.maxScore}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg">
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      <strong>{t('exercises.grading.feedback')}:</strong> {grade.feedback}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  };

  const renderContent = () => {
    switch (gradingState) {
      case 'grading':
        return renderGradingSession();
      case 'completed':
        return renderCompletedGrading();
      case 'idle':
      default:
        return (
          <div className="text-center py-8">
            <h4 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              {t('exercises.grading.title')}
            </h4>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6">
              {t('exercises.grading.description')}
            </p>

            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-6 mb-6">
              <h5 className="font-medium text-zinc-800 dark:text-zinc-200 mb-3">
                {t('exercises.grading.exercisesToGrade')}:
              </h5>
              <div className="space-y-2">
                {exercises.map((exercise, index) => (
                  <div key={exercise.id} className="flex items-center gap-3 text-sm">
                    <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="text-zinc-700 dark:text-zinc-300">{exercise.title}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700 px-2 py-1 rounded">
                      {t(`exercises.types.${exercise.type}`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleStartGrading}
              className="px-6 py-3 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-800 focus:ring-indigo-500 transition-all shadow-sm hover:shadow-md"
            >
              {t('exercises.grading.startGrading')}
            </button>
            {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{t(error)}</p>}
          </div>
        );
    }
  };

  return (
    <Card title={t('exercises.grading.cardTitle')}>
      {renderContent()}
    </Card>
  );
};

export default ExerciseGrader;
