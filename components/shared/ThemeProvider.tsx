import React, { createContext, useContext, useState, useEffect } from 'react';
import { colors, generateCSSVariables, darkMode, lightMode } from '../../utils/themeUtils';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
  systemTheme: 'light' | 'dark';
  colors: typeof colors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'system',
  storageKey = 'ai-document-analyzer-theme'
}) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
    }
    return defaultTheme;
  });

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Detect system theme
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    // Save theme to localStorage
    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey]);

  useEffect(() => {
    // Apply theme to document
    const resolvedTheme = theme === 'system' ? systemTheme : theme;

    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);

    // Generate CSS variables
    generateCSSVariables();

    // Apply theme-specific styles
    if (resolvedTheme === 'dark') {
      Object.entries(darkMode).forEach(([key, value]) => {
        root.style.setProperty(`--theme-${key}`, value.toString());
      });
    } else {
      Object.entries(lightMode).forEach(([key, value]) => {
        root.style.setProperty(`--theme-${key}`, value.toString());
      });
    }
  }, [theme, systemTheme]);

  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  const value: ThemeContextType = {
    theme,
    setTheme,
    resolvedTheme,
    systemTheme,
    colors
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme toggle component
interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  size = 'md'
}) => {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const handleToggle = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    switch (resolvedTheme) {
      case 'dark':
        return (
          <svg className={iconSizes[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        );
      case 'light':
        return (
          <svg className={iconSizes[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      default:
        return (
          <svg className={iconSizes[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Switch to dark mode';
      case 'dark':
        return 'Switch to system theme';
      case 'system':
        return 'Switch to light mode';
      default:
        return 'Toggle theme';
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`
        ${sizeClasses[size]}
        rounded-lg bg-zinc-100 dark:bg-zinc-800
        hover:bg-zinc-200 dark:hover:bg-zinc-700
        text-zinc-700 dark:text-zinc-300
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
        ${className}
      `}
      aria-label={getLabel()}
      title={getLabel()}
    >
      {getIcon()}
    </button>
  );
};

// Theme selector component
interface ThemeSelectorProps {
  className?: string;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  className = ''
}) => {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'system', label: 'System', icon: '🖥️' }
  ] as const;

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Theme
      </label>
      <div className="grid grid-cols-3 gap-2">
        {themes.map((themeOption) => (
          <button
            key={themeOption.value}
            onClick={() => setTheme(themeOption.value)}
            className={`
              flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all
              ${theme === themeOption.value
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50'
              }
            `}
          >
            <span className="text-lg mb-1">{themeOption.icon}</span>
            <span className="text-xs font-medium">{themeOption.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
