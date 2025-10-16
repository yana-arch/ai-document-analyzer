

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

export interface DocumentHistoryItem {
  type: 'document';
  analysis: AnalysisResult;
  documentText: string;
  fileName: string;
  date: string;
}

export interface InterviewHistoryItem {
  type: 'interview';
  interview: CVInterview;
  date: string;
}

export type HistoryItem = DocumentHistoryItem | InterviewHistoryItem;

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

export interface ExerciseSubmission {
  id: string;
  exerciseId: string;
  exerciseType: ExerciseType;
  userAnswers: Record<string, any>; // Flexible structure for different exercise types
  submittedAt: string;
  timeSpent?: number; // in seconds
}

export interface ExerciseGrade {
  id: string;
  submissionId: string;
  exerciseId: string;
  overallScore: number;
  maxScore: number;
  criteriaGrades: ExerciseCriteriaGrade[];
  feedback: string;
  strengths: string[];
  improvements: string[];
  gradedAt: string;
  gradedBy: 'ai' | 'manual';
}

export interface ExerciseCriteriaGrade {
  criterion: string;
  score: number;
  maxScore: number;
  feedback: string;
  weight: number; // percentage weight in overall score
}

// CV Interview Types
export type InterviewType = 'technical' | 'behavioral' | 'situational' | 'comprehensive';
export type QuestionType = 'technical' | 'behavioral' | 'situational' | 'experience';
export type PositionFit = 'excellent' | 'good' | 'fair' | 'poor';

export interface CVInterview {
  id: string;
  cvContent: string;
  cvFileName?: string;
  targetPosition: string;
  interviewType: InterviewType;
  customPrompt?: string;
  questions: InterviewQuestion[];
  answers: InterviewAnswer[];
  overallScore?: number;
  feedback?: InterviewFeedback;
  createdAt: string;
  completedAt?: string;
  status: 'preparing' | 'in-progress' | 'completed' | 'cancelled';
}

export interface InterviewQuestion {
  id: string;
  question: string;
  type: QuestionType;
  timeLimit: number; // seconds
  order: number;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface InterviewAnswer {
  questionId: string;
  answer: string;
  timeSpent: number; // seconds
  score: number; // 0-100
  maxScore: number;
  feedback: string;
  strengths?: string[];
  improvements?: string[];
  submittedAt: string;
}

export interface InterviewFeedback {
  overallScore: number;
  positionFit: PositionFit;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  summary: string;
  detailedAnalysis?: {
    technicalSkills?: number;
    communication?: number;
    problemSolving?: number;
    experience?: number;
    culturalFit?: number;
  };
}

export interface CVParseResult {
  personalInfo: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
  experience: Array<{
    company: string;
    position: string;
    duration: string;
    description: string;
    startDate?: string;
    endDate?: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    year?: string;
  }>;
  skills: string[];
  summary?: string;
  rawText: string;
}

export interface InterviewSession {
  id: string;
  currentQuestionIndex: number;
  startTime: string;
  endTime?: string;
  timeRemaining: number; // for current question
  isPaused: boolean;
  answers: InterviewAnswer[];
}

// Preparation and Practice Types
export interface PreparationResource {
  id: string;
  title: string;
  type: 'article' | 'video' | 'guide' | 'tips' | 'checklist' | 'course' | 'book' | 'website';
  url?: string;
  content: string;
  category: 'technical' | 'behavioral' | 'general' | 'industry-specific' | 'language' | 'communication';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  estimatedTime?: string;
  rating?: number;
}

export interface PracticeQuestion {
  id: string;
  question: string;
  type: QuestionType;
  category: string;
  sampleAnswer?: string;
  keyPoints?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface PracticeAttempt {
  id: string;
  questionId: string;
  userAnswer: string;
  score: number;
  feedback: string;
  attemptedAt: string;
  timeSpent: number; // seconds
}

export interface PreparationSession {
  id: string;
  cvContent: string;
  targetPosition: string;
  interviewType: InterviewType;
  resources: PreparationResource[];
  practiceQuestions: PracticeQuestion[];
  practiceAttempts: PracticeAttempt[];
  startedAt: string;
  completedAt?: string;
}

export interface ExerciseGradingSession {
  id: string;
  documentText: string;
  exercises: Exercise[];
  submissions: ExerciseSubmission[];
  grades: ExerciseGrade[];
  startedAt: string;
  completedAt?: string;
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

export interface DocumentTipsSettings {
  autoRefreshInterval: number; // in minutes, 0 = disabled
  showRandomTip: boolean; // Show 1 random tip during AI response waiting
  maxTipsCount: number; // Maximum number of tips to generate (1-10)
  refreshBehavior: 'append' | 'replace'; // Whether to append new tips or replace existing ones
}

export interface UserSettings {
  ai: AISettings;
  ui: {
    enableDarkMode: boolean;
    autoSave: boolean;
    enableDefaultGemini: boolean;
    enableDocumentTips: boolean;
  };
  documentTips: DocumentTipsSettings;
  apis: APIConfiguration[];
}
