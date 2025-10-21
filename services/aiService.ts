import { AnalysisResult, QuizQuestion, GradedWrittenAnswer, Exercise, ChatMessage, UserSettings, APIConfiguration, DocumentTip } from '../types';
import { decryptApiKey } from '../utils/apiKeyUtils';
import { GeminiProvider } from './providers/GeminiProvider';
import { OpenRouterProvider } from './providers/OpenRouterProvider';
import { BaseAIProvider } from './providers/BaseAIProvider';
import { cacheService } from './cacheService';

class AIService {
  private providers: Map<string, BaseAIProvider> = new Map();
  private cache: Map<string, any> = new Map();
  
  // Cache TTL settings for different operations (in seconds)
  private readonly CACHE_TTL = {
    documentAnalysis: 24 * 60 * 60, // 24 hours
    quizGeneration: 12 * 60 * 60,   // 12 hours
    exerciseGeneration: 12 * 60 * 60, // 12 hours
    chatSession: 2 * 60 * 60,       // 2 hours
    grading: 6 * 60 * 60,           // 6 hours
    fullCoverage: 6 * 60 * 60       // 6 hours
  };
  
  // Debounce map to prevent duplicate API calls
  private pendingRequests = new Map<string, Promise<any>>();

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

    // Generate cache key based on document content and settings
    const cacheKey = cacheService.generateKey(
      text, 
      'document_analysis', 
      { 
        languageStyle: settings.ai?.languageStyle,
        summaryLength: settings.ai?.summaryLength,
        maxTopics: settings.ai?.maxTopicsCount 
      }
    );

    // Check cache first
    const cachedResult = cacheService.get(cacheKey);
    if (cachedResult) {
      console.log(`Cache hit for document analysis: ${cacheKey.substring(0, 50)}...`);
      return cachedResult;
    }

    // Check if there's a pending request for the same document
    if (this.pendingRequests.has(cacheKey)) {
      console.log('Waiting for pending document analysis...');
      return this.pendingRequests.get(cacheKey);
    }

    // Start new request
    const request = provider.analyzeDocument(text, settings.ai)
      .then((analysis) => {
        // Generate document tips using the analysis if enabled
        let tips: DocumentTip[] = [];
        if (settings.ui.enableDocumentTips) {
          return provider.generateDocumentTips(text, analysis, settings.ui.enableDefaultGemini ? 'en' : 'en', settings.ai)
            .then((generatedTips) => {
              const result: AnalysisResult = {
                ...analysis,
                tips: generatedTips
              };
              
              // Cache the complete result
              cacheService.set(cacheKey, result, this.CACHE_TTL.documentAnalysis);
              this.pendingRequests.delete(cacheKey);
              return result;
            })
            .catch((error) => {
              console.warn('Failed to generate document tips:', error);
              // Continue without tips if generation fails
              const result: AnalysisResult = {
                ...analysis,
                tips: []
              };
              
              cacheService.set(cacheKey, result, this.CACHE_TTL.documentAnalysis);
              this.pendingRequests.delete(cacheKey);
              return result;
            });
        } else {
          const result: AnalysisResult = {
            ...analysis,
            tips: []
          };
          
          cacheService.set(cacheKey, result, this.CACHE_TTL.documentAnalysis);
          this.pendingRequests.delete(cacheKey);
          return result;
        }
      })
      .catch((error) => {
        this.pendingRequests.delete(cacheKey);
        throw error;
      });

    // Store the pending request
    this.pendingRequests.set(cacheKey, request);
    
