import React from 'react';

export default function Pagination({ currentPage, totalPages, onPageChange, className = "mt-6 flex items-center justify-center gap-1 flex-wrap" }) {
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const pages = getPageNumbers();

  const navCls = (disabled) =>
    [
      'w-8 h-8 flex items-center justify-center rounded-md border text-sm font-medium transition-all select-none',
      disabled
        ? 'border-[#E9DED3] text-[#C5B8AD] cursor-not-allowed opacity-50'
        : 'border-[#D6C9BC] text-[#7A5C44] hover:bg-[#F5EDE4] hover:border-[#C4A98B] cursor-pointer',
    ].join(' ');

  return (
    <div className={className}>
      {/* First Page */}
      <button
        type="button"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className={navCls(currentPage === 1)}
        aria-label="First Page"
      >
        «
      </button>

      {/* Previous Page */}
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className={navCls(currentPage === 1)}
        aria-label="Previous Page"
      >
        ‹
      </button>

      {/* Page Numbers */}
      {pages.map((page, index) => {
        if (page === '...') {
          return (
            <span
              key={`ellipsis-${index}`}
              className="w-8 h-8 flex items-center justify-center text-[#A89585] text-sm select-none"
            >
              …
            </span>
          );
        }
        const isActive = currentPage === page;
        return (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={[
              'w-8 h-8 flex items-center justify-center rounded-md text-sm font-semibold transition-all select-none border',
              isActive
                ? 'bg-[#C4965A] text-white border-[#C4965A] shadow-sm'
                : 'border-[#D6C9BC] text-[#7A5C44] hover:bg-[#F5EDE4] hover:border-[#C4A98B]',
            ].join(' ')}
          >
            {page}
          </button>
        );
      })}

      {/* Next Page */}
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className={navCls(currentPage === totalPages)}
        aria-label="Next Page"
      >
        ›
      </button>

      {/* Last Page */}
      <button
        type="button"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className={navCls(currentPage === totalPages)}
        aria-label="Last Page"
      >
        »
      </button>
    </div>
  );
}
