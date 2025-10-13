

export interface Entity {
  text: string;
  type: string;
}

export interface DocumentTip {
  id: string;
  content: string;
  type: 'factual' | 'story' | 'example';
  source: string; // Why this tip is factual (e.g., "Supported by historical data", "Based on author's professional experience")
  importance: 'high' | 'medium' | 'low';
  category?: string; // Optional category like "historical", "technical", "social", etc.
}

export interface AnalysisResult {
  summary: string;
  topics: string[];
  entities: Entity[];
  sentiment: 'Positive' | 'Negative' | 'Neutral' | string;
  tips: DocumentTip[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp?: string;
  id?: string;
}

export interface ChatSession {
  id: string;
  fileName: string;
  documentText: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  settings?: UserSettings;
}

export interface HistoryItem {
  analysis: AnalysisResult;
  documentText: string;
  fileName: string;
  date: string;
}

export interface MultipleChoiceQuestion {
  type: 'multiple-choice';
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface WrittenAnswerQuestion {
  type: 'written';
  question: string;
}

export type QuizQuestion = MultipleChoiceQuestion | WrittenAnswerQuestion;

export interface GradedWrittenAnswer {
  score: number;
  maxScore: number;
  feedback: string;
}

// Enhanced Quiz Types
export interface TrueFalseQuestion {
  type: 'true-false';
  question: string;
  correctAnswer: boolean;
  explanation: string;
}

export interface MatchingQuestion {
  type: 'matching';
  question: string;
  leftItems: string[];
  rightItems: string[];
  correctPairs: Record<number, number>; // leftIndex -> rightIndex
  explanation: string;
}

export interface OrderingQuestion {
  type: 'ordering';
  question: string;
  items: string[];
  correctOrder: number[];
  explanation: string;
}

export interface DragDropQuestion {
  type: 'drag-drop';
  question: string;
  content: string; // Text with placeholders like {{dropzone-1}}
  dropZones: Array<{
    id: string;
    options: string[];
    correctAnswer: string;
  }>;
  explanation: string;
}

export type EnhancedQuizQuestion =
  | MultipleChoiceQuestion
  | WrittenAnswerQuestion
  | TrueFalseQuestion
  | MatchingQuestion
  | OrderingQuestion
  | DragDropQuestion;

export interface GradedWrittenAnswer {
  score: number;
  maxScore: number;
  feedback: string;
}

// Learning Analytics Types
export interface QuizAttempt {
  id: string;
  timestamp: string;
  score: number;
  maxScore: number;
  timeSpent: number; // in seconds
  answers: Record<number, any>;
  questionResults: Array<{
    questionIndex: number;
    isCorrect: boolean;
    timeSpent: number;
    attempts: number;
  }>;
}

export interface LearningProgress {
  topic: string;
  totalAttempts: number;
  averageScore: number;
  bestScore: number;
  lastAttemptDate: string;
  streakCount: number;
  difficultyLevel: DifficultyLevel;
  weakAreas: string[];
  strongAreas: string[];
}

export interface UserStats {
  totalQuizzes: number;
  totalQuestions: number;
  averageScore: number;
  totalTimeSpent: number;
  currentStreak: number;
  longestStreak: number;
  badges: Badge[];
  achievements: Achievement[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  progress: number;
  maxProgress: number;
  isCompleted: boolean;
  completedAt?: string;
}

// Spaced Repetition Types
export interface SRSItem {
  id: string;
  question: string;
  answer: string;
  difficulty: number; // 1-5 scale
  nextReview: string; // ISO date
  lastReviewed: string;
  reviewCount: number;
  easeFactor: number; // SM-2 algorithm
  interval: number; // in days
  repetitions: number;
}

export interface StudySession {
  id: string;
  startTime: string;
  endTime?: string;
  itemsStudied: string[];
  correctCount: number;
  totalCount: number;
  sessionType: 'review' | 'new' | 'mixed';
}

// Adaptive Learning Types
export interface AdaptivePath {
  id: string;
  name: string;
  description: string;
  topics: string[];
  difficulty: DifficultyLevel;
  estimatedHours: number;
  prerequisites: string[];
  learningObjectives: string[];
}

export interface PersonalizedRecommendation {
  type: 'review' | 'practice' | 'advance' | 'focus';
  reason: string;
  items: string[]; // question IDs or topic IDs
  priority: 'low' | 'medium' | 'high';
}

// Question Bank Types
export interface QuestionBank {
  id: string;
  name: string;
  description: string;
  subject: string;
  tags: string[];
  questions: EnhancedQuizQuestion[];
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  usageCount: number;
}

export interface QuestionTemplate {
  id: string;
  name: string;
  category: string;
  template: string; // Template with variables
  variables: string[];
  difficulty: DifficultyLevel;
  estimatedTime: number;
}

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface ExerciseExample {
  title?: string;
  content: string;
  type?: 'text' | 'code' | 'diagram' | 'table';
}

export interface FillableExercise extends Exercise {
  type: 'fillable';
  fillableElements: {
    id: string;
    type: 'table' | 'list' | 'schedule' | 'form';
    data?: any; // Additional structured data for tables, schedules, etc.
    template?: string; // Template text with placeholders
  }[];
}

export type ExerciseType = 'practice' | 'simulation' | 'analysis' | 'application' | 'fillable';

export interface Exercise {
  id: string;
  type: ExerciseType;
  difficulty: DifficultyLevel;
  title: string;
  objective: string;
  instructions: string[];
  examples: ExerciseExample[];
  skills: string[];
  estimatedTime?: string;
}

export type LanguageStyle = 'formal' | 'conversational' | 'technical' | 'simplified';
export type SummaryLength = 'short' | 'medium' | 'long';

export interface AISettings {
  languageStyle: LanguageStyle;
  summaryLength: SummaryLength;
  maxTopicsCount: number;
  quizDefaultMCQuestions: number;
  quizDefaultWrittenQuestions: number;
  exerciseDefaultPracticeExercises: number;
  exerciseDefaultSimulationExercises: number;
  exerciseDefaultAnalysisExercises: number;
  exerciseDefaultApplicationExercises: number;
  exerciseDefaultFillableExercises: number;
  aiPromptPrefix: string;
}

export type AIProvider = 'gemini' | 'openrouter';

export interface APIConfiguration {
  id: string;
  provider: AIProvider;
  name: string; // User-friendly display name
  model?: string; // Model name (optional for Gemini, required for OpenRouter)
  apiKeys: string[]; // Array of encrypted API keys
  isActive: boolean; // Currently selected
}

export interface UserSettings {
  ai: AISettings;
  ui: {
    enableDarkMode: boolean;
    autoSave: boolean;
    enableDefaultGemini: boolean;
    enableDocumentTips: boolean;
  };
  apis: APIConfiguration[];
}
