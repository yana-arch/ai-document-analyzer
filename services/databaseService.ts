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
export const saveDocument = async (fileName: string, documentText: string, analysis: any, contentHash?: string) => {
  try {
    const response = await api.post('/documents', { fileName, documentText, analysis, contentHash });
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

// Utility function for content hashing
const hashContent = async (content: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Sync functions for local storage to database
export const syncLocalHistoryToDatabase = async (
  historyItems: any[],
  onProgress?: (completed: number, total: number, currentItem: string) => void
) => {
  const results = [];
  let completed = 0;
  const total = historyItems.length;

  for (const item of historyItems) {
    if (onProgress) {
      onProgress(completed, total, item.type === 'document' ? item.fileName : item.type === 'interview' ? item.interview.targetPosition : item.type);
    }

    if (item.type === 'document') {
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          // Check for duplicates using content hash
          const contentHash = await hashContent(item.documentText + JSON.stringify(item.analysis));
          const isDuplicate = await checkForDuplicatesByHash(contentHash);
          if (isDuplicate) {
            results.push({ type: 'document', fileName: item.fileName, success: false, error: 'Duplicate document' });
            break;
          }

          await saveDocument(item.fileName, item.documentText, item.analysis, contentHash);
          results.push({ type: 'document', fileName: item.fileName, success: true });
          break; // Success, exit retry loop
        } catch (error) {
          retryCount++;
          if (retryCount >= maxRetries) {
            console.error(`Failed to sync document ${item.fileName} after ${maxRetries} attempts:`, error);
            results.push({ type: 'document', fileName: item.fileName, success: false, error: error.message });
          } else {
            console.warn(`Retry ${retryCount}/${maxRetries} for document ${item.fileName}:`, error);
            // Wait with exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          }
        }
      }
    } else if (item.type === 'interview') {
        try {
          // Check for duplicates before saving
          const isDuplicate = await checkInterviewDuplicates(item.interview.targetPosition, item.interview.cvContent);
          if (isDuplicate) {
            results.push({ type: 'interview', targetPosition: item.interview.targetPosition, success: false, error: 'Duplicate interview' });
            continue;
          }

          await saveInterview({
            cvContent: item.interview.cvContent,
            cvFileName: item.interview.cvFileName,
            targetPosition: item.interview.targetPosition,
            interviewType: item.interview.interviewType,
            customPrompt: item.interview.customPrompt,
            questions: item.interview.questions,
            answers: item.interview.answers,
            overallScore: item.interview.feedback?.overallScore,
            feedback: item.interview.feedback,
            completedAt: item.interview.completedAt,
            status: item.interview.status
          });
          results.push({ type: 'interview', targetPosition: item.interview.targetPosition, success: true });
        } catch (error) {
          console.error(`Failed to sync interview ${item.interview.targetPosition}:`, error);
          results.push({ type: 'interview', targetPosition: item.interview.targetPosition, success: false, error: error.message });
        }
    } else if (item.type === 'question_bank') {
      try {
        const bank = item.bank;
        // Check for duplicates by name
        const existingBanks = await getQuestionBanks();
        const isDuplicate = existingBanks.some((existing: any) => existing.name === bank.name);
        if (isDuplicate) {
          results.push({ type: 'question_bank', name: bank.name, success: false, error: 'Duplicate question bank' });
          completed++;
          continue;
        }

        await saveQuestionBank({
          name: bank.name,
          description: bank.description,
          subject: bank.subject,
          tags: bank.tags,
          questions: bank.questions,
          isPublic: bank.isPublic,
          usageCount: bank.usageCount
        });
        results.push({ type: 'question_bank', name: bank.name, success: true });
      } catch (error) {
        console.error(`Failed to sync question bank ${item.bank.name}:`, error);
        results.push({ type: 'question_bank', name: item.bank.name, success: false, error: error.message });
      }
    }

    completed++;
  }
  return results;
};

// Enhanced sync function that includes question banks
export const syncAllToDatabase = async (
  historyItems: any[],
  questionBank: any[],
  onProgress?: (completed: number, total: number, currentItem: string) => void
) => {
  const allItems = [
    ...historyItems,
    ...questionBank.map(bank => ({ type: 'question_bank', bank }))
  ];

  return await syncLocalHistoryToDatabase(allItems, onProgress);
};

export const checkForDuplicates = async (fileName: string, documentText: string) => {
  try {
    const documents = await getDocuments();
    return documents.some((doc: any) =>
      doc.file_name === fileName && doc.document_text === documentText
    );
  } catch (error) {
    console.error('Error checking for duplicates:', error);
    return false;
  }
};

export const checkInterviewDuplicates = async (targetPosition: string, cvContent: string) => {
  try {
    const interviews = await getInterviews();
    return interviews.some((interview: any) =>
      interview.target_position === targetPosition && interview.cv_content === cvContent
    );
  } catch (error) {
    console.error('Error checking for interview duplicates:', error);
    return false;
  }
};

export const checkForDuplicatesByHash = async (contentHash: string) => {
  try {
    const documents = await getDocuments();
    return documents.some((doc: any) => doc.content_hash === contentHash);
  } catch (error) {
    console.error('Error checking for duplicates by hash:', error);
    return false;
  }
};

// Database Content Download Functions
export const browseDatabaseContent = async () => {
  try {
    const [documents, interviews, questionBanks] = await Promise.all([
      getDocuments(),
      getInterviews(),
      getQuestionBanks()
    ]);

    return {
      documents: documents.map(doc => ({
        id: doc.id,
        type: 'document' as const,
        title: doc.file_name,
        createdAt: doc.created_at,
        contentHash: doc.content_hash,
        metadata: {
          topics: doc.analysis?.topics?.join(', ') || '',
          sentiment: doc.analysis?.sentiment || '',
          entities: doc.analysis?.entities?.length || 0
        }
      })),
      interviews: interviews.map(interview => ({
        id: interview.id,
        type: 'interview' as const,
        title: `${interview.target_position} (${interview.interview_type})`,
        createdAt: interview.created_at,
        status: interview.status,
        score: interview.overall_score
      })),
      questionBanks: questionBanks.map(bank => ({
        id: bank.id,
        type: 'question_bank' as const,
        title: bank.name,
        createdAt: bank.created_at,
        questionCount: bank.questions?.length || 0,
        subject: bank.subject
      }))
    };
  } catch (error) {
    console.error('Error browsing database content:', error);
    throw error;
  }
};

export const getDocumentById = async (id: string) => {
  try {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error getting document by ID:', error);
    throw error;
  }
};

export const getInterviewById = async (id: string) => {
  try {
    const response = await api.get(`/interviews/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error getting interview by ID:', error);
    throw error;
  }
};

export const getQuestionBankById = async (id: string) => {
  try {
    const response = await api.get(`/question-banks/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error getting question bank by ID:', error);
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
