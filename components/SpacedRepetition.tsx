import React, { useState, useEffect } from 'react';
import { spacedRepetitionService } from '../services/spacedRepetitionService';
import { SRSItem, StudySession } from '../types';
import Card from './shared/Card';
import Loader from './shared/Loader';
import { useLanguage } from '../contexts/LanguageContext';

interface SpacedRepetitionProps {
  className?: string;
}

const SpacedRepetition: React.FC<SpacedRepetitionProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<'study' | 'stats' | 'plan' | 'manage'>('study');
  const [studyItems, setStudyItems] = useState<SRSItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [studyStats, setStudyStats] = useState<any>(null);
  const [studyPlan, setStudyPlan] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { t } = useLanguage();

  useEffect(() => {
    loadStudyData();
  }, [activeTab]);

  const loadStudyData = () => {
    const stats = spacedRepetitionService.getStudyStats();
    setStudyStats(stats);

    if (activeTab === 'study') {
      const items = spacedRepetitionService.getItemsForReview(20);
      setStudyItems(items);
      setCurrentItemIndex(0);
      setShowAnswer(false);
    } else if (activeTab === 'plan') {
      const plan = spacedRepetitionService.generateStudyPlan(30);
      setStudyPlan(plan);
    }
  };

  const startStudySession = () => {
    const id = spacedRepetitionService.startStudySession('review');
    setSessionId(id);
    loadStudyData();
  };

  const endStudySession = () => {
    const session = spacedRepetitionService.endStudySession();
    setSessionId(null);
    loadStudyData();
    if (session) {
      alert(`Session completed! Accuracy: ${Math.round((session.correctCount / session.totalCount) * 100)}%`);
    }
  };

  const processAnswer = (quality: number) => {
    if (currentItemIndex >= studyItems.length) return;

    const currentItem = studyItems[currentItemIndex];
    spacedRepetitionService.processAnswer(currentItem.id, quality);

    if (currentItemIndex < studyItems.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
      setShowAnswer(false);
    } else {
      // End of items
      setCurrentItemIndex(studyItems.length);
    }
  };

  const getQualityLabel = (quality: number): string => {
    switch (quality) {
      case 5: return 'Perfect response';
      case 4: return 'Correct with effort';
      case 3: return 'Correct with serious difficulty';
      case 2: return 'Incorrect but easy';
      case 1: return 'Incorrect and difficult';
      case 0: return 'Complete blackout';
      default: return 'Unknown';
    }
  };

  const getQualityColor = (quality: number): string => {
    if (quality >= 4) return 'bg-green-600 hover:bg-green-700';
    if (quality >= 3) return 'bg-yellow-600 hover:bg-yellow-700';
    return 'bg-red-600 hover:bg-red-700';
  };

  const renderStudy = () => {
    if (studyItems.length === 0) {
      return (
        <div className="text-center py-6">
          <div className="text-4xl mb-3">📚</div>
          <h3 className="font-semibold text-zinc-800 dark:text-zinc-100 mb-2">No items due for review</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Complete quizzes to add items to spaced repetition.</p>
          <button
            onClick={startStudySession}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
          >
            Start Session
          </button>
        </div>
      );
    }

    if (currentItemIndex >= studyItems.length) {
      return (
        <div className="text-center py-6">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="font-semibold text-zinc-800 dark:text-zinc-100 mb-2">Session completed!</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Reviewed {studyItems.length} items
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => {
                setCurrentItemIndex(0);
                setShowAnswer(false);
                loadStudyData();
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
            >
              Review Again
            </button>
            <button
              onClick={endStudySession}
              className="px-4 py-2 bg-zinc-600 text-white rounded-lg hover:bg-zinc-700 text-sm"
            >
              End Session
            </button>
          </div>
        </div>
      );
    }

    const currentItem = studyItems[currentItemIndex];
    const progress = ((currentItemIndex + (showAnswer ? 1 : 0)) / studyItems.length) * 100;

    return (
      <div className="space-y-4">
        {/* Compact Header */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">
            {currentItemIndex + 1}/{studyItems.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={startStudySession}
              className="px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs"
            >
              New
            </button>
            <button
              onClick={endStudySession}
              className="px-2 py-1 bg-zinc-600 text-white rounded hover:bg-zinc-700 text-xs"
            >
              End
            </button>
          </div>
        </div>

        {/* Study Item - Compact */}
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
          <div className="flex items-center gap-2 mb-3 text-xs">
            <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 px-2 py-1 rounded">
              Diff: {currentItem.difficulty}/5
            </span>
            <span className="text-zinc-600 dark:text-zinc-400">
              Reviews: {currentItem.reviewCount}
            </span>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold text-zinc-800 dark:text-zinc-100 mb-2 text-sm">Question:</h3>
            <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed">{currentItem.question}</p>
          </div>

          {showAnswer && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
              <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1 text-sm">Answer:</h4>
              <p className="text-blue-700 dark:text-blue-200 text-sm">{currentItem.answer}</p>
            </div>
          )}

          {!showAnswer ? (
            <button
              onClick={() => setShowAnswer(true)}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
            >
              Show Answer
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-zinc-600 dark:text-zinc-400 text-center">
                How well did you know this?
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[5, 3, 0].map((quality) => (
                  <button
                    key={quality}
                    onClick={() => processAnswer(quality)}
                    className={`px-3 py-2 text-xs font-medium text-white rounded transition-colors ${getQualityColor(quality)}`}
                    title={getQualityLabel(quality)}
                  >
                    {quality}
                  </button>
                ))}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
                5=Perfect • 3=Difficult • 0=Unknown
              </div>
            </div>
          )}
        </div>

        {/* Compact Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  };

  const renderStats = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 text-center">
          <div className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">{studyStats?.totalItems || 0}</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Total Items</div>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 text-center">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{studyStats?.dueForReview || 0}</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Due for Review</div>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{studyStats?.masteredItems || 0}</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Mastered</div>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 text-center">
          <div className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">{studyStats?.averageAccuracy || 0}%</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Avg Accuracy</div>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 text-center">
          <div className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">{studyStats?.currentStreak || 0}</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Current Streak</div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-4">Recent Study Sessions</h3>
        <div className="space-y-3">
          {spacedRepetitionService.getRecentSessions(5).map((session) => (
            <div key={session.id} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-700/50 rounded border border-zinc-200 dark:border-zinc-600">
              <div>
                <div className="font-medium text-zinc-800 dark:text-zinc-100">
                  {new Date(session.startTime).toLocaleDateString()}
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  {session.itemsStudied.length} items • {session.sessionType}
                </div>
              </div>
              <div className="text-right">
                <div className={`font-bold ${
                  (session.correctCount / session.totalCount) >= 0.8
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}>
                  {Math.round((session.correctCount / session.totalCount) * 100)}%
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  {session.correctCount}/{session.totalCount}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStudyPlan = () => (
    <div className="space-y-6">
      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-4">30-Day Study Plan</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {studyPlan?.dailyGoals.map((day: any, index: number) => (
            <div key={day.date} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-700/50 rounded border border-zinc-200 dark:border-zinc-600">
              <div>
                <div className="font-medium text-zinc-800 dark:text-zinc-100">
                  Day {index + 1} - {new Date(day.date).toLocaleDateString()}
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  {day.itemsToReview} reviews • {day.newItemsToAdd} new items
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-zinc-800 dark:text-zinc-100">
                  {day.itemsToReview + day.newItemsToAdd}
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">total</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-600">
          <div className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
            Total items to study: {studyPlan?.totalItems || 0}
          </div>
        </div>
      </div>
    </div>
  );

  const renderManage = () => {
    const allItems = spacedRepetitionService.getAllItems();
    const itemsByDifficulty = [1, 2, 3, 4, 5].map(difficulty =>
      allItems.filter(item => item.difficulty === difficulty)
    );

    return (
      <div className="space-y-6">
        {/* Items by Difficulty */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map((difficulty) => (
            <div key={difficulty} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
              <h4 className="font-semibold text-zinc-800 dark:text-zinc-100 mb-3">
                Difficulty {difficulty} ({itemsByDifficulty[difficulty - 1].length} items)
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {itemsByDifficulty[difficulty - 1].slice(0, 5).map((item) => (
                  <div key={item.id} className="text-sm p-2 bg-white dark:bg-zinc-700/50 rounded border border-zinc-200 dark:border-zinc-600">
                    <div className="font-medium text-zinc-800 dark:text-zinc-100 truncate">
                      {item.question}
                    </div>
                    <div className="text-zinc-600 dark:text-zinc-400">
                      Next: {new Date(item.nextReview).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {itemsByDifficulty[difficulty - 1].length > 5 && (
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-2">
                    ... and {itemsByDifficulty[difficulty - 1].length - 5} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-4">Manage Data</h3>
          <div className="space-y-3">
            <button
              onClick={() => {
                const data = spacedRepetitionService.exportData();
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `spaced-repetition-backup-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Export Data
            </button>

            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      const result = spacedRepetitionService.importData(e.target?.result as string);
                      alert(result.message);
                      loadStudyData();
                    };
                    reader.readAsText(file);
                  }
                };
                input.click();
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Import Data
            </button>

            <button
              onClick={() => {
                if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
                  spacedRepetitionService.resetProgress();
                  loadStudyData();
                }
              }}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Reset All Progress
            </button>
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'study', label: 'Study', icon: '📖' },
    { id: 'stats', label: 'Statistics', icon: '📊' },
    { id: 'plan', label: 'Study Plan', icon: '📅' },
    { id: 'manage', label: 'Manage', icon: '⚙️' }
  ];

  return (
    <Card title="Spaced Repetition System" className={className}>
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-zinc-200 dark:border-zinc-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-b-2 border-indigo-500'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'study' && renderStudy()}
          {activeTab === 'stats' && renderStats()}
          {activeTab === 'plan' && renderStudyPlan()}
          {activeTab === 'manage' && renderManage()}
        </div>
      </div>
    </Card>
  );
};

export default SpacedRepetition;
