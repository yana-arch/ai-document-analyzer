import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface LayoutProps {
  children: React.ReactNode;
  currentView?: string;
  onViewChange?: (view: string) => void;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
  category?: string;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  currentView = 'dashboard',
  onViewChange
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: t('nav.dashboard'),
      icon: '📊',
      category: 'main'
    },
    {
      id: 'upload',
      label: t('nav.upload'),
      icon: '📁',
      category: 'main'
    },
    {
      id: 'history',
      label: t('nav.history'),
      icon: '🕒',
      category: 'main'
    },
    {
      id: 'learning',
      label: t('nav.learning'),
      icon: '🎓',
      category: 'learning'
    },
    {
      id: 'quiz',
      label: t('nav.quiz'),
      icon: '❓',
      category: 'learning'
    },
    {
      id: 'exercises',
      label: t('nav.exercises'),
      icon: '✏️',
      category: 'learning'
    },
    {
      id: 'question-bank',
      label: t('nav.questionBank'),
      icon: '📚',
      category: 'learning'
    },
    {
      id: 'analytics',
      label: t('nav.analytics'),
      icon: '📈',
      category: 'tools'
    },
    {
      id: 'settings',
      label: t('nav.settings'),
      icon: '⚙️',
      category: 'tools'
    }
  ];

  const handleNavigation = (viewId: string) => {
    if (onViewChange) {
      onViewChange(viewId);
    }
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">AI</span>
          </div>
          <div>
            <h1 className="font-bold text-zinc-900 dark:text-zinc-100">
              {t('app.title')}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t('app.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigation(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
              currentView === item.id
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm'
                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center space-x-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">U</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
              {t('nav.user')}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {t('nav.premium')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } fixed md:relative md:translate-x-0 z-50 md:z-auto transition-transform duration-300 ease-in-out ${
        isMobile ? 'w-80' : 'w-64'
      }`}>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden p-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Breadcrumb */}
              <div className="hidden sm:flex items-center space-x-2 text-sm text-zinc-600 dark:text-zinc-400">
                <span>{t('nav.currentView')}: {navigationItems.find(item => item.id === currentView)?.label}</span>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-3">
              {/* Search */}
              <button className="p-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Notifications */}
              <button className="p-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors relative">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM15 7h5l-5-5v5z" />
                </svg>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>

              {/* Theme Toggle */}
              <button className="p-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
