import { HistoryItem, DocumentHistoryItem, InterviewHistoryItem } from '../types';
import jsPDF from 'jspdf';

export interface ExportOptions {
  format: 'pdf' | 'json' | 'csv';
  includeDocumentContent?: boolean;
  includeAnalysis?: boolean;
  includeInterviewDetails?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

/**
 * Export history items to various formats
 */
export class ExportService {
  /**
   * Export items to PDF format
   */
  static async exportToPDF(
    items: HistoryItem[],
    options: ExportOptions,
    filename?: string
  ): Promise<void> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Title
    doc.setFontSize(20);
    doc.text('AI Document Analyzer - History Export', margin, yPosition);
    yPosition += 20;

    // Export date
    doc.setFontSize(10);
    doc.text(`Exported on: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 15;

    // Process each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Check if we need a new page
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = margin;
      }

      if (item.type === 'document') {
        await this.addDocumentToPDF(doc, item, options, yPosition, margin);
      } else if (item.type === 'interview') {
        await this.addInterviewToPDF(doc, item, options, yPosition, margin);
      }

      yPosition += 40;
    }

    // Save the PDF
    const finalFilename = filename || `ai-analyzer-export-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(finalFilename);
  }

  /**
   * Export items to JSON format
   */
  static async exportToJSON(
    items: HistoryItem[],
    options: ExportOptions,
    filename?: string
  ): Promise<void> {
    const exportData = {
      exportDate: new Date().toISOString(),
      totalItems: items.length,
      exportOptions: options,
      items: items.map(item => this.sanitizeForExport(item, options))
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `ai-analyzer-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Export items to CSV format
   */
  static async exportToCSV(
    items: HistoryItem[],
    options: ExportOptions,
    filename?: string
  ): Promise<void> {
    const headers = ['Type', 'Title', 'Date', 'Summary', 'Details'];
    const csvData = [headers.join(',')];

    items.forEach(item => {
      if (item.type === 'document') {
        csvData.push([
          'Document',
          `"${item.fileName}"`,
          `"${item.date}"`,
          `"${item.analysis?.summary?.substring(0, 100) || ''}"`,
          `"Topics: ${item.analysis?.topics?.join(', ') || ''}"`
        ].join(','));
      } else if (item.type === 'interview') {
        csvData.push([
          'Interview',
          `"${item.interview.targetPosition}"`,
          `"${item.date}"`,
          `"${item.interview.interviewType}"`,
          `"Score: ${item.interview.overallScore || 'N/A'}"`
        ].join(','));
      }
    });

    const csvString = csvData.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `ai-analyzer-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Add document item to PDF
   */
  private static async addDocumentToPDF(
    doc: jsPDF,
    item: DocumentHistoryItem,
    options: ExportOptions,
    yPosition: number,
    margin: number
  ): Promise<void> {
    // Document header
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229); // Indigo color
    doc.text(`📄 ${item.fileName}`, margin, yPosition);
    yPosition += 10;

    // Date
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128); // Gray color
    doc.text(`Analyzed on: ${new Date(item.date).toLocaleString()}`, margin, yPosition);
    yPosition += 15;

    if (options.includeAnalysis && item.analysis) {
      // Summary
      if (item.analysis.summary) {
        doc.setFontSize(11);
        doc.setTextColor(31, 41, 55); // Dark gray
        const summaryLines = doc.splitTextToSize(`Summary: ${item.analysis.summary}`, 170);
        doc.text(summaryLines, margin, yPosition);
        yPosition += summaryLines.length * 5 + 5;
      }

      // Topics
      if (item.analysis.topics && item.analysis.topics.length > 0) {
        doc.setFontSize(10);
        doc.text(`Topics: ${item.analysis.topics.join(', ')}`, margin, yPosition);
        yPosition += 10;
      }

      // Sentiment
      if (item.analysis.sentiment) {
        doc.text(`Sentiment: ${item.analysis.sentiment}`, margin, yPosition);
        yPosition += 10;
      }
    }

    // Document content preview (if requested)
    if (options.includeDocumentContent && item.documentText) {
      yPosition += 5;
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      const preview = item.documentText.substring(0, 500) + '...';
      const contentLines = doc.splitTextToSize(`Content Preview: ${preview}`, 170);
      doc.text(contentLines, margin, yPosition);
    }
  }

