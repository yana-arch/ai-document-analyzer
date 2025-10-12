import { ChatSession, ChatMessage, UserSettings } from '../types';

class ChatSessionService {
  private static readonly STORAGE_KEY = 'ai-doc-analyzer-chat-sessions';
  private static readonly MAX_SESSIONS = 50;
  private static readonly MAX_MESSAGES_PER_SESSION = 100;

  /**
   * Create a new chat session
   */
  static createSession(fileName: string, documentText: string, settings?: UserSettings): ChatSession {
    const session: ChatSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fileName,
      documentText,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings
    };

    return session;
  }

  /**
   * Add a message to the session and update context
   */
  static addMessage(session: ChatSession, message: ChatMessage): ChatSession {
    const updatedSession = {
      ...session,
      messages: [
        ...session.messages,
        {
          ...message,
          id: message.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: message.timestamp || new Date().toISOString()
        }
      ].slice(-this.MAX_MESSAGES_PER_SESSION), // Keep only recent messages
      updatedAt: new Date().toISOString()
    };

    return updatedSession;
  }

  /**
   * Get conversation context for AI prompt
   */
  static getConversationContext(session: ChatSession, maxMessages: number = 10): string {
    if (session.messages.length === 0) {
      return '';
    }

    const recentMessages = session.messages.slice(-maxMessages);
    const contextParts: string[] = [];

    recentMessages.forEach((message, index) => {
      const role = message.role === 'user' ? 'User' : 'Assistant';
      contextParts.push(`${role}: ${message.text}`);
    });

    return contextParts.join('\n\n');
  }

  /**
   * Generate system prompt with conversation context
   */
  static generateSystemPrompt(documentText: string, conversationContext: string, locale: 'en' | 'vi'): string {
    const languageInstruction = locale === 'vi' ? 'You must respond in Vietnamese.' : 'You must respond in English.';
    const notFoundMessage = locale === 'vi' ? 'Không thể tìm thấy câu trả lời.' : 'I cannot find the answer in the document.';

    let systemPrompt = `${languageInstruction}

You are an AI assistant. You must answer questions based only on the content of the following document.

If the question cannot be answered using the document, say: "${notFoundMessage}"

Document: ${documentText}`;

    if (conversationContext) {
      systemPrompt += `

Previous conversation context:
${conversationContext}

When responding, consider the previous conversation to provide more relevant and contextual answers. Reference previous questions and answers when appropriate to maintain conversation flow.`;
    }

    return systemPrompt;
  }

  /**
   * Save session to localStorage
   */
  static saveSession(session: ChatSession): void {
    try {
      const sessions = this.getAllSessions();
      const existingIndex = sessions.findIndex(s => s.id === session.id);

      if (existingIndex >= 0) {
        sessions[existingIndex] = session;
      } else {
        sessions.unshift(session); // Add new sessions to the beginning
      }

      // Keep only the most recent sessions
      const trimmedSessions = sessions.slice(0, this.MAX_SESSIONS);

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedSessions));
    } catch (error) {
      console.error('Failed to save chat session:', error);
    }
  }

  /**
   * Load session by fileName
   */
  static loadSession(fileName: string): ChatSession | null {
    try {
      const sessions = this.getAllSessions();
      return sessions.find(s => s.fileName === fileName) || null;
    } catch (error) {
      console.error('Failed to load chat session:', error);
      return null;
    }
  }

  /**
   * Load all sessions
   */
  static getAllSessions(): ChatSession[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
      return [];
    }
  }

  /**
   * Delete session
   */
  static deleteSession(sessionId: string): void {
    try {
      const sessions = this.getAllSessions().filter(s => s.id !== sessionId);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to delete chat session:', error);
    }
  }

  /**
   * Clear all sessions for a specific file
   */
  static clearSessionsForFile(fileName: string): void {
    try {
      const sessions = this.getAllSessions().filter(s => s.fileName !== fileName);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to clear sessions for file:', error);
    }
  }

  /**
   * Get session statistics
   */
  static getSessionStats(): { totalSessions: number; totalMessages: number; oldestSession?: string; newestSession?: string } {
    const sessions = this.getAllSessions();
    const totalMessages = sessions.reduce((sum, session) => sum + session.messages.length, 0);

    const oldestSession = sessions.length > 0 ? sessions[sessions.length - 1]?.createdAt : undefined;
    const newestSession = sessions.length > 0 ? sessions[0]?.createdAt : undefined;

    return {
      totalSessions: sessions.length,
      totalMessages,
      oldestSession,
      newestSession
    };
  }

  /**
   * Clean up old sessions (older than 30 days)
   */
  static cleanupOldSessions(): number {
    try {
      const sessions = this.getAllSessions();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const filteredSessions = sessions.filter(session =>
        new Date(session.createdAt) > thirtyDaysAgo
      );

      const deletedCount = sessions.length - filteredSessions.length;

      if (deletedCount > 0) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredSessions));
        console.log(`Cleaned up ${deletedCount} old chat sessions`);
      }

      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup old sessions:', error);
      return 0;
    }
  }

  /**
   * Export session data
   */
  static exportSession(sessionId: string): ChatSession | null {
    const sessions = this.getAllSessions();
    return sessions.find(s => s.id === sessionId) || null;
  }

  /**
   * Import session data
   */
  static importSession(sessionData: ChatSession): boolean {
    try {
      // Validate session data
      if (!sessionData.id || !sessionData.fileName || !Array.isArray(sessionData.messages)) {
        return false;
      }

      const sessions = this.getAllSessions();
      const existingIndex = sessions.findIndex(s => s.id === sessionData.id);

      if (existingIndex >= 0) {
        sessions[existingIndex] = sessionData;
      } else {
        sessions.unshift(sessionData);
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions.slice(0, this.MAX_SESSIONS)));
      return true;
    } catch (error) {
      console.error('Failed to import session:', error);
      return false;
    }
  }
}

export default ChatSessionService;
