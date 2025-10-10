import CryptoJS from 'crypto-js';

// Simple encryption key for API storage (in production, this could be user-provided)
const ENCRYPTION_KEY = 'ai-doc-analyzer-2025';

// Encrypt API key
export function encryptApiKey(apiKey: string): string {
  try {
    return CryptoJS.AES.encrypt(apiKey, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Failed to encrypt API key:', error);
    throw new Error('Failed to encrypt API key');
  }
}

// Decrypt API key
export function decryptApiKey(encryptedKey: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Failed to decrypt API key:', error);
    throw new Error('Failed to decrypt API key');
  }
}

// Validate API key format
export function validateApiKey(provider: string, apiKey: string): boolean {
  switch (provider) {
    case 'gemini':
      return apiKey.startsWith('AIza') && apiKey.length > 20;
    case 'openrouter':
      return apiKey.startsWith('sk-or-v1-') && apiKey.length > 30;
    default:
      return apiKey.length > 10; // Basic validation for other providers
  }
}

// Parse API configurations from text input
export function parseApiConfigurations(text: string): string[] {
  if (!text.trim()) return [];

  // Split by newlines, then by commas
  return text
    .split('\n')
    .map(line => line.split(','))
    .flat()
    .map(api => api.trim())
    .filter(api => api.length > 0);
}
