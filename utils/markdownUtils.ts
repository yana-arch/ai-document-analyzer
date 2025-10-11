import MarkdownIt from 'markdown-it';

// Configure markdown-it with simple code block enhancement
const md = new MarkdownIt({
  html: false, // Don't allow HTML in markdown for security
  linkify: true,
  typographer: true,
  breaks: true, // Convert \n to <br>
  highlight: function (str, lang) {
    // Simple code block with copy functionality
    const language = lang ? `language-${lang}` : '';
    const escaped = md.utils.escapeHtml(str);
    return `<pre class="code-block"><code class="${language}">${escaped}</code><button class="copy-button" title="Copy code" onclick="copyToClipboard(this)">📋</button></pre>`;
  }
});

// Custom renderer for better styling
const defaultRenderer = md.renderer.rules.text;
md.renderer.rules.text = function(tokens, idx, options, env, self) {
  // Call the original renderer first
  let result = defaultRenderer?.(tokens, idx, options, env, self) || '';

  // Process bold text (**bold**) to wrap in spans for better styling
  result = result.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-zinc-900 dark:text-zinc-100">$1</strong>');

  // Process italic text (*italic*) to wrap in spans for better styling
  result = result.replace(/\*(.*?)\*/g, '<em class="italic text-zinc-700 dark:text-zinc-200">$1</em>');

  return result;
};

// Render markdown to HTML
export function renderMarkdown(text: string | object): string {
  try {
    // Handle case where text is an object (e.g., { text: "..." })
    let content = text;
    if (typeof text === 'object' && text !== null && 'text' in text) {
      content = (text as any).text;
    }

    // Ensure content is a string
    if (typeof content !== 'string') {
      console.warn('Expected string content, got:', typeof content, content);
      content = String(content);
    }

    return md.render(content);
  } catch (error) {
    console.error('Markdown rendering error:', error);
    return String(text); // Fallback to string representation
  }
}

// Render markdown to HTML with custom styling for rich content
export function renderMarkdownRich(text: string): string {
  return renderMarkdown(text);
}

// Utility to create safe HTML for React components
export function createMarkdownHtml(markdownText: string): { __html: string } {
  return { __html: renderMarkdown(markdownText) };
}
