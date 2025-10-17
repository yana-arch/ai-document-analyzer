import { GoogleGenAI, Type, Chat } from "@google/genai";
import { AnalysisResult, QuizQuestion, GradedWrittenAnswer, MultipleChoiceQuestion, WrittenAnswerQuestion, Exercise, AISettings, DocumentTip } from '../../types';
import { BaseAIProvider } from './BaseAIProvider';

// Prompt Template System for better organization and reusability
class PromptTemplate {
  private templates: Map<string, string> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates() {
    // Document Analysis Templates
    this.templates.set('document-analysis', `Analyze the document and provide structured results in JSON format.

Requirements:
- Language style: {languageStyle}
- Summary length: {summaryLength}
- Maximum topics: {maxTopics}
- Extract key entities and determine sentiment

Document Content:
---
{text}
---`);

    // Exercise Generation Templates
    this.templates.set('exercise-generation', `Generate {totalExercises} exercises from the document.

Exercise Distribution:
- Practice: {practiceCount}
- Simulation: {simulationCount}
- Analysis: {analysisCount}
- Application: {applicationCount}
- Fillable: {fillableCount}

Requirements:
- Language: {language}
- Each exercise must have clear objective and instructions
- Include practical examples for each exercise
- Ensure exercises are relevant to document content
- For fillable exercises, you MUST include fillableElements array with appropriate interactive elements

Document Content:
---
{text}
---`);

    // Fillable Element Templates
    this.templates.set('fillable-element', `Generate a fillable element based on document content and exercise context.

Exercise Context: {exerciseContext}
Document Content: {documentText}
Language: {language}

Generate ONE relevant fillable element using these structures:

For tables: { "type": "table", "data": { "rows": [["Header1", "Header2"], ["", ""]] } }
For lists: { "type": "list", "data": { "items": ["Item1", "", ""] } }
For schedules: { "type": "schedule", "data": { "schedule": [["Time", "Activity"], ["9:00", ""]] } }
For forms: { "type": "form", "data": { "fieldList": ["Field1", "Field2"], "fields": {} } }

Choose the most appropriate type based on the exercise context.`);

    // Quality Validation Template
    this.templates.set('quality-validation', `Evaluate the quality of generated exercises.

Exercises to evaluate:
{exerciseJson}

Evaluation Criteria:
1. Relevance to document content (1-5)
2. Clarity of instructions (1-5)
3. Completeness of examples (1-5)
4. Appropriate difficulty level (1-5)
5. Engagement potential (1-5)

Provide detailed feedback for improvement.`);
  }

  getTemplate(name: string, variables: Record<string, string> = {}): string {
    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`Template '${name}' not found`);
    }

    return this.interpolate(template, variables);
  }

  private interpolate(template: string, variables: Record<string, string>): string {
    return template.replace(/{(\w+)}/g, (match, key) => variables[key] || match);
  }
}

// Exercise Type Definitions with specific requirements
const EXERCISE_TYPES = {
  practice: {
    name: 'Practice',
    description: 'Hands-on exercises for skill development',
    requirements: [
      'Clear step-by-step instructions',
      'Practical examples',
      'Immediate feedback opportunities',
      'Progressive difficulty'
    ]
  },
  simulation: {
    name: 'Simulation',
    description: 'Real-world scenario simulations',
    requirements: [
      'Realistic scenario setup',
      'Decision-making opportunities',
      'Consequence consideration',
      'Debriefing guidelines'
    ]
  },
  analysis: {
    name: 'Analysis',
    description: 'Critical thinking and analysis exercises',
    requirements: [
      'Clear analytical framework',
      'Guiding questions',
      'Evidence-based reasoning',
      'Conclusion synthesis'
    ]
  },
  application: {
    name: 'Application',
    description: 'Real-world application projects',
    requirements: [
      'Practical application context',
      'Resource requirements',
      'Implementation steps',
      'Success criteria'
    ]
  },
  fillable: {
    name: 'Fillable',
    description: 'Interactive fill-in exercises',
    requirements: [
      'Clear structure template',
      'Appropriate data types',
      'Progressive disclosure',
      'Validation criteria'
    ]
  }
} as const;

// Enhanced Fillable Element Types with comprehensive table templates
const FILLABLE_TYPES = {
  table: {
    name: 'Data Table',
    structure: {
      type: 'table',
      data: {
        rows: [['Column 1', 'Column 2', 'Column 3'], ['', '', ''], ['', '', '']]
      }
    },
    useCases: ['comparison', 'data_entry', 'planning', 'tracking'],
    templates: {
      generic: {
        headers: ['Item', 'Description', 'Status', 'Notes'] as string[],
        sampleData: ['', '', 'Pending', ''] as string[]
      },
      comparison: {
        headers: ['Criteria', 'Option A', 'Option B', 'Recommendation'] as string[],
        sampleData: ['', '', '', ''] as string[]
      },
      planning: {
        headers: ['Task', 'Priority', 'Estimated Hours', 'Status', 'Due Date'] as string[],
        sampleData: ['', 'Medium', '', 'Pending', ''] as string[]
      },
      analysis: {
        headers: ['Metric', 'Current Value', 'Target Value', 'Gap Analysis', 'Action Items'] as string[],
        sampleData: ['', '', '', '', ''] as string[]
      },
      tracking: {
        headers: ['Date', 'Activity', 'Progress', 'Challenges', 'Next Steps'] as string[],
        sampleData: ['', '', '', '', ''] as string[]
      },
      scrum: {
        headers: ['Sprint Goal', 'User Stories', 'Acceptance Criteria', 'Status', 'Assignee'] as string[],
        sampleData: ['', '', '', 'Not Started', ''] as string[]
      },
      project: {
        headers: ['Milestone', 'Deliverables', 'Dependencies', 'Timeline', 'Status'] as string[],
        sampleData: ['', '', '', '', 'On Track'] as string[]
      },
      learning: {
        headers: ['Topic', 'Key Concepts', 'Examples', 'Practice Items', 'Mastery Level'] as string[],
        sampleData: ['', '', '', '', 'Beginner'] as string[]
      },
      evaluation: {
        headers: ['Criteria', 'Weight', 'Score (1-5)', 'Comments', 'Improvement Areas'] as string[],
        sampleData: ['', '', '', '', ''] as string[]
      },
      research: {
        headers: ['Research Question', 'Methodology', 'Data Sources', 'Findings', 'Conclusions'] as string[],
        sampleData: ['', '', '', '', ''] as string[]
      }
    }
  },
  list: {
    name: 'Interactive List',
    structure: {
      type: 'list',
      data: {
        items: ['Item 1', '', '', '']
      }
    },
    useCases: ['checklist', 'steps', 'requirements', 'inventory']
  },
  schedule: {
    name: 'Schedule/Timeline',
    structure: {
      type: 'schedule',
      data: {
        schedule: [['Time', 'Activity', 'Duration'], ['9:00', '', ''], ['10:00', '', '']]
      }
    },
    useCases: ['timeline', 'planning', 'project_schedule', 'daily_routine']
  },
  form: {
    name: 'Structured Form',
    structure: {
      type: 'form',
      data: {
        fieldList: ['Field 1', 'Field 2', 'Field 3'],
        fields: {}
      }
    },
    useCases: ['data_collection', 'assessment', 'registration', 'feedback']
  },
  matrix: {
    name: 'Comparison Matrix',
    structure: {
      type: 'matrix',
      data: {
        rows: [['Criteria', 'Option A', 'Option B', 'Recommendation'], ['', '', '', ''], ['', '', '', '']]
      }
    },
    useCases: ['comparison', 'evaluation', 'decision_matrix', 'analysis']
  }
} as const;

