import axios from 'axios';
import { AnalysisResult, QuizQuestion, GradedWrittenAnswer, Exercise, MultipleChoiceQuestion, WrittenAnswerQuestion, AISettings, DocumentTip } from '../../types';
import { BaseAIProvider } from './BaseAIProvider';

export class OpenRouterProvider extends BaseAIProvider {
  private model: string;
  private cache: Map<string, any> = new Map();

  constructor(apiKey: string, model: string) {
    super('OpenRouter', apiKey);
    this.model = model || 'openai/gpt-4o-mini'; // Default model
  }

  async generateFullCoverageQuestionsBatch(text: string, locale: 'en' | 'vi', batchToken?: string): Promise<{ questions: string[]; hasMore: boolean; nextBatchToken?: string }> {
    // For OpenRouter, we'll use similar batching logic but adapts to different models
    const languageInstruction = locale === 'vi' ? 'Questions in Vietnamese.' : 'Questions in English.';

    const batchSize = 15; // Smaller batch for OpenRouter
    const startIndex = parseInt(batchToken || '0') * batchSize;

    const prompt = `Generate batch ${parseInt(batchToken || '0') + 1} of ${batchSize} comprehensive questions covering different aspects of the document. Focus on questions ${startIndex + 1}-${startIndex + batchSize}. ${languageInstruction}

Return the response as JSON with this exact format:
{
  "questions": ["Question text here?", "Second question?", "Third question?"],
  "totalEstimated": 80
}

Document to analyze:
${text.substring(0, 8000)}...`; // Limit text for OpenRouter

    const messages = [{ role: 'user', content: prompt }];

    try {
      const response = await this.makeAPIRequest(messages, true);

      if (this.isValidQuestionsResponse(response)) {
        const questions = response.questions;
        const totalEstimated = response.totalEstimated || 80;
        const currentTotal = startIndex + questions.length;
        const hasMore = currentTotal < totalEstimated;

        return {
          questions,
          hasMore,
          nextBatchToken: hasMore ? (parseInt(batchToken || '0') + 1).toString() : undefined
        };
      } else if (typeof response === 'string') {
        // Try to parse as JSON
        try {
          const parsed = JSON.parse(response);
          const questions = parsed.questions || [];
          const totalEstimated = parsed.totalEstimated || 80;
          const currentTotal = startIndex + questions.length;
          const hasMore = currentTotal < totalEstimated;

          return {
            questions,
            hasMore,
            nextBatchToken: hasMore ? (parseInt(batchToken || '0') + 1).toString() : undefined
          };
        } catch (parseError) {
          // Extract questions from text
          const questions = this.extractQuestionsFromText(response, batchSize);

          const currentTotal = startIndex + questions.length;
          const hasMore = currentTotal < 80; // Estimate for fallback

          return {
            questions,
            hasMore,
            nextBatchToken: hasMore ? (parseInt(batchToken || '0') + 1).toString() : undefined
          };
        }
      }

      return { questions: [], hasMore: false };
    } catch (error) {
      console.error("OpenRouter full coverage questions batch generation error:", error);
      throw new Error("Failed to generate batch of full coverage questions with OpenRouter.");
    }
  }

  private async makeAPIRequest(messages: any[], responseFormat: any = null): Promise<any> {
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };

    const payload: any = {
      model: this.model,
      messages,
      temperature: 0.7,
      max_tokens: 2048
    };

