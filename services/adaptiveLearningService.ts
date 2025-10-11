import {
  EnhancedQuizQuestion,
  QuizAttempt,
  LearningProgress,
  UserStats,
  AdaptivePath,
  PersonalizedRecommendation,
  DifficultyLevel,
  Badge,
  Achievement
} from '../types';

export class AdaptiveLearningService {
  private static instance: AdaptiveLearningService;
  private userStats: UserStats;
  private learningProgress: Map<string, LearningProgress>;
  private quizAttempts: QuizAttempt[];
  private badges: Badge[];
  private achievements: Achievement[];

  private constructor() {
    this.userStats = this.loadUserStats();
    this.learningProgress = this.loadLearningProgress();
    this.quizAttempts = this.loadQuizAttempts();
    this.badges = this.loadBadges();
    this.achievements = this.loadAchievements();
  }

  public static getInstance(): AdaptiveLearningService {
    if (!AdaptiveLearningService.instance) {
      AdaptiveLearningService.instance = new AdaptiveLearningService();
    }
    return AdaptiveLearningService.instance;
  }

  // Adaptive Question Selection
  selectAdaptiveQuestions(
    allQuestions: EnhancedQuizQuestion[],
    topic: string,
    userLevel: DifficultyLevel,
    questionCount: number
  ): EnhancedQuizQuestion[] {
    const topicProgress = this.learningProgress.get(topic);
    const weakAreas = topicProgress?.weakAreas || [];
    const strongAreas = topicProgress?.strongAreas || [];

    // Filter questions by difficulty and topic relevance
    let candidateQuestions = allQuestions.filter(q => {
      // Adjust difficulty based on user performance
      const adjustedDifficulty = this.adjustDifficultyForUser(q, topicProgress);
      return adjustedDifficulty === userLevel || adjustedDifficulty === this.getNextDifficultyLevel(userLevel);
    });

    // Prioritize weak areas
    const weakAreaQuestions = candidateQuestions.filter(q =>
      weakAreas.some(weak => q.question.toLowerCase().includes(weak.toLowerCase()))
    );

    const otherQuestions = candidateQuestions.filter(q =>
      !weakAreas.some(weak => q.question.toLowerCase().includes(weak.toLowerCase()))
    );

    // Combine with preference for weak areas (70% weak, 30% other)
    const selectedQuestions: EnhancedQuizQuestion[] = [];
    const weakCount = Math.floor(questionCount * 0.7);
    const otherCount = questionCount - weakCount;

    selectedQuestions.push(...weakAreaQuestions.slice(0, weakCount));
    selectedQuestions.push(...otherQuestions.slice(0, otherCount));

    // Fill remaining slots if needed
    if (selectedQuestions.length < questionCount) {
      const remaining = candidateQuestions.filter(q => !selectedQuestions.includes(q));
      selectedQuestions.push(...remaining.slice(0, questionCount - selectedQuestions.length));
    }

    return selectedQuestions.slice(0, questionCount);
  }

  private adjustDifficultyForUser(question: EnhancedQuizQuestion, progress?: LearningProgress): DifficultyLevel {
    if (!progress) return 'intermediate';

    const averageScore = progress.averageScore;
    const attempts = progress.totalAttempts;

    // If user is struggling (low average score), lower difficulty
    if (averageScore < 0.6 && attempts > 3) {
      switch (question.type) {
        case 'multiple-choice': return 'beginner';
        case 'true-false': return 'beginner';
        case 'written': return 'intermediate';
        case 'matching': return 'intermediate';
        case 'ordering': return 'advanced';
        case 'drag-drop': return 'advanced';
        default: return 'intermediate';
      }
    }

    // If user is doing well, increase difficulty
    if (averageScore > 0.8 && attempts > 5) {
      switch (question.type) {
        case 'multiple-choice': return 'intermediate';
        case 'true-false': return 'intermediate';
        case 'written': return 'advanced';
        case 'matching': return 'advanced';
        case 'ordering': return 'advanced';
        case 'drag-drop': return 'advanced';
        default: return 'advanced';
      }
    }

    return 'intermediate';
  }

