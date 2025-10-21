import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { QuizQuestion, UserSettings } from '../types';

// Practice state types
type PracticeState = {
  questions: QuizQuestion[];
  lastSettingsId: string;
  lastResetTime: string;
  isDirty: boolean;
};

type PracticeAction = 
  | { type: 'RESET_QUESTIONS' }
  | { type: 'ADD_QUESTION'; payload: QuizQuestion }
  | { type: 'UPDATE_QUESTION'; payload: { oldText: string; newText: string } }
  | { type: 'DELETE_QUESTION'; payload: string }
  | { type: 'SETTINGS_CHANGED'; payload: UserSettings }
  | { type: 'MARK_DIRTY' }
  | { type: 'MARK_CLEAN' };

// Initial state
const initialState: PracticeState = {
  questions: [],
  lastSettingsId: '',
  lastResetTime: new Date().toISOString(),
  isDirty: false,
};

// Practice reducer
const practiceReducer = (state: PracticeState, action: PracticeAction): PracticeState => {
  switch (action.type) {
    case 'RESET_QUESTIONS':
      return {
        ...state,
        questions: [],
        lastResetTime: new Date().toISOString(),
        isDirty: false,
      };
      
    case 'ADD_QUESTION':
      return {
        ...state,
        questions: [...state.questions, action.payload],
        isDirty: true,
      };
      
    case 'UPDATE_QUESTION':
      return {
        ...state,
        questions: state.questions.map(q => 
          q.question === action.payload.oldText 
            ? { ...q, question: action.payload.newText }
            : q
        ),
        isDirty: true,
      };
      
    case 'DELETE_QUESTION':
      return {
        ...state,
        questions: state.questions.filter(q => q.question !== action.payload),
        isDirty: true,
      };
      
    case 'SETTINGS_CHANGED':
      // If settings changed significantly, reset practice questions
      return {
        ...state,
        lastSettingsId: JSON.stringify(action.payload.apis),
        isDirty: true,
      };
      
    case 'MARK_DIRTY':
      return {
        ...state,
        isDirty: true,
      };
      
    case 'MARK_CLEAN':
      return {
        ...state,
        isDirty: false,
      };
      
    default:
      return state;
  }
};

// Context
interface PracticeContextType {
  state: PracticeState;
  dispatch: React.Dispatch<PracticeAction>;
  resetPractice: (reason?: string) => void;
  hasUnsavedChanges: () => boolean;
}

const PracticeContext = createContext<PracticeContextType | undefined>(undefined);

// Provider component
interface PracticeProviderProps {
  children: ReactNode;
  initialQuestions?: QuizQuestion[];
}

export const PracticeProvider: React.FC<PracticeProviderProps> = ({ 
  children, 
  initialQuestions = [] 
}) => {
  const [state, dispatch] = useReducer(practiceReducer, {
    ...initialState,
    questions: initialQuestions,
  });

  // Load saved questions from localStorage on mount
  useEffect(() => {
    try {
      const savedQuestions = localStorage.getItem('practiceQuestions');
      const lastSettings = localStorage.getItem('lastPracticeSettings');

      if (savedQuestions) {
        // Validate JSON before parsing
        let parsedQuestions;
        try {
          parsedQuestions = JSON.parse(savedQuestions);
        } catch (parseError) {
          console.warn('Invalid practice questions data in localStorage, clearing corrupted data');
          localStorage.removeItem('practiceQuestions');
          return;
        }

        // Validate that parsed data is an array
        if (!Array.isArray(parsedQuestions)) {
          console.warn('Practice questions data is not an array, clearing corrupted data');
          localStorage.removeItem('practiceQuestions');
          return;
        }

        dispatch({ type: 'RESET_QUESTIONS' });
        parsedQuestions.forEach((q: QuizQuestion) => {
          dispatch({ type: 'ADD_QUESTION', payload: q });
        });
      }

      if (lastSettings) {
        try {
          const parsedSettings = JSON.parse(lastSettings);
          dispatch({ type: 'SETTINGS_CHANGED', payload: parsedSettings });
        } catch (parseError) {
          console.warn('Invalid practice settings data in localStorage, clearing corrupted data');
          localStorage.removeItem('lastPracticeSettings');
        }
      }
    } catch (error) {
      console.error('Failed to load practice questions:', error);
    }
  }, []);

  // Save questions to localStorage when they change
  useEffect(() => {
    if (state.questions.length > 0) {
      try {
        localStorage.setItem('practiceQuestions', JSON.stringify(state.questions));
      } catch (error) {
        console.error('Failed to save practice questions:', error);
      }
    }
  }, [state.questions]);

  // Save settings reference when they change
  useEffect(() => {
    try {
      localStorage.setItem('lastPracticeSettings', state.lastSettingsId);
    } catch (error) {
      console.error('Failed to save practice settings:', error);
    }
  }, [state.lastSettingsId]);

  // Reset practice function
  const resetPractice = (reason?: string) => {
    console.log(`Resetting practice questions${reason ? `: ${reason}` : ''}`);
    dispatch({ type: 'RESET_QUESTIONS' });
    localStorage.removeItem('practiceQuestions');
  };

  // Check for unsaved changes
  const hasUnsavedChanges = (): boolean => {
    return state.isDirty;
  };

  const value: PracticeContextType = {
    state,
    dispatch,
    resetPractice,
    hasUnsavedChanges,
  };

  return (
    <PracticeContext.Provider value={value}>
      {children}
    </PracticeContext.Provider>
  );
};

// Hook to use the practice context
export const usePractice = (): PracticeContextType => {
  const context = useContext(PracticeContext);
  if (context === undefined) {
    throw new Error('usePractice must be used within a PracticeProvider');
  }
  return context;
};

// Higher-order component to wrap components that need practice state
export const withPracticeState = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  return (props: P) => {
    const practice = usePractice();
    return <Component {...props} practiceState={practice} />;
  };
};

// Hook to handle settings changes
export const usePracticeSettingsHandler = (settings: UserSettings) => {
  const { dispatch, resetPractice } = usePractice();

  // Create a stable settings reference that only changes when critical settings change
  const settingsKey = React.useMemo(() => {
    return JSON.stringify({
      activeAPI: settings.apis.find(api => api.isActive)?.id || '',
      enableDefaultGemini: settings.ui?.enableDefaultGemini || false,
      languageStyle: settings.ai?.languageStyle || 'balanced',
    });
  }, [settings.apis, settings.ui?.enableDefaultGemini, settings.ai?.languageStyle]);

  // Track previous settings to avoid unnecessary updates
  const prevSettingsRef = React.useRef<string>('');

  useEffect(() => {
    // Only proceed if settings have actually changed
    if (settingsKey === prevSettingsRef.current) {
      return;
    }

    prevSettingsRef.current = settingsKey;

    // When settings change, mark practice as dirty
    dispatch({ type: 'SETTINGS_CHANGED', payload: settings });

    // Determine if the settings change requires a reset
    const requiresReset = settings.apis.length === 0 ||
                         !settings.apis.some(api => api.isActive);

    if (requiresReset) {
      resetPractice('Settings changed significantly');
    }
  }, [settingsKey, dispatch, resetPractice]);

  return { resetPractice };
};
