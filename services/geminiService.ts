import { GoogleGenAI, Type, Chat } from "@google/genai";
import { AnalysisResult, QuizQuestion, GradedWrittenAnswer, MultipleChoiceQuestion, WrittenAnswerQuestion } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set. Please add `API_KEY=YOUR_API_KEY` to the 'Run test' secret environments.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "A concise, 3-5 sentence summary of the document."
    },
    topics: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of the top 5-10 most important topics or concepts from the document."
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

export async function analyzeDocument(text: string): Promise<AnalysisResult> {
  const prompt = `Analyze the following document and provide the results in a JSON object. The analysis should be in English.

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
        responseSchema: analysisSchema,
      }
    });

    const jsonString = response.text.trim();
    return JSON.parse(jsonString) as AnalysisResult;

  } catch (error) {
    console.error("Gemini API call failed:", error);
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


export async function generateQuiz(text: string, locale: 'en' | 'vi', mcCount: number, writtenCount: number): Promise<QuizQuestion[]> {
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

    return [...multipleChoice, ...written];

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