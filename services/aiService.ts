import { AnalysisResult, QuizQuestion, GradedWrittenAnswer, Exercise, ChatMessage, UserSettings, APIConfiguration } from '../types';
import { decryptApiKey } from '../utils/apiKeyUtils';
import { GeminiProvider } from './providers/GeminiProvider';
import { OpenRouterProvider } from './providers/OpenRouterProvider';
import { BaseAIProvider } from './providers/BaseAIProvider';

class AIService {
  private providers: Map<string, BaseAIProvider> = new Map();

  constructor() {
    // Initialize with empty providers - they'll be loaded from settings
  }

  updateProviders(apis: APIConfiguration[]): void {
    this.providers.clear();

    for (const api of apis) {
      try {
        // Get the first valid API key (decrypt it)
        const decryptedKey = decryptApiKey(api.apiKeys[0]);

        switch (api.provider) {
          case 'gemini':
            this.providers.set(api.id, new GeminiProvider(decryptedKey));
            break;
          case 'openrouter':
            this.providers.set(api.id, new OpenRouterProvider(decryptedKey, api.model || 'openai/gpt-4o-mini'));
            break;
          default:
            console.warn(`Unknown provider: ${api.provider}`);
        }
      } catch (error) {
        console.error(`Failed to initialize provider ${api.name}:`, error);
      }
    }
  }

  getActiveProvider(settings: UserSettings): BaseAIProvider | null {
    // Find the active API configuration
    const activeApi = settings.apis.find(api => api.isActive);

    if (!activeApi) {
      // Fallback to old Gemini environment variable if no APIs configured and fallback is enabled
      if (settings.ui.enableDefaultGemini) {
        const fallbackKey = import.meta.env.VITE_API_KEY;
        if (fallbackKey) {
          console.warn('No active API configured, falling back to default Gemini API');
          try {
            this.providers.set('fallback-gemini', new GeminiProvider(fallbackKey));
            return this.providers.get('fallback-gemini') || null;
          } catch (error) {
            console.error('Fallback Gemini failed:', error);
            return null;
          }
        }
      }
      return null;
    }

    return this.providers.get(activeApi.id) || null;
  }

  async analyzeDocument(text: string, settings: UserSettings): Promise<AnalysisResult> {
    const provider = this.getActiveProvider(settings);
    if (!provider) {
      throw new Error('No active AI provider configured. Please configure an API in Settings.');
    }

    return provider.analyzeDocument(text, settings.ai);
  }

  async createChat(documentText: string, locale: 'en' | 'vi', settings: UserSettings): Promise<any> {
    const provider = this.getActiveProvider(settings);
    if (!provider) {
      throw new Error('No active AI provider configured.');
    }

    return provider.createChat(documentText, locale);
  }

  async generateQuiz(text: string, locale: 'en' | 'vi', settings: UserSettings, mcCount: number, writtenCount: number): Promise<QuizQuestion[]> {
    const provider = this.getActiveProvider(settings);
    if (!provider) {
      throw new Error('No active AI provider configured.');
    }

    return provider.generateQuiz(text, locale, mcCount, writtenCount);
  }

  async gradeWrittenAnswer(documentText: string, question: string, userAnswer: string, locale: 'en' | 'vi', settings: UserSettings): Promise<GradedWrittenAnswer> {
    const provider = this.getActiveProvider(settings);
    if (!provider) {
      throw new Error('No active AI provider configured.');
    }

    return provider.gradeWrittenAnswer(documentText, question, userAnswer, locale);
  }

  async generateExercises(text: string, locale: 'en' | 'vi', settings: UserSettings, exerciseCounts: {
    practice: number;
    simulation: number;
    analysis: number;
    application: number;
    fillable: number;
  }): Promise<Exercise[]> {
    const provider = this.getActiveProvider(settings);
    if (!provider) {
      throw new Error('No active AI provider configured.');
    }

    return provider.generateExercises(text, locale, exerciseCounts);
  }

  async testActiveProvider(settings: UserSettings): Promise<{ success: boolean; message: string }> {
    const provider = this.getActiveProvider(settings);
    if (!provider) {
      return { success: false, message: 'No active API configured.' };
    }

    try {
      const isConnected = await provider.testConnection();
      return {
        success: isConnected,
        message: isConnected ? 'Connection successful!' : 'Connection failed - please check your API key.'
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error.message}`
      };
    }
  }
}

// Export singleton instance
export const aiService = new AIService();

// Backward compatibility functions
export async function analyzeDocument(text: string, settings?: any): Promise<AnalysisResult> {
  throw new Error('Use aiService.analyzeDocument() instead');
}

export function createChat(documentText: string, locale: 'en' | 'vi'): Promise<any> {
  throw new Error('Use aiService.createChat() instead');
}

export async function generateQuiz(text: string, locale: 'en' | 'vi', mcCount: number, writtenCount: number): Promise<QuizQuestion[]> {
  throw new Error('Use aiService.generateQuiz() instead');
}

export async function gradeWrittenAnswer(documentText: string, question: string, userAnswer: string, locale: 'en' | 'vi'): Promise<GradedWrittenAnswer> {
  throw new Error('Use aiService.gradeWrittenAnswer() instead');
}
