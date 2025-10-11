import React, { useState } from 'react';
import { Exercise, UserSettings } from '../types';
import { aiService } from '../services/aiService';
import Card from './shared/Card';
import Loader from './shared/Loader';
import { useLanguage } from '../contexts/LanguageContext';

interface ExerciseGeneratorProps {
  documentText: string;
  settings: UserSettings;
  defaultPracticeExercises?: number;
  defaultSimulationExercises?: number;
  defaultAnalysisExercises?: number;
  defaultApplicationExercises?: number;
}

const ExerciseGenerator: React.FC<ExerciseGeneratorProps> = ({
  documentText,
  settings,
  defaultPracticeExercises = 2,
  defaultSimulationExercises = 2,
  defaultAnalysisExercises = 1,
  defaultApplicationExercises = 1
}) => {
  const [exercisesState, setExercisesState] = useState<'idle' | 'generating'>('idle');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Config
  const [practiceCount, setPracticeCount] = useState(defaultPracticeExercises);
  const [simulationCount, setSimulationCount] = useState(defaultSimulationExercises);
  const [analysisCount, setAnalysisCount] = useState(defaultAnalysisExercises);
  const [applicationCount, setApplicationCount] = useState(defaultApplicationExercises);

  const [score, setScore] = useState({ practice: 0, simulation: 0, analysis: 0, application: 0 });
  const { t, locale } = useLanguage();

  const handleGenerateExercises = async () => {
    if (practiceCount + simulationCount + analysisCount + applicationCount === 0) {
      setError('exercises.error.noExercises');
      return;
    }
    setExercisesState('generating');
    setError(null);

    try {
      const generatedExercises = await aiService.generateExercises(documentText, locale, settings, {
        practice: practiceCount,
        simulation: simulationCount,
        analysis: analysisCount,
        application: applicationCount
      });

      if (generatedExercises && generatedExercises.length > 0) {
        setExercises(generatedExercises);
        setExercisesState('idle'); // Show results when done
      } else {
        throw new Error("The AI didn't return any exercises.");
      }
    } catch (err) {
      setError('exercises.error.api');
      setExercisesState('idle');
    }
  };

  const renderIdle = () => (
    <div className="text-center py-8">
      <h4 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">{t('exercises.idleTitle')}</h4>
      <p className="mt-2 text-zinc-500 dark:text-zinc-400">{t('exercises.idleSubtitle')}</p>

      <div className="mt-8 max-w-sm mx-auto grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="practice-count" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('exercises.options.practice')}</label>
          <select
            id="practice-count"
            value={practiceCount}
            onChange={e => setPracticeCount(Number(e.target.value))}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option>0</option>
            <option>1</option>
            <option>2</option>
            <option>5</option>
          </select>
        </div>
        <div>
          <label htmlFor="simulation-count" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('exercises.options.simulation')}</label>
          <select
            id="simulation-count"
            value={simulationCount}
            onChange={e => setSimulationCount(Number(e.target.value))}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option>0</option>
            <option>1</option>
            <option>2</option>
            <option>3</option>
          </select>
        </div>
        <div>
          <label htmlFor="analysis-count" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('exercises.options.analysis')}</label>
          <select
            id="analysis-count"
            value={analysisCount}
            onChange={e => setAnalysisCount(Number(e.target.value))}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option>0</option>
            <option>1</option>
            <option>2</option>
            <option>3</option>
          </select>
        </div>
        <div>
          <label htmlFor="application-count" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('exercises.options.application')}</label>
          <select
            id="application-count"
            value={applicationCount}
            onChange={e => setApplicationCount(Number(e.target.value))}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option>0</option>
            <option>1</option>
            <option>2</option>
            <option>3</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleGenerateExercises}
        className="mt-8 px-6 py-3 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-800 focus:ring-indigo-500 transition-all shadow-sm hover:shadow-md"
      >
        {t('exercises.generateButton')}
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300';
      case 'intermediate': return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300';
      case 'advanced': return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300';
      default: return 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300';
    }
  };

  const renderExercises = () => (
    <div className="space-y-6">
      {exercises.map((exercise, index) => (
        <div key={exercise.id} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 px-2 py-1 rounded">
                  {t(`exercises.types.${exercise.type}`)}
                </span>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${getDifficultyColor(exercise.difficulty)}`}>
                  {t(`exercises.difficulties.${exercise.difficulty}`)}
                </span>
              </div>
              <h4 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 mb-2">
                {exercise.title}
              </h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                🎯 {exercise.objective}
              </p>
              {exercise.estimatedTime && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                  ⏱️ {exercise.estimatedTime}
                </p>
              )}
            </div>
          </div>

          <div className="mb-6">
            <h5 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              📝 {t('exercises.instructions')}:
            </h5>
            <ol className="list-decimal list-inside space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              {exercise.instructions.map((instruction, i) => (
                <li key={i}>{instruction}</li>
              ))}
            </ol>
          </div>

          {exercise.examples.length > 0 && (
            <div className="mb-6">
              <h5 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                💡 {t('exercises.examples')}:
              </h5>
              <div className="space-y-4">
                {exercise.examples.map((example, i) => (
                  <div key={i} className="bg-white dark:bg-zinc-700/50 rounded border border-zinc-200 dark:border-zinc-600 p-4">
                    {example.title && (
                      <h6 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                        {example.title}
                      </h6>
                    )}
                    <div className="text-sm text-zinc-700 dark:text-zinc-300">
                      {example.type === 'code' ? (
                        <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto">
                          <code>{example.content}</code>
                        </pre>
                      ) : example.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {exercise.skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {exercise.skills.map((skill, i) => (
                <span key={i} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                  #{skill}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderContent = () => {
    switch (exercisesState) {
      case 'generating':
        return renderGenerating(t('exercises.generating'));
      default:
        return exercises.length > 0 ? renderExercises() : renderIdle();
    }
  };

  return (
    <Card title={t('exercises.title')}>
      {renderContent()}
    </Card>
  );
};

export default ExerciseGenerator;
