import { AnalysisResult, ChatMessage, QuizQuestion, GradedWrittenAnswer, Exercise, AISettings } from '../../types';

export abstract class BaseAIProvider {
  protected providerName: string;
  protected apiKey: string;

  constructor(providerName: string, apiKey: string) {
    this.providerName = providerName;
    this.apiKey = apiKey;
  }

  abstract analyzeDocument(text: string, settings?: AISettings): Promise<AnalysisResult>;

  abstract createChat(documentText: string, locale: 'en' | 'vi'): Promise<any>;

  abstract generateQuiz(text: string, locale: 'en' | 'vi', mcCount: number, writtenCount: number): Promise<QuizQuestion[]>;

  abstract gradeWrittenAnswer(
    documentText: string,
    question: string,
    userAnswer: string,
    locale: 'en' | 'vi'
  ): Promise<GradedWrittenAnswer>;

  abstract generateExercises(text: string, locale: 'en' | 'vi', exerciseCounts: {
    practice: number;
    simulation: number;
    analysis: number;
    application: number;
    fillable: number;
  }): Promise<any[]>;

  abstract generateFillableElements(documentText: string, exerciseContext: string, locale: 'en' | 'vi', settings?: AISettings): Promise<any[]>;

  // Optional method to test API connectivity
  async testConnection(): Promise<boolean> {
    try {
      // Basic test - try to analyze a simple text
      await this.analyzeDocument('Hello world test', {
        languageStyle: 'formal',
        summaryLength: 'short',
        maxTopicsCount: 5,
        quizDefaultMCQuestions: 1,
        quizDefaultWrittenQuestions: 0,
        exerciseDefaultPracticeExercises: 1,
        exerciseDefaultSimulationExercises: 1,
        exerciseDefaultAnalysisExercises: 1,
        exerciseDefaultApplicationExercises: 1,
        exerciseDefaultFillableExercises: 1,
        aiPromptPrefix: ''
      });
      return true;
    } catch (error) {
      console.error(`${this.providerName} connection test failed:`, error);
      return false;
    }
  }
}
