import { GoogleGenAI, Type, Chat } from "@google/genai";
import { AnalysisResult, QuizQuestion, GradedWrittenAnswer, MultipleChoiceQuestion, WrittenAnswerQuestion, UserSettings } from '../types';
import { cacheService } from './cacheService';

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

if (!import.meta.env.VITE_API_KEY) {
  throw new Error("API_KEY environment variable not set. Please add `VITE_API_KEY=YOUR_API_KEY` to the .env file.");
}

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "A summary of the document."
    },
    topics: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of important topics or concepts from the document."
    },
    entities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING, description: "The named entity text." },
          type: { type: Type.STRING, description: "The type of entity (e.g., PERSON, ORGANIZATION, LOCATION, DATE)." }
        },
        required: ["text", "type"]
      },
      description: "A list of key named entities found in the document."
    },
    sentiment: {
      type: Type.STRING,
      description: "The overall sentiment of the document. Must be one of: Positive, Negative, or Neutral."
    }
  },
  required: ["summary", "topics", "entities", "sentiment"]
};

export async function analyzeDocument(text: string, settings?: UserSettings): Promise<AnalysisResult> {
  // Check cache first - include settings in cache key for different configurations
  const cacheKey = cacheService.generateKey(text, 'analysis', settings);
  const cachedResult = cacheService.get(cacheKey);
  if (cachedResult) {
    console.log('Using cached analysis result');
    return cachedResult as AnalysisResult;
  }

  // Build prompt based on settings
  const aiSettings = settings?.ai;

  let prompt = 'Analyze the following document and provide the results in a JSON object. The analysis should be in English.\n\n';

  if (aiSettings) {
    // Add custom prompt prefix if provided
    if (aiSettings.aiPromptPrefix.trim()) {
      prompt += `${aiSettings.aiPromptPrefix.trim()}\n\n`;
    }

    // Add language style instruction
    prompt += `${getLanguageStyleInstruction(aiSettings.languageStyle)}\n\n`;

    // Add summary length instruction
    prompt += `${getSummaryLengthInstruction(aiSettings.summaryLength)}\n\n`;

    // Add topics count instruction
    prompt += `${getTopicsCountInstruction(aiSettings.maxTopicsCount)}\n\n`;
  } else {
    // Default behavior when no settings provided
    prompt += 'Provide a concise, 3-5 sentence summary.\n\n';
    prompt += 'Extract the top 5-10 most important topics or concepts from the document.\n\n';
  }

  prompt += `Document:\n---\n${text}\n---\n`;

  try {
    const result = await retryWithBackoff(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: analysisSchema,
        }
      });

      const jsonString = response.text.trim();
      return JSON.parse(jsonString) as AnalysisResult;
    });

    // Cache the result for 1 hour (3600 seconds)
    cacheService.set(cacheKey, result, 3600);

    return result;

  } catch (error) {
    console.error("Gemini API call failed after retries:", error);
    throw new Error("Failed to analyze document with the AI model. Check the console for more details.");
  }
}

export function createChat(documentText: string, locale: 'en' | 'vi'): Chat {
  const languageInstruction = locale === 'vi' ? 'You must respond in Vietnamese.' : 'You must respond in English.';
  const notFoundMessage = locale === 'vi' ? 'Tôi không thể tìm thấy câu trả lời trong tài liệu được cung cấp.' : 'I cannot find the answer in the provided document.';

  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
        systemInstruction: `You are an intelligent Q&A assistant. Your task is to answer questions based *only* on the provided document context. Do not use any external knowledge. If the answer cannot be found within the document, you must respond with "${notFoundMessage}". ${languageInstruction}

DOCUMENT CONTEXT:
---
${documentText}
---`,
    }
  });
  return chat;
}

const multipleChoiceQuestionSchema = {
    type: Type.OBJECT,
    properties: {
        question: {
            type: Type.STRING,
            description: "The multiple-choice question."
        },
        options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of 4 possible answers."
        },
        correctAnswerIndex: {
            type: Type.INTEGER,
            description: "The 0-based index of the correct answer in the 'options' array."
        },
        explanation: {
            type: Type.STRING,
            description: "A brief explanation of why the correct answer is correct, referencing the document text."
        }
    },
    required: ["question", "options", "correctAnswerIndex", "explanation"]
};

const writtenQuestionSchema = {
    type: Type.OBJECT,
    properties: {
        question: {
            type: Type.STRING,
            description: "An open-ended question that requires a written answer."
        }
    },
    required: ["question"]
}

const quizSchema = {
    type: Type.OBJECT,
    properties: {
        multipleChoiceQuestions: {
            type: Type.ARRAY,
            description: "A list of multiple choice questions based on the document.",
            items: multipleChoiceQuestionSchema,
        },
        writtenQuestions: {
            type: Type.ARRAY,
            description: "A list of open-ended, written-answer questions based on the document.",
            items: writtenQuestionSchema
        }
    },
    required: ["multipleChoiceQuestions", "writtenQuestions"]
};

// Combined schema for batch analysis and quiz generation
const analysisWithQuizSchema = {
    type: Type.OBJECT,
    properties: {
        analysis: analysisSchema,
        quiz: quizSchema
    },
    required: ["analysis", "quiz"]
};


