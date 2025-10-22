import React, { useState, useEffect } from 'react';
import { browseDatabaseContent, getDocumentById, getInterviewById, getQuestionBankById, downloadDocument, downloadInterview } from '../services/databaseService';
import { HistoryItem, DocumentHistoryItem, InterviewHistoryItem } from '../types';

interface DatabaseItem {
  id: string;
  type: 'document' | 'interview' | 'question_bank';
  title: string;
  createdAt: string;
  metadata?: any;
  status?: string;
  score?: number;
  questionCount?: number;
  subject?: string;
  contentHash?: string;
}

interface DatabaseContent {
  documents: DatabaseItem[];
  interviews: DatabaseItem[];
  questionBanks: DatabaseItem[];
}

type DatabaseBrowserProps = {
  isOpen: boolean;
  onClose: () => void;
  onDownloadToLocal?: (item: DatabaseItem, data?: any) => void;
  onLoadToHistory?: (historyItem: HistoryItem) => void;
};

type TabType = 'documents' | 'interviews' | 'questionBanks';

const DatabaseBrowser: React.FC<DatabaseBrowserProps> = ({
  isOpen,
  onClose,
  onDownloadToLocal,
  onLoadToHistory
}) => {
  const [content, setContent] = useState<DatabaseContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('documents');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [downloadingItems, setDownloadingItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && !content) {
      loadDatabaseContent();
    }
  }, [isOpen]);

  const loadDatabaseContent = async () => {
    setLoading(true);
    try {
      const data = await browseDatabaseContent();
      setContent(data);
    } catch (error) {
      console.error('Failed to load database content:', error);
      alert('Failed to load database content. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleItemSelect = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleDownloadToLocal = async (item: DatabaseItem) => {
    if (!content) return;

    setDownloadingItems(prev => new Set([...prev, item.id]));

    try {
      let fullItem;
      let historyItem: HistoryItem | null = null;

      switch (item.type) {
        case 'document':
          fullItem = await getDocumentById(item.id);
          downloadDocument(fullItem);

          // Create history item for local analysis
          if (fullItem) {
            const documentHistoryItem: DocumentHistoryItem = {
              type: 'document',
              fileName: fullItem.file_name,
              analysis: fullItem.analysis,
              documentText: fullItem.document_text,
              date: new Date().toISOString(),
            };
            historyItem = documentHistoryItem;

            // Also save to local storage if onLoadToHistory provided
            if (onLoadToHistory) {
              onLoadToHistory(documentHistoryItem);
            }
          }
          break;

        case 'interview':
          fullItem = await getInterviewById(item.id);
          downloadInterview(fullItem);

          // Create history item for local analysis
          if (fullItem) {
            const interviewHistoryItem: InterviewHistoryItem = {
              type: 'interview',
              interview: {
                id: fullItem.id.toString(),
                cvContent: fullItem.cv_content,
                cvFileName: fullItem.cv_file_name,
                targetPosition: fullItem.target_position,
                interviewType: fullItem.interview_type,
                customPrompt: fullItem.custom_prompt,
                questions: fullItem.questions || [],
                answers: fullItem.answers || [],
                feedback: fullItem.feedback || { summary: '', strengths: [], weaknesses: [], recommendations: [], overallScore: 0, positionFit: 'fair' },
                createdAt: fullItem.created_at,
                status: fullItem.status || 'completed'
              },
              date: new Date().toISOString(),
            };
            historyItem = interviewHistoryItem;

            // Also save to local storage if onLoadToHistory provided
            if (onLoadToHistory) {
              onLoadToHistory(interviewHistoryItem);
            }
          }
          break;

        case 'question_bank':
          // For question banks, we need to handle the data differently
          fullItem = await getQuestionBankById(item.id);
          const bankData = {
            name: fullItem.name,
            description: fullItem.description,
            subject: fullItem.subject,
            tags: fullItem.tags,
            questions: fullItem.questions,
            isPublic: fullItem.is_public,
            usageCount: fullItem.usage_count,
            createdAt: fullItem.created_at
          };

          // Download as JSON file
          const blob = new Blob([JSON.stringify(bankData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${fullItem.name || 'question_bank'}.json`;
          a.click();
          URL.revokeObjectURL(url);

          // For question banks, we add to local question bank instead of history
          // The onDownloadToLocal callback will handle this in App.tsx
          break;
      }

      // If onDownloadToLocal is provided, also call it with the raw data
      if (onDownloadToLocal) {
        onDownloadToLocal(item, fullItem);
      }

    } catch (error) {
      console.error('Failed to download item:', error);
      alert(`Failed to download ${item.title}`);
    } finally {
      setDownloadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  const handleBulkDownload = async () => {
    if (!content) return;

    const allItems = [...content.documents, ...content.interviews, ...content.questionBanks];
    const itemsToDownload = allItems.filter(item => selectedItems.has(item.id));

    for (const item of itemsToDownload) {
      await handleDownloadToLocal(item);
    }

    setSelectedItems(new Set()); // Clear selection after download
  };

  const getCurrentTabItems = (): DatabaseItem[] => {
    if (!content) return [];

    switch (activeTab) {
      case 'documents':
        return content.documents;
      case 'interviews':
        return content.interviews;
      case 'questionBanks':
        return content.questionBanks;
      default:
        return [];
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'preparing':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 dark:bg-zinc-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-zinc-700/50 max-w-5xl w-full max-h-[95vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex justify-between items-center p-6 border-b border-zinc-200/50 dark:border-zinc-700/50 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M9 8h6m-6 8h6" style={{transformOrigin: 'center'}} className="animate-pulse" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Cloud Content Browser
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Access your documents from anywhere</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all duration-200 hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 border-b border-zinc-200 dark:border-zinc-700">
          {(['documents', 'interviews', 'questionBanks'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-3 text-center text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border-b-2 border-indigo-600'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              {tab === 'documents' ? 'Documents' : tab === 'interviews' ? 'Interviews' : 'Question Banks'}
              {content && (
                <span className="ml-2 px-2 py-1 text-xs bg-zinc-200 dark:bg-zinc-600 rounded-full">
                  {tab === 'documents' ? content.documents.length :
                   tab === 'interviews' ? content.interviews.length :
                   content.questionBanks.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : !content ? (
            <div className="text-center py-12 text-zinc-600 dark:text-zinc-400">
              Failed to load database content
            </div>
          ) : (
            <div className="space-y-4">
              {/* Bulk Actions */}
              {selectedItems.size > 0 && (
                <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {selectedItems.size} items selected
                  </span>
                  <button
                    onClick={handleBulkDownload}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                  >
                    Download Selected
                  </button>
                </div>
              )}

              {/* Content List */}
              {getCurrentTabItems().length === 0 ? (
                <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                  No {activeTab.replace(/([A-Z])/g, ' $1').toLowerCase()} found in database
                </div>
              ) : (
                <div className="space-y-3">
                  {getCurrentTabItems().map((item) => {
                    const getTypeIcon = () => {
                      switch (item.type) {
                        case 'document':
                          return (
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          );
                        case 'interview':
                          return (
                            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2a3 3 0 015.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M12 4a3 3 0 100 6 3 3 0 000-6z" />
                            </svg>
                          );
                        case 'question_bank':
                          return (
                            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          );
                      }
                    };

                    const getTypeGradient = () => {
                      switch (item.type) {
                        case 'document':
                          return 'from-blue-500 to-cyan-500';
                        case 'interview':
                          return 'from-green-500 to-emerald-500';
                        case 'question_bank':
                          return 'from-purple-500 to-pink-500';
                      }
                    };

                    return (
                      <div
                        key={item.id}
                        className={`group relative flex items-center space-x-4 p-5 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                          selectedItems.has(item.id)
                            ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/50 shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/30'
                            : `bg-white/60 dark:bg-zinc-800/60 border-zinc-200/60 dark:border-zinc-700/60 hover:border-zinc-300/80 dark:hover:border-zinc-600/80 hover:shadow-xl hover:-translate-y-1`
                        }`}
                        onClick={() => selectedItems.size > 0 && handleItemSelect(item.id)}
                      >
                        {/* Selection Overlay */}
                        {selectedItems.size > 0 && (
                          <div className="absolute top-3 left-3 z-10">
                            <input
                              type="checkbox"
                              checked={selectedItems.has(item.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleItemSelect(item.id);
                              }}
                              className="w-4 h-4 text-indigo-600 bg-white/80 border-zinc-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 focus:ring-2"
                            />
                          </div>
                        )}

                        {/* Type Icon */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${getTypeGradient()} flex items-center justify-center shadow-lg`}>
                          {getTypeIcon()}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {item.title}
                              </h3>
                              <div className="flex items-center space-x-3 mt-1">
                                {item.type === 'interview' && item.status && (
                                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(item.status)}`}>
                                    {item.status}
                                  </span>
                                )}
                                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                  {formatDate(item.createdAt)}
                                </span>
                              </div>
                            </div>
                            {/* Download Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadToLocal(item);
                              }}
                              disabled={downloadingItems.has(item.id)}
                              className="flex-shrink-0 ml-3 p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={`Download ${item.type}`}
                            >
                              {downloadingItems.has(item.id) ? (
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                                  <polyline points="7,10 12,15 17,10"/>
                                  <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                              )}
                            </button>
                          </div>

                          {/* Metadata */}
                          <div className="flex items-center space-x-4 mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                            {item.type === 'document' && item.metadata && (
                              <>
                                {item.metadata.entities > 0 && (
                                  <span className="flex items-center space-x-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                    <span>{item.metadata.entities} entities</span>
                                  </span>
                                )}
                                {item.metadata.sentiment && (
                                  <span className="flex items-center space-x-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                    <span>{item.metadata.sentiment}</span>
                                  </span>
                                )}
                              </>
                            )}
                            {item.type === 'interview' && item.score && (
                              <span className="flex items-center space-x-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                </svg>
                                <span>Score: {item.score}/100</span>
                              </span>
                            )}
                            {item.type === 'question_bank' && (
                              <>
                                {item.questionCount && (
                                  <span className="flex items-center space-x-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                    </svg>
                                    <span>{item.questionCount} questions</span>
                                  </span>
                                )}
                                {item.subject && (
                                  <span className="flex items-center space-x-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                    <span>{item.subject}</span>
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => setSelectedItems(new Set())}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
          >
            Clear Selection ({selectedItems.size})
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseBrowser;
