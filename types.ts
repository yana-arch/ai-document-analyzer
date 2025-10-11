

export interface Entity {
  text: string;
  type: string;
}

export interface AnalysisResult {
  summary: string;
  topics: string[];
  entities: Entity[];
  sentiment: 'Positive' | 'Negative' | 'Neutral' | string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
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

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface ExerciseExample {
  title?: string;
  content: string;
  type?: 'text' | 'code' | 'diagram' | 'table';
}

export interface Exercise {
  id: string;
  type: 'practice' | 'simulation' | 'analysis' | 'application';
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
  };
  apis: APIConfiguration[];
}
