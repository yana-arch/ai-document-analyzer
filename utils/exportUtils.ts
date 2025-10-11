import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { Exercise } from '../types';

export class ExerciseExportUtils {
  /**
   * Export exercises to PDF
   */
  static async exportToPDF(exercises: Exercise[], filename = 'exercises'): Promise<void> {
    try {
      const pdf = new jsPDF();
      const margin = 20;
      let yPosition = 30;

      // Title
      pdf.setFontSize(20);
      pdf.text('Skill Exercises', margin, yPosition);
      yPosition += 20;

      exercises.forEach((exercise, index) => {
        // Check if we need a new page
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }

        // Exercise title
        pdf.setFontSize(14);
        pdf.setFont('bold');
        const title = `${index + 1}. ${exercise.title}`;
        const lines = pdf.splitTextToSize(title, 170);
        pdf.text(lines, margin, yPosition);
        yPosition += lines.length * 6 + 5;

        // Exercise type and difficulty
        pdf.setFontSize(10);
        pdf.setFont('normal');
        const metadata = `Type: ${exercise.type} | Difficulty: ${exercise.difficulty}`;
        pdf.text(metadata, margin + 5, yPosition);
        yPosition += 10;

        // Objective
        pdf.setFontSize(12);
        pdf.setFont('bold');
        pdf.text('Objective:', margin, yPosition);
        yPosition += 8;
        pdf.setFont('normal');
        const objectiveLines = pdf.splitTextToSize(exercise.objective, 170);
        pdf.text(objectiveLines, margin, yPosition);
        yPosition += objectiveLines.length * 6 + 10;

        // Instructions
        pdf.setFontSize(12);
        pdf.setFont('bold');
        pdf.text('Instructions:', margin, yPosition);
        yPosition += 8;
        pdf.setFont('normal');
        exercise.instructions.forEach((instruction, i) => {
          if (yPosition > 270) {
            pdf.addPage();
            yPosition = 20;
          }
          const instructionText = `${i + 1}. ${instruction}`;
          const instructionLines = pdf.splitTextToSize(instructionText, 165);
          pdf.text(instructionLines, margin + 5, yPosition);
          yPosition += instructionLines.length * 6;
        });
        yPosition += 10;

        // Examples
        if (exercise.examples.length > 0) {
          if (yPosition > 250) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.setFontSize(12);
          pdf.setFont('bold');
          pdf.text('Examples:', margin, yPosition);
          yPosition += 8;
          pdf.setFont('normal');

          exercise.examples.forEach((example) => {
            if (yPosition > 270) {
              pdf.addPage();
              yPosition = 20;
            }
            if (example.title) {
              pdf.setFont('bold');
              pdf.text(example.title, margin + 5, yPosition);
              yPosition += 6;
              pdf.setFont('normal');
            }
            const exampleLines = pdf.splitTextToSize(example.content, 165);
            pdf.text(exampleLines, margin + 5, yPosition);
            yPosition += exampleLines.length * 6 + 8;
          });
        }

        // Skills
        if (exercise.skills.length > 0) {
          if (yPosition > 270) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.setFontSize(12);
          pdf.setFont('bold');
          pdf.text('Skills:', margin, yPosition);
          yPosition += 8;
          pdf.setFont('normal');
          const skillsText = exercise.skills.join(', ');
          const skillsLines = pdf.splitTextToSize(skillsText, 170);
          pdf.text(skillsLines, margin, yPosition);
          yPosition += skillsLines.length * 6 + 15;
        }

        // Fillable elements (only for fillable exercises)
        if (exercise.type === 'fillable' && 'fillableElements' in exercise && (exercise as any).fillableElements?.length > 0) {
          if (yPosition > 270) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.setFontSize(12);
          pdf.setFont('bold');
          pdf.text('Fillable Elements:', margin, yPosition);
          yPosition += 8;
          pdf.setFont('normal');

          const fillableElements = (exercise as any).fillableElements;
          fillableElements.forEach((element: any, elemIndex: number) => {
            if (yPosition > 270) {
              pdf.addPage();
              yPosition = 20;
            }

            pdf.setFont('bold');
            pdf.text(`${element.type.charAt(0).toUpperCase() + element.type.slice(1)}:`, margin + 5, yPosition);
            yPosition += 6;
            pdf.setFont('normal');

            if (element.type === 'form' && element.data) {
              const jsonData = JSON.stringify({ "type": "form", "data": element.data }, null, 2);
              const jsonLines = pdf.splitTextToSize(jsonData, 160);
              pdf.setFontSize(8);
              pdf.text(jsonLines, margin + 10, yPosition);
              yPosition += jsonLines.length * 4 + 10;
              pdf.setFontSize(10);
            } else if (element.data) {
              let dataText = '';
              if (element.type === 'table' && element.data.rows) {
                dataText = element.data.rows.map((row: string[]) => row.join(' | ')).join('\n');
              } else if (element.type === 'list' && element.data.items) {
                dataText = element.data.items.join(', ');
              } else {
                dataText = JSON.stringify(element.data, null, 2);
              }
              const dataLines = pdf.splitTextToSize(dataText, 160);
              pdf.setFontSize(8);
              pdf.text(dataLines, margin + 10, yPosition);
              yPosition += dataLines.length * 4 + 10;
              pdf.setFontSize(10);
            }
          });
        }

        // Add page break after each exercise (except the last one)
        if (index < exercises.length - 1) {
          pdf.addPage();
          yPosition = 30; // Reset to top margin for new page
        } else {
          yPosition += 10; // Space for last exercise
        }
      });

      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      throw new Error('Failed to export to PDF');
    }
  }

  /**
   * Export exercises to DOCX (HTML file saved as DOCX)
   */
  static exportToDOCX(exercises: Exercise[], filename = 'exercises'): void {
    try {
      // Generate HTML content with Word-compatible styling
      const htmlContent = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>Skill Exercises</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>90</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]--></head>
<body style="font-family: 'Times New Roman', serif; font-size: 12pt;">
  <h1 style="text-align: center; margin-bottom: 30pt;">Skill Exercises</h1>
  ${exercises.map((exercise, index) => `
    <div style="page-break-before: always; margin-bottom: 30pt;">
      <h2 style="color: #2563eb; border-bottom: 1pt solid #2563eb; padding-bottom: 5pt;">${index + 1}. ${exercise.title}</h2>
      <p style="margin: 10pt 0;"><strong>Type:</strong> ${exercise.type} | <strong>Difficulty:</strong> ${exercise.difficulty} | <strong>Time:</strong> ${exercise.estimatedTime || 'Not specified'}</p>
      <h3 style="margin: 15pt 0 8pt 0;">🎯 Objective</h3>
      <p style="margin-bottom: 15pt;">${exercise.objective}</p>
      <h3 style="margin: 15pt 0 8pt 0;">📝 Instructions</h3>
      <ol style="margin-bottom: 15pt;">
        ${exercise.instructions.map(instruction => `<li style="margin-bottom: 5pt;">${instruction}</li>`).join('')}
      </ol>
      ${exercise.examples.length > 0 ? `
        <h3 style="margin: 15pt 0 8pt 0;">💡 Examples</h3>
        ${exercise.examples.map(example => `
          <div style="margin-bottom: 10pt; padding: 8pt; background: #f8fafc; border-left: 3pt solid #3b82f6;">
            ${example.title ? `<strong>${example.title}</strong><br>` : ''}
            ${example.content.replace(/\n/g, '<br>')}
          </div>
        `).join('')}
      ` : ''}
      ${exercise.skills.length > 0 ? `
        <h3 style="margin: 15pt 0 8pt 0;">🛠️ Skills Developed</h3>
        <div style="margin-bottom: 15pt;">${exercise.skills.map(skill => `<span style="background: #dbeafe; color: #1e40af; padding: 2pt 6pt; margin: 1pt 3pt 1pt 0; border-radius: 8pt; font-size: 10pt;">#${skill}</span>`).join('')}</div>
      ` : ''}
      ${exercise.type === 'fillable' && 'fillableElements' in exercise && (exercise as any).fillableElements?.length > 0 ? `
        <h3 style="margin: 15pt 0 8pt 0;">📋 Fillable Elements</h3>
        ${(exercise as any).fillableElements.map((element: any) => `
          <div style="margin-bottom: 15pt; padding: 10pt; background: #f8fafc; border-left: 4pt solid #3b82f6;">
            <strong>${element.type.charAt(0).toUpperCase() + element.type.slice(1)}:</strong><br/>
            ${element.type === 'form' && element.data ?
              `<pre style="background: #f1f5f9; padding: 8pt; border-radius: 4pt; font-size: 10pt; margin-top: 8pt; white-space: pre-wrap;">${JSON.stringify({ "type": "form", "data": element.data }, null, 2)}</pre>` :
              element.data ? JSON.stringify(element.data, null, 2) : 'No data'
            }
          </div>
        `).join('')}
      ` : ''}
    </div>
  `).join('')}
</body>
</html>`;

      // Create blob and save as .docx using native browser download
      const blob = new Blob([htmlContent], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('DOCX export error:', error);
      throw new Error('Failed to export to DOCX');
    }
  }

  /**
   * Export exercises to Excel
   */
  static exportToExcel(exercises: Exercise[], filename = 'exercises'): void {
    try {
      const data: any[] = [];

      // Add header
      data.push(['Skill Exercises Export']);
      data.push([]); // Empty row

      exercises.forEach((exercise, index) => {
        data.push([`Exercise ${index + 1}: ${exercise.title}`]);
        data.push(['Type', 'Difficulty', 'Estimated Time']);
        data.push([exercise.type, exercise.difficulty, exercise.estimatedTime || 'N/A']);
        data.push([]); // Empty row

        data.push(['Objective']);
        data.push([exercise.objective]);
        data.push([]); // Empty row

        data.push(['Instructions']);
        exercise.instructions.forEach((instruction, i) => {
          data.push([`${i + 1}. ${instruction}`]);
        });
        data.push([]); // Empty row

        if (exercise.examples.length > 0) {
          data.push(['Examples']);
          exercise.examples.forEach((example) => {
            if (example.title) {
              data.push([example.title]);
            }
            data.push([example.content]);
          });
          data.push([]); // Empty row
        }

        if (exercise.skills.length > 0) {
          data.push(['Skills']);
          data.push([exercise.skills.join(', ')]);
        }

        // Fillable elements (only for fillable exercises)
        if (exercise.type === 'fillable' && 'fillableElements' in exercise && (exercise as any).fillableElements?.length > 0) {
          data.push(['Fillable Elements']);
          const fillableElements = (exercise as any).fillableElements;
          fillableElements.forEach((element: any) => {
            data.push([`${element.type.charAt(0).toUpperCase() + element.type.slice(1)}:`]);
            if (element.type === 'form' && element.data) {
              data.push([JSON.stringify({ "type": "form", "data": element.data }, null, 2)]);
            } else if (element.data) {
              let dataText = '';
              if (element.type === 'table' && element.data.rows) {
                dataText = element.data.rows.map((row: string[]) => row.join(' | ')).join('\n');
              } else if (element.type === 'list' && element.data.items) {
                dataText = element.data.items.join(', ');
              } else {
                dataText = JSON.stringify(element.data, null, 2);
              }
              data.push([dataText]);
            }
            data.push([]); // Empty row
          });
        }

        data.push([]); // Empty row between exercises
      });

      const worksheet = XLSX.utils.aoa_to_sheet(data);

      // Style worksheet
      worksheet['!cols'] = [{ width: 50 }]; // Set column width

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Exercises');

      XLSX.writeFile(workbook, `${filename}.xlsx`);
    } catch (error) {
      console.error('Excel export error:', error);
      throw new Error('Failed to export to Excel');
    }
  }

  /**
   * Get HTML representation of exercises for printing/preview
   */
  static generateHTML(exercises: Exercise[]): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Skill Exercises</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 20px;
            color: #333;
          }
          h1 {
            color: #2563eb;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
          }
          .exercise {
            margin-bottom: 30px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 20px;
            page-break-before: always;
          }
          .exercise-title {
            font-size: 18px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 8px;
          }
          .exercise-meta {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 15px;
            display: flex;
            gap: 15px;
          }
          .meta-item {
            display: inline-flex;
            align-items: center;
            gap: 5px;
          }
          .meta-label {
            font-weight: 600;
          }
          .difficulty {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .difficulty.beginner { background: #dcfce7; color: #166534; }
          .difficulty.intermediate { background: #fef3c7; color: #92400e; }
          .difficulty.advanced { background: #fecaca; color: #991b1b; }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #374151;
            margin: 20px 0 10px 0;
          }
          .instruction {
            margin-left: 20px;
            margin-bottom: 5px;
          }
          .example {
            margin-left: 20px;
            margin-bottom: 15px;
            padding: 10px;
            background: #f8fafc;
            border-left: 4px solid #3b82f6;
          }
          .example-title {
            font-weight: bold;
            margin-bottom: 5px;
          }
          .skills {
            margin-top: 15px;
            padding: 10px;
            background: #eef2ff;
            border-radius: 6px;
          }
          .skill-tag {
            display: inline-block;
            background: #dbeafe;
            color: #1e40af;
            padding: 2px 8px;
            margin: 2px 4px 2px 0;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
          }
          .print-date {
            position: fixed;
            top: 20px;
            right: 20px;
            font-size: 12px;
            color: #6b7280;
          }
          @media print {
            body { margin: 0; }
            .exercise { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="print-date">${new Date().toLocaleDateString()}</div>
        <h1>Skill Exercises</h1>
        ${exercises.map((exercise, index) => `
          <div class="exercise">
            <div class="exercise-title">${index + 1}. ${exercise.title}</div>
            <div class="exercise-meta">
              <span class="meta-item">
                <span class="meta-label">Type:</span> ${exercise.type}
              </span>
              <span class="meta-item">
                <span class="difficulty difficulty-${exercise.difficulty}">${exercise.difficulty}</span>
              </span>
              <span class="meta-item">
                <span class="meta-label">Time:</span> ${exercise.estimatedTime || 'Not specified'}
              </span>
            </div>
            <div class="section-title">🎯 Objective</div>
            <p>${exercise.objective}</p>
            <div class="section-title">📝 Instructions</div>
            <ol>
              ${exercise.instructions.map(instruction => `<li class="instruction">${instruction}</li>`).join('')}
            </ol>
            ${exercise.examples.length > 0 ? `
              <div class="section-title">💡 Examples</div>
              ${exercise.examples.map(example => `
                <div class="example">
                  ${example.title ? `<div class="example-title">${example.title}</div>` : ''}
                  <div>${example.content.replace(/\n/g, '<br>')}</div>
                </div>
              `).join('')}
            ` : ''}
            ${exercise.skills.length > 0 ? `
              <div class="section-title">🛠️ Skills Developed</div>
              <div class="skills">
                ${exercise.skills.map(skill => `<span class="skill-tag">#${skill}</span>`).join('')}
              </div>
            ` : ''}
            ${exercise.type === 'fillable' && 'fillableElements' in exercise && (exercise as any).fillableElements?.length > 0 ? `
              <div class="section-title">📋 Fillable Elements</div>
              ${(exercise as any).fillableElements.map((element: any) => `
                <div class="example" style="margin-bottom: 15px; padding: 10px; background: #f8fafc; border-left: 4px solid #3b82f6;">
                  <div class="example-title">${element.type.charAt(0).toUpperCase() + element.type.slice(1)}:</div>
                  ${element.type === 'form' && element.data ?
                    `<pre style="background: #f1f5f9; padding: 8pt; border-radius: 4pt; font-size: 10pt; margin-top: 8pt; white-space: pre-wrap;">${JSON.stringify({ "type": "form", "data": element.data }, null, 2)}</pre>` :
                    element.data ? `<div>${JSON.stringify(element.data, null, 2).replace(/\n/g, '<br>')}</div>` : '<div>No data</div>'
                  }
                </div>
              `).join('')}
            ` : ''}
          </div>
        `).join('')}
      </body>
      </html>
    `;
  }

  /**
   * Print exercises
   */
  static printExercises(exercises: Exercise[]): void {
    const html = this.generateHTML(exercises);
    const printWindow = window.open('', '_blank');

    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } else {
      throw new Error('Failed to open print window');
    }
  }
}
