
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
      const corsProxies = [
        'https://api.allorigins.win/get?url=',
        'https://thingproxy.freeboard.io/fetch/',
        'https://cors-anywhere.herokuapp.com/',
        'https://proxy.cors.sh/'
      ];

      let lastError: Error | null = null;

      // Try multiple CORS proxies with timeout
      for (const proxyBase of corsProxies) {
        try {
          console.log(`Trying CORS proxy: ${proxyBase}`);

          // Create AbortController for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

          let proxyUrl: string;
          if (proxyBase.includes('thingproxy')) {
            // Thingproxy handles URL encoding differently
            proxyUrl = proxyBase + source;
          } else if (proxyBase.includes('cors-anywhere')) {
            proxyUrl = proxyBase + source;
          } else if (proxyBase.includes('proxy.cors.sh')) {
            proxyUrl = proxyBase + source;
          } else {
            // allorigins.win
            proxyUrl = proxyBase + encodeURIComponent(source);
          }

          const response = await fetch(proxyUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; WebBrowser/1.0)',
              'Accept': 'application/json, text/html, */*',
              ...(proxyBase.includes('cors.sh') && { 'x-cors-api-key': 'fetch' }) // For cors.sh proxy
            }
          });
          clearTimeout(timeoutId);

          if (!response.ok) {
            console.warn(`CORS proxy ${proxyBase} returned status: ${response.status}`);
            continue; // Try next proxy
          }

          // Handle potential Content-Length mismatch issues by checking response type and content
          let data;
          const contentType = response.headers.get('content-type');

          // First, try to get the response text as the response body can only be consumed once
          let responseText: string;
          try {
            responseText = await response.text();
          } catch (textError) {
            console.error("Failed to read response text:", textError);
            continue; // Try next proxy
          }

          if (contentType && contentType.includes('application/json')) {
            try {
              data = JSON.parse(responseText);
            } catch (jsonError) {
              console.warn("JSON parsing failed due to malformed response:", jsonError);
              // If the response is not valid JSON, it might be HTML or partial content
              // Try to extract meaningful content or throw appropriate error
              if (responseText.startsWith('{') && responseText.includes('contents')) {
                // It looks like JSON but is malformed - this is likely a partial response
                console.warn("Partial JSON response detected, trying to salvage contents");
                try {
                  // Extract contents if it looks like partial JSON
                  const contentsMatch = responseText.match(/"contents"\s*:\s*"([^"]+(?:\\.[^"]*)*?)"/);
                  if (contentsMatch) {
                    data = { contents: contentsMatch[1].replace(/\\"/g, '"') };
                  } else {
                    throw new Error("error.partialResponse");
                  }
                } catch (partialError) {
                  console.error("Failed to extract partial JSON response:", partialError);
                  continue; // Try next proxy
                }
              } else {
                // Likely HTML or unexpected response content
                data = { contents: responseText };
              }
            }
          } else {
            // If not JSON, use the response text directly
            data = { contents: responseText };
          }

          if (!data || !data.contents) {
            console.warn("Invalid response data from proxy");
            continue; // Try next proxy
          }

          const htmlContent: string = data.contents;
          const extractedText = extractTextFromHtml(htmlContent);

          // Heuristic check: if the extracted text is too short, it's likely not a useful article.
          if (!extractedText || extractedText.length < 100) {
            console.warn("Extracted text too short, trying next proxy");
            continue; // Try next proxy
          }

          console.log(`Successfully extracted ${extractedText.length} characters using proxy: ${proxyBase}`);
          resolve(extractedText);
          return; // Success, exit the loop

        } catch (error) {
          lastError = error as Error;
          console.warn(`Failed with proxy ${proxyBase}:`, error);
          // Continue to next proxy
        }
      }

      // All proxies failed
      console.error("All CORS proxies failed. Last error:", lastError);
      // Pass specific error keys for translation, otherwise a generic one.
      reject(new Error("error.corsProxyFailed"));
    }
  });
};
