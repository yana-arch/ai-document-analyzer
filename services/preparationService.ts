import { PreparationResource, PracticeQuestion, PracticeAttempt, PreparationSession, CVParseResult, InterviewType, UserSettings } from '../types';
import { aiService } from './aiService';

export class PreparationService {
  /**
   * Generate preparation resources based on CV and target position
   */
  static async generatePreparationResources(
    cvContent: string,
    targetPosition: string,
    interviewType: InterviewType,
    settings?: UserSettings
  ): Promise<PreparationResource[]> {
    if (!settings) {
      throw new Error('User settings required for resource generation');
    }

    const resources: PreparationResource[] = [];

    // Base prompt for resource generation
    const resourcePrompt = `
    Based on this CV content and the target position "${targetPosition}", generate relevant preparation resources for interview practice.

    CV Content:
    ${cvContent}

    Target Position: ${targetPosition}
    Interview Type: ${interviewType}

    Generate 5-8 preparation resources including:
    - Study guides and tips specific to the position
    - Common interview questions for this field
    - Industry-specific preparation materials
    - Behavioral and technical preparation resources

    Return in JSON format:
    {
      "resources": [
        {
          "title": "Resource title",
          "type": "guide",
          "content": "Detailed content or description",
          "category": "technical",
          "difficulty": "intermediate"
        }
      ]
    }
    `;

    try {
      const provider = aiService.getActiveProvider(settings);
      if (!provider) {
        throw new Error('No active AI provider configured');
      }

      const response = await provider.generatePreparationResources(resourcePrompt, settings.ai);
      const data = JSON.parse(response);

      return (data.resources || []).map((resource: any, index: number) => ({
        id: `resource-${Date.now()}-${index}`,
        title: resource.title || `Resource ${index + 1}`,
        type: resource.type || 'guide',
        content: resource.content || resource.description || 'Content not available',
        category: resource.category || 'general',
        difficulty: resource.difficulty || 'intermediate',
        url: resource.url
      }));

    } catch (error) {
      console.error('Error generating preparation resources:', error);
      // Return fallback resources if AI generation fails
      return this.generateFallbackResources(targetPosition, interviewType);
    }
  }

  /**
   * Generate practice questions for interview preparation
   */
  static async generatePracticeQuestions(
    cvContent: string,
    targetPosition: string,
    interviewType: InterviewType,
    settings?: UserSettings
  ): Promise<PracticeQuestion[]> {
    if (!settings) {
      throw new Error('User settings required for practice question generation');
    }

    const questionsPrompt = `
    Generate 8-10 practice interview questions for someone applying for "${targetPosition}" position.

    CV Content:
    ${cvContent}

    Interview Type: ${interviewType}

    Generate questions that would be commonly asked in ${interviewType} interviews for this position.
    Include a mix of difficulty levels and provide sample answers and key points for each question.

    Return in JSON format:
    {
      "questions": [
        {
          "question": "Sample question?",
          "type": "technical",
          "category": "Technical Skills",
          "sampleAnswer": "Sample answer...",
          "keyPoints": ["Point 1", "Point 2"],
          "difficulty": "medium"
        }
      ]
    }
    `;

    try {
      const provider = aiService.getActiveProvider(settings);
      if (!provider) {
        throw new Error('No active AI provider configured');
      }

      const response = await provider.generatePracticeQuestions(questionsPrompt, settings.ai);
      const data = JSON.parse(response);

      return (data.questions || []).map((question: any, index: number) => ({
        id: `practice-${Date.now()}-${index}`,
        question: question.question,
        type: question.type || 'general',
        category: question.category || 'General',
        sampleAnswer: question.sampleAnswer,
        keyPoints: question.keyPoints || [],
        difficulty: question.difficulty || 'medium'
      }));

    } catch (error) {
      console.error('Error generating practice questions:', error);
      // Return fallback questions if AI generation fails
      return this.generateFallbackPracticeQuestions(targetPosition, interviewType);
    }
  }