// Retry utility with exponential backoff
const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        break; // Last attempt failed
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.warn(`Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};

// Helper functions for settings integration
function getLanguageStyleInstruction(languageStyle: string) {
  switch (languageStyle) {
    case 'conversational':
      return 'Use a conversational, friendly tone in your analysis.';
    case 'technical':
      return 'Use technical, professional language appropriate for academic or business contexts.';
    case 'simplified':
      return 'Use simple, clear language that would be understandable to a general audience.';
    case 'formal':
    default:
      return 'Use formal, professional language in your analysis.';
  }
}

function getSummaryLengthInstruction(summaryLength: string) {
  switch (summaryLength) {
    case 'short':
      return 'Provide a brief summary of 2-3 sentences.';
    case 'medium':
      return 'Provide a comprehensive summary of 4-6 sentences.';
    case 'long':
    default:
      return 'Provide a detailed summary of 7+ sentences covering all key aspects.';
  }
}

function getTopicsCountInstruction(maxTopics: number) {
  return `Extract the top ${maxTopics} most important topics or concepts from the document.`;
}

export class GeminiProvider extends BaseAIProvider {
  private ai: GoogleGenAI;
  private cache: Map<string, any> = new Map();
  private promptTemplate: PromptTemplate;

  constructor(apiKey: string) {
    super('Gemini', apiKey);
    this.ai = new GoogleGenAI({ apiKey });
    this.promptTemplate = new PromptTemplate();
  }

  async analyzeDocument(text: string, settings?: AISettings): Promise<AnalysisResult> {
    // Check local cache first
    const cacheKey = `gemini-analysis-${text.length}-${JSON.stringify(settings)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const analysisSchema = {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, description: "A summary of the document." },
        topics: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of important topics or concepts." },
        entities: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "The named entity text." },
              type: { type: Type.STRING, description: "The type of entity." }
            },
            required: ["text", "type"]
          },
          description: "Key named entities."
        },
        sentiment: { type: Type.STRING, description: "Overall sentiment: Positive, Negative, or Neutral." }
      },
      required: ["summary", "topics", "entities", "sentiment"]
    };

    // Build prompt based on settings
    let prompt = 'Analyze the following document and provide the results in JSON. The analysis should be in English.\n\n';

    if (settings) {
      if (settings.aiPromptPrefix.trim()) {
        prompt += `${settings.aiPromptPrefix.trim()}\n\n`;
      }
      prompt += `${getLanguageStyleInstruction(settings.languageStyle)}\n\n`;
      prompt += `${getSummaryLengthInstruction(settings.summaryLength)}\n\n`;
      prompt += `${getTopicsCountInstruction(settings.maxTopicsCount)}\n\n`;
    } else {
      prompt += 'Provide a concise summary and extract key topics.\n\n';
    }

    prompt += `Document:\n---\n${text}\n---\n`;

    try {
      const result = await retryWithBackoff(async () => {
        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: analysisSchema,
          }
        });
        return JSON.parse(response.text.trim()) as AnalysisResult;
      });

      // Cache result locally
      this.cache.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error("Gemini analysis error:", error);
      throw new Error("Failed to analyze document with Gemini.");
    }
  }

  async createChat(documentText: string, locale: 'en' | 'vi', conversationContext?: string): Promise<Chat> {
    const languageInstruction = locale === 'vi' ? 'You must respond in Vietnamese.' : 'You must respond in English.';
    const notFoundMessage = locale === 'vi' ? 'Không thể tìm thấy câu trả lời.' : 'I cannot find the answer in the document.';

    let systemInstruction = `${languageInstruction}

You are an AI assistant. You must answer questions based only on the content of the following document.

If the question cannot be answered using the document, say: "${notFoundMessage}"

Document: ${documentText}`;

    if (conversationContext) {
      systemInstruction += `

Previous conversation context:
${conversationContext}

When responding, consider the previous conversation to provide more relevant and contextual answers. Reference previous questions and answers when appropriate to maintain conversation flow.`;
    }

    const chat = this.ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
      }
    });
    return chat;
  }

  async generateQuiz(text: string, locale: 'en' | 'vi', mcCount: number, writtenCount: number): Promise<QuizQuestion[]> {
    const cacheKey = `gemini-quiz-${mcCount}-${writtenCount}-${locale}-${text.length}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const languageInstruction = locale === 'vi' ? 'Questions in Vietnamese.' : 'Questions in English.';

    const quizSchema = {
      type: Type.OBJECT,
      properties: {
        multipleChoiceQuestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswerIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            },
            required: ["question", "options", "correctAnswerIndex", "explanation"]
          }
        },
        writtenQuestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING }
            },
            required: ["question"]
          }
        }
      },
      required: ["multipleChoiceQuestions", "writtenQuestions"]
    };

    const prompt = `Generate a quiz with ${mcCount} multiple-choice and ${writtenCount} written questions. ${languageInstruction}

Document: ${text}`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: quizSchema,
        }
      });

      const data = JSON.parse(response.text.trim());
      const mcQuestions = (data.multipleChoiceQuestions || []).map((q: any) => ({ ...q, type: 'multiple-choice' }));
      const writtenQs = (data.writtenQuestions || []).map((q: any) => ({ ...q, type: 'written' }));

      const result = [...mcQuestions, ...writtenQs];
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Gemini quiz generation error:", error);
      throw new Error("Failed to generate quiz with Gemini.");
    }
  }

  async generateFullCoverageQuestions(text: string, locale: 'en' | 'vi'): Promise<{ questions: string[]; hasMore: boolean; nextBatchToken?: string }> {
    const languageInstruction = locale === 'vi' ? 'Questions in Vietnamese.' : 'Questions in English.';

    const coverageSchema = {
      type: Type.OBJECT,
      properties: {
        estimatedQuestions: { type: Type.INTEGER, description: "Estimated number of questions that can be generated for full coverage" },
        questions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of all possible questions covering the entire document content"
        }
      },
      required: ["estimatedQuestions", "questions"]
    };

    const prompt = `Generate a comprehensive list of all possible questions that cover every aspect of the document content. ${languageInstruction}

Requirements:
- Create questions that comprehensively cover ALL topics, facts, and concepts in the document
- Generate as many questions as needed for complete coverage
- Questions should be suitable for a knowledge check quiz
- Each question should be clear and answerable based on document content
- Include questions about key concepts, facts, details, and important information
- Do not limit to 30 questions - generate as many as needed for complete coverage

Document: ${text}`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: coverageSchema,
        }
      });

      const data = JSON.parse(response.text.trim());
      const questions = data.questions || [];
      return {
        questions,
        hasMore: false, // Gemini generates all at once, no batching needed
        nextBatchToken: undefined
      };
    } catch (error) {
      console.error("Gemini full coverage questions generation error:", error);
      throw new Error("Failed to generate full coverage questions with Gemini.");
    }
  }

  async generateFullCoverageQuestionsBatch(text: string, locale: 'en' | 'vi', batchToken?: string): Promise<{ questions: string[]; hasMore: boolean; nextBatchToken?: string }> {
    // Gemini can handle large content, so we request smaller chunks based on batch token
    // For simplicity, we'll generate based on batch size
    const languageInstruction = locale === 'vi' ? 'Questions in Vietnamese.' : 'Questions in English.';

    const batchSize = 20; // Request smaller batches
    const startIndex = parseInt(batchToken || '0') * batchSize;

    const coverageSchema = {
      type: Type.OBJECT,
      properties: {
        questions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: `Generate batch ${parseInt(batchToken || '0') + 1} of ${batchSize} questions`
        },
        totalEstimated: {
          type: Type.INTEGER,
          description: "Estimated total questions that could be generated"
        }
      },
      required: ["questions", "totalEstimated"]
    };

    const prompt = `Generate a batch of ${batchSize} comprehensive questions covering different aspects of the document. Focus on questions ${startIndex + 1}-${startIndex + batchSize}. ${languageInstruction}

Requirements:
- Create questions that comprehensively cover different important aspects of the document
- Start from question ${startIndex + 1} onwards
- Generate exactly ${batchSize} questions or fewer if the document content is exhausted
- Questions should be suitable for a knowledge check quiz
- Each question should be clear and answerable based on document content

Document: ${text.substring(0, 10000)}...`; // Limit text to avoid token issues

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: coverageSchema,
        }
      });

      const data = JSON.parse(response.text.trim());
      const questions = data.questions || [];
      const totalEstimated = data.totalEstimated || 100;

      // Check if there's more content to generate
      const currentTotal = startIndex + questions.length;
      const hasMore = currentTotal < totalEstimated;

      return {
        questions,
        hasMore,
        nextBatchToken: hasMore ? (parseInt(batchToken || '0') + 1).toString() : undefined
      };
    } catch (error) {
      console.error("Gemini full coverage questions batch generation error:", error);
      throw new Error("Failed to generate batch of full coverage questions with Gemini.");
    }
  }

  async gradeWrittenAnswer(documentText: string, question: string, userAnswer: string, locale: 'en' | 'vi'): Promise<GradedWrittenAnswer> {
    const languageInstruction = locale === 'vi' ? 'Feedback in Vietnamese.' : 'Feedback in English.';

    const gradingSchema = {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.INTEGER, description: "Score from 0-5." },
        maxScore: { type: Type.INTEGER, description: "Always 5." },
        feedback: { type: Type.STRING, description: "Constructive feedback." }
      },
      required: ["score", "maxScore", "feedback"]
    };

    const prompt = `Grade this answer. ${languageInstruction}

Question: ${question}
Answer: ${userAnswer}
Document context: ${documentText}`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: gradingSchema,
        }
      });

      return JSON.parse(response.text.trim()) as GradedWrittenAnswer;
    } catch (error) {
      console.error("Gemini grading error:", error);
      return { score: 0, maxScore: 5, feedback: "Error grading answer." };
    }
  }

  async generateExercises(text: string, locale: 'en' | 'vi', exerciseCounts: {
    practice: number;
    simulation: number;
    analysis: number;
    application: number;
    fillable: number;
  }): Promise<Exercise[]> {
    const cacheKey = `gemini-exercises-${exerciseCounts.practice}-${exerciseCounts.simulation}-${exerciseCounts.analysis}-${exerciseCounts.application}-${exerciseCounts.fillable}-${locale}-${text.length}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const totalExercises = Object.values(exerciseCounts).reduce((sum, count) => sum + count, 0);

    try {
      // Step 1: Generate exercises using template
      const rawExercises = await this.generateExercisesWithTemplate(text, locale, exerciseCounts, totalExercises);

      // Step 2: Validate and improve exercises
      const validatedExercises = await this.validateAndImproveExercises(rawExercises, text, locale);

      // Step 3: Generate fillable elements for fillable exercises
      const exercisesWithFillables = await this.enhanceFillableExercises(validatedExercises, text, locale);

      // Step 4: Final quality check
      const finalExercises = await this.performFinalQualityCheck(exercisesWithFillables, text);

      this.cache.set(cacheKey, finalExercises);
      return finalExercises;

    } catch (error) {
      console.error("Gemini exercises generation error:", error);
      throw new Error("Failed to generate exercises with Gemini.");
    }
  }

  private async generateExercisesWithTemplate(
    text: string,
    locale: 'en' | 'vi',
    exerciseCounts: any,
    totalExercises: number
  ): Promise<any[]> {
    const languageInstruction = locale === 'vi' ? 'Exercises in Vietnamese.' : 'Exercises in English.';

    // Use template for consistent prompt structure
    const templateVariables = {
      totalExercises: totalExercises.toString(),
      practiceCount: exerciseCounts.practice.toString(),
      simulationCount: exerciseCounts.simulation.toString(),
      analysisCount: exerciseCounts.analysis.toString(),
      applicationCount: exerciseCounts.application.toString(),
      fillableCount: exerciseCounts.fillable.toString(),
      language: languageInstruction,
      text: text
    };

    const prompt = this.promptTemplate.getTemplate('exercise-generation', templateVariables);

    // Enhanced schema with better validation
    const exercisesSchema = {
      type: Type.OBJECT,
      properties: {
        exercises: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Unique identifier for the exercise" },
              type: {
                type: Type.STRING,
                enum: ["practice", "simulation", "analysis", "application", "fillable"],
                description: "Type of exercise"
              },
              difficulty: {
                type: Type.STRING,
                enum: ["beginner", "intermediate", "advanced"],
                description: "Difficulty level"
              },
              title: { type: Type.STRING, description: "Exercise title" },
              objective: { type: Type.STRING, description: "Learning objective" },
              instructions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Step-by-step instructions",
                minItems: 2
              },
              examples: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: "Example title" },
                    content: { type: Type.STRING, description: "Example content" },
                    type: {
                      type: Type.STRING,
                      enum: ["text", "code", "diagram", "table"],
                      description: "Content type"
                    }
                  }
                },
                description: "Examples with title and content",
                minItems: 1
              },
              fillableElements: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "Element ID" },
                    type: {
                      type: Type.STRING,
                      enum: ["table", "list", "schedule", "form", "matrix"],
                      description: "Element type"
                    },
                    data: {
                      type: Type.OBJECT,
                      properties: {
                        rows: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                          },
                          description: "Table rows data"
                        },
                        items: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                          description: "List items data"
                        },
                        schedule: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                          },
                          description: "Schedule data"
                        },
                        fieldList: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                          description: "Form field names"
                        },
                        fields: {
                          type: Type.OBJECT,
                          properties: {
                            _default: { type: Type.STRING, description: "Default field" }
                          },
                          additionalProperties: { type: Type.STRING },
                          description: "Form field values"
                        }
                      },
                      description: "Element data structure"
                    }
                  }
                },
                description: "Fillable elements for interactive exercises"
              },
              skills: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Skills being developed",
                minItems: 1
              },
              estimatedTime: { type: Type.STRING, description: "Estimated completion time" }
            },
            required: ["id", "type", "difficulty", "title", "objective", "instructions", "examples", "skills"]
          },
          description: "List of exercises",
          minItems: totalExercises
        }
      },
      required: ["exercises"]
    };

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: exercisesSchema,
      }
    });

    const data = JSON.parse(response.text.trim());
    return data.exercises || [];
  }

  protected async validateAndImproveExercises(exercises: any[], documentText: string, locale: 'en' | 'vi'): Promise<any[]> {
    // Quality validation and improvement
    const validatedExercises = exercises.map(exercise => ({
      ...exercise,
      id: exercise.id || `exercise-${Math.random().toString(36).substr(2, 9)}`,
      instructions: this.ensureMinimumInstructions(exercise.instructions),
      examples: this.ensureMinimumExamples(exercise.examples),
      skills: this.extractSkillsFromDocument(exercise, documentText),
      estimatedTime: exercise.estimatedTime || this.estimateTime(exercise)
    }));

    return validatedExercises;
  }

  protected async enhanceFillableExercises(exercises: any[], documentText: string, locale: 'en' | 'vi'): Promise<any[]> {
    const enhancedExercises = await Promise.all(
      exercises.map(async (exercise) => {
        if (exercise.type === 'fillable') {
          try {
            // Generate smart fillable elements based on exercise context
            const fillableElements = await this.generateSmartFillableElements(
              documentText,
              exercise.objective || exercise.title,
              locale
            );

            return {
              ...exercise,
              fillableElements: fillableElements.map(element => ({
                id: element.id || `element-${Math.random().toString(36).substr(2, 9)}`,
                type: element.type,
                data: element.data || {}
              }))
            };
          } catch (error) {
            console.warn(`Failed to generate fillable elements for ${exercise.title}:`, error);
            // Fallback to mock data
            return {
              ...exercise,
              fillableElements: [this.generateMockFillableElement(exercise.objective || exercise.title, locale)]
            };
          }
        }
        return exercise;
      })
    );

    return enhancedExercises;
  }

  protected async performFinalQualityCheck(exercises: any[], documentText: string): Promise<any[]> {
    // Final validation to ensure all exercises meet quality standards
    return exercises.filter(exercise => {
      // Basic quality checks
      const hasValidTitle = exercise.title && exercise.title.length > 5;
      const hasValidInstructions = exercise.instructions && exercise.instructions.length >= 2;
      const hasValidExamples = exercise.examples && exercise.examples.length > 0;
      const hasValidSkills = exercise.skills && exercise.skills.length > 0;

      return hasValidTitle && hasValidInstructions && hasValidExamples && hasValidSkills;
    });
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

  protected extractSkillsFromDocument(exercise: any, documentText: string): string[] {
    // Extract relevant skills based on exercise type and document content
    const defaultSkills = {
      practice: ['Practical application', 'Hands-on skills'],
      simulation: ['Decision making', 'Problem solving'],
      analysis: ['Critical thinking', 'Data analysis'],
      application: ['Implementation', 'Project management'],
      fillable: ['Organization', 'Attention to detail']
    };

    const exerciseTypeSkills = defaultSkills[exercise.type] || ['General skills'];

    // Add context-specific skills based on document content
    const contextSkills = this.extractContextSkills(documentText, exercise);

    return [...exerciseTypeSkills, ...contextSkills].slice(0, 5); // Limit to 5 skills
  }

  protected extractContextSkills(documentText: string, exercise: any): string[] {
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

    return skills;
  }

  protected estimateTime(exercise: any): string {
    // Estimate time based on exercise type and complexity
    const baseTimes = {
      practice: '15-20 minutes',
      simulation: '25-35 minutes',
      analysis: '20-30 minutes',
      application: '45-60 minutes',
      fillable: '10-15 minutes'
    };

    return baseTimes[exercise.type] || '20-30 minutes';
  }

  protected async generateSmartFillableElements(
    documentText: string,
    exerciseContext: string,
    locale: 'en' | 'vi'
  ): Promise<any[]> {
    // Analyze document and exercise context to determine best fillable type
    const suggestedType = this.suggestFillableType(documentText, exerciseContext);

    const templateVariables = {
      exerciseContext,
      documentText,
      language: locale === 'vi' ? 'Vietnamese' : 'English'
    };

    const prompt = this.promptTemplate.getTemplate('fillable-element', templateVariables);

    const elementSchema = {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          enum: Object.keys(FILLABLE_TYPES),
          description: "Type of fillable element"
        },
        data: {
          type: Type.OBJECT,
          properties: {
            rows: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              description: "Table rows data"
            },
            items: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List items data"
            },
            schedule: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              description: "Schedule data"
            },
            fieldList: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Form field names"
            },
            fields: {
              type: Type.OBJECT,
              description: "Form field values"
            }
          },
          description: "Data structure for the element"
        }
      },
      required: ["type", "data"]
    };

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: elementSchema,
        }
      });

      const element = JSON.parse(response.text.trim());
      return [{
        id: `smart-${Math.random().toString(36).substr(2, 9)}`,
        ...element
      }];
    } catch (error) {
      console.warn("Smart fillable generation failed, using fallback:", error);
      return [this.generateContextualFillableElement(suggestedType, exerciseContext)];
    }
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

  protected generateContextualFillableElement(type: string, context: string): any {
    if (type === 'table') {
      return this.generateSmartTableElement(context);
    }

    const fillableType = FILLABLE_TYPES[type as keyof typeof FILLABLE_TYPES] || FILLABLE_TYPES.table;

    return {
      id: `contextual-${Math.random().toString(36).substr(2, 9)}`,
      type: fillableType.structure.type,
      data: this.customizeFillableData(fillableType.structure.data, context)
    };
  }

  protected generateSmartTableElement(context: string): any {
    // Analyze context to determine the best table template
    const lowerContext = context.toLowerCase();
    const tableTemplates = FILLABLE_TYPES.table.templates;

    // Find the most appropriate template based on context keywords
    let selectedTemplate = tableTemplates.generic;

    if (lowerContext.includes('scrum') || lowerContext.includes('sprint') || lowerContext.includes('agile')) {
      selectedTemplate = tableTemplates.scrum;
    } else if (lowerContext.includes('project') || lowerContext.includes('planning') || lowerContext.includes('milestone')) {
      selectedTemplate = tableTemplates.project;
    } else if (lowerContext.includes('learning') || lowerContext.includes('study') || lowerContext.includes('concept')) {
      selectedTemplate = tableTemplates.learning;
    } else if (lowerContext.includes('evaluation') || lowerContext.includes('assessment') || lowerContext.includes('score')) {
      selectedTemplate = tableTemplates.evaluation;
    } else if (lowerContext.includes('research') || lowerContext.includes('methodology') || lowerContext.includes('finding')) {
      selectedTemplate = tableTemplates.research;
    } else if (lowerContext.includes('analysis') || lowerContext.includes('metric') || lowerContext.includes('gap')) {
      selectedTemplate = tableTemplates.analysis;
    } else if (lowerContext.includes('comparison') || lowerContext.includes('criteria') || lowerContext.includes('option')) {
      selectedTemplate = tableTemplates.comparison;
    } else if (lowerContext.includes('tracking') || lowerContext.includes('progress') || lowerContext.includes('challenge')) {
      selectedTemplate = tableTemplates.tracking;
    } else if (lowerContext.includes('planning') || lowerContext.includes('task') || lowerContext.includes('priority')) {
      selectedTemplate = tableTemplates.planning;
    }

    // Create table structure with selected template
    const headers = selectedTemplate.headers;
    const sampleRow = selectedTemplate.sampleData;

    // Generate 3-4 rows for the table
    const rows = [headers];

    // Add sample data rows with some empty cells for user input
    for (let i = 0; i < 3; i++) {
      const row = sampleRow.map(cell => {
        // Randomly leave some cells empty for user input (30% chance)
        return Math.random() < 0.3 ? '' : cell;
      });
      rows.push(row);
    }

    // Add one completely empty row for user to fill
    const emptyRow = new Array(headers.length).fill('');
    rows.push(emptyRow);

    return {
      id: `smart-table-${Math.random().toString(36).substr(2, 9)}`,
      type: 'table',
      data: {
        rows: rows,
        template: selectedTemplate // Store template info for reference
      }
    };
  }

  protected customizeFillableData(baseData: any, context: string): any {
    // Customize the fillable data based on context
    const customized = JSON.parse(JSON.stringify(baseData));
    const lowerContext = context.toLowerCase();

    if (lowerContext.includes('schedule') || lowerContext.includes('timeline')) {
      if (customized.rows) {
        customized.rows[0] = ['Time', 'Activity', 'Notes'];
      }
    }

    if (lowerContext.includes('comparison') || lowerContext.includes('analysis')) {
      if (customized.rows) {
        customized.rows[0] = ['Criteria', 'Option A', 'Option B', 'Recommendation'];
      }
    }

    return customized;
  }

  protected generateMockFillableElement(context: string, locale: 'en' | 'vi'): any {
    // Generate contextual mock data based on exercise context
    const lowerContext = context.toLowerCase();

    if (lowerContext.includes('scrum') || lowerContext.includes('sprint')) {
      return {
        id: `mock-scrum-${Math.random().toString(36).substr(2, 9)}`,
        type: 'table',
        data: {
          rows: [
            ['Sprint Goal', 'User Stories', 'Acceptance Criteria', 'Status'],
            ['', '', '', ''],
            ['', '', '', '']
          ]
        }
      };
    }

    if (lowerContext.includes('planning') || lowerContext.includes('project')) {
      return {
        id: `mock-planning-${Math.random().toString(36).substr(2, 9)}`,
        type: 'table',
        data: {
          rows: [
            ['Task', 'Priority', 'Estimated Hours', 'Status'],
            ['', '', '', ''],
            ['', '', '', '']
          ]
        }
      };
    }

    // Default fillable element
    return {
      id: `mock-default-${Math.random().toString(36).substr(2, 9)}`,
      type: 'table',
      data: {
        rows: [
          ['Item', 'Description', 'Status'],
          ['', '', ''],
          ['', '', '']
        ]
      }
    };
  }

  async generateFillableElements(documentText: string, exerciseContext: string, locale: 'en' | 'vi', settings?: AISettings): Promise<any[]> {
    const languageInstruction = locale === 'vi' ? 'Content in Vietnamese.' : 'Content in English.';

    const elementSchema = {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          enum: ["table", "list", "schedule", "form"],
          description: "Type of fillable element"
        },
        data: {
          type: Type.OBJECT,
          description: "Data structure for the element"
        }
      },
      required: ["type", "data"]
    };

    const prompt = `Generate a fillable element based on the document and exercise context. ${languageInstruction}

// Exercise Context: ${exerciseContext}
// Document: ${documentText}

// Generate one relevant fillable element that matches the exercise. Use structures like:

For table: { "type": "table", "data": { "rows": [["Header1", "Header2"], ["", ""], ["", ""]] } }
For list: { "type": "list", "data": { "items": ["Item1", "", "", ""] } }
For schedule: { "type": "schedule", "data": { "schedule": [["Time", "Activity"], ["9:00", ""], ["10:00", ""]] } }
For form: { "type": "form", "data": { "fieldList": ["Field1", "Field2"], "fields": {} } }

Make it relevant to the exercise and document content.`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: elementSchema,
        }
      });

      const element = JSON.parse(response.text.trim());
      return [{
        id: `aigenerated-${Math.random().toString(36).substr(2, 9)}`,
        ...element
      }];
    } catch (error) {
      console.error("Gemini fillable element generation error:", error);
      // Fallback to simple table
      return [{
        id: `fallback-${Math.random().toString(36).substr(2, 9)}`,
        type: 'table',
        data: {
          rows: [
            ['Field', 'Value'],
            ['', ''],
            ['', '']
          ]
        }
      }];
    }
  }

  async generateDocumentTips(documentText: string, analysis: Omit<AnalysisResult, 'tips'>, locale: 'en' | 'vi', settings?: AISettings): Promise<DocumentTip[]> {
    const languageInstruction = locale === 'vi' ? 'Tips in Vietnamese.' : 'Tips in English.';

    const tipsSchema = {
      type: Type.OBJECT,
      properties: {
        tips: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Unique identifier for the tip" },
              content: { type: Type.STRING, description: "The tip content" },
              type: {
                type: Type.STRING,
                enum: ["factual", "story", "example"],
                description: "Type of tip"
              },
              source: { type: Type.STRING, description: "Why this tip is factual" },
              importance: {
                type: Type.STRING,
                enum: ["high", "medium", "low"],
                description: "Importance level"
              },
              category: { type: Type.STRING, description: "Optional category like historical, technical, social, etc." }
            },
            required: ["id", "content", "type", "source", "importance"]
          },
          description: "List of document tips",
          minItems: 3,
          maxItems: 8
        }
      },
      required: ["tips"]
    };

    const prompt = `${languageInstruction}

Generate factual tips about the document content. Each tip must be based on real information and supported by evidence.

Document Summary: ${analysis.summary}
Topics: ${analysis.topics.join(', ')}
Sentiment: ${analysis.sentiment}

Document Content:
---
${documentText}
---

Rules for tips:
1. Factual tips must draw from real historical events, scientific facts, or documented knowledge
2. Story tips should reference real stories from history, biographies, or actual case studies
3. Example tips should provide real-world examples that actually happened or are established practices
4. Each tip must have a "source" explaining why it's factual (e.g., "Based on historical data from 1929 crash", "From Newton's laws of motion", "Documented in the author's professional experience")
5. Only create tips that derive from verifiable information, not opinions
6. Tips should be interesting and revealing insights about the document content`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: tipsSchema,
        }
      });

      const data = JSON.parse(response.text.trim()) as { tips: DocumentTip[] };

      // Validate and enhance tips
      const validatedTips = data.tips.map(tip => ({
        ...tip,
        id: tip.id || `tip-${Math.random().toString(36).substr(2, 9)}`,
        importance: tip.importance || 'medium',
        type: tip.type || 'factual',
        source: tip.source || 'Based on document analysis',
        category: tip.category || this.inferCategoryFromContent(tip.content)
      }));

      return validatedTips;
    } catch (error) {
      console.error("Gemini tips generation error:", error);
      // Fallback tips based on document analysis
      return this.generateFallbackTips(analysis, locale);
    }
  }

  protected inferCategoryFromContent(content: string): string {
    const lowerContent = content.toLowerCase();

    if (lowerContent.includes('history') || lowerContent.includes('past') || /19\d{2}|20\d{2}/.test(lowerContent)) {
      return 'historical';
    }
    if (lowerContent.includes('technology') || lowerContent.includes('science') || lowerContent.includes('engineering')) {
      return 'technical';
    }
    if (lowerContent.includes('society') || lowerContent.includes('culture') || lowerContent.includes('people')) {
      return 'social';
    }
    if (lowerContent.includes('business') || lowerContent.includes('economy') || lowerContent.includes('market')) {
      return 'economic';
    }
    if (lowerContent.includes('education') || lowerContent.includes('learning') || lowerContent.includes('study')) {
      return 'educational';
    }

    return 'general';
  }

  protected generateFallbackTips(analysis: Omit<AnalysisResult, 'tips'>, locale: 'en' | 'vi'): DocumentTip[] {
    const isVietnamese = locale === 'vi';
    const topicBasedTip = isVietnamese
      ? `Chủ đề chính "${analysis.topics[0] || 'được phân tích'}" có thể được áp dụng trong nhiều ngữ cảnh thực tế khác nhau.`
      : `The main topic "${analysis.topics[0] || 'being analyzed'}" can be applied in various real-world contexts.`;

    const sentimentTip = isVietnamese
      ? `Tâm trạng chung của tài liệu (${analysis.sentiment}) phản ánh cách tiếp cận thực tế và cân nhắc kỹ lưỡng.`
      : `The document's overall ${analysis.sentiment.toLowerCase()} sentiment reflects a practical and well-considered approach.`;

    const structureTip = isVietnamese
      ? 'Cấu trúc logic của tài liệu này tuân theo các nguyên tắc viết học thuật chuẩn quốc tế.'
      : 'This document follows standard international academic writing principles in its logical structure.';

    return [
      {
        id: `fallback-tip-1-${Math.random().toString(36).substr(2, 9)}`,
        content: topicBasedTip,
        type: 'factual',
        source: 'Based on document analysis and topic extraction',
        importance: 'high',
        category: 'general'
      },
      {
        id: `fallback-tip-2-${Math.random().toString(36).substr(2, 9)}`,
        content: sentimentTip,
        type: 'factual',
        source: 'Based on sentiment analysis of document content',
        importance: 'medium',
        category: 'general'
      },
      {
        id: `fallback-tip-3-${Math.random().toString(36).substr(2, 9)}`,
        content: structureTip,
        type: 'factual',
        source: 'Based on established academic writing standards',
        importance: 'medium',
        category: 'educational'
      }
    ];
  }

  async gradeExercise(
    documentText: string,
    exercise: Exercise,
    submission: any,
    locale: 'en' | 'vi'
  ): Promise<any> {
    const languageInstruction = locale === 'vi' ? 'Grade and provide feedback in Vietnamese.' : 'Grade and provide feedback in English.';

    const gradingSchema = {
      type: Type.OBJECT,
      properties: {
        overallScore: { type: Type.NUMBER, description: "Overall score from 0-10." },
        maxScore: { type: Type.NUMBER, description: "Maximum possible score, usually 10." },
        criteriaGrades: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              criterion: { type: Type.STRING, description: "Grading criterion name" },
              score: { type: Type.NUMBER, description: "Score for this criterion" },
              maxScore: { type: Type.NUMBER, description: "Maximum score for this criterion" },
              feedback: { type: Type.STRING, description: "Feedback for this criterion" },
              weight: { type: Type.NUMBER, description: "Weight of this criterion in percentage" }
            },
            required: ["criterion", "score", "maxScore", "feedback", "weight"]
          },
          description: "Detailed criteria-based grading"
        },
        feedback: { type: Type.STRING, description: "Overall constructive feedback" },
        strengths: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of strengths in the submission"
        },
        improvements: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of areas for improvement"
        }
      },
      required: ["overallScore", "maxScore", "criteriaGrades", "feedback", "strengths", "improvements"]
    };

    // Create grading criteria based on exercise type
    const criteria = this.generateGradingCriteria(exercise);

    const prompt = `Grade this exercise submission. ${languageInstruction}

Exercise Details:
- Type: ${exercise.type}
- Title: ${exercise.title}
- Objective: ${exercise.objective}
- Instructions: ${exercise.instructions.join(', ')}

User Submission:
${JSON.stringify(submission.userAnswers, null, 2)}

Document Context:
${documentText}

Grading Criteria:
${criteria.map(c => `- ${c.name} (${c.weight}%): ${c.description}`).join('\n')}

Provide detailed, constructive feedback that helps the student improve.`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: gradingSchema,
        }
      });

      const grade = JSON.parse(response.text.trim());

      // Ensure criteria grades match our expected format
      const validatedGrade = {
        id: `grade-${Date.now()}`,
        submissionId: submission.id,
        exerciseId: exercise.id,
        overallScore: grade.overallScore,
        maxScore: grade.maxScore,
        criteriaGrades: grade.criteriaGrades.map((cg: any) => ({
          criterion: cg.criterion,
          score: cg.score,
          maxScore: cg.maxScore,
          feedback: cg.feedback,
          weight: cg.weight
        })),
        feedback: grade.feedback,
        strengths: grade.strengths,
        improvements: grade.improvements,
        gradedAt: new Date().toISOString(),
        gradedBy: 'ai' as const
      };

      return validatedGrade;
    } catch (error) {
      console.error("Gemini exercise grading error:", error);
      // Return a basic fallback grade
      return {
        id: `fallback-grade-${Date.now()}`,
        submissionId: submission.id,
        exerciseId: exercise.id,
        overallScore: 5,
        maxScore: 10,
        criteriaGrades: [
          {
            criterion: 'Overall Quality',
            score: 5,
            maxScore: 10,
            feedback: 'Grade could not be computed due to technical issues.',
            weight: 100
          }
        ],
        feedback: 'Unable to provide detailed feedback at this time.',
        strengths: ['Submission received'],
        improvements: ['Please try again later'],
        gradedAt: new Date().toISOString(),
        gradedBy: 'ai' as const
      };
    }
  }

  private generateGradingCriteria(exercise: Exercise): Array<{name: string, description: string, weight: number}> {
    const baseCriteria = [
      { name: 'Understanding', description: 'Demonstrates clear understanding of the exercise requirements', weight: 30 },
      { name: 'Completeness', description: 'Provides complete and thorough responses', weight: 25 },
      { name: 'Accuracy', description: 'Information is accurate and relevant', weight: 25 },
      { name: 'Clarity', description: 'Response is clear and well-structured', weight: 20 }
    ];

    // Add exercise-type specific criteria
    switch (exercise.type) {
      case 'practice':
        return [
          ...baseCriteria,
          { name: 'Practical Application', description: 'Effectively applies concepts in practice', weight: 20 }
        ];
      case 'analysis':
        return [
          ...baseCriteria,
          { name: 'Critical Thinking', description: 'Shows analytical depth and insight', weight: 20 }
        ];
      case 'application':
        return [
          ...baseCriteria,
          { name: 'Implementation', description: 'Demonstrates practical implementation skills', weight: 20 }
        ];
      case 'fillable':
        return [
          ...baseCriteria,
          { name: 'Organization', description: 'Information is well-organized and structured', weight: 20 }
        ];
      default:
        return baseCriteria;
    }
  }

  // CV Interview methods implementation
  async generateInterviewQuestions(prompt: string, settings?: AISettings): Promise<string> {
    const languageInstruction = settings?.languageStyle === 'formal' ? 'Use formal language.' : 'Use conversational language.';

    const questionsSchema = {
      type: Type.OBJECT,
      properties: {
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING, description: "The interview question" },
              type: {
                type: Type.STRING,
                enum: ["technical", "behavioral", "situational", "experience"],
                description: "Type of question"
              },
              timeLimit: { type: Type.INTEGER, description: "Time limit in seconds" },
              category: { type: Type.STRING, description: "Question category" },
              difficulty: {
                type: Type.STRING,
                enum: ["easy", "medium", "hard"],
                description: "Difficulty level"
              }
            },
            required: ["question", "type", "timeLimit"]
          },
          description: "List of interview questions",
          minItems: 5,
          maxItems: 10
        }
      },
      required: ["questions"]
    };

    const fullPrompt = `${languageInstruction}

${prompt}

Generate 6-8 interview questions in JSON format. Make them specific and relevant to the provided CV content and target position.

IMPORTANT: Return ONLY valid JSON without any additional text or explanation.`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: questionsSchema,
        }
      });

      const result = response.text.trim();

      // Validate that we got proper JSON
      try {
        JSON.parse(result);
      } catch (parseError) {
        console.error("Invalid JSON response from Gemini:", result);
        throw new Error("Invalid response format from AI provider");
      }

      return result;
    } catch (error) {
      console.error("Gemini interview questions generation error:", error);
      throw new Error("Failed to generate interview questions with Gemini.");
    }
  }

  async evaluateInterviewAnswer(prompt: string, settings?: AISettings): Promise<string> {
    const languageInstruction = settings?.languageStyle === 'formal' ? 'Use formal language.' : 'Use conversational language.';

    const evaluationSchema = {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.INTEGER, description: "Score from 0-100" },
        feedback: { type: Type.STRING, description: "Detailed feedback on the answer" },
        strengths: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of strengths in the answer"
        },
        improvements: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Areas for improvement"
        }
      },
      required: ["score", "feedback", "strengths", "improvements"]
    };

    const fullPrompt = `${languageInstruction}

${prompt}

Provide a detailed evaluation in JSON format.`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: evaluationSchema,
        }
      });

      return response.text.trim();
    } catch (error) {
      console.error("Gemini interview answer evaluation error:", error);
      throw new Error("Failed to evaluate interview answer with Gemini.");
    }
  }

  async generateInterviewFeedback(prompt: string, settings?: AISettings): Promise<string> {
    const languageInstruction = settings?.languageStyle === 'formal' ? 'Use formal language.' : 'Use conversational language.';

    const feedbackSchema = {
      type: Type.OBJECT,
      properties: {
        overallScore: { type: Type.INTEGER, description: "Overall score from 0-100" },
        positionFit: {
          type: Type.STRING,
          enum: ["excellent", "good", "fair", "poor"],
          description: "How well the candidate fits the position"
        },
        strengths: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Candidate's strengths"
        },
        weaknesses: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Areas for improvement"
        },
        recommendations: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Specific recommendations"
        },
        summary: { type: Type.STRING, description: "Overall assessment summary" },
        detailedAnalysis: {
          type: Type.OBJECT,
          properties: {
            technicalSkills: { type: Type.INTEGER, description: "Technical skills score 0-100" },
            communication: { type: Type.INTEGER, description: "Communication score 0-100" },
            problemSolving: { type: Type.INTEGER, description: "Problem solving score 0-100" },
            experience: { type: Type.INTEGER, description: "Experience score 0-100" },
            culturalFit: { type: Type.INTEGER, description: "Cultural fit score 0-100" }
          },
          description: "Detailed analysis scores"
        }
      },
      required: ["overallScore", "positionFit", "strengths", "weaknesses", "recommendations", "summary"]
    };

    const fullPrompt = `${languageInstruction}

${prompt}

Provide comprehensive feedback in JSON format.`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: feedbackSchema,
        }
      });

      return response.text.trim();
    } catch (error) {
      console.error("Gemini interview feedback generation error:", error);
      throw new Error("Failed to generate interview feedback with Gemini.");
    }
  }

  // Preparation methods implementation
  async generatePreparationResources(prompt: string, settings?: AISettings): Promise<string> {
    const languageInstruction = settings?.languageStyle === 'formal' ? 'Use formal language.' : 'Use conversational language.';

    const resourcesSchema = {
      type: Type.OBJECT,
      properties: {
        resources: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Resource title" },
              type: {
                type: Type.STRING,
                enum: ["article", "video", "guide", "tips", "checklist"],
                description: "Type of resource"
              },
              content: { type: Type.STRING, description: "Resource content or description" },
              category: {
                type: Type.STRING,
                enum: ["technical", "behavioral", "general", "industry-specific"],
                description: "Resource category"
              },
              difficulty: {
                type: Type.STRING,
                enum: ["beginner", "intermediate", "advanced"],
                description: "Difficulty level"
              }
            },
            required: ["title", "type", "content", "category", "difficulty"]
          },
          description: "List of preparation resources",
          minItems: 3,
          maxItems: 8
        }
      },
      required: ["resources"]
    };

    const fullPrompt = `${languageInstruction}

${prompt}

Generate preparation resources in JSON format with specific URLs to real learning resources when possible.`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: resourcesSchema,
        }
      });

      return response.text.trim();
    } catch (error) {
      console.error("Gemini preparation resources generation error:", error);
      throw new Error("Failed to generate preparation resources with Gemini.");
    }
  }

  async generatePracticeQuestions(prompt: string, settings?: AISettings): Promise<string> {
    const languageInstruction = settings?.languageStyle === 'formal' ? 'Use formal language.' : 'Use conversational language.';

    const questionsSchema = {
      type: Type.OBJECT,
      properties: {
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING, description: "The practice question" },
              type: {
                type: Type.STRING,
                enum: ["technical", "behavioral", "situational", "experience"],
                description: "Type of question"
              },
              category: { type: Type.STRING, description: "Question category" },
              sampleAnswer: { type: Type.STRING, description: "Sample answer for reference" },
              keyPoints: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Key points to cover in answer"
              },
              difficulty: {
                type: Type.STRING,
                enum: ["easy", "medium", "hard"],
                description: "Difficulty level"
              }
            },
            required: ["question", "type", "category", "difficulty"]
          },
          description: "List of practice questions",
          minItems: 5,
          maxItems: 10
        }
      },
      required: ["questions"]
    };

    const fullPrompt = `${languageInstruction}

${prompt}

Generate practice questions in JSON format.`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: questionsSchema,
        }
      });

      return response.text.trim();
    } catch (error) {
      console.error("Gemini practice questions generation error:", error);
      throw new Error("Failed to generate practice questions with Gemini.");
    }
  }

  async evaluatePracticeAnswer(prompt: string, settings?: AISettings): Promise<string> {
    const languageInstruction = settings?.languageStyle === 'formal' ? 'Use formal language.' : 'Use conversational language.';

    const evaluationSchema = {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.INTEGER, description: "Score from 0-100" },
        feedback: { type: Type.STRING, description: "Detailed feedback on the answer" },
        timeSpent: { type: Type.INTEGER, description: "Time spent in seconds" }
      },
      required: ["score", "feedback", "timeSpent"]
    };

    const fullPrompt = `${languageInstruction}

${prompt}

Provide evaluation in JSON format.`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: evaluationSchema,
        }
      });

      return response.text.trim();
    } catch (error) {
      console.error("Gemini practice answer evaluation error:", error);
      throw new Error("Failed to evaluate practice answer with Gemini.");
    }
  }
}
