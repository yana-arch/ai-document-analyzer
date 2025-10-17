import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HistoryList from '../../components/HistoryList';
import { HistoryItem } from '../../types';

// Mock the language context
vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    locale: 'en',
    setLocale: vi.fn()
  })
}));

// Mock the history utils
vi.mock('../../utils/historyUtils', () => ({
  exportHistory: vi.fn().mockResolvedValue(undefined),
  importHistory: vi.fn().mockResolvedValue([]),
  mergeHistory: vi.fn().mockImplementation((a, b) => [...a, ...b])
}));

describe('HistoryList Component', () => {
  const mockItems: HistoryItem[] = [
    {
      type: 'document',
      fileName: 'test-document.pdf',
      analysis: {
        summary: 'This is a test document summary',
        topics: ['test', 'document'],
        entities: [],
        sentiment: 'Positive',
        tips: []
      },
      documentText: 'This is test document content',
      date: new Date().toISOString()
    },
    {
      type: 'interview',
      interview: {
        id: 'test-interview-1',
        cvContent: 'Test CV content',
        targetPosition: 'Software Engineer',
        interviewType: 'technical',
        questions: [],
        answers: [],
        createdAt: new Date().toISOString(),
        status: 'completed'
      },
      date: new Date().toISOString()
    }
  ];

  const mockOnLoadItem = vi.fn();
  const mockOnImportHistory = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no items provided', () => {
    render(<HistoryList items={[]} onLoadItem={mockOnLoadItem} onImportHistory={mockOnImportHistory} />);

    // Should render nothing when items array is empty
    expect(screen.queryByText('history.title')).not.toBeInTheDocument();
  });

  it('renders history items correctly', () => {
    render(<HistoryList items={mockItems} onLoadItem={mockOnLoadItem} onImportHistory={mockOnImportHistory} />);

    expect(screen.getByText('history.title')).toBeInTheDocument();
    expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
    expect(screen.getByText(/Interview for Software Engineer/)).toBeInTheDocument();
  });

  it('filters items by search term', async () => {
    render(<HistoryList items={mockItems} onLoadItem={mockOnLoadItem} onImportHistory={mockOnImportHistory} />);

    const searchInput = screen.getByPlaceholderText(/Search history/);
    fireEvent.change(searchInput, { target: { value: 'document' } });

    await waitFor(() => {
      expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
      expect(screen.queryByText(/Interview for Software Engineer/)).not.toBeInTheDocument();
    });
  });

  it('filters items by type', async () => {
    render(<HistoryList items={mockItems} onLoadItem={mockOnLoadItem} onImportHistory={mockOnImportHistory} />);

    const documentFilter = screen.getByText('history.filter.document');
    fireEvent.click(documentFilter);

    await waitFor(() => {
      expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
      expect(screen.queryByText(/Interview for Software Engineer/)).not.toBeInTheDocument();
    });
  });

  it('changes view mode between list and grid', () => {
    render(<HistoryList items={mockItems} onLoadItem={mockOnLoadItem} onImportHistory={mockOnImportHistory} />);

    const gridViewButton = screen.getByRole('button', { name: /grid view/i });
    fireEvent.click(gridViewButton);

    // Check if grid view is active (you might need to check for specific grid classes)
    expect(gridViewButton).toHaveClass('bg-indigo-100');
  });

  it('calls onLoadItem when item is clicked', () => {
    render(<HistoryList items={mockItems} onLoadItem={mockOnLoadItem} onImportHistory={mockOnImportHistory} />);

    const documentItem = screen.getByText('test-document.pdf');
    fireEvent.click(documentItem);

    expect(mockOnLoadItem).toHaveBeenCalledWith(mockItems[0]);
  });

  it('handles export functionality', async () => {
    const { exportHistory } = await import('../../utils/historyUtils');

    render(<HistoryList items={mockItems} onLoadItem={mockOnLoadItem} onImportHistory={mockOnImportHistory} />);

    const exportButton = screen.getByText('history.exportButton');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(exportHistory).toHaveBeenCalledWith(mockItems);
    });
  });

  it('handles import functionality', async () => {
    const { importHistory, mergeHistory } = await import('../../utils/historyUtils');

    render(<HistoryList items={mockItems} onLoadItem={mockOnLoadItem} onImportHistory={mockOnImportHistory} />);

    const importButton = screen.getByText('history.importButton');
    fireEvent.click(importButton);

    // Simulate file selection
    const file = new File(['test'], 'test.json', { type: 'application/json' });
    const importInput = screen.getByRole('input', { type: 'file' });

    // Note: In a real test environment, you'd need to properly mock the file input
    // This is a simplified version
    expect(importInput).toBeInTheDocument();
  });

  it('sorts items by different criteria', async () => {
    render(<HistoryList items={mockItems} onLoadItem={mockOnLoadItem} onImportHistory={mockOnImportHistory} />);

    const nameSortButton = screen.getByText('history.sort.name');
    fireEvent.click(nameSortButton);

    // Check if sort button is active
    expect(nameSortButton).toHaveClass('bg-zinc-200');
  });

  it('displays correct item counts in results summary', () => {
    render(<HistoryList items={mockItems} onLoadItem={mockOnLoadItem} onImportHistory={mockOnImportHistory} />);

    expect(screen.getByText(/Showing 2 of 2 items/)).toBeInTheDocument();
  });

  it('shows no results message when search yields no matches', async () => {
    render(<HistoryList items={mockItems} onLoadItem={mockOnLoadItem} onImportHistory={mockOnImportHistory} />);

    const searchInput = screen.getByPlaceholderText(/Search history/);
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('history.noResults')).toBeInTheDocument();
    });
  });
});