  /**
   * Evaluate practice answer
   */
  static async evaluatePracticeAnswer(
    question: PracticeQuestion,
    userAnswer: string,
    cvContent: string,
    targetPosition: string,
    settings?: UserSettings
  ): Promise<PracticeAttempt> {
    if (!settings) {
      throw new Error('User settings required for practice evaluation');
    }

    const evaluationPrompt = `
    Evaluate this practice interview answer for the position of "${targetPosition}".

    Question: ${question.question}
    User Answer: ${userAnswer}

    Sample Answer for reference: ${question.sampleAnswer || 'Not provided'}

    CV Context:
    ${cvContent}

    Please provide a detailed evaluation in the following JSON format:
    {
      "score": 85,
      "feedback": "Detailed feedback on the answer quality, relevance, and completeness.",
      "timeSpent": 0
    }

    Scoring criteria (0-100):
    - Relevance to question (0-30 points)
    - Depth of response (0-25 points)
    - Use of specific examples (0-20 points)
    - Communication clarity (0-15 points)
    - Alignment with CV (0-10 points)
    `;

    try {
      const provider = aiService.getActiveProvider(settings);
      if (!provider) {
        throw new Error('No active AI provider configured');
      }

      const response = await provider.evaluatePracticeAnswer(evaluationPrompt, settings.ai);
      const evaluation = JSON.parse(response);

      return {
        id: `attempt-${Date.now()}`,
        questionId: question.id,
        userAnswer,
        score: evaluation.score || 0,
        feedback: evaluation.feedback || 'Answer received but could not be evaluated.',
        attemptedAt: new Date().toISOString(),
        timeSpent: evaluation.timeSpent || 0
      };

    } catch (error) {
      console.error('Error evaluating practice answer:', error);
      // Return basic evaluation if AI evaluation fails
      return {
        id: `attempt-${Date.now()}`,
        questionId: question.id,
        userAnswer,
        score: 50,
        feedback: 'Answer received. Detailed evaluation could not be completed due to technical issues.',
        attemptedAt: new Date().toISOString(),
        timeSpent: 0
      };
    }
  }

  /**
   * Generate fallback preparation resources
   */
  private static generateFallbackResources(targetPosition: string, interviewType: InterviewType): PreparationResource[] {
    return [
      {
        id: `fallback-resource-1-${Date.now()}`,
        title: `Common ${interviewType} Interview Questions for ${targetPosition}`,
        type: 'guide',
        content: `This guide covers the most frequently asked ${interviewType} questions for ${targetPosition} roles. Focus on questions related to your experience, problem-solving abilities, and industry knowledge.`,
        category: 'general',
        difficulty: 'intermediate'
      },
      {
        id: `fallback-resource-2-${Date.now()}`,
        title: 'STAR Method for Behavioral Questions',
        type: 'tips',
        content: 'Use the STAR method (Situation, Task, Action, Result) to structure your behavioral answers. This helps you provide specific examples that demonstrate your skills and experience.',
        category: 'behavioral',
        difficulty: 'beginner'
      },
      {
        id: `fallback-resource-3-${Date.now()}`,
        title: 'Technical Preparation Checklist',
        type: 'checklist',
        content: 'Review key technical concepts, prepare examples of your work, understand the company\'s tech stack, and be ready to discuss your problem-solving approach.',
        category: 'technical',
        difficulty: 'intermediate'
      },
      {
        id: `fallback-resource-4-${Date.now()}`,
        title: 'Body Language and Communication Tips',
        type: 'tips',
        content: 'Maintain good eye contact, speak clearly and confidently, use positive body language, and show enthusiasm for the role and company.',
        category: 'general',
        difficulty: 'beginner'
      }
    ];
  }

