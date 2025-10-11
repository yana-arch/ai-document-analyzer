import { UserSettings } from '../types';

const SETTINGS_KEY = 'aiDocumentAnalyzerSettings';

// Default settings
export const defaultSettings: UserSettings = {
  ai: {
    languageStyle: 'formal',
    summaryLength: 'medium',
    maxTopicsCount: 10,
    quizDefaultMCQuestions: 5,
    quizDefaultWrittenQuestions: 2,
    exerciseDefaultPracticeExercises: 2,
    exerciseDefaultSimulationExercises: 2,
    exerciseDefaultAnalysisExercises: 1,
    exerciseDefaultApplicationExercises: 1,
    aiPromptPrefix: '',
  },
  ui: {
    enableDarkMode: false,
    autoSave: true,
    enableDefaultGemini: true,
  },
  apis: [], // Will be populated with default configurations when first created
};

// Load settings from localStorage
export function loadSettings(): UserSettings {
  try {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      // Merge with default settings to ensure all properties exist
      return {
        ai: { ...defaultSettings.ai, ...parsedSettings.ai },
        ui: { ...defaultSettings.ui, ...parsedSettings.ui },
        apis: parsedSettings.apis || defaultSettings.apis,
      };
    }
  } catch (error) {
    console.error('Failed to load settings from localStorage:', error);
  }
  return defaultSettings;
}

// Save settings to localStorage
export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings to localStorage:', error);
  }
}

// Get specific AI settings
export function getAISettings(settings: UserSettings) {
  return settings.ai;
}

// Get specific UI settings
export function getUISettings(settings: UserSettings) {
  return settings.ui;
}
