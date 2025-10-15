import { CVInterview, InterviewQuestion, InterviewAnswer, InterviewFeedback, InterviewType, QuestionType, CVParseResult } from '../types';
import { aiService } from './aiService';
import { UserSettings } from '../types';

export class InterviewService {
  private static readonly DEFAULT_QUESTION_COUNT = 8;
  private static readonly DEFAULT_TIME_LIMIT = 300; // 5 minutes per question

  /**
   * Create a new CV interview session
   */
  static async createInterview(
    cvContent: string,
    targetPosition: string,
    interviewType: InterviewType,
    customPrompt?: string,
    settings?: UserSettings
  ): Promise<CVInterview> {
    const interviewId = `interview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Parse CV content to get structured data
    const cvParseResult = this.parseCVContent(cvContent);

    // Generate questions based on CV and position
    const questions = await this.generateQuestions(
      cvContent,
      cvParseResult,
      targetPosition,
      interviewType,
      customPrompt,
      settings
    );

    const interview: CVInterview = {
      id: interviewId,
      cvContent,
      targetPosition,
      interviewType,
      customPrompt,
      questions,
      answers: [],
      createdAt: new Date().toISOString(),
      status: 'preparing'
    };

    return interview;
  }

  /**
   * Generate interview questions based on CV and requirements
   */
  static async generateQuestions(
    cvContent: string,
    parsedCV: CVParseResult,
    targetPosition: string,
    interviewType: InterviewType,
    customPrompt?: string,
    settings?: UserSettings
  ): Promise<InterviewQuestion[]> {
    if (!settings) {
      throw new Error('User settings required for question generation');
    }

    const questions: InterviewQuestion[] = [];
    let questionOrder = 1;

    // Base prompt for question generation
    let basePrompt = `Based on this CV content and the target position of "${targetPosition}", generate ${this.DEFAULT_QUESTION_COUNT} interview questions.`;

    if (customPrompt) {
      basePrompt += ` Additional context: ${customPrompt}`;
    }

    // Customize prompt based on interview type
    switch (interviewType) {
      case 'technical':
        basePrompt += `
        Focus on technical skills, problem-solving abilities, and technical experience.
        Generate questions that assess:
        - Technical expertise and knowledge
        - Problem-solving approach
        - Technical project experience
        - Technology stack familiarity`;
        break;

      case 'behavioral':
        basePrompt += `
        Focus on behavioral aspects, past experiences, and soft skills.
        Generate questions that assess:
        - Past behavior in challenging situations
        - Leadership and teamwork experiences
        - Conflict resolution abilities
        - Achievement stories`;
        break;

      case 'situational':
        basePrompt += `
        Focus on situational judgment and hypothetical scenarios.
        Generate questions that assess:
        - How candidates would handle specific work situations
        - Decision-making processes
        - Priority setting in complex situations
        - Crisis management abilities`;
        break;

      case 'comprehensive':
        basePrompt += `
        Generate a comprehensive set of questions covering:
        - Technical skills and experience
        - Behavioral aspects and past experiences
        - Situational judgment and problem-solving
        - Cultural fit and motivation`;
        break;
    }

    basePrompt += `

    CV Content:
    ${cvContent}

    Return the questions in the following JSON format:
    {
      "questions": [
        {
          "question": "Question text here?",
          "type": "${interviewType === 'technical' ? 'technical' : interviewType === 'behavioral' ? 'behavioral' : interviewType === 'situational' ? 'situational' : 'experience'}",
          "timeLimit": ${this.DEFAULT_TIME_LIMIT},
          "category": "category_name",
          "difficulty": "medium"
        }
      ]
    }

    Make questions specific to the candidate's experience and the target position.`;

    try {
      // Use AI service to generate questions
      const provider = aiService.getActiveProvider(settings);
      if (!provider) {
        throw new Error('No active AI provider configured');
      }

      const response = await provider.generateInterviewQuestions(basePrompt, settings.ai);

      // Parse the AI response
      const parsedResponse = JSON.parse(response);

      // Convert to InterviewQuestion format
      const generatedQuestions = parsedResponse.questions.map((q: any, index: number) => ({
        id: `question-${Date.now()}-${index}`,
        question: q.question,
        type: q.type as QuestionType,
        timeLimit: q.timeLimit || this.DEFAULT_TIME_LIMIT,
        order: questionOrder++,
        category: q.category,
        difficulty: q.difficulty
      }));

      return generatedQuestions;

    } catch (error) {
      console.error('Error generating interview questions:', error);
      // Fallback to template questions if AI generation fails
      return this.generateFallbackQuestions(interviewType, targetPosition, parsedCV);
    }
  }

