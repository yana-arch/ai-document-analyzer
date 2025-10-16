import React, { useRef, useCallback, useState, useMemo } from 'react';
import { HistoryItem, DocumentHistoryItem, InterviewHistoryItem } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { exportHistory, importHistory, mergeHistory } from '../utils/historyUtils';
import ProgressiveDisclosure from './shared/ProgressiveDisclosure';

interface HistoryListProps {
  items: HistoryItem[];
  onLoadItem: (item: HistoryItem) => void;
  onImportHistory: (mergedHistory: HistoryItem[]) => void;
}

type FilterType = 'all' | 'document' | 'interview';
type SortType = 'date' | 'name' | 'type';

const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);

const UserIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
);

const EnhancedHistoryItem: React.FC<{
  item: HistoryItem,
  onLoadItem: (item: HistoryItem) => void,
  t: (key: string) => string,
  viewMode: 'list' | 'grid'
}> = ({ item, onLoadItem, t, viewMode }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'negative': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'neutral': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (item.type === 'document') {
    const previewText = item.analysis?.summary?.substring(0, 150) + '...' || '';
    const topics = item.analysis?.topics?.slice(0, 3) || [];
    const sentiment = item.analysis?.sentiment;

    return (
      <div className={`
        bg-white dark:bg-zinc-800/50 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700/50
        hover:shadow-2xl hover:scale-[1.02] transition-all duration-200 cursor-pointer
        ${viewMode === 'grid' ? 'p-6' : 'p-4'}
      `}>
        <button
          onClick={() => onLoadItem(item)}
          className="w-full text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-800 rounded-lg"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <ClockIcon className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formatDate(item.date)}
                </span>
              </div>
              <h3 className="font-semibold text-indigo-600 dark:text-indigo-400 truncate text-sm" title={item.fileName}>
                {item.fileName}
              </h3>
            </div>
            <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-full shrink-0 ml-2">
              Document
            </span>
          </div>

          {/* Preview */}
          {previewText && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2">
              {previewText}
            </p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {sentiment && (
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSentimentColor(sentiment)}`}>
                {sentiment}
              </span>
            )}
            {topics.map((topic, index) => (
              <span key={index} className="px-2 py-1 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium rounded-full">
                {topic}
              </span>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>{t('history.analyzedOn') || 'Analyzed'}</span>
            <span>{topics.length} topics</span>
          </div>
        </button>
      </div>
    );
  }

  if (item.type === 'interview') {
    const previewText = item.interview.cvContent?.substring(0, 150) + '...' || '';
    const score = item.interview.overallScore;
    const questionCount = item.interview.questions?.length || 0;
    const answerCount = item.interview.answers?.length || 0;

    return (
      <div className={`
        bg-white dark:bg-zinc-800/50 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700/50
        hover:shadow-2xl hover:scale-[1.02] transition-all duration-200 cursor-pointer
        ${viewMode === 'grid' ? 'p-6' : 'p-4'}
      `}>
        <button
          onClick={() => onLoadItem(item)}
          className="w-full text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-800 rounded-lg"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <UserIcon className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formatDate(item.date)}
                </span>
              </div>
              <h3 className="font-semibold text-purple-600 dark:text-purple-400 truncate text-sm" title={item.interview.targetPosition}>
                {t('history.interviewFor') || 'Interview for'} {item.interview.targetPosition}
              </h3>
            </div>
            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full shrink-0 ml-2">
              Interview
            </span>
          </div>

          {/* Preview */}
          {previewText && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2">
              {previewText}
            </p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              item.interview.interviewType === 'technical' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
              item.interview.interviewType === 'behavioral' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
              item.interview.interviewType === 'situational' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
              'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
            }`}>
              {item.interview.interviewType}
            </span>

            {score !== undefined && (
              <span className={`px-2 py-1 text-xs font-medium rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300`}>
                Score: <span className={getScoreColor(score)}>{score.toFixed(0)}%</span>
              </span>
            )}

            <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium rounded-full">
              {answerCount}/{questionCount} answered
            </span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>{t('history.completedOn') || 'Completed'}</span>
            {item.interview.feedback?.positionFit && (
              <span className={`font-medium ${
                item.interview.feedback.positionFit === 'excellent' ? 'text-green-600 dark:text-green-400' :
                item.interview.feedback.positionFit === 'good' ? 'text-blue-600 dark:text-blue-400' :
                item.interview.feedback.positionFit === 'fair' ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {item.interview.feedback.positionFit} fit
              </span>
            )}
          </div>
        </button>
      </div>
    );
  }

  return null;
};


const HistoryList: React.FC<HistoryListProps> = ({ items, onLoadItem, onImportHistory }) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('date');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = items;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item => {
        if (item.type === 'document') {
          return item.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 item.analysis?.summary?.toLowerCase().includes(searchTerm.toLowerCase());
        } else if (item.type === 'interview') {
          return item.interview.targetPosition.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 item.interview.cvContent.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return false;
      });
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'name':
          const aName = a.type === 'document' ? a.fileName : a.interview.targetPosition;
          const bName = b.type === 'document' ? b.fileName : b.interview.targetPosition;
          return aName.localeCompare(bName);
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

    return filtered;
  }, [items, searchTerm, filterType, sortBy]);

  const handleExportHistory = useCallback(async () => {
    try {
      await exportHistory(filteredAndSortedItems);
      alert(t('history.exportSuccess'));
    } catch (error) {
      console.error('Export failed:', error);
      alert(t('history.importError'));
    }
  }, [filteredAndSortedItems, t]);

  const handleImportTrigger = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportHistory = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedHistory = await importHistory(file);
      const mergedHistory = mergeHistory(items, importedHistory);
      onImportHistory(mergedHistory);
      alert(t('history.importSuccess'));
    } catch (error) {
      console.error('Import failed:', error);
      alert(t('history.importError'));
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [items, onImportHistory, t]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto mt-16">
      <h3 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 mb-6 text-center">{t('history.title')}</h3>

      {/* Progressive Controls Section - Simplified để giảm cognitive load */}
      <ProgressiveDisclosure
        title={
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-8.0 0 7 7 0 018 0z" />
            </svg>
            {t('history.searchFilter') || 'Search & Filter'} <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full">Optional</span>
          </div>
        }
        defaultExpanded={false}
        variant="card"
        className="mb-6"
      >
        {/* Search and Filter Row */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          {/* Search */}
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder={t('history.searchPlaceholder') || "Search history..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-100 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            />
          </div>

          {/* Filter */}
          <div className="flex gap-2">
            {(['all', 'document', 'interview'] as FilterType[]).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterType === type
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                }`}
              >
                {t(`history.filter.${type}`) || type}
              </button>
            ))}
          </div>
        </div>

        {/* Sort and View Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div className="flex gap-2">
            {(['date', 'name', 'type'] as SortType[]).map((sort) => (
              <button
                key={sort}
                onClick={() => setSortBy(sort)}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  sortBy === sort
                    ? 'bg-zinc-200 dark:bg-zinc-600 text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                {t(`history.sort.${sort}`) || sort}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <button
            onClick={handleExportHistory}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors flex items-center gap-2"
            disabled={filteredAndSortedItems.length === 0}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {t('history.exportButton')}
          </button>

          <button
            onClick={handleImportTrigger}
            className="px-4 py-2 bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-500 transition-colors flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17,8 12,3 7,8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {t('history.importButton')}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportHistory}
            className="hidden"
          />
        </div>
      </ProgressiveDisclosure>

      {/* Results Summary */}
      <div className="mb-4 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">
          {t('history.showingResults') || `Showing ${filteredAndSortedItems.length} of ${items.length} items`}
        </p>
      </div>

      {/* Items Grid/List */}
      {filteredAndSortedItems.length > 0 ? (
        <div className={
          viewMode === 'grid'
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
        }>
          {filteredAndSortedItems.map((item, index) => (
            <EnhancedHistoryItem
              key={item.type === 'document' ? `${item.fileName}_${item.date}` : item.interview.id}
              item={item}
              onLoadItem={onLoadItem}
              t={t}
              viewMode={viewMode}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-800/50 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700/50 p-12 text-center">
          <svg className="w-12 h-12 text-zinc-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            {t('history.noResults') || 'No results found'}
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400">
            {t('history.noResultsDesc') || 'Try adjusting your search or filter criteria'}
          </p>
        </div>
      )}
    </div>
  );
};

export default HistoryList;
