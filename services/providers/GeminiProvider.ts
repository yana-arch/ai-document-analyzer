import { GoogleGenAI, Type, Chat } from "@google/genai";
import { AnalysisResult, QuizQuestion, GradedWrittenAnswer, MultipleChoiceQuestion, WrittenAnswerQuestion, Exercise, AISettings } from '../../types';
import { BaseAIProvider } from './BaseAIProvider';

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

  constructor(apiKey: string) {
    super('Gemini', apiKey);
    this.ai = new GoogleGenAI({ apiKey });
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

  async createChat(documentText: string, locale: 'en' | 'vi'): Promise<Chat> {
    const languageInstruction = locale === 'vi' ? 'You must respond in Vietnamese.' : 'You must respond in English.';
    const notFoundMessage = locale === 'vi' ? 'Không thể tìm thấy câu trả lời.' : 'I cannot find the answer in the document.';

    const chat = this.ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `${languageInstruction}

You are an AI assistant. You must answer questions based only on the content of the following document.

If the question cannot be answered using the document, say: "${notFoundMessage}"

Document: ${documentText}`,
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

    const languageInstruction = locale === 'vi' ? 'Exercises in Vietnamese.' : 'Exercises in English.';

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
                description: "Step-by-step instructions"
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
                description: "Examples with title and content"
              },
              skills: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Skills being developed"
              },
              estimatedTime: { type: Type.STRING, description: "Estimated completion time" }
            },
            required: ["id", "type", "difficulty", "title", "objective", "instructions", "examples", "skills"]
          },
          description: "List of exercises"
        }
      },
      required: ["exercises"]
    };

    const prompt = `Generate exercises from this document. ${languageInstruction}

Generate exactly:
- ${exerciseCounts.practice} practice exercises
- ${exerciseCounts.simulation} simulation exercises
- ${exerciseCounts.analysis} analysis exercises
- ${exerciseCounts.application} application exercises
- ${exerciseCounts.fillable} fillable exercises (tables, forms, scheduling, product backlog creation)

Each exercise should include practical examples and clear instructions like mind maps, role-playing, gap-fill exercises, mini-projects, etc.

For fillable exercises, create interactive exercises where users fill information using these specific structures:

**Table Fillable Element Structure:**
{
  "type": "table",
  "data": {
    "rows": [["Row1Col1", "Row1Col2"], ["Row2Col1", "Row2Col2"], ["", ""]]  // Pre-filled or empty cells
  }
}

**List Fillable Element Structure:**
{
  "type": "list",
  "data": {
    "items": ["Item 1", "", "", ""]  // Pre-filled items or empty slots
  }
}

**Schedule Fillable Element Structure:**
{
  "type": "schedule",
  "data": {
    "schedule": [["Time", "Activity"], ["9:00", ""], ["10:00", ""], ["11:00", ""]]  // Time-based table
  }
}

**Form Fillable Element Structure:**
{
  "type": "form",
  "data": {
    "fieldList": ["Field 1", "Field 2", "Field 3"],  // Field names
    "fields": {}  // Leave empty for users to fill
  }
}

IMPORTANT: For fillable exercises, provide fillableElements as an array of objects with the above structures. Make sure the data matches exactly what the application expects.

Document: ${text}`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: exercisesSchema,
        }
      });

      const data = JSON.parse(response.text.trim());
      const result = data.exercises || [];
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Gemini exercises generation error:", error);
      throw new Error("Failed to generate exercises with Gemini.");
    }
  }
}
