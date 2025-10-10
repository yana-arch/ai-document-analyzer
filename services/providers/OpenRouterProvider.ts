import axios from 'axios';
import { AnalysisResult, QuizQuestion, GradedWrittenAnswer, MultipleChoiceQuestion, WrittenAnswerQuestion, AISettings } from '../../types';
import { BaseAIProvider } from './BaseAIProvider';

export class OpenRouterProvider extends BaseAIProvider {
  private model: string;
  private cache: Map<string, any> = new Map();

  constructor(apiKey: string, model: string) {
    super('OpenRouter', apiKey);
    this.model = model || 'openai/gpt-4o-mini'; // Default model
  }

  private async makeRequest(messages: any[], responseFormat: any = null): Promise<any> {
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'AI Document Analyzer'
    };

    const payload: any = {
      model: this.model,
      messages,
      temperature: 0.7,
      max_tokens: 2048
    };

    if (responseFormat) {
      payload.response_format = { type: 'json_object' };
    }

    try {
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', payload, { headers });
      const content = response.data.choices[0].message.content;

      if (responseFormat) {
        return JSON.parse(content);
      }

      return content;
    } catch (error) {
      console.error('OpenRouter API error:', error);
      throw new Error(`OpenRouter API error: ${error.response?.data?.error || error.message}`);
    }
  }

  async analyzeDocument(text: string, settings?: AISettings): Promise<AnalysisResult> {
    const cacheKey = `openrouter-analysis-${text.length}-${this.model}-${JSON.stringify(settings)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Build prompt based on settings
    let prompt = 'Analyze the following document and provide the results in JSON format with exactly these keys: summary, topics (array), entities (array of objects with text and type), sentiment (Positive/Negative/Neutral).\n\n';

    if (settings) {
      if (settings.aiPromptPrefix.trim()) {
        prompt += `${settings.aiPromptPrefix.trim()}\n\n`;
      }

      // Add language style instruction
      switch (settings.languageStyle) {
        case 'conversational':
          prompt += 'Use a conversational, friendly tone.\n\n';
          break;
        case 'technical':
          prompt += 'Use technical, professional language.\n\n';
          break;
        case 'simplified':
          prompt += 'Use simple, clear language.\n\n';
          break;
        default:
          prompt += 'Use formal, professional language.\n\n';
      }

      // Add summary length instruction
      switch (settings.summaryLength) {
        case 'short':
          prompt += 'Provide a brief summary of 2-3 sentences.\n\n';
          break;
        case 'medium':
          prompt += 'Provide a comprehensive summary of 4-6 sentences.\n\n';
          break;
        default:
          prompt += 'Provide a detailed summary of 7+ sentences.\n\n';
      }

      prompt += `Extract the top ${settings.maxTopicsCount} most important topics or concepts.\n\n`;
    }

    prompt += `Document:\n${text}`;

    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ];

    try {
      const result = await this.makeRequest(messages, true) as AnalysisResult;

      // Ensure the result has the correct structure
      const formattedResult: AnalysisResult = {
        summary: result.summary || 'Analysis failed to generate summary.',
        topics: Array.isArray(result.topics) ? result.topics : [],
        entities: Array.isArray(result.entities) ? result.entities.map((e: any) => ({
          text: e.text || '',
          type: e.type || 'UNKNOWN'
        })) : [],
        sentiment: result.sentiment || 'Neutral'
      };

      this.cache.set(cacheKey, formattedResult);
      return formattedResult;
    } catch (error) {
      console.error('OpenRouter analysis error:', error);
      throw new Error('Failed to analyze document with OpenRouter.');
    }
  }

  async createChat(documentText: string, locale: 'en' | 'vi'): Promise<any> {
    // OpenRouter doesn't have built-in chat sessions like Gemini
    // We'll create a mock chat that uses individual requests
    const chatMock = {
      sendMessage: async (message: string) => {
        const languageInstruction = locale === 'vi' ? 'You must respond in Vietnamese.' : 'You must respond in English.';
        const notFoundMessage = locale === 'vi' ? 'Không thể tìm thấy câu trả lời trong tài liệu.' : 'I cannot find the answer in the document.';

        const prompt = `You are an AI assistant analyzing this document: ${documentText}

${languageInstruction}

If you cannot find information in the document, say: "${notFoundMessage}"

Question: ${message}`;

        const messages = [{
          role: 'user',
          content: prompt
        }];

        const response = await this.makeRequest(messages);
        return { text: response };
      }
    };

    return chatMock;
  }

  async generateQuiz(text: string, locale: 'en' | 'vi', mcCount: number, writtenCount: number): Promise<QuizQuestion[]> {
    const cacheKey = `openrouter-quiz-${mcCount}-${writtenCount}-${locale}-${this.model}-${text.length}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const languageInstruction = locale === 'vi' ? 'Questions in Vietnamese.' : 'Questions in English.';

    const prompt = `Generate a quiz based on this document. Return JSON with multipleChoiceQuestions and writtenQuestions arrays.

Multiple choice questions: ${mcCount}
Written questions: ${writtenCount}
${languageInstruction}

Document: ${text}

Response format: {"multipleChoiceQuestions": [{"question": "...", "options": ["...", "...", "...", "..."], "correctAnswerIndex": 0, "explanation": "..."}], "writtenQuestions": [{"question": "..."}]}`;

    const messages = [{
      role: 'user',
      content: prompt
    }];

    try {
      const data = await this.makeRequest(messages, true);
      const mcQuestions = (data.multipleChoiceQuestions || []).map((q: any) => ({ ...q, type: 'multiple-choice' }));
      const writtenQs = (data.writtenQuestions || []).map((q: any) => ({ ...q, type: 'written' }));

      const result = [...mcQuestions, ...writtenQs];
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('OpenRouter quiz error:', error);
      throw new Error('Failed to generate quiz with OpenRouter.');
    }
  }

  async gradeWrittenAnswer(documentText: string, question: string, userAnswer: string, locale: 'en' | 'vi'): Promise<GradedWrittenAnswer> {
    const languageInstruction = locale === 'vi' ? 'Feedback in Vietnamese.' : 'Feedback in English.';

    const prompt = `Grade this written answer on a scale of 0-5. Return JSON with score, maxScore (always 5), and constructive feedback.

${languageInstruction}

Question: ${question}
Answer: ${userAnswer}

Document context: ${documentText}

Response format: {"score": 0-5, "maxScore": 5, "feedback": "..."}`;

    const messages = [{
      role: 'user',
      content: prompt
    }];

    try {
      const result = await this.makeRequest(messages, true) as GradedWrittenAnswer;
      return {
        score: Math.max(0, Math.min(5, result.score || 0)),
        maxScore: 5,
        feedback: result.feedback || 'Grading failed.'
      };
    } catch (error) {
      console.error('OpenRouter grading error:', error);
      return { score: 0, maxScore: 5, feedback: 'Error grading answer.' };
    }
  }
}
