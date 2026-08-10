import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from 'lucide-react';

export default function Pagination({ currentPage, totalPages, onPageChange, className = "mt-8 flex items-center justify-center gap-2 flex-wrap" }) {
  if (totalPages <= 1) return null;

  // Determine which page numbers to show
  // We want to show first page, last page, and a few pages around the current page
  // Like: 1 2 ... 8 9 10 (if current is 9)
  const getPageNumbers = () => {
    const pages = [];
    
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
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

  const buttonBaseClass = "flex h-9 w-9 items-center justify-center rounded-md text-sm font-bold transition shadow-sm shrink-0 select-none";
  const inactiveClass = "bg-white border border-[#E9DED3] text-[#A7632E] hover:bg-[#FAF8F5]";
  const activeClass = "bg-[#A7632E] text-white border border-transparent";
  const disabledClass = "opacity-50 cursor-not-allowed";

  return (
    <div className={className}>
      {/* First Page */}
      <button
        type="button"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className={`${buttonBaseClass} ${inactiveClass} ${currentPage === 1 ? disabledClass : ''}`}
        aria-label="First Page"
      >
        <ChevronsLeft className="h-4 w-4" />
      </button>

      {/* Previous Page */}
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className={`${buttonBaseClass} ${inactiveClass} ${currentPage === 1 ? disabledClass : ''}`}
        aria-label="Previous Page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      
      {/* Page Numbers */}
      {pages.map((page, index) => {
        if (page === '...') {
          return (
            <div key={`ellipsis-${index}`} className="flex h-9 w-9 items-center justify-center text-[#6D625C]">
              <MoreHorizontal className="h-4 w-4" />
            </div>
          );
        }
        
        return (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={`${buttonBaseClass} ${currentPage === page ? activeClass : inactiveClass}`}
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
        className={`${buttonBaseClass} ${inactiveClass} ${currentPage === totalPages ? disabledClass : ''}`}
        aria-label="Next Page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Last Page */}
      <button
        type="button"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className={`${buttonBaseClass} ${inactiveClass} ${currentPage === totalPages ? disabledClass : ''}`}
        aria-label="Last Page"
      >
        <ChevronsRight className="h-4 w-4" />
      </button>
    </div>
  );
}
