import React, { useState, useMemo } from 'react';
import { QuizQuestion } from '../types'; // Assuming QuizQuestion is a defined type
import Card from './shared/Card';

interface QuestionBankProps {
  questions: QuizQuestion[];
  onDeleteQuestion: (questionText: string) => void;
  onEditQuestion: (oldText: string, newText: string) => void;
}

const QuestionBank: React.FC<QuestionBankProps> = ({ questions, onDeleteQuestion, onEditQuestion }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedText, setEditedText] = useState('');

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const matchesSearch = q.question.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || q.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [questions, searchTerm, typeFilter]);

  const questionTypes = useMemo(() => {
    const types = new Set(questions.map(q => q.type));
    return ['all', ...Array.from(types)];
  }, [questions]);

  return (
    <Card>
      <div className="p-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Question Bank</h2>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Search questions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {questionTypes.map(type => (
              <option key={type} value={type} className="capitalize">{type.replace('-', ' ')}</option>
            ))}
          </select>
        </div>

        {/* Question List */}
        <div className="space-y-4">
          {filteredQuestions.length > 0 ? (
            filteredQuestions.map((q, index) => (
              <div key={index} className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                {editingIndex === index ? (
                  <div className="space-y-3">
                    <textarea 
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => { onEditQuestion(q.question, editedText); setEditingIndex(null); }} className="px-3 py-1 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">Save</button>
                      <button onClick={() => setEditingIndex(null)} className="px-3 py-1 text-sm font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-200 dark:bg-zinc-600 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-500">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-semibold text-zinc-800 dark:text-zinc-200">{q.question}</p>
                    <div className="mt-2 flex justify-between items-center">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 capitalize">
                            {q.type.replace('-', ' ')}
                        </span>
                        <div className="flex gap-3">
                            <button onClick={() => { setEditingIndex(index); setEditedText(q.question); }} className="text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 font-semibold">Edit</button>
                            <button onClick={() => onDeleteQuestion(q.question)} className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 font-semibold">Delete</button>
                        </div>
                    </div>
                  </>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-zinc-500 dark:text-zinc-400">No questions found.</p>
              <p className="text-sm text-zinc-400 dark:text-zinc-500">Generate quizzes or exercises to populate the question bank.</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default QuestionBank;