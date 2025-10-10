
/**
 * Extracts text from a PDF file buffer
 * @param arrayBuffer The PDF file buffer
 * @returns Extracted text content
 */
const extractTextFromPdf = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  try {
    // For now, return a placeholder message as PDF parsing in browser is complex
    // This is a simplified implementation for the demo
    // In production, you'd want proper PDF parsing on a backend
    console.log("PDF file detected - simplified text extraction used");

    // Basic heuristic: try to extract readable text patterns from the binary data
    const uint8Array = new Uint8Array(arrayBuffer);
    let text = '';

    // Look for text segments between parentheses (PDF text objects)
    const pdfContent = String.fromCharCode.apply(null, Array.from(uint8Array));
    const textMatches = pdfContent.match(/\(([^)]{10,})\)/g); // Find long text segments in parentheses

    if (textMatches) {
      text = textMatches
        .map(match => match.slice(1, -1)) // Remove parentheses
        .join(' ')
        .replace(/[^\x20-\x7E\n]/g, '') // Keep only printable ASCII
        .replace(/\s+/g, ' ')
        .trim();
    }

    if (text.length < 50) {
      throw new Error("PDF text extraction yielded insufficient content");
    }

    return text;
  } catch (error) {
    console.error("Failed to extract text from PDF:", error);
    throw new Error("error.pdfProcessing");
  }
};

/**
 * Extracts text from a DOCX file buffer
 * @param arrayBuffer The DOCX file buffer
 * @returns Extracted text content
 */
const extractTextFromDocx = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  try {
    // Dynamic import for mammoth
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.replace(/(\r\n|\n|\r)/gm, "\n").replace(/[\t ]+/g, ' ').trim();
  } catch (error) {
    console.error("Failed to extract text from DOCX:", error);
    throw new Error("error.docxProcessing");
  }
};

/**
 * Extracts clean text from an HTML string by parsing it, removing non-content tags, and cleaning up whitespace.
 * @param html The HTML content as a string.
 * @returns The extracted plain text.
 */
const extractTextFromHtml = (html: string): string => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Remove elements that don't typically contribute to the main article content
    doc.querySelectorAll('script, style, nav, header, footer, aside, form, button, [role="navigation"], [role="banner"], [role="contentinfo"]').forEach(el => el.remove());

    const body = doc.body || doc.documentElement;
    let text = body.textContent || '';
    
    // Clean up excessive whitespace and newlines for better readability
    text = text.replace(/(\r\n|\n|\r)/gm, "\n").replace(/[\t ]+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim();
    
    return text;
  } catch (error) {
    console.error("Failed to parse HTML", error);
    // Fallback for parsing failure: basic tag stripping
    return html.replace(/<[^>]*>?/gm, '');
  }
};

/**
 * Extracts text content from either a file or a URL.
 * @param source A File object or a URL string.
 * @returns A promise that resolves with the extracted text content or rejects with an error key.
 */
export const extractTextFromSource = (source: File | string): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    if (source instanceof File) {
      // Handle file upload
      try {
        if (source.type === 'application/pdf') {
          // Handle PDF files
          const arrayBuffer = await source.arrayBuffer();
          const text = await extractTextFromPdf(arrayBuffer);
          resolve(text);
        } else if (source.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                   source.name.toLowerCase().endsWith('.docx')) {
          // Handle DOCX files
          const arrayBuffer = await source.arrayBuffer();
          const text = await extractTextFromDocx(arrayBuffer);
          resolve(text);
        } else {
          // Handle text-based files
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const fileContent = event.target?.result as string;
              if (source.type === 'text/html') {
                resolve(extractTextFromHtml(fileContent));
              } else {
                // For .txt, .md, and other plain text formats
                resolve(fileContent);
              }
            } catch (e) {
              reject(new Error("error.fileRead"));
            }
          };
          reader.onerror = () => {
            reject(new Error("error.fileRead"));
          };
          reader.readAsText(source);
        }
      } catch (error) {
        console.error("File processing error:", error);
        reject(error instanceof Error ? error : new Error("error.fileProcessing"));
      }
    } else {
      // Handle URL
      try {
        // Using a CORS proxy to fetch URL content from the client-side.
        // This is a workaround for demo purposes. A production app should use a backend server.
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(source)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
          throw new Error("error.fetchFailure");
        }
        
        const data = await response.json();
        
        if (!data.contents) {
          throw new Error("error.contentRetrieval");
        }
        
        const htmlContent: string = data.contents;
        const extractedText = extractTextFromHtml(htmlContent);

        // Heuristic check: if the extracted text is too short, it's likely not a useful article.
        if (!extractedText || extractedText.length < 100) {
             throw new Error("error.textExtraction");
        }

        resolve(extractedText);
      } catch (error) {
        console.error("URL processing error:", error);
        // Pass specific error keys for translation, otherwise a generic one.
        if (error instanceof Error && error.message.startsWith('error.')) {
            reject(error);
        } else {
            reject(new Error("error.urlProcessing"));
        }
      }
    }
  });
};
