import React, { useContext, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

// Context for managing UI state across components
interface UIStateContextType {
  activeTab: string;
  recentActions: string[];
  userFlow: 'firstTime' | 'frequentUser' | 'powerUser';
  analysisProgress: number;
  updateUIState: (updates: Partial<UIStateContextType>) => void;
}

const UIStateContext = React.createContext<UIStateContextType | undefined>(undefined);

// Hook to use UI state context
export const useUIState = () => {
  const context = useContext(UIStateContext);
  if (!context) {
    throw new Error('useUIState must be used within a UIStateProvider');
  }
  return context;
};

// Provider component
export const UIStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = React.useState<string>('summary');
  const [recentActions, setRecentActions] = React.useState<string[]>([]);
  const [userFlow, setUserFlow] = React.useState<'firstTime' | 'frequentUser' | 'powerUser'>('firstTime');
  const [analysisProgress, setAnalysisProgress] = React.useState<number>(0);

  const updateUIState = React.useCallback((updates: Partial<UIStateContextType>) => {
    if (updates.activeTab !== undefined) setActiveTab(updates.activeTab);
    if (updates.recentActions !== undefined) setRecentActions(updates.recentActions);
    if (updates.userFlow !== undefined) setUserFlow(updates.userFlow);
    if (updates.analysisProgress !== undefined) setAnalysisProgress(updates.analysisProgress);
  }, []);

  const contextValue = React.useMemo(() => ({
    activeTab,
    recentActions,
    userFlow,
    analysisProgress,
    updateUIState
  }), [activeTab, recentActions, userFlow, analysisProgress, updateUIState]);

  return (
    <UIStateContext.Provider value={contextValue}>
      {children}
    </UIStateContext.Provider>
  );
};

// Smart suggestions based on user actions and context
export const SmartSuggestions: React.FC = () => {
  const { activeTab, recentActions, userFlow } = useUIState();
  const { t } = useLanguage();

  const suggestions = useMemo(() => {
    const baseSuggestions = [];

    // First time users - guide through features
    if (userFlow === 'firstTime') {
      baseSuggestions.push({
        icon: '📄',
        title: t('suggestions.readSummary') || 'Read the Summary',
        description: t('suggestions.readSummaryDesc') || 'Get an overview of the document',
        action: () => document.querySelector('[data-section="summary"]')?.scrollIntoView({ behavior: 'smooth' })
      });
    }

    // Recent actions based suggestions
    if (recentActions.includes('chat')) {
      baseSuggestions.push({
        icon: '🤖',
        title: t('suggestions.askMore') || 'Ask Follow-up Questions',
        description: t('suggestions.askMoreDesc') || 'Dive deeper into specific topics',
        action: () => document.querySelector('[data-section="chat"]')?.scrollIntoView({ behavior: 'smooth' })
      });
    }

    if (recentActions.includes('quiz') && !recentActions.includes('exercise')) {
      baseSuggestions.push({
        icon: '📚',
        title: t('suggestions.practiceSkills') || 'Practice with Exercises',
        description: t('suggestions.practiceSkillsDesc') || 'Apply your knowledge practically',
        action: () => document.querySelector('[data-section="learning"]')?.scrollIntoView({ behavior: 'smooth' })
      });
    }

    // Context-aware suggestions based on active tab
    if (activeTab === 'summary') {
      baseSuggestions.unshift({
        icon: '🎯',
        title: t('suggestions.exploreTopics') || 'Explore Key Topics',
        description: t('suggestions.exploreTopicsDesc') || 'See what the document is about',
        action: () => document.querySelector('[data-section="topics"]')?.scrollIntoView({ behavior: 'smooth' })
      });
    }

    if (activeTab === 'chat') {
      baseSuggestions.unshift({
        icon: '📝',
        title: t('suggestions.takeQuiz') || 'Test Your Knowledge',
        description: t('suggestions.takeQuizDesc') || 'See how well you understand the material',
        action: () => document.querySelector('[data-section="learning"]')?.scrollIntoView({ behavior: 'smooth' })
      });
    }

    return baseSuggestions.slice(0, 3); // Show max 3 suggestions
  }, [activeTab, recentActions, userFlow, t]);

  if (suggestions.length === 0) return null;

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl border border-blue-200 dark:border-blue-800">
      <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
        💡 {t('suggestions.nextSteps') || 'Recommended Next Steps'}
      </h3>
      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={suggestion.action}
            className="w-full text-left p-3 bg-white dark:bg-zinc-800 rounded-lg border border-blue-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-zinc-600 hover:bg-blue-25 transition-all duration-200 group"
          >
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0">{suggestion.icon}</span>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                  {suggestion.title}
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  {suggestion.description}
                </p>
              </div>
              <svg className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Progress indicator that updates based on user interactions
export const ContextProgressIndicator: React.FC<{
  sections: Array<{ key: string; label: string; completed: boolean }>;
}> = ({ sections }) => {
  const { t } = useLanguage();
  const completedCount = sections.filter(s => s.completed).length;
  const totalCount = sections.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-2xl border border-green-200 dark:border-green-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">
          📊 {t('progress.exploration') || 'Document Exploration'}
        </h3>
        <span className="text-sm font-medium text-green-700 dark:text-green-300">
          {completedCount}/{totalCount} {t('progress.completed') || 'sections explored'}
        </span>
      </div>

      <div className="w-full bg-green-100 dark:bg-green-900 rounded-full h-2 mb-3">
        <div
          className="bg-green-600 dark:bg-green-400 h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <p className="text-xs text-green-700 dark:text-green-300">
        {progressPercent < 30 && (t('progress.justStarted') || 'Great start! Continue exploring the document.')}
        {progressPercent >= 30 && progressPercent < 70 && (t('progress.halfway') || 'You\'re making good progress!')}
        {progressPercent >= 70 && progressPercent < 100 && (t('progress.almostDone') || 'Almost done! Click through the remaining sections.')}
        {progressPercent === 100 && (t('progress.complete') || 'Excellent! You\'ve explored all sections.')}
      </p>
    </div>
  );
};
