import React, { Suspense, useState } from 'react';
import { QuizQuestion } from '../types';

const QuestionBank = React.lazy(() => import('./QuestionBank'));
const SpacedRepetition = React.lazy(() => import('./SpacedRepetition'));
const LearningAnalytics = React.lazy(() => import('./LearningAnalytics'));

type PracticeTab = 'bank' | 'review' | 'analytics';

interface PracticeCenterProps {
  questionBank: QuizQuestion[];
  onDeleteQuestion: (questionText: string) => void;
  onEditQuestion: (oldText: string, newText: string) => void;
}

const PracticeCenter: React.FC<PracticeCenterProps> = ({ questionBank, onDeleteQuestion, onEditQuestion }) => {
  const [activeTab, setActiveTab] = useState<PracticeTab>('bank');

  const TabButton: React.FC<{ tabName: PracticeTab; label: string; icon: React.ReactNode }> = ({ tabName, label, icon }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
        activeTab === tabName
          ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Practice Center</h1>
            <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">Review questions and practice with spaced repetition.</p>
        </div>

        <div className="border-b border-zinc-200 dark:border-zinc-700">
            <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                <TabButton tabName='bank' label='Question Bank' icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4M4 7s0 0 0 0m16 0s0 0 0 0M12 11v10" /></svg>} />
                <TabButton tabName='review' label='Spaced Repetition' icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
                <TabButton tabName='analytics' label='Analytics' icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} />
            </nav>
        </div>

        <div className="mt-6">
            <Suspense fallback={<div className='h-96 w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse' />}>
                {activeTab === 'bank' && <QuestionBank questions={questionBank} onDeleteQuestion={onDeleteQuestion} onEditQuestion={onEditQuestion} />}
                {activeTab === 'review' && <SpacedRepetition />}
                {activeTab === 'analytics' && <LearningAnalytics />}
            </Suspense>
        </div>
    </div>
  );
};

export default PracticeCenter;