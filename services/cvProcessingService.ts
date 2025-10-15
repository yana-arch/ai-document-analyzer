import { CVParseResult } from '../types';

// Dynamically import mammoth for DOC/DOCX processing
const loadMammoth = async () => {
  try {
    const mammoth = await import('mammoth');
    return mammoth;
  } catch (error) {
    console.warn('Mammoth not available for DOC/DOCX processing');
    return null;
  }
};

// Dynamically import PDF.js for PDF processing
const loadPDFJS = async () => {
  try {
    const pdfjsLib = await import('pdfjs-dist');

    // Set worker path for PDF.js - try multiple approaches
    if (typeof window !== 'undefined') {
      try {
        // Try using the worker from node_modules directly
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).href;
      } catch (workerError) {
        console.warn('Failed to set worker path, PDF processing may not work:', workerError);
        // Continue without worker - some PDF features might still work
      }
    }

    return pdfjsLib;
  } catch (error) {
    console.warn('PDF.js not available for PDF processing');
    return null;
  }
};

export class CVProcessingService {
  /**
   * Extract text content from CV file
   */
  static async extractTextFromCV(file: File): Promise<string> {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    switch (fileExtension) {
      case 'pdf':
        return this.extractFromPDF(file);
      case 'docx':
      case 'doc':
        return this.extractFromDoc(file);
      case 'txt':
        return this.extractFromText(file);
      default:
        throw new Error(`Unsupported file type: ${fileExtension}. Supported formats: PDF, DOC, DOCX, TXT`);
    }
  }

  /**
   * Extract text from PDF file using PDF.js
   */
  private static async extractFromPDF(file: File): Promise<string> {
    try {
      const pdfjsLib = await loadPDFJS();
      if (!pdfjsLib) {
        throw new Error('PDF.js library not available');
      }

      const arrayBuffer = await file.arrayBuffer();

      // Try to load PDF document
      let pdf;
      try {
        pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      } catch (pdfError) {
        console.warn('PDF loading failed, falling back to text input:', pdfError);
        throw new Error('PDF file could not be processed. For now, please paste your CV content directly in the text area.');
      }

      let fullText = '';

      // Extract text from each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();

          // Combine text items from the page
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');

          fullText += pageText + '\n';
        } catch (pageError) {
          console.warn(`Failed to extract text from page ${pageNum}:`, pageError);
          fullText += `[Page ${pageNum} - extraction failed]\n`;
        }
      }

      const trimmedText = fullText.trim();
      if (!trimmedText) {
        throw new Error('No text content found in PDF. Please ensure the PDF contains selectable text or paste the content directly.');
      }

