import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002'}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.response?.status >= 500) {
      // Show user-friendly error message
      const message = 'Unable to connect to the database server. Please check your connection and try again.';
      if (typeof window !== 'undefined') {
        // Only show alert in browser environment
        alert(message);
      }
      console.error('Database connection error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Documents
export const saveDocument = async (fileName: string, documentText: string, analysis: any) => {
  try {
    const response = await api.post('/documents', { fileName, documentText, analysis });
    return response.data;
  } catch (error) {
    console.error('Error saving document:', error);
    throw error;
  }
};

export const getDocuments = async () => {
  try {
    const response = await api.get('/documents');
    return response.data;
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
};

// Interviews
export const saveInterview = async (interviewData: {
  cvContent: string;
  cvFileName?: string;
  targetPosition: string;
  interviewType: string;
  customPrompt?: string;
  questions: any[];
  answers: any[];
  overallScore?: number;
  feedback: any;
  completedAt?: string;
  status: string;
}) => {
  try {
    const response = await api.post('/interviews', interviewData);
    return response.data;
  } catch (error) {
    console.error('Error saving interview:', error);
    throw error;
  }
};

export const getInterviews = async () => {
  try {
    const response = await api.get('/interviews');
    return response.data;
  } catch (error) {
    console.error('Error fetching interviews:', error);
    throw error;
  }
};

// Questions
export const saveQuestion = async (questionData: {
  type: string;
  question: string;
  options?: any[];
  correctAnswerIndex?: number;
  explanation?: string;
  keyTopic?: string;
}) => {
  try {
    const response = await api.post('/questions', questionData);
    return response.data;
  } catch (error) {
    console.error('Error saving question:', error);
    throw error;
  }
};

export const getQuestions = async () => {
  try {
    const response = await api.get('/questions');
    return response.data;
  } catch (error) {
    console.error('Error fetching questions:', error);
    throw error;
  }
};

// Question Banks
export const saveQuestionBank = async (bankData: {
  name: string;
  description?: string;
  subject?: string;
  tags?: any[];
  questions: any[];
  isPublic?: boolean;
  usageCount?: number;
}) => {
  try {
    const response = await api.post('/question_banks', bankData);
    return response.data;
  } catch (error) {
    console.error('Error saving question bank:', error);
    throw error;
  }
};

export const getQuestionBanks = async () => {
  try {
    const response = await api.get('/question_banks');
    return response.data;
  } catch (error) {
    console.error('Error fetching question banks:', error);
    throw error;
  }
};

// Export functions for download
export const downloadDocument = (item: any) => {
  const data = {
    fileName: item.file_name,
    documentText: item.document_text,
    analysis: item.analysis,
    createdAt: item.created_at
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${item.file_name || 'document'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadInterview = (item: any) => {
  const data = {
    cvContent: item.cv_content,
    cvFileName: item.cv_file_name,
    targetPosition: item.target_position,
    interviewType: item.interview_type,
    customPrompt: item.custom_prompt,
    questions: item.questions,
    answers: item.answers,
    overallScore: item.overall_score,
    feedback: item.feedback,
    completedAt: item.completed_at,
    status: item.status,
    createdAt: item.created_at
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${item.cv_file_name || 'interview'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
