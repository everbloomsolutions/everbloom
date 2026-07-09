import { Search } from 'lucide-react';
import { useDebounce } from '../../hooks';
import { useState, useEffect } from 'react';

const SearchBar = ({ onSearch, placeholder = 'Search...', delay = 500, value, onChange }) => {
  const isControlled = value !== undefined;
  const [searchTerm, setSearchTerm] = useState('');
  const inputValue = isControlled ? value : searchTerm;
  const debouncedSearchTerm = useDebounce(inputValue, delay);

  useEffect(() => {
    onSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, onSearch]);

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <Search className="w-5 h-5 text-gray-400" />
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          const nextValue = e.target.value;
          onChange?.(nextValue);
          if (!isControlled) {
            setSearchTerm(nextValue);
          }
        }}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      />
    </div>
  );
};

export default SearchBar;