  /**
   * Add interview item to PDF
   */
  private static async addInterviewToPDF(
    doc: jsPDF,
    item: InterviewHistoryItem,
    options: ExportOptions,
    yPosition: number,
    margin: number
  ): Promise<void> {
    // Interview header
    doc.setFontSize(14);
    doc.setTextColor(139, 92, 246); // Purple color
    doc.text(`👤 Interview: ${item.interview.targetPosition}`, margin, yPosition);
    yPosition += 10;

    // Date
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Completed on: ${new Date(item.date).toLocaleString()}`, margin, yPosition);
    yPosition += 15;

    // Interview details
    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55);
    doc.text(`Type: ${item.interview.interviewType}`, margin, yPosition);
    yPosition += 8;

    if (item.interview.overallScore !== undefined) {
      doc.text(`Overall Score: ${item.interview.overallScore.toFixed(1)}%`, margin, yPosition);
      yPosition += 8;
    }

    if (item.interview.feedback?.positionFit) {
      doc.text(`Position Fit: ${item.interview.feedback.positionFit}`, margin, yPosition);
      yPosition += 8;
    }

    // Questions and answers (if requested)
    if (options.includeInterviewDetails && item.interview.answers) {
      yPosition += 5;
      doc.setFontSize(10);
      doc.text(`Questions Answered: ${item.interview.answers.length}/${item.interview.questions.length}`, margin, yPosition);
      yPosition += 8;

      // Add some Q&A details
      item.interview.answers.slice(0, 3).forEach((answer, index) => {
        if (yPosition > 250) { // Check if we need a new page
          doc.addPage();
          yPosition = margin;
        }

        const question = item.interview.questions.find(q => q.id === answer.questionId);
        if (question) {
          doc.text(`Q${index + 1}: ${question.question.substring(0, 80)}...`, margin, yPosition);
          yPosition += 8;
          doc.text(`Score: ${answer.score}%`, margin + 10, yPosition);
          yPosition += 8;
        }
      });
    }
  }

  /**
   * Sanitize item data for export
   */
  private static sanitizeForExport(item: HistoryItem, options: ExportOptions): any {
    const sanitized: any = {
      type: item.type,
      date: item.date
    };

    if (item.type === 'document') {
      sanitized.fileName = item.fileName;

      if (options.includeAnalysis && item.analysis) {
        sanitized.analysis = {
          summary: item.analysis.summary,
          topics: item.analysis.topics,
          sentiment: item.analysis.sentiment,
          entities: item.analysis.entities?.length || 0
        };
      }

      if (options.includeDocumentContent) {
        sanitized.documentText = item.documentText?.substring(0, 1000) + '...'; // Limit content size
      }
    } else if (item.type === 'interview') {
      sanitized.targetPosition = item.interview.targetPosition;
      sanitized.interviewType = item.interview.interviewType;
      sanitized.overallScore = item.interview.overallScore;

      if (options.includeInterviewDetails) {
        sanitized.feedback = item.interview.feedback;
        sanitized.questionCount = item.interview.questions.length;
        sanitized.answerCount = item.interview.answers.length;
      }

      if (options.includeDocumentContent) {
        sanitized.cvContent = item.interview.cvContent?.substring(0, 1000) + '...';
      }
    }

    return sanitized;
  }

  /**
   * Get file size estimate for export
   */
  static getExportSizeEstimate(items: HistoryItem[], options: ExportOptions): string {
    const itemCount = items.length;
    let estimatedSize = 0;

    // Base size per item
    estimatedSize += itemCount * 1024; // 1KB per item base

    // Additional size based on options
    if (options.includeDocumentContent) {
      items.forEach(item => {
        if (item.type === 'document' && item.documentText) {
          estimatedSize += item.documentText.length;
        } else if (item.type === 'interview' && item.interview.cvContent) {
          estimatedSize += item.interview.cvContent.length;
        }
      });
    }

    if (options.includeAnalysis) {
      items.forEach(item => {
        if (item.type === 'document' && item.analysis) {
          estimatedSize += JSON.stringify(item.analysis).length;
        }
      });
    }

    // Convert to human readable format
    if (estimatedSize < 1024) return `${estimatedSize} B`;
    if (estimatedSize < 1024 * 1024) return `${(estimatedSize / 1024).toFixed(1)} KB`;
    return `${(estimatedSize / (1024 * 1024)).toFixed(1)} MB`;
  }
}

/**
 * Legacy export function for backward compatibility
 */
export async function exportHistory(items: HistoryItem[]): Promise<void> {
  await ExportService.exportToJSON(items, {
    format: 'json',
    includeDocumentContent: false,
    includeAnalysis: true,
    includeInterviewDetails: true
  });
}
