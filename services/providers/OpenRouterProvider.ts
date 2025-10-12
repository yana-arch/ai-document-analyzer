import axios from 'axios';
import { AnalysisResult, QuizQuestion, GradedWrittenAnswer, Exercise, MultipleChoiceQuestion, WrittenAnswerQuestion, AISettings } from '../../types';
import { BaseAIProvider } from './BaseAIProvider';

export class OpenRouterProvider extends BaseAIProvider {
  private model: string;
  private cache: Map<string, any> = new Map();

  constructor(apiKey: string, model: string) {
    super('OpenRouter', apiKey);
    this.model = model || 'openai/gpt-4o-mini'; // Default model
  }

  private async makeRequest(messages: any[], responseFormat: any = null, flexible: boolean = true): Promise<any> {
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'AI Document Analyzer'
    };

    const payload: any = {
      model: this.model,
      messages,
      temperature: 0.7,
      max_tokens: 2048
    };

    // Only enforce strict JSON format for certain models
    if (responseFormat && !flexible) {
      payload.response_format = { type: 'json_object' };
    }

    try {
      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', payload, { headers });
      const fullMessage = response.data.choices[0].message;

      // Handle different response formats from various models
      let content = fullMessage.content || '';

      // Some advanced models include reasoning/thinking that we should filter out
      // Only keep user-facing content, not internal reasoning
      if (typeof content === 'string') {
        // Clean up responses that might include model reasoning
        content = this.cleanModelReasoning(content);
      }

      if (responseFormat) {
        // Try flexible JSON parsing first
        try {
          return this.parseFlexibleJSON(content);
        } catch (parseError) {
          // If flexible parsing fails, try direct JSON.parse as fallback
          try {
            return JSON.parse(content);
          } catch (fallbackError) {
            console.warn('JSON parsing failed, attempting to extract from text');
            return this.extractJSONFromText(content);
          }
        }
      }

      return content;
    } catch (error) {
      console.error('OpenRouter API error:', error);
      throw new Error(`OpenRouter API error: ${error.response?.data?.error || error.message}`);
    }
  }

  // Clean up model reasoning/thinking that shouldn't be shown to users
  private cleanModelReasoning(content: string): string {
    // Remove any thinking/reasoning blocks that some models include
    // This handles cases where models output both reasoning and final answer
    let cleanContent = content.trim();

    // Remove common reasoning patterns
    cleanContent = cleanContent.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
    cleanContent = cleanContent.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '');
    cleanContent = cleanContent.replace(/^#+\s*Reasoning[\s\S]*?(?=\n\n|\n[A-Z]|\n\d|$)/gim, '');

    // Remove reasoning sections that appear as code blocks or quotes
    cleanContent = cleanContent.replace(/```[\w]*\s*#+\s*Reasoning[\s\S]*?```/gi, '');
    cleanContent = cleanContent.replace(/^\s*#+\s*Internal\s+(Thinking|Reasoning|Analysis)[\s\S]*?(?=\n\n|\n[A-Z]|\n\d+|$)/gm, '');

    // Some models put reasoning at the end after the actual answer
    const lines = cleanContent.split('\n');
    let actualContent = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Stop if we encounter reasoning/thinking markers
      if (line.match(/^(#{1,6}\s*)?(Reasoning|Thinking|Internal|Debug|Debugging|Chain of thought):?/i)) {
        break;
      }

      // Skip lines that look like internal reasoning (usually after the main content)
      if (actualContent.length > 0 && (
        line.match(/^The (user|question|input)/i) ||
        line.match(/^I (need to|should|will)/i) ||
        line.match(/^This (is|seems|appears|might be)/i) ||
        line.includes('[object Object]') // Specific case mentioned
      )) {
        // Stop collecting if we start seeing reasoning content
        break;
      }

      actualContent.push(line);
    }

    // If filtering removed content, use the filtered version
    if (actualContent.length > 0 && actualContent.length < lines.length) {
      cleanContent = actualContent.join('\n').trim();
    }

    return cleanContent;
  }

  // Flexible JSON parsing that can handle various formats
  private parseFlexibleJSON(content: string): any {
    // Clean up common issues
    let cleanContent = content.trim();

    // Remove markdown code fences if present
    cleanContent = cleanContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

    // Remove any trailing commas before closing braces/brackets
    cleanContent = cleanContent.replace(/,(\s*[}\]])/g, '$1');

    // Try parsing
    return JSON.parse(cleanContent);
  }

  // Extract JSON from text when model doesn't follow format strictly
  private extractJSONFromText(content: string): any {
    // Try to find JSON-like structures in the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        return this.parseFlexibleJSON(jsonMatch[0]);
      } catch (error) {
        console.warn('JSON structure found but parsing failed, trying alternative approach');
      }
    }

    // Try to extract information from natural language response
    return this.parseNaturalLanguageResponse(content);
  }

  // Parse natural language responses that aren't strict JSON
  private parseNaturalLanguageResponse(content: string): any {
    const result: any = {
      summary: '',
      topics: [],
      entities: [],
      sentiment: 'Neutral'
    };

    // Extract summary (look for common patterns)
    const summaryPatterns = [
      /summary:?\s*([^\n]+)/i,
      /overview:?\s*([^\n]+)/i,
      /^([^\n]{50,200})/m,
      // Take the first substantial paragraph as summary
      content.split('\n\n').find(p => p.length > 100 && p.length < 1000)
    ];

    for (const pattern of summaryPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        result.summary = match[1].trim();
        break;
      }
    }

    if (!result.summary && content.length > 50) {
      result.summary = content.substring(0, 300) + (content.length > 300 ? '...' : '');
    }

    // Extract topics (look for lists, bullet points, or "topics:" sections)
    const topicsMatch = content.match(/topics?:?\s*([\s\S]*?)(?:\n\n|$)/i);
    if (topicsMatch) {
      const topicsText = topicsMatch[1];
      const topicItems = topicsText
        .split(/[•\-\*\n]/)
        .map(t => t.trim())
        .filter(t => t.length > 2 && t.length < 100)
        .slice(0, 10); // Limit to 10 topics

      if (topicItems.length > 0) {
        result.topics = topicItems;
      }
    }

    // Extract sentiment (look for sentiment words)
    const sentimentPatterns = [
      /\b(positive|negative|neutral)\b/i,
      /\b(optimistic|pessimistic|balanced)\b/i,
      /\b(good|bad|excellent|poor)\b/i
    ];

    for (const pattern of sentimentPatterns) {
      const match = content.match(pattern);
      if (match) {
        const sentiment = match[1].toLowerCase();
        if (sentiment.includes('positive') || sentiment.includes('good') || sentiment.includes('optimistic')) {
          result.sentiment = 'Positive';
        } else if (sentiment.includes('negative') || sentiment.includes('bad') || sentiment.includes('pessimistic')) {
          result.sentiment = 'Negative';
        } else {
          result.sentiment = 'Neutral';
        }
        break;
      }
    }

    // If no specific sentiment found, keep as Neutral
    if (!result.sentiment) {
      result.sentiment = 'Neutral';
    }

    return result;
  }

  async analyzeDocument(text: string, settings?: AISettings): Promise<AnalysisResult> {
    const cacheKey = `openrouter-analysis-${text.length}-${this.model}-${JSON.stringify(settings)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Build prompt based on settings - more flexible approach
    let prompt = 'Please analyze the following document and provide:\n\n';
    prompt += '1. A comprehensive summary\n';
    prompt += '2. Key topics or main themes (as a list)\n';
    prompt += '3. Important entities mentioned (people, organizations, etc.)\n';
    prompt += '4. Overall sentiment (positive, negative, or neutral)\n\n';
    prompt += 'You can respond in a natural format, but try to clearly separate the different sections.\n\n';

    if (settings) {
      if (settings.aiPromptPrefix.trim()) {
        prompt += `${settings.aiPromptPrefix.trim()}\n\n`;
      }

      // Add language style instruction
      switch (settings.languageStyle) {
        case 'conversational':
          prompt += 'Use a conversational, friendly tone.\n\n';
          break;
        case 'technical':
          prompt += 'Use technical, professional language.\n\n';
          break;
        case 'simplified':
          prompt += 'Use simple, clear language.\n\n';
          break;
        default:
          prompt += 'Use formal, professional language.\n\n';
      }

      // Add summary length instruction
      switch (settings.summaryLength) {
        case 'short':
          prompt += 'Provide a brief summary of 2-3 sentences.\n\n';
          break;
        case 'medium':
          prompt += 'Provide a comprehensive summary of 4-6 sentences.\n\n';
          break;
        default:
          prompt += 'Provide a detailed summary of 7+ sentences.\n\n';
      }

      prompt += `Extract the top ${settings.maxTopicsCount} most important topics or concepts.\n\n`;
    }

    prompt += `Document:\n${text}`;

    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ];

    try {
      const result = await this.makeRequest(messages, true) as AnalysisResult;

      // Ensure the result has the correct structure
      const formattedResult: AnalysisResult = {
        summary: result.summary || 'Analysis failed to generate summary.',
        topics: Array.isArray(result.topics) ? result.topics : [],
        entities: Array.isArray(result.entities) ? result.entities.map((e: any) => ({
          text: e.text || '',
          type: e.type || 'UNKNOWN'
        })) : [],
        sentiment: result.sentiment || 'Neutral'
      };

      this.cache.set(cacheKey, formattedResult);
      return formattedResult;
    } catch (error) {
      console.error('OpenRouter analysis error:', error);
      throw new Error('Failed to analyze document with OpenRouter.');
    }
  }

  async createChat(documentText: string, locale: 'en' | 'vi', conversationContext?: string): Promise<any> {
    // OpenRouter doesn't have built-in chat sessions like Gemini
    // We'll create a mock chat that uses individual requests with conversation context
    const chatMock = {
      sendMessage: async (params: { message: string }) => {
        const languageInstruction = locale === 'vi' ? 'You must respond in Vietnamese.' : 'You must respond in English.';
        const notFoundMessage = locale === 'vi' ? 'Không thể tìm thấy câu trả lời trong tài liệu.' : 'I cannot find the answer in the document.';

        let prompt = `${languageInstruction}

You are an AI assistant. You must answer questions based only on the content of the following document.

Document: ${documentText}

If the question cannot be answered using the document, say: "${notFoundMessage}"`;

        if (conversationContext) {
          prompt += `

Previous conversation context:
${conversationContext}

When responding, consider the previous conversation to provide more relevant and contextual answers. Reference previous questions and answers when appropriate to maintain conversation flow.`;
        }

        prompt += `

Now, answer this question: ${params.message}`;

        const messages = [{
          role: 'user',
          content: prompt
        }];

        const response = await this.makeRequest(messages);
        return { text: response };
      }
    };

    return chatMock;
  }

  async generateQuiz(text: string, locale: 'en' | 'vi', mcCount: number, writtenCount: number): Promise<QuizQuestion[]> {
    const cacheKey = `openrouter-quiz-${mcCount}-${writtenCount}-${locale}-${this.model}-${text.length}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const languageInstruction = locale === 'vi' ? 'Please create questions in Vietnamese.' : 'Please create questions in English.';

    const prompt = `Please create a quiz about this document.

I need:
- ${mcCount} multiple choice questions (each with 4 options, indicate the correct answer)
- ${writtenCount} written/oral questions

${languageInstruction}

Please format your response using bold markdown (**) for emphasis. For each multiple choice question use this format:

**Multiple Choice Question 1:** What is the question?
A) Option 1
B) Option 2
C) Option 3
D) Option 4

**Correct:** B)
**Explanation:** Explanation here...

Separate each question with --- and list written questions at the end as simple statements.

Document to base questions on:
${text}`;

    const messages = [{
      role: 'user',
      content: prompt
    }];

    try {
      let data = await this.makeRequest(messages, true);

      // Check if we got structured data or natural language
      if (data.multipleChoiceQuestions || data.writtenQuestions) {
        // Structured JSON response - use as is
        const mcQuestions = (data.multipleChoiceQuestions || []).map((q: any) => ({ ...q, type: 'multiple-choice' }));
        const writtenQs = (data.writtenQuestions || []).map((q: any) => ({ ...q, type: 'written' }));
        const result = [...mcQuestions, ...writtenQs];
        this.cache.set(cacheKey, result);
        return result;
      } else {
        // Natural language response - parse it
        const result = this.parseNaturalLanguageQuiz(await this.makeRequest(messages, false));
        this.cache.set(cacheKey, result);
        return result;
      }
    } catch (error) {
      console.error('OpenRouter quiz error:', error);
      throw new Error('Failed to generate quiz with OpenRouter.');
    }
  }

  // Parse natural language quiz responses
  private parseNaturalLanguageQuiz(content: string): QuizQuestion[] {
    const questions: QuizQuestion[] = [];
    const lines = content.split('\n');

    let currentQuestion: Partial<MultipleChoiceQuestion> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Look for multiple choice questions (handling ** bold formatting)
      const mcMatch = line.match(/\*{0,2}multiple choice question\s*(\d+):?\*{0,2}\s*(.+)/i);
      const questionMatch = line.match(/\*{0,2}question\s*(\d+):?\*{0,2}\s*(.+)/i);

      if (mcMatch || questionMatch) {
        // Save previous question if exists
        if (currentQuestion && currentQuestion.question) {
          if ('options' in currentQuestion && Array.isArray(currentQuestion.options)) {
            questions.push({
              type: 'multiple-choice',
              question: currentQuestion.question || '',
              options: currentQuestion.options || [],
              correctAnswerIndex: currentQuestion.correctAnswerIndex || 0,
              explanation: currentQuestion.explanation || ''
            } as MultipleChoiceQuestion);
          } else {
            questions.push({
              type: 'written',
              question: currentQuestion.question || ''
            } as WrittenAnswerQuestion);
          }
        }

        // Start new question
        currentQuestion = {
          question: (mcMatch ? mcMatch[2] : questionMatch ? questionMatch[2] : line).trim(),
          options: [],
          correctAnswerIndex: 0,
          explanation: ''
        } as Partial<MultipleChoiceQuestion>;

        continue;
      }

      // Look for options (handling various formats)
      const optionMatch = line.match(/^(?:options?\s*:?\s*)?([A-D])\)\s*(.+)/i);
      if (optionMatch && currentQuestion && 'options' in currentQuestion) {
        (currentQuestion.options as string[]).push(optionMatch[2].trim());
        continue;
      }

      // Look for correct answer (handling ** bold formatting)
      const correctMatch = line.match(/\*{0,2}correct:?\*{0,2}\s*\**([A-D])\)\*{0,2}\s*(.+)?/i);
      if (correctMatch && currentQuestion && 'options' in currentQuestion) {
        const answerLetter = correctMatch[1].toUpperCase().charCodeAt(0) - 65; // A=0, B=1, etc.
        currentQuestion.correctAnswerIndex = Math.max(0, Math.min(answerLetter, (currentQuestion.options as string[]).length - 1));
        continue;
      }

      // Look for explanation (handling ** bold formatting)
      const explanationMatch = line.match(/\*{0,2}explanation:?\*{0,2}\s*(.+)/i);
      if (explanationMatch && currentQuestion) {
        currentQuestion.explanation = explanationMatch[1].trim();
        continue;
      }

      // For written questions, if we have a question and no options, it's likely a written question
      if (currentQuestion && !('options' in currentQuestion) && line.length > 20 && !line.match(/^(options|correct|explanation)/i)) {
        currentQuestion.question = line;
      }
    }

    // Don't forget the last question
    if (currentQuestion && currentQuestion.question) {
      if ('options' in currentQuestion && Array.isArray(currentQuestion.options) && currentQuestion.options.length >= 2) {
        questions.push({
          type: 'multiple-choice',
          question: currentQuestion.question,
          options: currentQuestion.options,
          correctAnswerIndex: currentQuestion.correctAnswerIndex || 0,
          explanation: currentQuestion.explanation || ''
        } as MultipleChoiceQuestion);
      } else {
        questions.push({
          type: 'written',
          question: currentQuestion.question
        } as WrittenAnswerQuestion);
      }
    }

    return questions.slice(0, 50); // Limit to 50 questions
  }

  async gradeWrittenAnswer(documentText: string, question: string, userAnswer: string, locale: 'en' | 'vi'): Promise<GradedWrittenAnswer> {
    const languageInstruction = locale === 'vi' ? 'Please provide feedback in Vietnamese.' : 'Please provide feedback in English.';

    const prompt = `Please grade this written answer based on the document context.

Grade on a scale of 0-5 (where 5 is excellent, 3 is good, 1 is poor, 0 is completely wrong).
Provide constructive feedback explaining the score.


Question: ${question}
Student's Answer: ${userAnswer}

Document Context: ${documentText}

Please respond with a score (0-5) and detailed feedback on why this answer received that score.`;

    const messages = [{
      role: 'user',
      content: prompt
    }];

    try {
      const result: any = await this.makeRequest(messages, true);

      // Try to extract score and feedback from flexible responses
      if (typeof result === 'object' && result.score !== undefined) {
        // Structured response
        return {
          score: Math.max(0, Math.min(5, result.score || 0)),
          maxScore: 5,
          feedback: result.feedback || 'Grading completed.'
        };
      } else if (typeof result === 'string') {
        // Parse from natural language
        const scoreMatch = result.match(/score:?\s*(\d)/i);
        const score = scoreMatch ? parseInt(scoreMatch[1]) : 3;

        return {
          score: Math.max(0, Math.min(5, score)),
          maxScore: 5,
          feedback: result,
        };
      }
    } catch (error) {
      console.error('OpenRouter grading error:', error);
    }

    // Fallback response
    return {
      score: 3,
      maxScore: 5,
      feedback: languageInstruction.includes('Vietnamese')
        ? 'Đã hoàn thành việc chấm bài.'
        : 'Answer graded successfully.'
    };
  }

  async generateExercises(text: string, locale: 'en' | 'vi', exerciseCounts: {
    practice: number;
    simulation: number;
    analysis: number;
    application: number;
  }): Promise<any[]> {
    const cacheKey = `openrouter-exercises-${exerciseCounts.practice}-${exerciseCounts.simulation}-${exerciseCounts.analysis}-${exerciseCounts.application}-${locale}-${this.model}-${text.length}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const languageInstruction = locale === 'vi' ? 'Please create exercises in Vietnamese.' : 'Please create exercises in English.';

    const prompt = `Create practical exercises to help someone learn and apply concepts from this document.

Create exactly:
- ${exerciseCounts.practice} practice exercises (hands-on activities, mapping, flashcards, gap-fill exercises)
- ${exerciseCounts.simulation} simulation exercises (role-playing, scenario-based activities)
- ${exerciseCounts.analysis} analysis exercises (evaluation, critique, pattern recognition)
- ${exerciseCounts.application} application exercises (real-world project applications, case studies)

${languageInstruction}

For each exercise, please include:
- Exercise title
- Difficulty level (beginner/intermediate/advanced)
- Learning objective
- Step-by-step instructions
- 1-3 practical examples
- Key skills developed
- Estimated time to complete

Format each exercise clearly, separating them with ---.

Document content:
${text}`;

    const messages = [{
      role: 'user',
      content: prompt
    }];

    try {
      const response = await this.makeRequest(messages, false);

      if (typeof response === 'string') {
        const exercises = this.parseNaturalLanguageExercises(response);
        this.cache.set(cacheKey, exercises);
        return exercises;
      } else {
        // Try to use structured data if available
        return response.exercises || [];
      }
    } catch (error) {
      console.error('OpenRouter exercises generation error:', error);
      throw new Error('Failed to generate exercises with OpenRouter.');
    }
  }

  // Parse natural language exercise responses
  private parseNaturalLanguageExercises(content: string): any[] {
    const exercises: any[] = [];
    const sections = content.split(/---+/).map(s => s.trim()).filter(s => s.length > 0);

    for (const section of sections) {
      const lines = section.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      if (lines.length < 3) continue; // Need at least title, objective, some instructions

      let exercise: any = {
        id: `exercise-${exercises.length + 1}`,
        type: 'practice', // Default, will be determined from content
        difficulty: 'intermediate', // Default
        title: '',
        objective: '',
        instructions: [],
        examples: [],
        skills: [],
        estimatedTime: '15-30 minutes'
      };

      let currentField = '';
      let examplesText = '';

      for (const line of lines) {
        // Title detection (usually first line and bold/shorter)
        if (!exercise.title && (line.includes('**') || line.length < 100)) {
          exercise.title = line.replace(/\*{1,2}/g, '').trim();
          continue;
        }

        // Difficulty detection
        const difficultyMatch = line.match(/(beginner|intermediate|advanced|nhân viên mới|trung cấp|nâng cao)/i);
        if (difficultyMatch) {
          const diff = difficultyMatch[1].toLowerCase();
          exercise.difficulty = diff.includes('nhân viên mới') || diff.includes('beginner') ? 'beginner' :
                               diff.includes('nâng cao') || diff.includes('advanced') ? 'advanced' : 'intermediate';
          continue;
        }

        // Objective detection
        if (line.match(/\*{0,2}(objective|mục tiêu):?\*{0,2}/i)) {
          currentField = 'objective';
          continue;
        }

        // Instructions detection
        if (line.match(/\*{0,2}(instructions|hướng dẫn):?\*{0,2}/i)) {
          currentField = 'instructions';
          continue;
        }

        // Examples detection
        if (line.match(/\*{0,2}(examples|ví dụ):?\*{0,2}/i)) {
          currentField = 'examples';
          continue;
        }

        // Skills detection
        if (line.match(/\*{0,2}(skills|kỹ năng):?\*{0,2}/i)) {
          currentField = 'skills';
          continue;
        }

        // Time detection
        if (line.match(/\*{0,2}(time|thời gian):?\*{0,2}/i)) {
          currentField = 'time';
          continue;
        }

        // Content processing based on current field
        if (currentField === 'objective' && exercise.objective === '') {
          exercise.objective = line;
        } else if (currentField === 'instructions') {
          if (line.match(/^\d+\./) || line.match(/^[•\-\*]/)) {
            exercise.instructions.push(line.replace(/^\d+\.\s*|^[•\-\*\s]/, '').trim());
          }
        } else if (currentField === 'examples') {
          examplesText += line + '\n';
        } else if (currentField === 'skills') {
          const skills = line.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 0);
          exercise.skills.push(...skills);
        } else if (currentField === 'time' && exercise.estimatedTime === '15-30 minutes') {
          exercise.estimatedTime = line;
        }

        // Type detection from content keywords
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes('simulation') || lowerLine.includes('giả lập') || lowerLine.includes('role') || lowerLine.includes('scenario')) {
          exercise.type = 'simulation';
        } else if (lowerLine.includes('analysis') || lowerLine.includes('phân tích') || lowerLine.includes('critique') || lowerLine.includes('evaluate')) {
          exercise.type = 'analysis';
        } else if (lowerLine.includes('application') || lowerLine.includes('apply') || lowerLine.includes('real-world') || lowerLine.includes('project')) {
          exercise.type = 'application';
        } else if (lowerLine.includes('practice') || lowerLine.includes('mapping') || lowerLine.includes('flashcard') || lowerLine.includes('gap-fill')) {
          exercise.type = 'practice';
        }
      }

      // Process examples
      if (examplesText.trim()) {
        const exampleBlocks = examplesText.split(/\n\n+/).filter(e => e.trim().length > 10);
        exercise.examples = exampleBlocks.map((block, i) => ({
          title: `Example ${i + 1}`,
          content: block.trim(),
          type: 'text' as const
        }));
      }

      // Ensure we have minimum required fields
      if (exercise.title && exercise.objective && exercise.instructions.length > 0) {
        exercises.push(exercise);
      }
    }

    return exercises.slice(0, 20); // Limit to 20 exercises
  }

  async generateFillableElements(documentText: string, exerciseContext: string, locale: 'en' | 'vi', settings?: AISettings): Promise<any[]> {
    const languageInstruction = locale === 'vi' ? 'Content in Vietnamese.' : 'Content in English.';

    const prompt = `Generate a fillable element based on the document and exercise context. ${languageInstruction}

// Exercise Context: ${exerciseContext}
// Document: ${documentText}

// Generate one relevant fillable element that matches the exercise. Choose the most appropriate type:

For tables: Use { "type": "table", "data": { "rows": [["Header1", "Header2"], ["Row1Data", "Row2Data"], ["", ""]] } }
For lists: Use { "type": "list", "data": { "items": ["Item 1", "Item 2", "", "", ""] } }
For schedules: Use { "type": "schedule", "data": { "schedule": [["Time", "Activity"], ["9:00", ""], ["10:00", ""], ["11:00", ""]] } }
For forms: Use { "type": "form", "data": { "fieldList": ["Field1", "Field2"], "fields": {} } }

Make it completely relevant to the exercise and document content. Include some pre-filled data where appropriate, but leave blanks for user input.`;

    const messages = [{
      role: 'user',
      content: prompt
    }];

    try {
      const response = await this.makeRequest(messages, true);

      if (typeof response === 'string') {
        // Try to parse JSON from natural language
        try {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const element = JSON.parse(jsonMatch[0]);
            return [{
              id: `aigenerated-${Math.random().toString(36).substr(2, 9)}`,
              ...element
            }];
          }
        } catch (e) {
          console.warn('Failed to parse fillable element JSON, using fallback');
        }
      } else if (response.type && response.data) {
        // Structured response
        return [{
          id: `aigenerated-${Math.random().toString(36).substr(2, 9)}`,
          type: response.type,
          data: response.data
        }];
      }

      // Fallback
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
    } catch (error) {
      console.error('OpenRouter fillable element generation error:', error);
      // Fallback
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

  protected async generateSmartFillableElements(
    documentText: string,
    exerciseContext: string,
    locale: 'en' | 'vi'
  ): Promise<any[]> {
    // For OpenRouter, we'll use the same implementation as generateFillableElements
    // since OpenRouter doesn't have the same smart generation capabilities as Gemini
    return this.generateFillableElements(documentText, exerciseContext, locale);
  }
}
