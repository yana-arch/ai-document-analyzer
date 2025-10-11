import React, { useState, useEffect } from 'react';
import { adaptiveLearningService } from '../services/adaptiveLearningService';
import { UserStats, LearningProgress, Badge, Achievement, PersonalizedRecommendation } from '../types';
import Card from './shared/Card';
import { useLanguage } from '../contexts/LanguageContext';

interface LearningAnalyticsProps {
  className?: string;
}

const LearningAnalytics: React.FC<LearningAnalyticsProps> = ({ className = '' }) => {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [learningProgress, setLearningProgress] = useState<Map<string, LearningProgress>>(new Map());
  const [badges, setBadges] = useState<Badge[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [recommendations, setRecommendations] = useState<PersonalizedRecommendation[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'badges' | 'achievements'>('overview');

  const { t } = useLanguage();

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = () => {
    setUserStats(adaptiveLearningService.getUserStats());
    setLearningProgress(adaptiveLearningService.getLearningProgress() as Map<string, LearningProgress>);
    setBadges(adaptiveLearningService.getBadges());
    setAchievements(adaptiveLearningService.getAchievements());
    setRecommendations(adaptiveLearningService.getRecommendations());
  };

  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-600 dark:text-green-400';
    if (score >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getDifficultyColor = (level: string): string => {
    switch (level) {
      case 'beginner': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'intermediate': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'advanced': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'low': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      default: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300';
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <div className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">{userStats?.totalQuizzes || 0}</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Total Quizzes</div>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <div className={`text-2xl font-bold ${getScoreColor(userStats?.averageScore || 0)}`}>
            {userStats?.averageScore ? Math.round(userStats.averageScore * 100) : 0}%
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Average Score</div>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <div className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">{userStats?.currentStreak || 0}</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Current Streak</div>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <div className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
            {formatTime(userStats?.totalTimeSpent || 0)}
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Time Spent</div>
        </div>
      </div>

      {/* Recent Progress */}
      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-4">Recent Learning Progress</h3>
        <div className="space-y-4">
          {Array.from(learningProgress.values()).slice(0, 5).map((progress) => {
            const progressData = progress as LearningProgress;
            return (
              <div key={progressData.topic} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-700/50 rounded border border-zinc-200 dark:border-zinc-600">
                <div className="flex-1">
                  <div className="font-medium text-zinc-800 dark:text-zinc-100">{progressData.topic}</div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    {progressData.totalAttempts} attempts • Best: {Math.round(progressData.bestScore * 100)}%
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${getScoreColor(progressData.averageScore)}`}>
                    {Math.round(progressData.averageScore * 100)}%
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${getDifficultyColor(progressData.difficultyLevel)}`}>
                    {progressData.difficultyLevel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 p-6">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-4">Personalized Recommendations</h3>
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-white dark:bg-zinc-700/50 rounded border border-blue-200 dark:border-blue-600">
                <span className={`px-2 py-1 text-xs rounded ${getPriorityColor(rec.priority)}`}>
                  {rec.priority}
                </span>
                <div className="flex-1">
                  <div className="font-medium text-zinc-800 dark:text-zinc-100">{rec.reason}</div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    Suggested: {rec.items.join(', ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderProgress = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from(learningProgress.values()).map((progress) => {
          const progressData = progress as LearningProgress;
          return (
            <div key={progressData.topic} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">{progressData.topic}</h3>
                <span className={`px-2 py-1 text-xs rounded ${getDifficultyColor(progressData.difficultyLevel)}`}>
                  {progressData.difficultyLevel}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                    <span>Average Score</span>
                    <span>{Math.round(progressData.averageScore * 100)}%</span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressData.averageScore * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-zinc-600 dark:text-zinc-400">Total Attempts</div>
                    <div className="font-semibold text-zinc-800 dark:text-zinc-100">{progressData.totalAttempts}</div>
                  </div>
                  <div>
                    <div className="text-zinc-600 dark:text-zinc-400">Best Score</div>
                    <div className={`font-semibold ${getScoreColor(progressData.bestScore)}`}>
                      {Math.round(progressData.bestScore * 100)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-600 dark:text-zinc-400">Current Streak</div>
                    <div className="font-semibold text-zinc-800 dark:text-zinc-100">{progressData.streakCount}</div>
                  </div>
                  <div>
                    <div className="text-zinc-600 dark:text-zinc-400">Last Attempt</div>
                    <div className="font-semibold text-zinc-800 dark:text-zinc-100">
                      {new Date(progressData.lastAttemptDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {(progressData.weakAreas.length > 0 || progressData.strongAreas.length > 0) && (
                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-600">
                    {progressData.weakAreas.length > 0 && (
                      <div className="mb-2">
                        <div className="text-sm font-medium text-red-600 dark:text-red-400">Areas to Improve:</div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-400">{progressData.weakAreas.join(', ')}</div>
                      </div>
                    )}
                    {progressData.strongAreas.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-green-600 dark:text-green-400">Strong Areas:</div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-400">{progressData.strongAreas.join(', ')}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderBadges = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {badges.map((badge) => (
          <div key={badge.id} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 text-center">
            <div className="text-3xl mb-2">{badge.icon}</div>
            <div className="font-semibold text-zinc-800 dark:text-zinc-100 text-sm">{badge.name}</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{badge.description}</div>
            <div className={`text-xs px-2 py-1 rounded mt-2 inline-block ${
              badge.rarity === 'legendary' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
              badge.rarity === 'epic' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' :
              badge.rarity === 'rare' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
              'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
            }`}>
              {badge.rarity}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Unlocked: {new Date(badge.unlockedAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {badges.length === 0 && (
        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
          No badges unlocked yet. Complete quizzes to earn badges!
        </div>
      )}
    </div>
  );

  const renderAchievements = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        {achievements.map((achievement) => (
          <div key={achievement.id} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-zinc-800 dark:text-zinc-100">{achievement.name}</h3>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">{achievement.description}</div>
              </div>
              {achievement.isCompleted && (
                <span className="text-2xl">🏆</span>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">Progress</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-100">
                  {achievement.progress}/{achievement.maxProgress}
                </span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    achievement.isCompleted ? 'bg-green-600' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                ></div>
              </div>
              {achievement.isCompleted && achievement.completedAt && (
                <div className="text-xs text-green-600 dark:text-green-400">
                  Completed on {new Date(achievement.completedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'progress', label: 'Progress', icon: '📈' },
    { id: 'badges', label: 'Badges', icon: '🏅' },
    { id: 'achievements', label: 'Achievements', icon: '🎯' }
  ];

  return (
    <Card title="Learning Analytics" className={className}>
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
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'progress' && renderProgress()}
          {activeTab === 'badges' && renderBadges()}
          {activeTab === 'achievements' && renderAchievements()}
        </div>
      </div>
    </Card>
  );
};

export default LearningAnalytics;
