import { AnalysisResult, ChatMessage, QuizQuestion, GradedWrittenAnswer, Exercise, AISettings, DocumentTip, InterviewQuestion, InterviewAnswer, InterviewFeedback, PreparationResource, PracticeQuestion } from '../../types';

export abstract class BaseAIProvider {
  protected providerName: string;
  protected apiKey: string;

  constructor(providerName: string, apiKey: string) {
    this.providerName = providerName;
    this.apiKey = apiKey;
  }

  abstract analyzeDocument(text: string, settings?: AISettings): Promise<AnalysisResult>;

  abstract generateDocumentTips(documentText: string, analysis: Omit<AnalysisResult, 'tips'>, locale: 'en' | 'vi', settings?: AISettings): Promise<DocumentTip[]>;

  abstract createChat(documentText: string, locale: 'en' | 'vi', conversationContext?: string): Promise<any>;

  abstract generateQuiz(text: string, locale: 'en' | 'vi', mcCount: number, writtenCount: number): Promise<QuizQuestion[]>;

  abstract generateFullCoverageQuestions(text: string, locale: 'en' | 'vi'): Promise<{ questions: string[]; hasMore: boolean; nextBatchToken?: string }>;
  abstract generateFullCoverageQuestionsBatch(text: string, locale: 'en' | 'vi', batchToken?: string): Promise<{ questions: string[]; hasMore: boolean; nextBatchToken?: string }>;

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

  abstract gradeExercise(
    documentText: string,
    exercise: Exercise,
    submission: any,
    locale: 'en' | 'vi'
  ): Promise<any>;

  // CV Interview methods
  abstract generateInterviewQuestions(prompt: string, settings?: AISettings): Promise<string>;

  abstract evaluateInterviewAnswer(prompt: string, settings?: AISettings): Promise<string>;

  abstract generateInterviewFeedback(prompt: string, settings?: AISettings): Promise<string>;

  // Preparation methods
  abstract generatePreparationResources(prompt: string, settings?: AISettings): Promise<string>;

  abstract generatePracticeQuestions(prompt: string, settings?: AISettings): Promise<string>;

  abstract evaluatePracticeAnswer(prompt: string, settings?: AISettings): Promise<string>;

  // Enhanced method for smart fillable element generation
  protected abstract generateSmartFillableElements?(documentText: string, exerciseContext: string, locale: 'en' | 'vi'): Promise<any[]>;

  // Quality validation and improvement methods
  protected validateExerciseStructure(exercise: any): boolean {
    return !!(
      exercise &&
      exercise.title &&
      exercise.title.length > 5 &&
      exercise.instructions &&
      exercise.instructions.length >= 2 &&
      exercise.examples &&
      exercise.examples.length > 0 &&
      exercise.skills &&
      exercise.skills.length > 0
    );
  }

  protected ensureMinimumInstructions(instructions: string[]): string[] {
    if (!instructions || instructions.length < 2) {
      return [
        'Review the provided information carefully.',
        'Complete the exercise following the given structure.',
        'Verify your work for accuracy and completeness.'
      ];
    }
    return instructions;
  }

  protected ensureMinimumExamples(examples: any[]): any[] {
    if (!examples || examples.length === 0) {
      return [{
        title: 'Example',
        content: 'Refer to the document content for guidance.',
        type: 'text'
      }];
    }
    return examples;
  }

  protected extractContextualSkills(documentText: string, exerciseType: string): string[] {
    const skills: string[] = [];
    const lowerText = documentText.toLowerCase();

    // Technical skills
    if (lowerText.includes('programming') || lowerText.includes('code')) {
      skills.push('Programming');
    }
    if (lowerText.includes('design') || lowerText.includes('ui/ux')) {
      skills.push('Design thinking');
    }
    if (lowerText.includes('management') || lowerText.includes('leadership')) {
      skills.push('Leadership');
    }
    if (lowerText.includes('analysis') || lowerText.includes('research')) {
      skills.push('Research');
    }
    if (lowerText.includes('communication') || lowerText.includes('presentation')) {
      skills.push('Communication');
    }

    // Exercise type specific skills
    const typeSkills = {
      practice: ['Practical application', 'Hands-on skills'],
      simulation: ['Decision making', 'Problem solving'],
      analysis: ['Critical thinking', 'Data analysis'],
      application: ['Implementation', 'Project management'],
      fillable: ['Organization', 'Attention to detail']
    };

    const exerciseTypeSkills = typeSkills[exerciseType as keyof typeof typeSkills] || ['General skills'];

    return [...exerciseTypeSkills, ...skills].slice(0, 5);
  }

  protected estimateExerciseTime(exerciseType: string): string {
    const baseTimes = {
      practice: '15-20 minutes',
      simulation: '25-35 minutes',
      analysis: '20-30 minutes',
      application: '45-60 minutes',
      fillable: '10-15 minutes'
    };

    return baseTimes[exerciseType as keyof typeof baseTimes] || '20-30 minutes';
  }

  protected suggestFillableType(documentText: string, exerciseContext: string): string {
    const context = (documentText + ' ' + exerciseContext).toLowerCase();

    // Analyze context to suggest best fillable type
    if (context.includes('schedule') || context.includes('timeline') || context.includes('time')) {
      return 'schedule';
    }
    if (context.includes('compare') || context.includes('evaluation') || context.includes('matrix')) {
      return 'matrix';
    }
    if (context.includes('form') || context.includes('data') || context.includes('collection')) {
      return 'form';
    }
    if (context.includes('list') || context.includes('steps') || context.includes('checklist')) {
      return 'list';
    }

    return 'table'; // Default fallback
  }

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
