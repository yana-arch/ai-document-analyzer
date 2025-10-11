import React, { useState, useEffect } from 'react';
import { questionBankService } from '../services/questionBankService';
import { QuestionBank as QuestionBankType, EnhancedQuizQuestion, QuestionTemplate } from '../types';
import Card from './shared/Card';
import { useLanguage } from '../contexts/LanguageContext';

interface QuestionBankProps {
  className?: string;
}

const QuestionBank: React.FC<QuestionBankProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'manage' | 'templates' | 'import'>('browse');
  const [questionBanks, setQuestionBanks] = useState<QuestionBankType[]>([]);
  const [templates, setTemplates] = useState<QuestionTemplate[]>([]);
  const [selectedBank, setSelectedBank] = useState<QuestionBankType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBankForm, setNewBankForm] = useState({
    name: '',
    description: '',
    subject: '',
    isPublic: false
  });

  const { t } = useLanguage();

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = () => {
    setQuestionBanks(questionBankService.getAllBanks());
    setTemplates(questionBankService.getAllTemplates());
  };

  const handleCreateBank = () => {
    if (!newBankForm.name.trim()) return;

    const bankId = questionBankService.createQuestionBank(
      newBankForm.name,
      newBankForm.description,
      newBankForm.subject,
      newBankForm.isPublic
    );

    setNewBankForm({ name: '', description: '', subject: '', isPublic: false });
    setShowCreateForm(false);
    loadData();
  };

  const handleImportBank = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = questionBankService.importBank(e.target?.result as string);
          alert(result.message);
          loadData();
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleExportBank = (bankId: string) => {
    const data = questionBankService.exportBank(bankId);
    if (data) {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `question-bank-${bankId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const renderBrowse = () => (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search questions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-sm"
        />
        <select className="px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-sm">
          <option>All Types</option>
          <option>Multiple Choice</option>
          <option>True/False</option>
          <option>Written</option>
        </select>
      </div>

      {/* Question Banks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {questionBanks.map((bank) => (
          <div key={bank.id} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-zinc-800 dark:text-zinc-100 mb-1">{bank.name}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">{bank.description}</p>
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>{bank.subject}</span>
                  <span>•</span>
                  <span>{bank.questions.length} questions</span>
                  <span>•</span>
                  <span>Used {bank.usageCount} times</span>
                </div>
              </div>
              {bank.isPublic && (
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded">
                  Public
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedBank(bank)}
                className="flex-1 px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
              >
                Browse
              </button>
              <button
                onClick={() => handleExportBank(bank.id)}
                className="px-3 py-1 bg-zinc-600 text-white rounded hover:bg-zinc-700 text-sm"
              >
                Export
              </button>
            </div>
          </div>
        ))}
      </div>

      {questionBanks.length === 0 && (
        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
          No question banks found. Create one to get started!
        </div>
      )}
    </div>
  );

  const renderManage = () => (
    <div className="space-y-6">
      {/* Create New Bank */}
      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-4">Create Question Bank</h3>

        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Create New Bank
          </button>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Bank Name"
                value={newBankForm.name}
                onChange={(e) => setNewBankForm(prev => ({ ...prev, name: e.target.value }))}
                className="px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700"
              />
              <input
                type="text"
                placeholder="Subject"
                value={newBankForm.subject}
                onChange={(e) => setNewBankForm(prev => ({ ...prev, subject: e.target.value }))}
                className="px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700"
              />
            </div>
            <textarea
              placeholder="Description"
              value={newBankForm.description}
              onChange={(e) => setNewBankForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700"
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={newBankForm.isPublic}
                onChange={(e) => setNewBankForm(prev => ({ ...prev, isPublic: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="isPublic" className="text-sm text-zinc-700 dark:text-zinc-300">
                Make this bank public (others can use it)
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateBank}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Create Bank
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-zinc-600 text-white rounded-lg hover:bg-zinc-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Existing Banks */}
      <div className="space-y-4">
        {questionBanks.map((bank) => (
          <div key={bank.id} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-zinc-800 dark:text-zinc-100">{bank.name}</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{bank.description}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportBank(bank.id)}
                  className="px-3 py-1 bg-zinc-600 text-white rounded hover:bg-zinc-700 text-sm"
                >
                  Export
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this question bank? This cannot be undone.')) {
                      questionBankService.deleteBank(bank.id);
                      loadData();
                    }
                  }}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-zinc-600 dark:text-zinc-400">Questions</div>
                <div className="font-semibold text-zinc-800 dark:text-zinc-100">{bank.questions.length}</div>
              </div>
              <div>
                <div className="text-zinc-600 dark:text-zinc-400">Subject</div>
                <div className="font-semibold text-zinc-800 dark:text-zinc-100">{bank.subject}</div>
              </div>
              <div>
                <div className="text-zinc-600 dark:text-zinc-400">Usage</div>
                <div className="font-semibold text-zinc-800 dark:text-zinc-100">{bank.usageCount}</div>
              </div>
              <div>
                <div className="text-zinc-600 dark:text-zinc-400">Visibility</div>
                <div className={`font-semibold ${bank.isPublic ? 'text-green-600 dark:text-green-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
                  {bank.isPublic ? 'Public' : 'Private'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTemplates = () => (
    <div className="space-y-6">
      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-4">Question Templates</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          Templates help you generate questions quickly using variables and patterns.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {questionBankService.getTemplateCategories().map((category) => (
            <div key={category} className="p-4 bg-white dark:bg-zinc-700/50 rounded border border-zinc-200 dark:border-zinc-600">
              <h4 className="font-semibold text-zinc-800 dark:text-zinc-100 mb-2 capitalize">
                {category.replace('-', ' ')} Templates
              </h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                Create reusable {category.replace('-', ' ')} question patterns.
              </p>
              <button className="w-full px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm">
                Create Template
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderImport = () => (
    <div className="space-y-6">
      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-4">Import Question Bank</h3>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-zinc-800 dark:text-zinc-100 mb-2">From File</h4>
            <button
              onClick={handleImportBank}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Import from JSON File
            </button>
          </div>

          <div>
            <h4 className="font-medium text-zinc-800 dark:text-zinc-100 mb-2">From Public Banks</h4>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
              Browse and import from public question banks shared by other users.
            </p>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Browse Public Banks
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'browse', label: 'Browse', icon: '🔍' },
    { id: 'manage', label: 'Manage', icon: '⚙️' },
    { id: 'templates', label: 'Templates', icon: '📋' },
    { id: 'import', label: 'Import', icon: '📥' }
  ];

  return (
    <Card title="Question Bank" className={className}>
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-zinc-200 dark:border-zinc-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-b-2 border-indigo-500'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'browse' && renderBrowse()}
          {activeTab === 'manage' && renderManage()}
          {activeTab === 'templates' && renderTemplates()}
          {activeTab === 'import' && renderImport()}
        </div>
      </div>
    </Card>
  );
};

export default QuestionBank;
