import React, { useState, useRef, useEffect } from 'react';
import { debounce, reactUtils } from '../../utils/performanceUtils';
import { keyCodes } from '../../utils/accessibilityUtils';

interface SearchInputProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showClearButton?: boolean;
  ariaLabel?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = 'Search...',
  onSearch,
  debounceMs = 300,
  className = '',
  size = 'md',
  showClearButton = true,
  ariaLabel = 'Search'
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search function
  const debouncedSearch = React.useMemo(
    () => debounce(onSearch, debounceMs),
    [onSearch, debounceMs]
  );

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  // Handle clear
  const handleClear = () => {
    setQuery('');
    onSearch('');
    inputRef.current?.focus();
  };

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === keyCodes.ESCAPE) {
      handleClear();
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const baseClasses = `
    w-full rounded-lg border border-zinc-300 dark:border-zinc-600
    bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
    placeholder-zinc-500 dark:placeholder-zinc-400
    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
    transition-all duration-200
    ${sizeClasses[size]}
    ${className}
  `.trim();

  return (
    <div className="relative">
      {/* Search Icon */}
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg
          className={`w-5 h-5 transition-colors ${
            isFocused ? 'text-indigo-500' : 'text-zinc-400 dark:text-zinc-500'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Input Field */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={`${baseClasses} ${query ? 'pr-10' : 'pr-3'}`}
      />

      {/* Clear Button */}
      {showClearButton && query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
          aria-label="Clear search"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Search Results Indicator */}
      {query && (
        <div className="absolute inset-y-0 right-0 pr-10 flex items-center pointer-events-none">
          <div className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
};

export default SearchInput;
