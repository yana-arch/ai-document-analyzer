

import { HistoryItem } from '../types';

export const exportHistory = async (history: HistoryItem[]): Promise<void> => {
  try {
    const dataStr = JSON.stringify(history, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `document-analysis-history-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    console.log('History exported successfully');
  } catch (error) {
    console.error('Failed to export history:', error);
    throw error;
  }
};

export const importHistory = (file: File): Promise<HistoryItem[]> => {
  return new Promise((resolve, reject) => {
    if (!file.name.endsWith('.json')) {
      reject(new Error('Invalid file type. Only JSON files are allowed.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedHistory: HistoryItem[] = JSON.parse(content);

        // Validate the imported history structure
        if (!Array.isArray(importedHistory)) {
          throw new Error('Import data must be an array');
        }

        // Validate each history item
        for (const item of importedHistory) {
          if (!item.fileName || !item.analysis || !item.documentText || !item.date) {
            throw new Error('Invalid history item structure');
          }
          // Basic validation for required fields
          if (typeof item.fileName !== 'string' || typeof item.documentText !== 'string' || typeof item.date !== 'string') {
            throw new Error('Invalid data types in history item');
          }
          if (typeof item.analysis !== 'object' || item.analysis === null) {
            throw new Error('Invalid analysis data in history item');
          }
        }

        resolve(importedHistory);
      } catch (error) {
        console.error('Failed to parse imported history:', error);
        reject(new Error('Invalid file format or corrupted data'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read the file'));
    };

    reader.readAsText(file);
  });
};

export const mergeHistory = (currentHistory: HistoryItem[], importedHistory: HistoryItem[]): HistoryItem[] => {
  // Create a map to avoid duplicates based on fileName + date combination
  const historyMap = new Map<string, HistoryItem>();

  // Add current history first
  currentHistory.forEach(item => {
    const key = `${item.fileName}_${item.date}`;
    historyMap.set(key, item);
  });

  // Add imported items, overwriting if they have the same fileName + date
  importedHistory.forEach(item => {
    const key = `${item.fileName}_${item.date}`;
    historyMap.set(key, item);
  });

  // Convert back to array and sort by date (newest first)
  const merged = Array.from(historyMap.values());
  merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Limit to 100 items to prevent excessive storage usage
  return merged.slice(0, 100);
};
