import { memo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = memo(({ currentPage, totalPages, onPageChange }) => {
  const pages = [];
  const maxPagesToShow = 5;

  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  if (endPage - startPage < maxPagesToShow - 1) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!!(currentPage === 1)}
        className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600"
        aria-label="Go to previous page"
      >
        <ChevronLeft className="w-4 h-4 mr-2" aria-hidden="true" />
        Previous
      </button>

      <div className="flex gap-2">
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              currentPage === page
                ? 'bg-primary-600 text-white'
                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600'
            }`}
            aria-label={`Go to page ${page}`}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!!(currentPage === totalPages)}
        className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600"
        aria-label="Go to next page"
      >
        Next
        <ChevronRight className="w-4 h-4 ml-2" aria-hidden="true" />
      </button>
    </div>
  );
});

Pagination.displayName = 'Pagination';

export default Pagination;
