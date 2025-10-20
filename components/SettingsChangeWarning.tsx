import React, { useEffect, useState } from 'react';
import { usePractice } from './PracticeStateManager';
import ProgressiveDisclosure from './shared/ProgressiveDisclosure';
import { useLanguage } from '../contexts/LanguageContext';

interface SettingsChangeWarningProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  settings: any; // UserSettings type
}

const SettingsChangeWarning: React.FC<SettingsChangeWarningProps> = ({
  isOpen,
  onClose,
  onConfirm,
  settings
}) => {
  const { state, resetPractice } = usePractice();
  const { t } = useLanguage();
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!isOpen || !state.isDirty) return;
    
    // Auto-close if no unsaved changes
    const timer = setTimeout(() => {
      if (!state.isDirty) {
        onClose();
      }
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [isOpen, state.isDirty, onClose]);

  if (!isOpen || !state.isDirty) return null;

  const handleResetAndConfirm = () => {
    resetPractice('Settings changed');
    onConfirm();
    onClose();
  };

  const getSettingsChanges = () => {
    // This would compare old vs new settings in a real implementation
    const changes = [];
    
    if (settings.apis.length === 0) {
      changes.push({ type: 'danger', message: t('settingsWarning.noAPIs') || 'No active AI providers configured' });
    } else if (!settings.apis.some(api => api.isActive)) {
      changes.push({ type: 'warning', message: t('settingsWarning.noActiveAPI') || 'No active AI providers selected' });
    }
    
    if (settings.ui.enableDarkMode !== state.lastSettingsId.includes('darkMode')) {
      changes.push({ type: 'info', message: t('settingsWarning.themeChanged') || 'Theme preference changed' });
    }
    
    return changes;
  };

  const settingsChanges = getSettingsChanges();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {t('settingsWarning.title') || 'Settings Changed'}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {t('settingsWarning.subtitle') || 'This may affect your practice questions'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Changes Summary */}
        <div className="mb-4">
          <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3">
            {t('settingsWarning.summary') || 'The following changes may impact your practice experience:'}
          </p>
          
          {settingsChanges.length > 0 ? (
            <div className="space-y-2">
              {settingsChanges.map((change, index) => (
                <div key={index} className={`flex items-start gap-2 p-2 rounded-lg ${
                  change.type === 'danger' ? 'bg-red-50 dark:bg-red-900/20' :
                  change.type === 'warning' ? 'bg-orange-50 dark:bg-orange-900/20' :
                  'bg-blue-50 dark:bg-blue-900/20'
                }`}>
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    change.type === 'danger' ? 'bg-red-500' :
                    change.type === 'warning' ? 'bg-orange-500' :
                    'bg-blue-500'
                  }`} />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{change.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-green-600 dark:text-green-400">
              {t('settingsWarning.noImpact') || 'No significant impact expected'}
            </p>
          )}
        </div>

        {/* Details */}
        <ProgressiveDisclosure
          title={t('settingsWarning.details') || 'What this means'}
          defaultExpanded={false}
          onToggle={(expanded) => setShowDetails(expanded)}
        >
          <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
            <p>{t('settingsWarning.detailsText1') || 'Practice questions are generated using your current AI provider settings.'}</p>
            <p>{t('settingsWarning.detailsText2') || 'Changing providers may affect question quality and availability.'}</p>
            <p>{t('settingsWarning.detailsText3') || 'Your existing practice questions will be preserved.'}</p>
          </div>
        </ProgressiveDisclosure>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded-lg transition-colors"
          >
            {t('settingsWarning.later') || 'Decide Later'}
          </button>
          <button
            onClick={handleResetAndConfirm}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            {t('settingsWarning.reset') || 'Reset & Continue'}
          </button>
        </div>

        {/* Dismiss option */}
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              resetPractice('User dismissed warning');
              onClose();
            }}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
          >
            {t('settingsWarning.dontShowAgain') || "Don't show this again"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsChangeWarning;