  /**
   * Evaluate interview answer and provide feedback
   */
  static async evaluateAnswer(
    question: InterviewQuestion,
    answer: string,
    cvContent: string,
    targetPosition: string,
    settings?: UserSettings
  ): Promise<InterviewAnswer> {
    if (!settings) {
      throw new Error('User settings required for answer evaluation');
    }

    // Check if there's an active AI provider
    const activeProvider = settings.apis.find(api => api.isActive);
    if (!activeProvider) {
      throw new Error('No active AI provider configured. Please configure an API provider in Settings.');
    }

    const evaluationPrompt = `
    Evaluate this interview answer for the position of "${targetPosition}".

    Question: ${question.question}
    Candidate Answer: ${answer}

    CV Context:
    ${cvContent}

    Please provide a detailed evaluation in the following JSON format:
    {
      "score": 85,
      "feedback": "Detailed feedback on the answer quality, relevance, and completeness.",
      "strengths": ["Specific strength 1", "Specific strength 2"],
      "improvements": ["Area for improvement 1", "Area for improvement 2"]
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

      const response = await provider.evaluateInterviewAnswer(evaluationPrompt, settings.ai);
      const evaluation = JSON.parse(response);

      return {
        questionId: question.id,
        answer,
        timeSpent: 0, // This would be tracked during the actual interview
        score: evaluation.score || 0,
        maxScore: 100,
        feedback: evaluation.feedback || 'Answer received but could not be evaluated.',
        strengths: evaluation.strengths || [],
        improvements: evaluation.improvements || [],
        submittedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error evaluating answer:', error);
      // Return basic evaluation if AI evaluation fails
      return {
        questionId: question.id,
        answer,
        timeSpent: 0,
        score: 50,
        maxScore: 100,
        feedback: 'Answer received. Detailed evaluation could not be completed due to technical issues.',
        strengths: ['Provided a response to the question'],
        improvements: ['Evaluation could not be completed'],
        submittedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Generate comprehensive feedback for completed interview
   */
  static async generateInterviewFeedback(
    interview: CVInterview,
    settings?: UserSettings
  ): Promise<InterviewFeedback> {
    if (!settings) {
      throw new Error('User settings required for feedback generation');
    }

    const answers = interview.answers;
    if (answers.length === 0) {
      throw new Error('No answers to evaluate');
    }

    // Calculate overall score
    const overallScore = answers.reduce((sum, answer) => sum + answer.score, 0) / answers.length;

    const feedbackPrompt = `
    Generate comprehensive feedback for a ${interview.interviewType} interview for the position of "${interview.targetPosition}".

    Interview Summary:
    - Total Questions: ${interview.questions.length}
    - Answered Questions: ${answers.length}
    - Average Score: ${overallScore.toFixed(1)}/100

    CV Content:
    ${interview.cvContent}

    Please provide detailed feedback in the following JSON format:
    {
      "overallScore": ${overallScore},
      "positionFit": "good",
      "strengths": ["Overall strength 1", "Overall strength 2"],
      "weaknesses": ["Area for improvement 1", "Area for improvement 2"],
      "recommendations": ["Specific recommendation 1", "Specific recommendation 2"],
      "summary": "Overall assessment summary",
      "detailedAnalysis": {
        "technicalSkills": 85,
        "communication": 78,
        "problemSolving": 82,
        "experience": 80,
        "culturalFit": 75
      }
    }

    Consider the candidate's experience, skills, and how well they align with the target position.
    `;

    try {
      const provider = aiService.getActiveProvider(settings);
      if (!provider) {
        throw new Error('No active AI provider configured');
      }

      const response = await provider.generateInterviewFeedback(feedbackPrompt, settings.ai);
      const feedback = JSON.parse(response);

      return {
        overallScore: feedback.overallScore || overallScore,
        positionFit: this.calculatePositionFit(feedback.overallScore || overallScore),
        strengths: feedback.strengths || ['Completed interview process'],
        weaknesses: feedback.weaknesses || [],
        recommendations: feedback.recommendations || ['Continue developing skills'],
        summary: feedback.summary || 'Interview completed successfully.',
        detailedAnalysis: feedback.detailedAnalysis || {}
      };

    } catch (error) {
      console.error('Error generating interview feedback:', error);
      // Return basic feedback if AI generation fails
      return {
        overallScore,
        positionFit: this.calculatePositionFit(overallScore),
        strengths: ['Completed interview process'],
        weaknesses: ['Detailed analysis not available'],
        recommendations: ['Continue practicing interview skills'],
        summary: `Interview completed with an average score of ${overallScore.toFixed(1)}%.`,
        detailedAnalysis: {}
      };
    }
  }

  /**
   * Parse CV content (reuse from CVProcessingService)
   */
  private static parseCVContent(cvContent: string): CVParseResult {
    // Simple parsing logic - in a real implementation, use CVProcessingService
    return {
      personalInfo: {},
      experience: [],
      education: [],
      skills: [],
      rawText: cvContent
    };
  }

  /**
   * Generate fallback questions if AI generation fails
   */
  private static generateFallbackQuestions(
    interviewType: InterviewType,
    targetPosition: string,
    parsedCV: CVParseResult
  ): InterviewQuestion[] {
    const fallbackQuestions: InterviewQuestion[] = [];

    switch (interviewType) {
      case 'technical':
        fallbackQuestions.push(
          {
            id: `fallback-1-${Date.now()}`,
            question: `Can you walk me through your technical experience relevant to ${targetPosition}?`,
            type: 'technical',
            timeLimit: this.DEFAULT_TIME_LIMIT,
            order: 1,
            category: 'Technical Experience'
          },
          {
            id: `fallback-2-${Date.now()}`,
            question: `What technical challenges have you faced in your previous roles?`,
            type: 'technical',
            timeLimit: this.DEFAULT_TIME_LIMIT,
            order: 2,
            category: 'Problem Solving'
          }
        );
        break;

      case 'behavioral':
        fallbackQuestions.push(
          {
            id: `fallback-1-${Date.now()}`,
            question: `Tell me about a time when you worked as part of a team.`,
            type: 'behavioral',
            timeLimit: this.DEFAULT_TIME_LIMIT,
            order: 1,
            category: 'Teamwork'
          },
          {
            id: `fallback-2-${Date.now()}`,
            question: `Describe a challenging situation you faced at work and how you resolved it.`,
            type: 'behavioral',
            timeLimit: this.DEFAULT_TIME_LIMIT,
            order: 2,
            category: 'Conflict Resolution'
          }
        );
        break;

      case 'situational':
        fallbackQuestions.push(
          {
            id: `fallback-1-${Date.now()}`,
            question: `How would you handle a tight deadline for an important project?`,
            type: 'situational',
            timeLimit: this.DEFAULT_TIME_LIMIT,
            order: 1,
            category: 'Time Management'
          },
          {
            id: `fallback-2-${Date.now()}`,
            question: `What would you do if you disagreed with your manager's approach to a project?`,
            type: 'situational',
            timeLimit: this.DEFAULT_TIME_LIMIT,
            order: 2,
            category: 'Decision Making'
          }
        );
        break;

      case 'comprehensive':
        fallbackQuestions.push(
          {
            id: `fallback-1-${Date.now()}`,
            question: `Why are you interested in this ${targetPosition} role?`,
            type: 'experience',
            timeLimit: this.DEFAULT_TIME_LIMIT,
            order: 1,
            category: 'Motivation'
          },
          {
            id: `fallback-2-${Date.now()}`,
            question: `What are your greatest strengths relevant to this position?`,
            type: 'experience',
            timeLimit: this.DEFAULT_TIME_LIMIT,
            order: 2,
            category: 'Self-Assessment'
          }
        );
        break;
    }

    return fallbackQuestions;
  }

  /**
   * Calculate position fit based on score
   */
  private static calculatePositionFit(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    return 'poor';
  }

  /**
   * Save interview to localStorage
   */
  static saveInterview(interview: CVInterview): void {
    try {
      const interviews = this.getAllInterviews();
      const existingIndex = interviews.findIndex(i => i.id === interview.id);

      if (existingIndex >= 0) {
        interviews[existingIndex] = interview;
      } else {
        interviews.push(interview);
      }

      localStorage.setItem('cv-interviews', JSON.stringify(interviews));
    } catch (error) {
      console.error('Error saving interview:', error);
    }
  }

  /**
   * Load interview from localStorage
   */
  static loadInterview(interviewId: string): CVInterview | null {
    try {
      const interviews = this.getAllInterviews();
      return interviews.find(i => i.id === interviewId) || null;
    } catch (error) {
      console.error('Error loading interview:', error);
      return null;
    }
  }

  /**
   * Get all interviews from localStorage
   */
  static getAllInterviews(): CVInterview[] {
    try {
      const stored = localStorage.getItem('cv-interviews');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading interviews:', error);
      return [];
    }
  }

  /**
   * Delete interview from localStorage
   */
  static deleteInterview(interviewId: string): void {
    try {
      const interviews = this.getAllInterviews();
      const filtered = interviews.filter(i => i.id !== interviewId);
      localStorage.setItem('cv-interviews', JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting interview:', error);
    }
  }
}
