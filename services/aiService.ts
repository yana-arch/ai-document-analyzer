import { AnalysisResult, QuizQuestion, GradedWrittenAnswer, Exercise, ChatMessage, UserSettings, APIConfiguration } from '../types';
import { decryptApiKey } from '../utils/apiKeyUtils';
import { GeminiProvider } from './providers/GeminiProvider';
import { OpenRouterProvider } from './providers/OpenRouterProvider';
import { BaseAIProvider } from './providers/BaseAIProvider';

class AIService {
  private providers: Map<string, BaseAIProvider> = new Map();
  private cache: Map<string, any> = new Map();

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

    const rawExercises = await provider.generateExercises(text, locale, exerciseCounts);

    // Post-process exercises to handle AI putting fillable elements in examples instead of fillableElements
    rawExercises.forEach((exercise: any) => {
      if (exercise.type === 'fillable' && (!exercise.fillableElements || exercise.fillableElements.length === 0)) {
        // Look for table examples in fillable exercises without fillableElements
        const tableExamples = exercise.examples?.filter((ex: any) => ex.type === 'table') || [];
        if (tableExamples.length > 0) {
          // Convert table examples to fillable elements
          const fillableElements = tableExamples.map((ex: any) => {
            try {
              // Parse markdown table content to extract rows
              const lines = ex.content.split('\n')
                .map((line: string) => line.trim())
                .filter((line: string) => line && !line.startsWith('---') && !line.startsWith('| ---'));

              const rows: string[][] = lines
                .map((line: string) => line.split('|').slice(1, -1).map((cell: string) => cell.trim()))
                .filter((row: string[]) => row.length > 0);

              if (rows.length > 0) {
                return {
                  id: `from-example-${Math.random().toString(36).substr(2, 9)}`,
                  type: 'table',
                  data: { rows }
                };
              }
            } catch (error) {
              console.warn('Failed to parse table from example:', error);
            }
            return null;
          }).filter((element: any) => element);

          if (fillableElements.length > 0) {
            exercise.fillableElements = fillableElements;
            // Remove the table examples since they're now in fillableElements
            exercise.examples = exercise.examples.filter((ex: any) => ex.type !== 'table');
            console.log(`Extracted ${fillableElements.length} fillable elements from examples for exercise: ${exercise.title}`);
          }
        }
      }
    });

    // Process exercises and ensure proper typing and fillable elements
    const processedExercises = await Promise.all(rawExercises.map(async (exercise: any) => {
      // For fillable exercises, ensure they have fillableElements
      if (exercise.type === 'fillable') {
        // If fillableElements exists, clean them up
        if (exercise.fillableElements) {
          return {
            ...exercise,
            fillableElements: exercise.fillableElements.map((element: any) => ({
              id: element.id || `element-${Math.random().toString(36).substr(2, 9)}`,
              type: element.type || 'table',
              data: element.data || {}
            }))
          } as Exercise;
        } else {
          // Generate AI-generated fillableElements for fillable exercises
          try {
            const fillableElements = await provider.generateFillableElements(text, exercise.objective || exercise.title, locale, settings.ai);
            return {
              ...exercise,
              fillableElements: fillableElements.map((element: any) => ({
                id: element.id || `ai-element-${Math.random().toString(36).substr(2, 9)}`,
                type: element.type || 'table',
                data: element.data || {}
              }))
            } as Exercise;
          } catch (error) {
            console.warn('Failed to generate AI fillable elements, using fallback:', error);
            const fillableElements = this.generateMockTableData(exercise.objective || exercise.title, locale);
            return {
              ...exercise,
              fillableElements: [fillableElements]
            } as Exercise;
          }
        }
      }

      return exercise as Exercise;
    }));

    return processedExercises;
  }

  generateMockTableData(context: string, locale: 'en' | 'vi'): any {
    // Generate table based on exercise context keywords
    const lowerContext = context.toLowerCase();

    // Scrum/Agile related exercises
    if (lowerContext.includes('scrum') || lowerContext.includes('sprint') || lowerContext.includes('backlog')) {
      return {
        id: `tablet-${Math.random().toString(36).substr(2, 9)}`,
        type: 'table',
        data: {
          rows: [
            ['Backlog Item', 'Priority', 'Story Points', 'Acceptance Criteria'],
            ['User login feature', 'High', '', ''],
            ['Password reset', 'Medium', '', ''],
            ['Dashboard UI', 'Low', '', '']
          ]
        }
      };
    }

    // Planning/Scheduling exercises
    if (lowerContext.includes('planning') || lowerContext.includes('schedule') || lowerContext.includes('timeline')) {
      return {
        id: `schedulet-${Math.random().toString(36).substr(2, 9)}`,
        type: 'table',
        data: {
          rows: [
            ['Week', 'Activities', 'Deliverables'],
            ['Week 1', '', ''],
            ['Week 2', '', ''],
            ['Week 3', '', ''],
            ['Week 4', '', '']
          ]
        }
      };
    }

    // Analysis/Comparison exercises
    if (lowerContext.includes('analysis') || lowerContext.includes('comparison') || lowerContext.includes('evaluation')) {
      return {
        id: `analysist-${Math.random().toString(36).substr(2, 9)}`,
        type: 'table',
        data: {
          rows: [
            ['Criteria', 'Option A', 'Option B', 'Recommendation'],
            ['Cost', '', '', ''],
            ['Timeline', '', '', ''],
            ['Quality', '', '', ''],
            ['Risk', '', '', '']
          ]
        }
      };
    }

    // Problem-solving exercises
    if (lowerContext.includes('problem') || lowerContext.includes('solution') || lowerContext.includes('troubleshoot')) {
      return {
        id: `problemst-${Math.random().toString(36).substr(2, 9)}`,
        type: 'table',
        data: {
          rows: [
            ['Problem', 'Root Cause', 'Solution', 'Priority'],
            ['', '', '', ''],
            ['', '', '', ''],
            ['', '', '', '']
          ]
        }
      };
    }

    // Requirements/List exercises
    if (lowerContext.includes('requirement') || lowerContext.includes('list') || lowerContext.includes('specifications')) {
      return {
        id: `listt-${Math.random().toString(36).substr(2, 9)}`,
        type: 'table',
        data: {
          rows: [
            ['Requirement', 'Description', 'Priority', 'Status'],
            ['', '', '', ''],
            ['', '', '', ''],
            ['', '', '', ''],
            ['', '', '', '']
          ]
        }
      };
    }

    // Default general table
    return {
      id: `generalt-${Math.random().toString(36).substr(2, 9)}`,
      type: 'table',
      data: {
        rows: [
          ['Item', 'Details', 'Status'],
          ['', '', ''],
          ['', '', ''],
          ['', '', '']
        ]
      }
    };
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
