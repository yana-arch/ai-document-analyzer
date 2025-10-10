

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