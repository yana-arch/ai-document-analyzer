import React, { useState, useEffect, useRef, useMemo, ReactNode } from 'react';

interface VirtualScrollProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  overscan?: number; // Number of items to render outside visible area
  onScroll?: (scrollTop: number) => void;
}

interface VisibleRange {
  start: number;
  end: number;
}

/**
 * Virtual scrolling component for efficiently rendering large lists
 */
export function VirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = '',
  overscan = 5,
  onScroll
}: VirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const visibleRange = useMemo((): VisibleRange => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length - 1, start + visibleCount + overscan * 2);

    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1);
  }, [items, visibleRange]);

  // Total height of all items
  const totalHeight = items.length * itemHeight;

  // Handle scroll event
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  };

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Spacer for items before visible range */}
        <div style={{ height: visibleRange.start * itemHeight }} />

        {/* Visible items */}
        <div style={{ position: 'absolute', top: visibleRange.start * itemHeight, width: '100%' }}>
          {visibleItems.map((item, index) => (
            <div key={visibleRange.start + index} style={{ height: itemHeight }}>
              {renderItem(item, visibleRange.start + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for managing virtual scroll state
 */
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo((): VisibleRange => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length - 1, start + visibleCount + overscan * 2);

    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;

  return {
    scrollTop,
    setScrollTop,
    visibleRange,
    visibleItems,
    totalHeight
  };
}

/**
 * Optimized list component with virtual scrolling
 */
interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  estimatedItemSize?: number;
  onItemsRendered?: (range: { start: number; end: number; visibleStart: number; visibleEnd: number }) => void;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = '',
  estimatedItemSize,
  onItemsRendered
}: VirtualListProps<T>) {
  const { visibleItems, totalHeight, scrollTop, setScrollTop } = useVirtualScroll(
    items,
    itemHeight,
    containerHeight
  );

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);

    // Calculate visible range for callback
    const start = Math.floor(newScrollTop / itemHeight);
    const end = Math.min(
      items.length - 1,
      start + Math.ceil(containerHeight / itemHeight)
    );

    onItemsRendered?.({
      start,
      end,
      visibleStart: start,
      visibleEnd: end
    });
  };

  return (
    <div
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => {
          const originalIndex = Math.floor((scrollTop + index * itemHeight) / itemHeight);
          return (
            <div
              key={originalIndex}
              style={{
                height: itemHeight,
                position: 'absolute',
                top: originalIndex * itemHeight,
                width: '100%'
              }}
            >
              {renderItem(item, originalIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Grid-based virtual scrolling for 2D layouts
 */
interface VirtualGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  gap?: number;
  columnCount?: number;
}

export function VirtualGrid<T>({
  items,
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  renderItem,
  className = '',
  gap = 0,
  columnCount
}: VirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const autoColumnCount = Math.floor((containerWidth + gap) / (itemWidth + gap));
  const columns = columnCount || autoColumnCount;

  const rowCount = Math.ceil(items.length / columns);
  const totalHeight = rowCount * (itemHeight + gap) - gap;

  const visibleRange = useMemo(() => {
    const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - 1);
    const endRow = Math.min(
      rowCount - 1,
      startRow + Math.ceil(containerHeight / (itemHeight + gap)) + 1
    );

    return { startRow, endRow };
  }, [scrollTop, itemHeight, gap, containerHeight, rowCount]);

  const visibleItems = useMemo(() => {
    const result: Array<{ item: T; row: number; col: number; index: number }> = [];

    for (let row = visibleRange.startRow; row <= visibleRange.endRow; row++) {
      for (let col = 0; col < columns; col++) {
        const index = row * columns + col;
        if (index < items.length) {
          result.push({
            item: items[index],
            row,
            col,
            index
          });
        }
      }
    }

    return result;
  }, [items, visibleRange, columns]);

  return (
    <div
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight, width: containerWidth }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, row, col, index }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: col * (itemWidth + gap),
              top: row * (itemHeight + gap),
              width: itemWidth,
              height: itemHeight
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default VirtualScroll;