    return request;
  }

  async createChat(documentText: string, locale: 'en' | 'vi', settings: UserSettings, conversationContext?: string): Promise<any> {
    const provider = this.getActiveProvider(settings);
    if (!provider) {
      throw new Error('No active AI provider configured.');
    }

    // Generate cache key (conversation context affects uniqueness)
    const cacheKey = cacheService.generateKey(
      documentText + (conversationContext || ''), 
      'chat_session', 
      { 
        locale,
        languageStyle: settings.ai?.languageStyle,
        summaryLength: settings.ai?.summaryLength
      }
    );

    // Check cache first
    const cachedResult = cacheService.get(cacheKey);
    if (cachedResult) {
      console.log(`Cache hit for chat session: ${cacheKey.substring(0, 50)}...`);
      return cachedResult;
    }

    // For chat sessions, we don't use pending requests as they're typically sequential
    const result = provider.createChat(documentText, locale, conversationContext);
    
    // Cache chat results with shorter TTL
    cacheService.set(cacheKey, result, this.CACHE_TTL.chatSession);
    
    return result;
  }

  async generateQuiz(text: string, locale: 'en' | 'vi', settings: UserSettings, mcCount: number, writtenCount: number, mode: 'default' | 'full-coverage' = 'default'): Promise<QuizQuestion[]> {
    const provider = this.getActiveProvider(settings);
    if (!provider) {
      throw new Error('No active AI provider configured.');
    }

    // Generate cache key
    const cacheKey = cacheService.generateKey(
      text, 
      'quiz_generation', 
      { 
        locale, 
        mcCount, 
        writtenCount, 
        mode,
        languageStyle: settings.ai?.languageStyle,
        summaryLength: settings.ai?.summaryLength
      }
    );

    // Check cache first
    const cachedResult = cacheService.get(cacheKey);
    if (cachedResult) {
      console.log(`Cache hit for quiz generation: ${cacheKey.substring(0, 50)}...`);
      return cachedResult;
    }

    // Check for pending request
    if (this.pendingRequests.has(cacheKey)) {
      console.log('Waiting for pending quiz generation...');
      return this.pendingRequests.get(cacheKey);
    }

    // Start new request
    const request = provider.generateQuiz(text, locale, mcCount, writtenCount)
      .then((questions) => {
        // Cache the result
        cacheService.set(cacheKey, questions, this.CACHE_TTL.quizGeneration);
        this.pendingRequests.delete(cacheKey);
        return questions;
      })
      .catch((error) => {
        this.pendingRequests.delete(cacheKey);
        throw error;
      });

    // Store pending request
    this.pendingRequests.set(cacheKey, request);
    
    return request;
  }

  async generateFullCoverageQuestions(text: string, locale: 'en' | 'vi', settings: UserSettings): Promise<{ questions: string[]; hasMore: boolean; nextBatchToken?: string }> {
    const provider = this.getActiveProvider(settings);
    if (!provider) {
      throw new Error('No active AI provider configured.');
    }

    // Generate cache key
    const cacheKey = cacheService.generateKey(
      text, 
      'full_coverage_questions', 
      { 
        locale,
        languageStyle: settings.ai?.languageStyle,
        summaryLength: settings.ai?.summaryLength
      }
    );

    // Check cache first
    const cachedResult = cacheService.get(cacheKey);
    if (cachedResult) {
      console.log(`Cache hit for full coverage questions: ${cacheKey.substring(0, 50)}...`);
      return cachedResult;
    }

    // Check for pending request
    if (this.pendingRequests.has(cacheKey)) {
      console.log('Waiting for pending full coverage generation...');
      return this.pendingRequests.get(cacheKey);
    }

    // Start new request
    const request = provider.generateFullCoverageQuestions(text, locale)
      .then((result) => {
        // Cache results
        cacheService.set(cacheKey, result, this.CACHE_TTL.fullCoverage);
        this.pendingRequests.delete(cacheKey);
        return result;
      })
      .catch((error) => {
        this.pendingRequests.delete(cacheKey);
        throw error;
      });

    // Store pending request
    this.pendingRequests.set(cacheKey, request);
    
    return request;
  }

  async gradeWrittenAnswer(documentText: string, question: string, userAnswer: string, locale: 'en' | 'vi', settings: UserSettings): Promise<GradedWrittenAnswer> {
    const provider = this.getActiveProvider(settings);
    if (!provider) {
      throw new Error('No active AI provider configured.');
    }

    // Generate cache key
    const cacheKey = cacheService.generateKey(
      documentText + question + userAnswer, 
      'written_answer_grading', 
      { 
        locale,
        languageStyle: settings.ai?.languageStyle,
        summaryLength: settings.ai?.summaryLength
      }
    );

    // Check cache first
    const cachedResult = cacheService.get(cacheKey);
    if (cachedResult) {
      console.log(`Cache hit for written answer grading: ${cacheKey.substring(0, 50)}...`);
      return cachedResult;
    }

    // Check for pending request
    if (this.pendingRequests.has(cacheKey)) {
      console.log('Waiting for pending grading...');
      return this.pendingRequests.get(cacheKey);
    }

    // Start new request
    const request = provider.gradeWrittenAnswer(documentText, question, userAnswer, locale)
      .then((result) => {
        // Cache grading results
        cacheService.set(cacheKey, result, this.CACHE_TTL.grading);
        this.pendingRequests.delete(cacheKey);
        return result;
      })
      .catch((error) => {
        this.pendingRequests.delete(cacheKey);
        throw error;
      });

    // Store pending request
    this.pendingRequests.set(cacheKey, request);
    
    return request;
  }

  async gradeExercise(documentText: string, exercise: Exercise, submission: any, locale: 'en' | 'vi', settings: UserSettings): Promise<any> {
    const provider = this.getActiveProvider(settings);
    if (!provider) {
      throw new Error('No active AI provider configured.');
    }

    return provider.gradeExercise(documentText, exercise, submission, locale);
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

    // Generate cache key
    const cacheKey = cacheService.generateKey(
      text, 
      'exercise_generation', 
      { 
        locale, 
        exerciseCounts,
        languageStyle: settings.ai?.languageStyle,
        summaryLength: settings.ai?.summaryLength
      }
    );

    // Check cache first
    const cachedResult = cacheService.get(cacheKey);
    if (cachedResult) {
      console.log(`Cache hit for exercise generation: ${cacheKey.substring(0, 50)}...`);
      return cachedResult;
    }

    // Check for pending request
    if (this.pendingRequests.has(cacheKey)) {
      console.log('Waiting for pending exercise generation...');
      return this.pendingRequests.get(cacheKey);
    }

    // Start new request
    const request = provider.generateExercises(text, locale, exerciseCounts)
      .then((rawExercises) => {
        // Post-process exercises (existing logic)
        const processedExercises = this.processExercises(rawExercises, text, locale, settings, provider);
        
        // Cache the processed result
        cacheService.set(cacheKey, processedExercises, this.CACHE_TTL.exerciseGeneration);
        this.pendingRequests.delete(cacheKey);
        return processedExercises;
      })
      .catch((error) => {
        this.pendingRequests.delete(cacheKey);
        throw error;
      });

    // Store pending request
    this.pendingRequests.set(cacheKey, request);
    
    return request;
  }

  /**
   * Process exercises with proper typing and fillable elements
   */
  private async processExercises(rawExercises: any[], text: string, locale: 'en' | 'vi', settings: UserSettings, provider: BaseAIProvider): Promise<Exercise[]> {
    // Post-process exercises and ensure proper typing and fillable elements
    const processedExercises = await Promise.all(rawExercises.map(async (exercise: any) => {
      // For fillable exercises, ensure they have fillableElements
      if (exercise.type === 'fillable') {
        // If fillableElements exists, clean them up
        if (exercise.fillableElements && exercise.fillableElements.length > 0) {
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
            console.log(`Generating fillable elements for exercise: ${exercise.title}`);
            const fillableElements = await provider.generateFillableElements(text, exercise.objective || exercise.title, locale, settings.ai);
            console.log(`Generated ${fillableElements.length} fillable elements for: ${exercise.title}`);

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
            console.log(`Using fallback fillable element for: ${exercise.title}`);

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

  /**
   * Get cache statistics for monitoring
   */
  public getCacheStats() {
    return cacheService.getStats();
  }

  /**
   * Clear specific operation cache or all cache
   */
  public clearCache(operation?: string) {
    if (operation) {
      // Clear cache for specific operation (would need to implement pattern-based clearing)
      console.log(`Clearing cache for operation: ${operation}`);
    } else {
      // Clear all cache
      cacheService.clear();
      this.pendingRequests.clear();
      console.log('All cache cleared');
    }
  }

  /**
   * Get the number of pending AI requests
   */
  public getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Generate mock table data for fallback (existing logic)
   */
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
