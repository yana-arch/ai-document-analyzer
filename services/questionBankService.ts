import { QuestionBank, EnhancedQuizQuestion, QuestionTemplate } from '../types';

export class QuestionBankService {
  private static instance: QuestionBankService;
  private questionBanks: Map<string, QuestionBank>;
  private templates: QuestionTemplate[];

  private constructor() {
    this.questionBanks = this.loadQuestionBanks();
    this.templates = this.loadTemplates();
  }

  public static getInstance(): QuestionBankService {
    if (!QuestionBankService.instance) {
      QuestionBankService.instance = new QuestionBankService();
    }
    return QuestionBankService.instance;
  }

  // Question Bank Management
  createQuestionBank(name: string, description: string, subject: string, isPublic: boolean = false): string {
    const id = `bank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const bank: QuestionBank = {
      id,
      name,
      description,
      subject,
      tags: [],
      questions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic,
      usageCount: 0
    };

    this.questionBanks.set(id, bank);
    this.saveQuestionBanks();
    return id;
  }

  addQuestionsToBank(bankId: string, questions: EnhancedQuizQuestion[]): boolean {
    const bank = this.questionBanks.get(bankId);
    if (!bank) return false;

    // Avoid duplicates based on question text
    const existingQuestions = new Set(bank.questions.map(q => q.question));
    const newQuestions = questions.filter(q => !existingQuestions.has(q.question));

    bank.questions.push(...newQuestions);
    bank.updatedAt = new Date().toISOString();
    bank.usageCount++;

    this.saveQuestionBanks();
    return true;
  }

  removeQuestionsFromBank(bankId: string, questionIndices: number[]): boolean {
    const bank = this.questionBanks.get(bankId);
    if (!bank) return false;

    // Remove questions by index (in reverse order to maintain indices)
    questionIndices.sort((a, b) => b - a).forEach(index => {
      if (index >= 0 && index < bank.questions.length) {
        bank.questions.splice(index, 1);
      }
    });

    bank.updatedAt = new Date().toISOString();
    this.saveQuestionBanks();
    return true;
  }

  searchQuestions(
    query: string,
    bankId?: string,
    tags?: string[],
    questionType?: string,
    difficulty?: string
  ): EnhancedQuizQuestion[] {
    let questions: EnhancedQuizQuestion[] = [];

    if (bankId) {
      const bank = this.questionBanks.get(bankId);
      questions = bank ? bank.questions : [];
    } else {
      // Search across all banks
      questions = Array.from(this.questionBanks.values()).flatMap(bank => bank.questions);
    }

    return questions.filter(question => {
      // Text search
      if (query && !question.question.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }

      // Type filter
      if (questionType && question.type !== questionType) {
        return false;
      }

      // For now, simplified filtering - in real implementation, questions would have metadata
      return true;
    });
  }

  // Question Templates
  createTemplate(
    name: string,
    category: string,
    template: string,
    variables: string[],
    difficulty: 'beginner' | 'intermediate' | 'advanced',
    estimatedTime: number
  ): string {
    const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const questionTemplate: QuestionTemplate = {
      id,
      name,
      category,
      template,
      variables,
      difficulty,
      estimatedTime
    };

    this.templates.push(questionTemplate);
    this.saveTemplates();
    return id;
  }

  generateQuestionsFromTemplate(
    templateId: string,
    variables: Record<string, string>,
    count: number
  ): EnhancedQuizQuestion[] {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) return [];

    const questions: EnhancedQuizQuestion[] = [];

    for (let i = 0; i < count; i++) {
      let questionText = template.template;

      // Replace variables with provided values
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        questionText = questionText.replace(regex, value);
      });

      // Create appropriate question type based on template category
      const question = this.createQuestionFromTemplate(questionText, template, i);
      if (question) {
        questions.push(question);
      }
    }

    return questions;
  }

  private createQuestionFromTemplate(
    questionText: string,
    template: QuestionTemplate,
    index: number
  ): EnhancedQuizQuestion | null {
    // This is a simplified implementation
    // In a real system, you'd have more sophisticated template processing

    switch (template.category) {
      case 'multiple-choice':
        return {
          type: 'multiple-choice',
          question: questionText,
          options: ['Option A', 'Option B', 'Option C', 'Option D'], // Would be generated from template
          correctAnswerIndex: 0,
          explanation: 'Generated from template'
        };

      case 'true-false':
        return {
          type: 'true-false',
          question: questionText,
          correctAnswer: true,
          explanation: 'Generated from template'
        };

      default:
        return null;
    }
  }

  // Bank Analytics
  getBankStats(bankId: string): {
    totalQuestions: number;
    questionsByType: Record<string, number>;
    questionsByDifficulty: Record<string, number>;
    usageCount: number;
    lastUpdated: string;
  } | null {
    const bank = this.questionBanks.get(bankId);
    if (!bank) return null;

    const questionsByType: Record<string, number> = {};
    const questionsByDifficulty: Record<string, number> = {};

    bank.questions.forEach(question => {
      questionsByType[question.type] = (questionsByType[question.type] || 0) + 1;
      // Difficulty would need to be added to question metadata
    });

    return {
      totalQuestions: bank.questions.length,
      questionsByType,
      questionsByDifficulty,
      usageCount: bank.usageCount,
      lastUpdated: bank.updatedAt
    };
  }

  // Import/Export
  exportBank(bankId: string): string | null {
    const bank = this.questionBanks.get(bankId);
    if (!bank) return null;

    return JSON.stringify(bank, null, 2);
  }

  importBank(jsonData: string, mergeWithExisting: boolean = false): { success: boolean; message: string; bankId?: string } {
    try {
      const bank = JSON.parse(jsonData) as QuestionBank;

      if (mergeWithExisting && this.questionBanks.has(bank.id)) {
        // Merge questions
        const existingBank = this.questionBanks.get(bank.id)!;
        const existingQuestions = new Set(existingBank.questions.map(q => q.question));
        const newQuestions = bank.questions.filter(q => !existingQuestions.has(q.question));

        existingBank.questions.push(...newQuestions);
        existingBank.updatedAt = new Date().toISOString();

        this.saveQuestionBanks();
        return { success: true, message: `Added ${newQuestions.length} new questions to existing bank` };
      } else {
        // Create new bank
        bank.id = `bank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        bank.createdAt = new Date().toISOString();
        bank.updatedAt = new Date().toISOString();

        this.questionBanks.set(bank.id, bank);
        this.saveQuestionBanks();
        return { success: true, message: 'Question bank imported successfully', bankId: bank.id };
      }
    } catch (error) {
      return { success: false, message: `Import failed: ${error.message}` };
    }
  }

  // Data Persistence
  private saveQuestionBanks(): void {
    const data = Object.fromEntries(this.questionBanks);
    localStorage.setItem('question_banks', JSON.stringify(data));
  }

  private loadQuestionBanks(): Map<string, QuestionBank> {
    const saved = localStorage.getItem('question_banks');
    const map = new Map<string, QuestionBank>();
    if (saved) {
      const data = JSON.parse(saved);
      Object.entries(data).forEach(([key, value]) => {
        map.set(key, value as QuestionBank);
      });
    }
    return map;
  }

  private saveTemplates(): void {
    localStorage.setItem('question_templates', JSON.stringify(this.templates));
  }

  private loadTemplates(): QuestionTemplate[] {
    const saved = localStorage.getItem('question_templates');
    return saved ? JSON.parse(saved) : [];
  }

  // Public API
  getAllBanks(): QuestionBank[] {
    return Array.from(this.questionBanks.values());
  }

  getBank(bankId: string): QuestionBank | null {
    return this.questionBanks.get(bankId) || null;
  }

  getPublicBanks(): QuestionBank[] {
    return Array.from(this.questionBanks.values()).filter(bank => bank.isPublic);
  }

  getAllTemplates(): QuestionTemplate[] {
    return [...this.templates];
  }

  deleteBank(bankId: string): boolean {
    const deleted = this.questionBanks.delete(bankId);
    if (deleted) {
      this.saveQuestionBanks();
    }
    return deleted;
  }

  updateBank(bankId: string, updates: Partial<QuestionBank>): boolean {
    const bank = this.questionBanks.get(bankId);
    if (!bank) return false;

    Object.assign(bank, updates, { updatedAt: new Date().toISOString() });
    this.saveQuestionBanks();
    return true;
  }

  deleteTemplate(templateId: string): boolean {
    const index = this.templates.findIndex(t => t.id === templateId);
    if (index === -1) return false;

    this.templates.splice(index, 1);
    this.saveTemplates();
    return true;
  }

  // Utility functions
  getQuestionTypes(): string[] {
    return ['multiple-choice', 'true-false', 'written', 'matching', 'ordering', 'drag-drop'];
  }

  getTemplateCategories(): string[] {
    return ['multiple-choice', 'true-false', 'written', 'matching', 'ordering', 'drag-drop'];
  }

  resetAllData(): void {
    this.questionBanks.clear();
    this.templates = [];
    this.saveQuestionBanks();
    this.saveTemplates();
  }
}

// Export singleton instance
export const questionBankService = QuestionBankService.getInstance();
