import { SRSItem, StudySession, EnhancedQuizQuestion } from '../types';

export class SpacedRepetitionService {
  private static instance: SpacedRepetitionService;
  private srsItems: Map<string, SRSItem>;
  private studySessions: StudySession[];
  private currentSession: StudySession | null = null;

  private constructor() {
    this.srsItems = this.loadSRSItems();
    this.studySessions = this.loadStudySessions();
  }

  public static getInstance(): SpacedRepetitionService {
    if (!SpacedRepetitionService.instance) {
      SpacedRepetitionService.instance = new SpacedRepetitionService();
    }
    return SpacedRepetitionService.instance;
  }

  // SM-2 Algorithm Implementation
  private calculateNextReview(item: SRSItem, quality: number): Date {
    // SM-2 algorithm for spaced repetition
    let nextInterval = item.interval;

    if (quality < 3) {
      // Incorrect response - reset to 1 day
      nextInterval = 1;
      item.repetitions = 0;
    } else {
      // Correct response
      if (item.repetitions === 0) {
        nextInterval = 1;
      } else if (item.repetitions === 1) {
        nextInterval = 6;
      } else {
        nextInterval = Math.round(item.interval * item.easeFactor);
      }

      item.repetitions++;
    }

    // Update ease factor based on response quality
    item.easeFactor = Math.max(1.3, item.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

    // Calculate next review date
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);

    return nextReviewDate;
  }

  // Add questions to SRS system
  addQuestionsToSRS(questions: EnhancedQuizQuestion[], topic: string): void {
    questions.forEach((question, index) => {
      const id = `srs_${topic}_${index}_${Date.now()}`;

      const srsItem: SRSItem = {
        id,
        question: question.question,
        answer: this.extractAnswerFromQuestion(question),
        difficulty: this.calculateQuestionDifficulty(question),
        nextReview: new Date().toISOString(),
        lastReviewed: new Date().toISOString(),
        reviewCount: 0,
        easeFactor: 2.5,
        interval: 1,
        repetitions: 0
      };

      this.srsItems.set(id, srsItem);
    });

    this.saveSRSItems();
  }

  private extractAnswerFromQuestion(question: EnhancedQuizQuestion): string {
    switch (question.type) {
      case 'multiple-choice':
        return question.options[question.correctAnswerIndex];
      case 'true-false':
        return question.correctAnswer ? 'True' : 'False';
      case 'written':
        return 'Written answer question';
      case 'matching':
        return Object.entries(question.correctPairs)
          .map(([left, right]) => `${question.leftItems[left]} → ${question.rightItems[right]}`)
          .join(', ');
      case 'ordering':
        return question.correctOrder.map(index => question.items[index]).join(' → ');
      case 'drag-drop':
        return question.dropZones.map(zone => zone.correctAnswer).join(', ');
      default:
        return 'Answer not available';
    }
  }

  private calculateQuestionDifficulty(question: EnhancedQuizQuestion): number {
    switch (question.type) {
      case 'multiple-choice':
        return 2; // Easy to medium
      case 'true-false':
        return 1; // Easy
      case 'written':
        return 4; // Hard
      case 'matching':
        return 3; // Medium
      case 'ordering':
        return 4; // Hard
      case 'drag-drop':
        return 3; // Medium
      default:
        return 2;
    }
  }

  // Get items due for review
  getItemsForReview(count: number = 20): SRSItem[] {
    const now = new Date();
    const dueItems = Array.from(this.srsItems.values())
      .filter(item => new Date(item.nextReview) <= now)
      .sort((a, b) => new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime());

    return dueItems.slice(0, count);
  }

  // Start study session
  startStudySession(type: 'review' | 'new' | 'mixed' = 'mixed'): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.currentSession = {
      id: sessionId,
      startTime: new Date().toISOString(),
      itemsStudied: [],
      correctCount: 0,
      totalCount: 0,
      sessionType: type
    };

