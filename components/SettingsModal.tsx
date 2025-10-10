import React, { useState, useEffect } from 'react';
import { UserSettings, LanguageStyle, SummaryLength } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
  t: (key: string) => string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  t,
}) => {
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  const updateAISetting = <K extends keyof UserSettings['ai']>(key: K, value: UserSettings['ai'][K]) => {
    setLocalSettings(prev => ({
      ...prev,
      ai: {
        ...prev.ai,
        [key]: value
      }
    }));
  };

  const updateUISetting = <K extends keyof UserSettings['ui']>(key: K, value: UserSettings['ui'][K]) => {
    setLocalSettings(prev => ({
      ...prev,
      ui: {
        ...prev.ui,
        [key]: value
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {t('settings.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* AI Settings Section */}
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              {t('settings.aiConfiguration')}
            </h3>
            <div className="space-y-6">
              {/* Language Style */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  {t('settings.languageStyle')}
                </label>
                <select
                  value={localSettings.ai.languageStyle}
                  onChange={(e) => updateAISetting('languageStyle', e.target.value as LanguageStyle)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="formal">Formal</option>
                  <option value="conversational">Conversational</option>
                  <option value="technical">Technical</option>
                  <option value="simplified">Simplified</option>
                </select>
              </div>

              {/* Summary Length */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  {t('settings.summaryLength')}
                </label>
                <select
                  value={localSettings.ai.summaryLength}
                  onChange={(e) => updateAISetting('summaryLength', e.target.value as SummaryLength)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="short">Short (2-3 sentences)</option>
                  <option value="medium">Medium (4-6 sentences)</option>
                  <option value="long">Long (7+ sentences)</option>
                </select>
              </div>

              {/* Max Topics Count */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  {t('settings.maxTopics')}
                </label>
                <input
                  type="number"
                  min="5"
                  max="15"
                  value={localSettings.ai.maxTopicsCount}
                  onChange={(e) => updateAISetting('maxTopicsCount', parseInt(e.target.value) || 10)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Quiz Settings */}
              {/* <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    {t('settings.defaultMCQuestions')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={localSettings.ai.quizDefaultMCQuestions}
                    onChange={(e) => updateAISetting('quizDefaultMCQuestions', parseInt(e.target.value) || 5)}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    {t('settings.defaultWrittenQuestions')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={localSettings.ai.quizDefaultWrittenQuestions}
                    onChange={(e) => updateAISetting('quizDefaultWrittenQuestions', parseInt(e.target.value) || 2)}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div> */}

              {/* AI Prompt Prefix */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  {t('settings.customPrompt')}
                </label>
                <textarea
                  value={localSettings.ai.aiPromptPrefix}
                  onChange={(e) => updateAISetting('aiPromptPrefix', e.target.value)}
                  placeholder={t('settings.customPromptPlaceholder')}
                  rows={3}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </div>

          {/* UI Settings Section */}
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              {t('settings.uiPreferences')}
            </h3>
            <div className="space-y-4">
              {/* Auto-save Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t('settings.autoSave')}
                  </label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t('settings.autoSaveDesc')}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.ui.autoSave}
                    onChange={(e) => updateUISetting('autoSave', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Dark Mode (UI indicator only - actual dark mode is handled by the context) */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t('settings.darkMode')}
                  </label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t('settings.darkModeDesc')}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.ui.enableDarkMode}
                    onChange={(e) => updateUISetting('enableDarkMode', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-zinc-200 dark:border-zinc-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
          >
            {t('settings.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {t('settings.saveSettings')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