  private getNextDifficultyLevel(current: DifficultyLevel): DifficultyLevel {
    switch (current) {
      case 'beginner': return 'intermediate';
      case 'intermediate': return 'advanced';
      case 'advanced': return 'advanced';
      default: return 'intermediate';
    }
  }

  // Progress Tracking
  recordQuizAttempt(attempt: Omit<QuizAttempt, 'id'>): string {
    const id = `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullAttempt: QuizAttempt = { ...attempt, id };

    this.quizAttempts.unshift(fullAttempt);
    this.saveQuizAttempts();

    // Update learning progress
    this.updateLearningProgress(fullAttempt);

    // Check for new badges and achievements
    this.checkBadgesAndAchievements(fullAttempt);

    return id;
  }

  private updateLearningProgress(attempt: QuizAttempt): void {
    // Extract topics from questions (simplified - in real implementation, questions would have topic metadata)
    const topics = this.extractTopicsFromAttempt(attempt);

    topics.forEach(topic => {
      const current = this.learningProgress.get(topic) || {
        topic,
        totalAttempts: 0,
        averageScore: 0,
        bestScore: 0,
        lastAttemptDate: new Date().toISOString(),
        streakCount: 0,
        difficultyLevel: 'beginner',
        weakAreas: [],
        strongAreas: []
      };

      current.totalAttempts++;
      current.lastAttemptDate = new Date().toISOString();

      // Update average score with weighted moving average
      const alpha = 0.3; // Learning rate
      current.averageScore = current.averageScore * (1 - alpha) + attempt.score / attempt.maxScore * alpha;

      // Update best score
      if (attempt.score > current.bestScore) {
        current.bestScore = attempt.score;
      }

      // Update streak
      if (attempt.score / attempt.maxScore >= 0.8) {
        current.streakCount++;
      } else {
        current.streakCount = 0;
      }

      // Update difficulty level based on performance
      current.difficultyLevel = this.calculateDifficultyLevel(current);

      // Update weak and strong areas based on question performance
      this.updateWeakAndStrongAreas(current, attempt);

      this.learningProgress.set(topic, current);
    });

    this.saveLearningProgress();
  }

  private extractTopicsFromAttempt(attempt: QuizAttempt): string[] {
    // Simplified topic extraction - in real implementation, this would use NLP or predefined topics
    const topics = new Set<string>();

    // Extract keywords from questions (simplified approach)
    attempt.questionResults.forEach(result => {
      // This is a placeholder - real implementation would use better topic extraction
      if (result.isCorrect) {
        topics.add('general');
      }
    });

    return Array.from(topics);
  }

  private calculateDifficultyLevel(progress: LearningProgress): DifficultyLevel {
    const avgScore = progress.averageScore;
    const attempts = progress.totalAttempts;

    if (attempts < 3) return 'beginner';
    if (avgScore < 0.6) return 'beginner';
    if (avgScore < 0.8) return 'intermediate';
    return 'advanced';
  }

  private updateWeakAndStrongAreas(progress: LearningProgress, attempt: QuizAttempt): void {
    // Analyze which types of questions the user struggles with
    const questionTypes = attempt.questionResults.reduce((acc, result, index) => {
      // This would need access to the actual questions to determine types
      // For now, using a simplified approach
      acc[index] = result.isCorrect ? 'strong' : 'weak';
      return acc;
    }, {} as Record<number, string>);

    // Update weak and strong areas based on performance patterns
    // This is a simplified implementation
  }

  // Gamification
  private checkBadgesAndAchievements(attempt: QuizAttempt): void {
    const scorePercentage = attempt.score / attempt.maxScore;

    // Check for score-based badges
    if (scorePercentage === 1.0) {
      this.unlockBadge('perfect_score', 'Perfect Score', 'Got 100% on a quiz');
    }

    if (attempt.questionResults.length >= 10 && scorePercentage >= 0.9) {
      this.unlockBadge('quiz_master', 'Quiz Master', 'Scored 90%+ on a 10+ question quiz');
    }

    // Check for streak badges
    const currentStreak = this.calculateCurrentStreak();
    if (currentStreak >= 5) {
      this.unlockBadge('streak_5', 'Hot Streak', 'Got 5 quizzes correct in a row');
    }

    // Update achievements
    this.updateAchievements(attempt);
  }

  private unlockBadge(id: string, name: string, description: string): void {
    const existingBadge = this.badges.find(b => b.id === id);
    if (!existingBadge) {
      const badge: Badge = {
        id,
        name,
        description,
        icon: this.getBadgeIcon(id),
        unlockedAt: new Date().toISOString(),
        rarity: this.getBadgeRarity(id)
      };
      this.badges.push(badge);
      this.saveBadges();
    }
  }

  private getBadgeIcon(badgeId: string): string {
    const icons: Record<string, string> = {
      'perfect_score': '🏆',
      'quiz_master': '🎓',
      'streak_5': '🔥',
      'first_quiz': '🎯',
      'speed_demon': '⚡',
      'persistent': '💪'
    };
    return icons[badgeId] || '🏅';
  }

  private getBadgeRarity(badgeId: string): Badge['rarity'] {
    const rarities: Record<string, Badge['rarity']> = {
      'perfect_score': 'epic',
      'quiz_master': 'rare',
      'streak_5': 'rare',
      'first_quiz': 'common',
      'speed_demon': 'rare',
      'persistent': 'legendary'
    };
    return rarities[badgeId] || 'common';
  }

  private updateAchievements(attempt: QuizAttempt): void {
    // Update quiz count achievement
    const quizCountAchievement = this.achievements.find(a => a.id === 'quiz_count');
    if (quizCountAchievement) {
      quizCountAchievement.progress = Math.min(quizCountAchievement.progress + 1, quizCountAchievement.maxProgress);
      if (quizCountAchievement.progress >= quizCountAchievement.maxProgress) {
        quizCountAchievement.isCompleted = true;
        quizCountAchievement.completedAt = new Date().toISOString();
      }
    }

    // Update perfect score achievement
    if (attempt.score === attempt.maxScore) {
      const perfectScoreAchievement = this.achievements.find(a => a.id === 'perfect_scores');
      if (perfectScoreAchievement) {
        perfectScoreAchievement.progress = Math.min(perfectScoreAchievement.progress + 1, perfectScoreAchievement.maxProgress);
        if (perfectScoreAchievement.progress >= perfectScoreAchievement.maxProgress) {
          perfectScoreAchievement.isCompleted = true;
          perfectScoreAchievement.completedAt = new Date().toISOString();
        }
      }
    }

    this.saveAchievements();
  }

  private calculateCurrentStreak(): number {
    let streak = 0;
    for (const attempt of this.quizAttempts) {
      if (attempt.score / attempt.maxScore >= 0.8) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  // Personalized Recommendations
  generateRecommendations(): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = [];

    // Analyze weak areas
    const weakTopics = Array.from(this.learningProgress.values())
      .filter(p => p.averageScore < 0.7)
      .map(p => p.topic);

    if (weakTopics.length > 0) {
      recommendations.push({
        type: 'review',
        reason: `You need more practice in: ${weakTopics.join(', ')}`,
        items: weakTopics,
        priority: 'high'
      });
    }

    // Recommend advancement
    const strongTopics = Array.from(this.learningProgress.values())
      .filter(p => p.averageScore > 0.85 && p.totalAttempts > 5)
      .map(p => p.topic);

    if (strongTopics.length > 0) {
      recommendations.push({
        type: 'advance',
        reason: `You're ready to advance in: ${strongTopics.join(', ')}`,
        items: strongTopics,
        priority: 'medium'
      });
    }

    // Recommend focus areas
    const inconsistentTopics = Array.from(this.learningProgress.values())
      .filter(p => p.totalAttempts > 3 && p.averageScore > 0.6 && p.averageScore < 0.8)
      .map(p => p.topic);

    if (inconsistentTopics.length > 0) {
      recommendations.push({
        type: 'focus',
        reason: `Focus on these areas for improvement: ${inconsistentTopics.join(', ')}`,
        items: inconsistentTopics,
        priority: 'medium'
      });
    }

    return recommendations;
  }

  // Data Persistence
  private saveUserStats(): void {
    localStorage.setItem('adaptive_learning_user_stats', JSON.stringify(this.userStats));
  }

  private loadUserStats(): UserStats {
    const saved = localStorage.getItem('adaptive_learning_user_stats');
    if (saved) {
      return { ...this.getDefaultUserStats(), ...JSON.parse(saved) };
    }
    return this.getDefaultUserStats();
  }

  private getDefaultUserStats(): UserStats {
    return {
      totalQuizzes: 0,
      totalQuestions: 0,
      averageScore: 0,
      totalTimeSpent: 0,
      currentStreak: 0,
      longestStreak: 0,
      badges: [],
      achievements: this.getDefaultAchievements()
    };
  }

  private getDefaultAchievements(): Achievement[] {
    return [
      {
        id: 'quiz_count',
        name: 'Quiz Enthusiast',
        description: 'Complete 10 quizzes',
        progress: 0,
        maxProgress: 10,
        isCompleted: false
      },
      {
        id: 'perfect_scores',
        name: 'Perfectionist',
        description: 'Get 5 perfect scores',
        progress: 0,
        maxProgress: 5,
        isCompleted: false
      }
    ];
  }

  private saveLearningProgress(): void {
    const data = Object.fromEntries(this.learningProgress);
    localStorage.setItem('adaptive_learning_progress', JSON.stringify(data));
  }

  private loadLearningProgress(): Map<string, LearningProgress> {
    const saved = localStorage.getItem('adaptive_learning_progress');
    const map = new Map<string, LearningProgress>();
    if (saved) {
      const data = JSON.parse(saved);
      Object.entries(data).forEach(([key, value]) => {
        map.set(key, value as LearningProgress);
      });
    }
    return map;
  }

  private saveQuizAttempts(): void {
    localStorage.setItem('adaptive_learning_attempts', JSON.stringify(this.quizAttempts.slice(0, 100))); // Keep last 100
  }

  private loadQuizAttempts(): QuizAttempt[] {
    const saved = localStorage.getItem('adaptive_learning_attempts');
    return saved ? JSON.parse(saved) : [];
  }

  private saveBadges(): void {
    localStorage.setItem('adaptive_learning_badges', JSON.stringify(this.badges));
  }

  private loadBadges(): Badge[] {
    const saved = localStorage.getItem('adaptive_learning_badges');
    return saved ? JSON.parse(saved) : [];
  }

  private saveAchievements(): void {
    localStorage.setItem('adaptive_learning_achievements', JSON.stringify(this.achievements));
  }

  private loadAchievements(): Achievement[] {
    const saved = localStorage.getItem('adaptive_learning_achievements');
    if (saved) {
      return JSON.parse(saved);
    }
    return this.getDefaultAchievements();
  }

  // Public API
  getUserStats(): UserStats {
    return { ...this.userStats };
  }

  getLearningProgress(topic?: string): LearningProgress | Map<string, LearningProgress> {
    if (topic) {
      return this.learningProgress.get(topic) || {
        topic,
        totalAttempts: 0,
        averageScore: 0,
        bestScore: 0,
        lastAttemptDate: new Date().toISOString(),
        streakCount: 0,
        difficultyLevel: 'beginner',
        weakAreas: [],
        strongAreas: []
      };
    }
    return new Map(this.learningProgress);
  }

  getRecentAttempts(count: number = 10): QuizAttempt[] {
    return this.quizAttempts.slice(0, count);
  }

  getBadges(): Badge[] {
    return [...this.badges];
  }

  getAchievements(): Achievement[] {
    return [...this.achievements];
  }

  getRecommendations(): PersonalizedRecommendation[] {
    return this.generateRecommendations();
  }

  resetProgress(): void {
    this.userStats = this.getDefaultUserStats();
    this.learningProgress.clear();
    this.quizAttempts = [];
    this.badges = [];
    this.achievements = this.getDefaultAchievements();

    this.saveUserStats();
    this.saveLearningProgress();
    this.saveQuizAttempts();
    this.saveBadges();
    this.saveAchievements();
  }
}

// Export singleton instance
export const adaptiveLearningService = AdaptiveLearningService.getInstance();
