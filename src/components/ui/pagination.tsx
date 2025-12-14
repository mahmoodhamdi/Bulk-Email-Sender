'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { getPageNumbers } from '@/hooks/usePagination';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  showFirstLast?: boolean;
  maxVisiblePages?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  showFirstLast = true,
  maxVisiblePages = 5,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages, maxVisiblePages);
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <nav
      className={cn('flex items-center justify-center gap-1', className)}
      role="navigation"
      aria-label="Pagination"
    >
      {showFirstLast && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={!canGoPrevious}
          aria-label="Go to first page"
          className="h-8 w-8 p-0"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canGoPrevious}
        aria-label="Go to previous page"
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pages.map((page, index) =>
        page === 'ellipsis' ? (
          <span
            key={`ellipsis-${index}`}
            className="flex h-8 w-8 items-center justify-center"
            aria-hidden
          >
            <MoreHorizontal className="h-4 w-4 text-gray-400" />
          </span>
        ) : (
          <Button
            key={page}
            variant={currentPage === page ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPageChange(page)}
            aria-label={`Go to page ${page}`}
            aria-current={currentPage === page ? 'page' : undefined}
            className="h-8 w-8 p-0"
          >
            {page}
          </Button>
        )
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canGoNext}
        aria-label="Go to next page"
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {showFirstLast && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={!canGoNext}
          aria-label="Go to last page"
          className="h-8 w-8 p-0"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      )}
    </nav>
  );
}

export interface PaginationInfoProps {
  startIndex: number;
  endIndex: number;
  totalItems: number;
  className?: string;
  showingLabel?: string;
  ofLabel?: string;
}

export function PaginationInfo({
  startIndex,
  endIndex,
  totalItems,
  className,
  showingLabel = 'Showing',
  ofLabel = 'of',
}: PaginationInfoProps) {
  if (totalItems === 0) {
    return (
      <p className={cn('text-sm text-gray-600 dark:text-gray-400', className)}>
        No items to display
      </p>
    );
  }

  return (
    <p className={cn('text-sm text-gray-600 dark:text-gray-400', className)}>
      {showingLabel} <span className="font-medium">{startIndex}</span> -{' '}
      <span className="font-medium">{endIndex}</span> {ofLabel}{' '}
      <span className="font-medium">{totalItems}</span>
    </p>
  );
}

export interface PageSizeSelectorProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  options?: number[];
  className?: string;
  label?: string;
}

export function PageSizeSelector({
  pageSize,
  onPageSizeChange,
  options = [10, 25, 50, 100],
  className,
  label = 'per page',
}: PageSizeSelectorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-sm"
        aria-label="Items per page"
      >
        {options.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
    </div>
  );
}

export interface PaginationContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PaginationContainer({ children, className }: PaginationContainerProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-4 py-4',
        className
      )}
    >
      {children}
    </div>
  );
}