export async function generateQuiz(text: string, locale: 'en' | 'vi', mcCount: number, writtenCount: number): Promise<QuizQuestion[]> {
  // Check cache first with locale and question counts
  const cacheKey = cacheService.generateKey(text, 'quiz', { locale, mcCount, writtenCount });
  const cachedResult = cacheService.get(cacheKey);
  if (cachedResult) {
    console.log('Using cached quiz result');
    return cachedResult as QuizQuestion[];
  }

  const languageInstruction = locale === 'vi' ? 'The quiz questions, options, and explanations must be in Vietnamese.' : 'The quiz questions, options, and explanations must be in English.';

  const prompt = `Based on the following document, generate a comprehensive quiz to test a user's comprehension.
The quiz should contain exactly ${mcCount} multiple-choice questions and ${writtenCount} open-ended (written answer) questions.
Ensure the questions cover different, important aspects of the document. ${languageInstruction}

Document:
---
${text}
---
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: quizSchema,
      }
    });

    const jsonString = response.text.trim();
    const parsed = JSON.parse(jsonString);

    const multipleChoice: MultipleChoiceQuestion[] = (parsed.multipleChoiceQuestions || []).map((q: any) => ({ ...q, type: 'multiple-choice' }));
    const written: WrittenAnswerQuestion[] = (parsed.writtenQuestions || []).map((q: any) => ({ ...q, type: 'written' }));

    const result = [...multipleChoice, ...written];

    // Cache the result for 2 hours (7200 seconds) since quizes are more static
    cacheService.set(cacheKey, result, 7200);

    return result;

  } catch (error) {
    console.error("Gemini API call for quiz generation failed:", error);
    throw new Error("Failed to generate a quiz with the AI model. The model might have been unable to create questions for this text.");
  }
}

const gradingSchema = {
    type: Type.OBJECT,
    properties: {
        score: { type: Type.INTEGER, description: "A score from 0 to 5, where 5 is an excellent, comprehensive, and factually correct answer." },
        maxScore: { type: Type.INTEGER, description: "The maximum possible score, which is always 5." },
        feedback: { type: Type.STRING, description: "Constructive, concise feedback for the user, explaining the score and suggesting improvements. Base the grading strictly on the provided document context." }
    },
    required: ["score", "maxScore", "feedback"]
}

export async function gradeWrittenAnswer(documentText: string, question: string, userAnswer: string, locale: 'en' | 'vi'): Promise<GradedWrittenAnswer> {
    const languageInstruction = locale === 'vi' ? 'The feedback must be in Vietnamese.' : 'The feedback must be in English.';
    
    const prompt = `You are an AI teaching assistant. Your task is to grade a user's written answer based *only* on the provided document context.
    
    1.  Read the document context carefully.
    2.  Read the question.
    3.  Evaluate the user's answer for accuracy, completeness, and relevance as it pertains to the document.
    4.  Provide a score from 0 (poor) to 5 (excellent).
    5.  Provide brief, constructive feedback explaining why the user received that score. Do not provide a model answer, just feedback.
    6.  Your entire response must be in the specified JSON format.
    7.  ${languageInstruction}

    DOCUMENT CONTEXT:
    ---
    ${documentText}
    ---
    
    QUESTION:
    ---
    ${question}
    ---

    USER'S ANSWER:
    ---
    ${userAnswer}
    ---
    `;

    try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: gradingSchema,
          }
        });
    
        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as GradedWrittenAnswer;
    
      } catch (error) {
        console.error("Gemini API call for grading failed:", error);
        // Return a default error object so Promise.all doesn't fail completely
        return {
            score: 0,
            maxScore: 5,
            feedback: "Sorry, an error occurred while grading this answer."
        }
      }
}

// Batch analysis and quiz generation in one API call
export async function analyzeDocumentWithQuiz(text: string, locale: 'en' | 'vi' = 'en', mcCount: number = 5, writtenCount: number = 2): Promise<{analysis: AnalysisResult, quiz: QuizQuestion[]}> {
  // Check individual caches first
  const analysisKey = cacheService.generateKey(text, 'analysis');
  const quizKey = cacheService.generateKey(text, 'quiz', { locale, mcCount, writtenCount });

  const cachedAnalysis = cacheService.get(analysisKey) as AnalysisResult | null;
  const cachedQuiz = cacheService.get(quizKey) as QuizQuestion[] | null;

  // If both are cached, return them
  if (cachedAnalysis && cachedQuiz) {
    console.log('Using cached analysis and quiz results');
    return { analysis: cachedAnalysis, quiz: cachedQuiz };
  }

  const languageInstruction = locale === 'vi' ? 'The quiz questions, options, and explanations must be in Vietnamese.' : 'The quiz questions, options, and explanations must be in English.';

  const prompt = `Analyze the following document and generate a quiz. Provide both analysis results and quiz questions in a JSON object.

The quiz should contain exactly ${mcCount} multiple-choice questions and ${writtenCount} open-ended (written answer) questions.
${languageInstruction}

Document:
---
${text}
---
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisWithQuizSchema,
      }
    });

    const jsonString = response.text.trim();
    const parsed = JSON.parse(jsonString);

    const analysis = parsed.analysis as AnalysisResult;
    const multipleChoice: MultipleChoiceQuestion[] = (parsed.quiz.multipleChoiceQuestions || []).map((q: any) => ({ ...q, type: 'multiple-choice' }));
    const written: WrittenAnswerQuestion[] = (parsed.quiz.writtenQuestions || []).map((q: any) => ({ ...q, type: 'written' }));
    const quiz = [...multipleChoice, ...written];

    // Cache both results
    cacheService.set(analysisKey, analysis, 3600);
    cacheService.set(quizKey, quiz, 7200);

    return { analysis, quiz };

  } catch (error) {
    console.error("Batch API call failed:", error);
    throw new Error("Failed to analyze document and generate quiz. Check the console for more details.");
  }
}
