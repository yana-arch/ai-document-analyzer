import { HistoryItem, DocumentHistoryItem, InterviewHistoryItem } from '../types';

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
          if (!item.type || !item.date) {
            throw new Error('Invalid history item structure: missing type or date');
          }
          if (item.type === 'document') {
            const docItem = item as DocumentHistoryItem;
            if (!docItem.fileName || !docItem.analysis || !docItem.documentText) {
              throw new Error('Invalid document history item structure');
            }
          } else if (item.type === 'interview') {
            const interviewItem = item as InterviewHistoryItem;
            if (!interviewItem.interview) {
              throw new Error('Invalid interview history item structure');
            }
          } else {
            // For forward compatibility, we can choose to ignore unknown types
            console.warn(`Unknown history item type found: ${(item as any).type}`);
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

const getHistoryItemKey = (item: HistoryItem): string => {
  if (item.type === 'document') {
    return `doc_${item.fileName}_${item.date}`;
  }
  // Add null check to prevent runtime errors when interview is undefined
  return `iv_${item.interview?.id || 'unknown'}_${item.date}`;
};

export const mergeHistory = (currentHistory: HistoryItem[], importedHistory: HistoryItem[]): HistoryItem[] => {
  // Create a map to avoid duplicates
  const historyMap = new Map<string, HistoryItem>();

  // Add current history first
  currentHistory.forEach(item => {
    historyMap.set(getHistoryItemKey(item), item);
  });

  // Add imported items, overwriting if they have the same key
  importedHistory.forEach(item => {
    historyMap.set(getHistoryItemKey(item), item);
  });

  // Convert back to array and sort by date (newest first)
  const merged = Array.from(historyMap.values());
  merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Limit to 100 items to prevent excessive storage usage
  return merged.slice(0, 100);
};