      return trimmedText;
    } catch (error) {
      console.error('PDF extraction error:', error);

      // Provide helpful error messages
      if (error.message.includes('worker')) {
        throw new Error('PDF processing is currently unavailable. Please paste your CV content directly in the text area below.');
      }

      throw new Error(error.message || 'Failed to extract text from PDF file. Please paste your CV content directly.');
    }
  }

  /**
   * Extract text from DOC/DOCX file using mammoth.js
   */
  private static async extractFromDoc(file: File): Promise<string> {
    try {
      const mammoth = await loadMammoth();
      if (!mammoth) {
        throw new Error('Mammoth library not available');
      }

      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });

      return result.value.trim();
    } catch (error) {
      console.error('DOC/DOCX extraction error:', error);
      throw new Error('Failed to extract text from document file. Please ensure the document contains readable text.');
    }
  }

  /**
   * Extract text from TXT file
   */
  private static async extractFromText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        resolve(text);
      };
      reader.onerror = () => reject(new Error('Failed to read text file'));
      reader.readAsText(file);
    });
  }

  /**
   * Parse CV text to extract structured information
   */
  static parseCVContent(cvText: string): CVParseResult {
    const lines = cvText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    const result: CVParseResult = {
      personalInfo: {},
      experience: [],
      education: [],
      skills: [],
      rawText: cvText
    };

    let currentSection = '';
    let currentCompany = '';
    let currentPosition = '';
    let currentDescription = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      const originalLine = lines[i];

      // Detect sections
      if (line.includes('contact') || line.includes('personal') || line.includes('info')) {
        currentSection = 'personal';
        continue;
      } else if (line.includes('experience') || line.includes('work') || line.includes('employment')) {
        currentSection = 'experience';
        continue;
      } else if (line.includes('education') || line.includes('academic') || line.includes('degree')) {
        currentSection = 'education';
        continue;
      } else if (line.includes('skill') || line.includes('technology') || line.includes('expertise')) {
        currentSection = 'skills';
        continue;
      } else if (line.includes('summary') || line.includes('objective') || line.includes('profile')) {
        currentSection = 'summary';
        continue;
      }

      // Parse based on current section
      switch (currentSection) {
        case 'personal':
          this.parsePersonalInfo(originalLine, result);
          break;
        case 'experience':
          this.parseExperienceInfo(lines, i, result);
          break;
        case 'education':
          this.parseEducationInfo(originalLine, result);
          break;
        case 'skills':
          this.parseSkillsInfo(originalLine, result);
          break;
        case 'summary':
          if (!result.summary) {
            result.summary = originalLine;
          }
          break;
      }
    }

    return result;
  }

  /**
   * Parse personal information section
   */
  private static parsePersonalInfo(line: string, result: CVParseResult): void {
    const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/;
    const phoneRegex = /(\+\d{1,3}[- ]?)?\d{3}[- ]?\d{3}[- ]?\d{4}/;

    const emailMatch = line.match(emailRegex);
    if (emailMatch) {
      result.personalInfo.email = emailMatch[0];
    }

    const phoneMatch = line.match(phoneRegex);
    if (phoneMatch) {
      result.personalInfo.phone = phoneMatch[0];
    }

    // Try to extract name (usually first non-empty line in personal section)
    if (!result.personalInfo.name && line.length > 2 && !line.includes('@') && !line.match(phoneRegex)) {
      result.personalInfo.name = line;
    }
  }

  /**
   * Parse experience information
   */
  private static parseExperienceInfo(lines: string[], index: number, result: CVParseResult): void {
    const line = lines[index];
    const nextLine = index + 1 < lines.length ? lines[index + 1] : '';

    // Check if this looks like a company/position line
    if (line.length > 0 && !line.toLowerCase().includes('experience') && !line.toLowerCase().includes('work')) {
      // Check if next line looks like a date/duration
      if (nextLine && (nextLine.includes('20') || nextLine.includes('-') || nextLine.toLowerCase().includes('present'))) {
        const experience = {
          company: line,
          position: nextLine,
          duration: index + 2 < lines.length ? lines[index + 2] : '',
          description: index + 3 < lines.length ? lines[index + 3] : ''
        };
        result.experience.push(experience);
      }
    }
  }

  /**
   * Parse education information
   */
  private static parseEducationInfo(line: string, result: CVParseResult): void {
    if (line.includes('University') || line.includes('College') || line.includes('Bachelor') ||
        line.includes('Master') || line.includes('PhD') || line.includes('Degree')) {
      const education = {
        institution: line,
        degree: '',
        field: '',
        year: ''
      };
      result.education.push(education);
    }
  }

  /**
   * Parse skills information
   */
  private static parseSkillsInfo(line: string, result: CVParseResult): void {
    // Split by common separators
    const skills = line.split(/[,;•·]/).map(skill => skill.trim()).filter(skill => skill.length > 0);

    // Extract individual skills
    const technicalSkills = skills.filter(skill =>
      !skill.toLowerCase().includes('communication') &&
      !skill.toLowerCase().includes('leadership') &&
      !skill.toLowerCase().includes('teamwork') &&
      skill.length > 1
    );

    result.skills.push(...technicalSkills);
  }

  /**
   * Generate summary based on parsed CV data
   */
  static generateCVSummary(parsedCV: CVParseResult): string {
    let summary = '';

    if (parsedCV.personalInfo.name) {
      summary += `${parsedCV.personalInfo.name} is a professional `;
    }

    if (parsedCV.experience.length > 0) {
      const latestExperience = parsedCV.experience[0];
      summary += `with experience as ${latestExperience.position} at ${latestExperience.company}. `;
    }

    if (parsedCV.skills.length > 0) {
      summary += `Key skills include: ${parsedCV.skills.slice(0, 5).join(', ')}. `;
    }

    if (parsedCV.education.length > 0) {
      const latestEducation = parsedCV.education[0];
      summary += `Education: ${latestEducation.degree} from ${latestEducation.institution}.`;
    }

    return summary || 'CV content has been parsed and is ready for analysis.';
  }
}