    return sessionId;
  }

  // Process answer and update SRS item
  processAnswer(itemId: string, quality: number): { correct: boolean; nextReview: Date } {
    const item = this.srsItems.get(itemId);
    if (!item) {
      throw new Error(`SRS item not found: ${itemId}`);
    }

    const wasCorrect = quality >= 3;
    const nextReviewDate = this.calculateNextReview(item, quality);

    // Update item
    item.lastReviewed = new Date().toISOString();
    item.nextReview = nextReviewDate.toISOString();
    item.reviewCount++;

    // Update current session if active
    if (this.currentSession) {
      this.currentSession.itemsStudied.push(itemId);
      this.currentSession.totalCount++;

      if (wasCorrect) {
        this.currentSession.correctCount++;
      }
    }

    this.saveSRSItems();
    return { correct: wasCorrect, nextReview: nextReviewDate };
  }

  // End current study session
  endStudySession(): StudySession | null {
    if (!this.currentSession) {
      return null;
    }

    const endedSession = {
      ...this.currentSession,
      endTime: new Date().toISOString()
    };

    this.studySessions.unshift(endedSession);
    this.currentSession = null;

    this.saveStudySessions();
    return endedSession;
  }

  // Get study statistics
  getStudyStats(): {
    totalItems: number;
    dueForReview: number;
    masteredItems: number;
    averageAccuracy: number;
    currentStreak: number;
  } {
    const items = Array.from(this.srsItems.values());
    const dueForReview = items.filter(item => new Date(item.nextReview) <= new Date()).length;
    const masteredItems = items.filter(item => item.repetitions >= 3 && item.easeFactor >= 2.5).length;

    // Calculate average accuracy from recent sessions
    const recentSessions = this.studySessions.slice(0, 10);
    const averageAccuracy = recentSessions.length > 0
      ? recentSessions.reduce((sum, session) => sum + (session.correctCount / session.totalCount), 0) / recentSessions.length
      : 0;

    // Calculate current streak
    let currentStreak = 0;
    for (const session of this.studySessions) {
      const accuracy = session.correctCount / session.totalCount;
      if (accuracy >= 0.8) {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      totalItems: items.length,
      dueForReview,
      masteredItems,
      averageAccuracy: Math.round(averageAccuracy * 100),
      currentStreak
    };
  }

  // Get upcoming reviews
  getUpcomingReviews(days: number = 7): Array<{ date: string; count: number }> {
    const items = Array.from(this.srsItems.values());
    const upcoming: Record<string, number> = {};

    items.forEach(item => {
      const reviewDate = new Date(item.nextReview);
      const now = new Date();
      const daysDiff = Math.ceil((reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff >= 0 && daysDiff <= days) {
        const dateKey = reviewDate.toISOString().split('T')[0];
        upcoming[dateKey] = (upcoming[dateKey] || 0) + 1;
      }
    });

    return Object.entries(upcoming)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Generate personalized study plan
  generateStudyPlan(targetDays: number = 30): {
    dailyGoals: Array<{ date: string; itemsToReview: number; newItemsToAdd: number }>;
    totalItems: number;
  } {
    const stats = this.getStudyStats();
    const dailyGoals: Array<{ date: string; itemsToReview: number; newItemsToAdd: number }> = [];

    const startDate = new Date();
    const upcomingReviews = this.getUpcomingReviews(targetDays);

    for (let i = 0; i < targetDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateKey = currentDate.toISOString().split('T')[0];

      const scheduledReviews = upcomingReviews.find(r => r.date === dateKey)?.count || 0;
      const newItemsToAdd = i < 5 ? Math.min(5, stats.totalItems) : 0; // Add new items in first 5 days

      dailyGoals.push({
        date: dateKey,
        itemsToReview: scheduledReviews,
        newItemsToAdd
      });
    }

    const totalItems = dailyGoals.reduce((sum, day) => sum + day.itemsToReview + day.newItemsToAdd, 0);

    return { dailyGoals, totalItems };
  }

  // Data persistence
  private saveSRSItems(): void {
    const data = Object.fromEntries(this.srsItems);
    localStorage.setItem('srs_items', JSON.stringify(data));
  }

  private loadSRSItems(): Map<string, SRSItem> {
    const saved = localStorage.getItem('srs_items');
    const map = new Map<string, SRSItem>();
    if (saved) {
      const data = JSON.parse(saved);
      Object.entries(data).forEach(([key, value]) => {
        map.set(key, value as SRSItem);
      });
    }
    return map;
  }

  private saveStudySessions(): void {
    localStorage.setItem('srs_study_sessions', JSON.stringify(this.studySessions.slice(0, 100)));
  }

  private loadStudySessions(): StudySession[] {
    const saved = localStorage.getItem('srs_study_sessions');
    return saved ? JSON.parse(saved) : [];
  }

  // Public API
  getAllItems(): SRSItem[] {
    return Array.from(this.srsItems.values());
  }

  getItemsByDifficulty(difficulty: number): SRSItem[] {
    return Array.from(this.srsItems.values()).filter(item => item.difficulty === difficulty);
  }

  getRecentSessions(count: number = 10): StudySession[] {
    return this.studySessions.slice(0, count);
  }

  getCurrentSession(): StudySession | null {
    return this.currentSession;
  }

  removeItem(itemId: string): boolean {
    const deleted = this.srsItems.delete(itemId);
    if (deleted) {
      this.saveSRSItems();
    }
    return deleted;
  }

  resetProgress(): void {
    this.srsItems.clear();
    this.studySessions = [];
    this.currentSession = null;

    this.saveSRSItems();
    this.saveStudySessions();
  }

  // Import/Export functionality
  exportData(): string {
    const data = {
      srsItems: Object.fromEntries(this.srsItems),
      studySessions: this.studySessions,
      exportDate: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }

  importData(jsonData: string): { success: boolean; message: string } {
    try {
      const data = JSON.parse(jsonData);

      if (data.srsItems) {
        this.srsItems.clear();
        Object.entries(data.srsItems).forEach(([key, value]) => {
          this.srsItems.set(key, value as SRSItem);
        });
        this.saveSRSItems();
      }

      if (data.studySessions) {
        this.studySessions = data.studySessions;
        this.saveStudySessions();
      }

      return { success: true, message: 'Data imported successfully' };
    } catch (error) {
      return { success: false, message: `Import failed: ${error.message}` };
    }
  }
}

// Export singleton instance
export const spacedRepetitionService = SpacedRepetitionService.getInstance();