    try {
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', payload, { headers });

      let content = response.data.choices[0].message.content || '';

      if (responseFormat) {
        return this.parseFlexibleJSON(content);
      }

      return content;
    } catch (error) {
      console.error('OpenRouter API error:', error);
      throw new Error(`OpenRouter API error: ${error.response?.data?.error || error.message}`);
    }
  }

  private parseFlexibleJSON(content: string): any {
    let cleanContent = content.trim();
    try {
      return JSON.parse(cleanContent);
    } catch (error) {
      // Extract JSON-like structure
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw error;
    }
  }

  private isValidQuestionsResponse(response: any): boolean {
    return typeof response === 'object' &&
           response.questions &&
           Array.isArray(response.questions);
  }

  private extractQuestionsFromText(content: string, maxCount: number): string[] {
    const lines = content.split('\n');
    const questions: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes('?') && trimmed.length > 10) {
        const cleanQuestion = trimmed.replace(/^\d+[\.)]?\s*/, '');
        if (cleanQuestion.length > 10) {
          questions.push(cleanQuestion);
        }
      }
      if (questions.length >= maxCount) break;
    }

    return questions;
  }

  // ======================== Abstract Method Implementations ========================

  async analyzeDocument(text: string, settings?: AISettings): Promise<AnalysisResult> {
    const cacheKey = `openrouter-analysis-${text.length}-${JSON.stringify(settings)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let prompt = 'Analyze the following document:\n\n';
    if (settings?.aiPromptPrefix) {
      prompt += `${settings.aiPromptPrefix}\n\n`;
    }

    prompt += `Document:\n${text}`;

    const messages = [{ role: 'user', content: prompt }];

    try {
      const result = await this.makeAPIRequest(messages, true) as AnalysisResult;

      const formattedResult: AnalysisResult = {
        summary: result.summary || 'Analysis failed.',
        topics: Array.isArray(result.topics) ? result.topics : [],
        entities: Array.isArray(result.entities) ? result.entities : [],
        sentiment: result.sentiment || 'Neutral',
        tips: result.tips || []
      };

      this.cache.set(cacheKey, formattedResult);
      return formattedResult;
    } catch (error) {
      throw new Error('Failed to analyze document with OpenRouter.');
    }
  }

  async createChat(documentText: string, locale: 'en' | 'vi', conversationContext?: string): Promise<any> {
    return {
      sendMessage: async (params: { message: string }) => {
        const languageInstruction = locale === 'vi' ? 'Respond in Vietnamese.' : 'Respond in English.';
        const prompt = `${languageInstruction}\n\nDocument: ${documentText}\n\n${conversationContext || ''}\n\nQuestion: ${params.message}`;
        const messages = [{ role: 'user', content: prompt }];
        const response = await this.makeAPIRequest(messages);
        return { text: response };
      }
    };
  }

  async generateQuiz(text: string, locale: 'en' | 'vi', mcCount: number, writtenCount: number): Promise<QuizQuestion[]> {
    const languageInstruction = locale === 'vi' ? 'Questions in Vietnamese.' : 'Questions in English.';
    const prompt = `Generate a quiz with ${mcCount} multiple-choice and ${writtenCount} written questions. Format as JSON array of quiz questions. ${languageInstruction}\n\nDocument: ${text}`;

    const messages = [{ role: 'user', content: prompt }];

    try {
      const result = await this.makeAPIRequest(messages, true);

      if (Array.isArray(result)) {
        return result.map(q => ({ ...q, type: q.type || 'multiple-choice' }));
      }

      // Fallback parsing
      return this.extractQuestionsFromText(typeof result === 'string' ? result : '', 50)
        .map(q => ({ type: 'written' as const, question: q }));
    } catch (error) {
      throw new Error('Failed to generate quiz with OpenRouter.');
    }
  }

  protected generateSmartFillableElements(documentText: string, exerciseContext: string, locale: 'en' | 'vi'): Promise<any[]> {
    return this.generateFillableElements(documentText, exerciseContext, locale);
  }

  async generateFullCoverageQuestions(text: string, locale: 'en' | 'vi'): Promise<{ questions: string[]; hasMore: boolean; nextBatchToken?: string }> {
    // For OpenRouter, generate first batch
    return this.generateFullCoverageQuestionsBatch(text, locale, '0');
  }

  async gradeWrittenAnswer(documentText: string, question: string, userAnswer: string, locale: 'en' | 'vi'): Promise<GradedWrittenAnswer> {
    const languageInstruction = locale === 'vi' ? 'Feedback in Vietnamese.' : 'Feedback in English.';
    const prompt = `Grade this answer. ${languageInstruction}\n\nQuestion: ${question}\nAnswer: ${userAnswer}\nDocument: ${documentText}\n\nProvide a score (0-5) and feedback.`;

    const messages = [{ role: 'user', content: prompt }];

    try {
      const result = await this.makeAPIRequest(messages, true);

      if (result.score !== undefined) {
        return {
          score: Math.max(0, Math.min(5, result.score)),
          maxScore: 5,
          feedback: result.feedback || 'Graded successfully.'
        };
      }

      // Parse from text
      const content = typeof result === 'string' ? result : JSON.stringify(result);
      const scoreMatch = content.match(/(\d+)\/5|score[:\s]+(\d)/i);
      const score = scoreMatch ? parseInt(scoreMatch[1] || scoreMatch[2]) : 3;

      return {
        score: Math.max(0, Math.min(5, score)),
        maxScore: 5,
        feedback: content
      };
    } catch (error) {
      return { score: 0, maxScore: 5, feedback: 'Error grading answer.' };
    }
  }

  async generateExercises(text: string, locale: 'en' | 'vi', exerciseCounts: {
    practice: number;
    simulation: number;
    analysis: number;
    application: number;
    fillable: number;
  }): Promise<any[]> {
    const totalExercises = Object.values(exerciseCounts).reduce((sum, count) => sum + count, 0);
    const languageInstruction = locale === 'vi' ? 'Exercises in Vietnamese.' : 'Exercises in English.';

    const prompt = `Generate ${totalExercises} exercises from this document. ${languageInstruction}\n\nDocument: ${text}\n\nReturn as JSON array of exercises.`;

    const messages = [{ role: 'user', content: prompt }];

    try {
      const result = await this.makeAPIRequest(messages, true);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      throw new Error('Failed to generate exercises with OpenRouter.');
    }
  }

  async generateFillableElements(documentText: string, exerciseContext: string, locale: 'en' | 'vi', settings?: AISettings): Promise<any[]> {
    const prompt = `Generate a fillable element for this exercise context. Document: ${documentText}\nExercise: ${exerciseContext}\n\nReturn JSON for a fillable element.`;

    const messages = [{ role: 'user', content: prompt }];

    try {
      const result = await this.makeAPIRequest(messages, true);

      if (result.type && result.data) {
        return [{
          id: `ai-${Date.now()}`,
          type: result.type,
          data: result.data
        }];
      }

      // Default fallback
      return [{
        id: `fallback-${Date.now()}`,
        type: 'table',
        data: { rows: [['Item', 'Value'], ['', '']] }
      }];
    } catch (error) {
      return [{
        id: `error-${Date.now()}`,
        type: 'table',
        data: { rows: [['Item', 'Value'], ['', '']] }
      }];
    }
  }

  async generateDocumentTips(documentText: string, analysis: Omit<AnalysisResult, 'tips'>, locale: 'en' | 'vi', settings?: AISettings): Promise<DocumentTip[]> {
    const prompt = `Generate 3-5 factual tips about this document analysis. Return as JSON array.\n\nAnalysis: ${JSON.stringify(analysis)}\nDocument: ${documentText}`;

    const messages = [{ role: 'user', content: prompt }];

    try {
      const result = await this.makeAPIRequest(messages, true);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      return [{
        id: `fallback-tip-${Date.now()}`,
        content: 'This document contains valuable information.',
        type: 'factual',
        source: 'Document analysis',
        importance: 'medium'
      }];
    }
  }

  // CV Interview methods
  async generateInterviewQuestions(prompt: string, settings?: AISettings): Promise<string> {
    const messages = [{ role: 'user', content: prompt }];
    const result = await this.makeAPIRequest(messages, true);
    return JSON.stringify(result);
  }

  async evaluateInterviewAnswer(prompt: string, settings?: AISettings): Promise<string> {
    const messages = [{ role: 'user', content: prompt }];
    const result = await this.makeAPIRequest(messages, true);
    return JSON.stringify(result);
  }

  async generateInterviewFeedback(prompt: string, settings?: AISettings): Promise<string> {
    const messages = [{ role: 'user', content: prompt }];
    const result = await this.makeAPIRequest(messages, true);
    return JSON.stringify(result);
  }

  // Preparation methods
  async generatePreparationResources(prompt: string, settings?: AISettings): Promise<string> {
    const messages = [{ role: 'user', content: prompt }];
    const result = await this.makeAPIRequest(messages, true);
    return JSON.stringify(result);
  }

  async generatePracticeQuestions(prompt: string, settings?: AISettings): Promise<string> {
    const messages = [{ role: 'user', content: prompt }];
    const result = await this.makeAPIRequest(messages, true);
    return JSON.stringify(result);
  }

  async evaluatePracticeAnswer(prompt: string, settings?: AISettings): Promise<string> {
    const messages = [{ role: 'user', content: prompt }];
    const result = await this.makeAPIRequest(messages, true);
    return JSON.stringify(result);
  }

  async gradeExercise(documentText: string, exercise: Exercise, submission: any, locale: 'en' | 'vi'): Promise<any> {
    const prompt = `Grade this exercise submission.\n\nExercise: ${exercise.title}\nSubmission: ${JSON.stringify(submission)}\n\nProvide detailed feedback.`;

    const messages = [{ role: 'user', content: prompt }];

    try {
      const result = await this.makeAPIRequest(messages, true);

      return {
        id: `grade-${Date.now()}`,
        submissionId: submission.id,
        exerciseId: exercise.id,
        overallScore: result.score || 5,
        maxScore: 10,
        criteriaGrades: [],
        feedback: result.feedback || 'Graded successfully.',
        strengths: result.strengths || [],
        improvements: result.improvements || [],
        gradedAt: new Date().toISOString(),
        gradedBy: 'ai'
      };
    } catch (error) {
      return {
        id: `fallback-grade-${Date.now()}`,
        submissionId: submission.id,
        exerciseId: exercise.id,
        overallScore: 5,
        maxScore: 10,
        criteriaGrades: [],
        feedback: 'Unable to grade at this time.',
        strengths: ['Submission received'],
        improvements: ['Please try again'],
        gradedAt: new Date().toISOString(),
        gradedBy: 'ai'
      };
    }
  }
}
