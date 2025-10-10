import MarkdownIt from 'markdown-it';

// Configure markdown-it
const md = new MarkdownIt({
  html: false, // Don't allow HTML in markdown for security
  linkify: true,
  typographer: true,
  breaks: true, // Convert \n to <br>
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
export function renderMarkdown(text: string): string {
  try {
    return md.render(text);
  } catch (error) {
    console.error('Markdown rendering error:', error);
    return text; // Fallback to plain text
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
