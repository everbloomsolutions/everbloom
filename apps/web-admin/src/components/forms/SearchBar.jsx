import { Search, X } from 'lucide-react';
import { useDebounce } from '../../hooks';
import { useState, useEffect } from 'react';

const SearchBar = ({
  onSearch,
  placeholder = 'Search...',
  delay = 500,
  value,
  onChange,
  minSearchLength = 1,
}) => {
  const isControlled = value !== undefined;
  const [searchTerm, setSearchTerm] = useState('');
  const inputValue = isControlled ? value : searchTerm;
  const debouncedSearchTerm = useDebounce(inputValue, delay);

  const trimmedInput = typeof inputValue === 'string' ? inputValue.trim() : '';
  const showTooShortHint =
    trimmedInput.length > 0 && trimmedInput.length < minSearchLength;

  useEffect(() => {
    const trimmed = typeof debouncedSearchTerm === 'string'
      ? debouncedSearchTerm.trim()
      : '';
    if (trimmed === '' || trimmed.length >= minSearchLength) {
      onSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, minSearchLength, onSearch]);

  const handleChange = (e) => {
    const nextValue = e.target.value;
    onChange?.(nextValue);
    if (!isControlled) {
      setSearchTerm(nextValue);
    }
  };

  const handleClear = () => {
    onChange?.('');
    if (!isControlled) {
      setSearchTerm('');
    }
    onSearch('');
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <Search className="w-5 h-5 text-gray-400" />
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full pl-10 ${trimmedInput ? 'pr-10' : 'pr-4'} py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
      />
      {trimmedInput && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {showTooShortHint && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Enter at least {minSearchLength} characters to search
        </p>
      )}
    </div>
  );
};

export default SearchBar;