  /**
   * Generate fallback practice questions
   */
  private static generateFallbackPracticeQuestions(targetPosition: string, interviewType: InterviewType): PracticeQuestion[] {
    const questions: PracticeQuestion[] = [];

    switch (interviewType) {
      case 'technical':
        questions.push(
          {
            id: `fallback-tech-1-${Date.now()}`,
            question: `Can you walk me through a technical project you've worked on recently?`,
            type: 'technical',
            category: 'Technical Experience',
            sampleAnswer: 'I recently worked on a web application using React and Node.js. I was responsible for implementing the user authentication system and optimizing database queries.',
            keyPoints: ['Describe the technology stack', 'Explain your specific role', 'Highlight challenges and solutions'],
            difficulty: 'medium'
          },
          {
            id: `fallback-tech-2-${Date.now()}`,
            question: `How do you approach debugging a complex technical issue?`,
            type: 'technical',
            category: 'Problem Solving',
            sampleAnswer: 'I start by reproducing the issue, then isolate the problem step by step, check logs and error messages, and test potential solutions systematically.',
            keyPoints: ['Show systematic thinking', 'Mention tools and techniques', 'Emphasize learning from the experience'],
            difficulty: 'medium'
          }
        );
        break;

      case 'behavioral':
        questions.push(
          {
            id: `fallback-behavioral-1-${Date.now()}`,
            question: `Tell me about a time when you worked effectively as part of a team.`,
            type: 'behavioral',
            category: 'Teamwork',
            sampleAnswer: 'In my previous role, I collaborated with a cross-functional team to deliver a major product update. I coordinated with designers, developers, and QA to ensure smooth delivery.',
            keyPoints: ['Describe the situation and team composition', 'Explain your specific contribution', 'Highlight positive outcomes'],
            difficulty: 'easy'
          },
          {
            id: `fallback-behavioral-2-${Date.now()}`,
            question: `Describe a challenging situation you faced and how you resolved it.`,
            type: 'behavioral',
            category: 'Problem Solving',
            sampleAnswer: 'When a critical deadline was approaching and we discovered a major bug, I organized an emergency meeting, delegated tasks, and we worked overtime to fix the issue.',
            keyPoints: ['Set the context clearly', 'Explain your actions and decisions', 'Focus on positive resolution'],
            difficulty: 'medium'
          }
        );
        break;

      case 'situational':
        questions.push(
          {
            id: `fallback-situational-1-${Date.now()}`,
            question: `How would you handle a disagreement with a team member about a technical approach?`,
            type: 'situational',
            category: 'Conflict Resolution',
            sampleAnswer: 'I would first seek to understand their perspective, then share my reasoning with data and examples, and work together to find a compromise that benefits the project.',
            keyPoints: ['Show willingness to listen', 'Demonstrate collaborative approach', 'Focus on project success'],
            difficulty: 'medium'
          },
          {
            id: `fallback-situational-2-${Date.now()}`,
            question: `What would you do if you were assigned a task with a very tight deadline?`,
            type: 'situational',
            category: 'Time Management',
            sampleAnswer: 'I would break down the task into smaller milestones, prioritize the most critical components, communicate with stakeholders about realistic expectations, and focus on delivering quality work.',
            keyPoints: ['Show organized thinking', 'Mention communication with team', 'Emphasize quality over speed'],
            difficulty: 'medium'
          }
        );
        break;

      case 'comprehensive':
        questions.push(
          {
            id: `fallback-comp-1-${Date.now()}`,
            question: `Why are you interested in this ${targetPosition} role?`,
            type: 'experience',
            category: 'Motivation',
            sampleAnswer: 'I\'m passionate about this role because it aligns with my experience in [relevant area] and offers opportunities to grow while contributing to meaningful projects.',
            keyPoints: ['Connect to your background', 'Show knowledge of the company/role', 'Express genuine enthusiasm'],
            difficulty: 'easy'
          },
          {
            id: `fallback-comp-2-${Date.now()}`,
            question: `What are your greatest strengths relevant to this position?`,
            type: 'experience',
            category: 'Self-Assessment',
            sampleAnswer: 'My key strengths include [technical skill], [soft skill], and [relevant experience]. For example, I\'ve successfully [specific achievement] in my previous role.',
            keyPoints: ['Choose 2-3 relevant strengths', 'Provide specific examples', 'Connect to job requirements'],
            difficulty: 'easy'
          }
        );
        break;
    }

    return questions;
  }

  /**
   * Save preparation session to localStorage
   */
  static savePreparationSession(session: PreparationSession): void {
    try {
      const sessions = this.getAllPreparationSessions();
      const existingIndex = sessions.findIndex(s => s.id === session.id);

      if (existingIndex >= 0) {
        sessions[existingIndex] = session;
      } else {
        sessions.push(session);
      }

      localStorage.setItem('cv-preparation-sessions', JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving preparation session:', error);
    }
  }

  /**
   * Load preparation session from localStorage
   */
  static loadPreparationSession(sessionId: string): PreparationSession | null {
    try {
      const sessions = this.getAllPreparationSessions();
      return sessions.find(s => s.id === sessionId) || null;
    } catch (error) {
      console.error('Error loading preparation session:', error);
      return null;
    }
  }

  /**
   * Get all preparation sessions from localStorage
   */
  static getAllPreparationSessions(): PreparationSession[] {
    try {
      const stored = localStorage.getItem('cv-preparation-sessions');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading preparation sessions:', error);
      return [];
    }
  }

  /**
   * Delete preparation session from localStorage
   */
  static deletePreparationSession(sessionId: string): void {
    try {
      const sessions = this.getAllPreparationSessions();
      const filtered = sessions.filter(s => s.id !== sessionId);
      localStorage.setItem('cv-preparation-sessions', JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting preparation session:', error);
    }
  }
}
