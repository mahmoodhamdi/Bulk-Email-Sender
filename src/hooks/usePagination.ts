import { useState, useMemo, useCallback } from 'react';

export interface PaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  pageSizeOptions?: number[];
}

export interface PaginationResult<T> {
  // Current state
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;

  // Paginated data
  paginatedItems: T[];

  // Navigation
  goToPage: (page: number) => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;

  // Page size
  setPageSize: (size: number) => void;
  pageSizeOptions: number[];

  // Utility
  canGoNext: boolean;
  canGoPrevious: boolean;
  startIndex: number;
  endIndex: number;

  // Reset
  reset: () => void;
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function usePagination<T>(
  items: T[],
  options: PaginationOptions = {}
): PaginationResult<T> {
  const {
    initialPage = 1,
    initialPageSize = 10,
    pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Ensure current page is within valid range
  const validCurrentPage = useMemo(() => {
    if (currentPage < 1) return 1;
    if (currentPage > totalPages) return totalPages;
    return currentPage;
  }, [currentPage, totalPages]);

  // Update current page if it's out of range
  if (validCurrentPage !== currentPage) {
    setCurrentPage(validCurrentPage);
  }

  // Calculate paginated items
  const paginatedItems = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return items.slice(startIndex, endIndex);
  }, [items, validCurrentPage, pageSize]);

  // Calculate start and end indices for display
  const startIndex = totalItems === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const endIndex = Math.min(validCurrentPage * pageSize, totalItems);

  // Navigation flags
  const canGoPrevious = validCurrentPage > 1;
  const canGoNext = validCurrentPage < totalPages;

  // Navigation functions
  const goToPage = useCallback(
    (page: number) => {
      const validPage = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(validPage);
    },
    [totalPages]
  );

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  const goToNextPage = useCallback(() => {
    if (canGoNext) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [canGoNext]);

  const goToPreviousPage = useCallback(() => {
    if (canGoPrevious) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [canGoPrevious]);

  // Page size change handler
  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setCurrentPage(1); // Reset to first page when page size changes
  }, []);

  // Reset function
  const reset = useCallback(() => {
    setCurrentPage(initialPage);
    setPageSizeState(initialPageSize);
  }, [initialPage, initialPageSize]);

  return {
    currentPage: validCurrentPage,
    pageSize,
    totalItems,
    totalPages,
    paginatedItems,
    goToPage,
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPreviousPage,
    setPageSize,
    pageSizeOptions,
    canGoNext,
    canGoPrevious,
    startIndex,
    endIndex,
    reset,
  };
}

/**
 * Generate an array of page numbers for pagination display
 * Shows ellipsis when there are many pages
 */
export function getPageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisiblePages: number = 5
): (number | 'ellipsis')[] {
  if (totalPages <= maxVisiblePages) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [];
  const halfVisible = Math.floor(maxVisiblePages / 2);

  // Always show first page
  pages.push(1);

  // Calculate start and end of visible page range
  let start = Math.max(2, currentPage - halfVisible);
  let end = Math.min(totalPages - 1, currentPage + halfVisible);

  // Adjust if near start or end
  if (currentPage <= halfVisible + 1) {
    end = Math.min(totalPages - 1, maxVisiblePages - 1);
  } else if (currentPage >= totalPages - halfVisible) {
    start = Math.max(2, totalPages - maxVisiblePages + 2);
  }

  // Add ellipsis before middle pages if needed
  if (start > 2) {
    pages.push('ellipsis');
  }

  // Add middle pages
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  // Add ellipsis after middle pages if needed
  if (end < totalPages - 1) {
    pages.push('ellipsis');
  }

  // Always show last page if more than 1 page
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}
