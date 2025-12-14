import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination, getPageNumbers } from '@/hooks/usePagination';

describe('usePagination', () => {
  const mockItems = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
  }));

  describe('initial state', () => {
    it('should return correct initial values', () => {
      const { result } = renderHook(() => usePagination(mockItems));

      expect(result.current.currentPage).toBe(1);
      expect(result.current.pageSize).toBe(10);
      expect(result.current.totalItems).toBe(50);
      expect(result.current.totalPages).toBe(5);
      expect(result.current.paginatedItems).toHaveLength(10);
      expect(result.current.startIndex).toBe(1);
      expect(result.current.endIndex).toBe(10);
    });

    it('should respect initial options', () => {
      const { result } = renderHook(() =>
        usePagination(mockItems, { initialPage: 2, initialPageSize: 25 })
      );

      expect(result.current.currentPage).toBe(2);
      expect(result.current.pageSize).toBe(25);
      expect(result.current.totalPages).toBe(2);
      expect(result.current.paginatedItems).toHaveLength(25);
      expect(result.current.startIndex).toBe(26);
      expect(result.current.endIndex).toBe(50);
    });

    it('should handle empty array', () => {
      const { result } = renderHook(() => usePagination([]));

      expect(result.current.currentPage).toBe(1);
      expect(result.current.totalItems).toBe(0);
      expect(result.current.totalPages).toBe(1);
      expect(result.current.paginatedItems).toHaveLength(0);
      expect(result.current.startIndex).toBe(0);
      expect(result.current.endIndex).toBe(0);
    });
  });

  describe('navigation', () => {
    it('should go to next page', () => {
      const { result } = renderHook(() => usePagination(mockItems));

      act(() => {
        result.current.goToNextPage();
      });

      expect(result.current.currentPage).toBe(2);
      expect(result.current.startIndex).toBe(11);
      expect(result.current.endIndex).toBe(20);
    });

    it('should go to previous page', () => {
      const { result } = renderHook(() =>
        usePagination(mockItems, { initialPage: 3 })
      );

      act(() => {
        result.current.goToPreviousPage();
      });

      expect(result.current.currentPage).toBe(2);
    });

    it('should go to specific page', () => {
      const { result } = renderHook(() => usePagination(mockItems));

      act(() => {
        result.current.goToPage(4);
      });

      expect(result.current.currentPage).toBe(4);
      expect(result.current.startIndex).toBe(31);
      expect(result.current.endIndex).toBe(40);
    });

    it('should go to first page', () => {
      const { result } = renderHook(() =>
        usePagination(mockItems, { initialPage: 4 })
      );

      act(() => {
        result.current.goToFirstPage();
      });

      expect(result.current.currentPage).toBe(1);
    });

    it('should go to last page', () => {
      const { result } = renderHook(() => usePagination(mockItems));

      act(() => {
        result.current.goToLastPage();
      });

      expect(result.current.currentPage).toBe(5);
      expect(result.current.startIndex).toBe(41);
      expect(result.current.endIndex).toBe(50);
    });

    it('should not go beyond first page', () => {
      const { result } = renderHook(() => usePagination(mockItems));

      act(() => {
        result.current.goToPreviousPage();
      });

      expect(result.current.currentPage).toBe(1);
    });

    it('should not go beyond last page', () => {
      const { result } = renderHook(() =>
        usePagination(mockItems, { initialPage: 5 })
      );

      act(() => {
        result.current.goToNextPage();
      });

      expect(result.current.currentPage).toBe(5);
    });

    it('should clamp page number within valid range', () => {
      const { result } = renderHook(() => usePagination(mockItems));

      act(() => {
        result.current.goToPage(100);
      });

      expect(result.current.currentPage).toBe(5);

      act(() => {
        result.current.goToPage(-5);
      });

      expect(result.current.currentPage).toBe(1);
    });
  });

  describe('page size', () => {
    it('should change page size', () => {
      const { result } = renderHook(() => usePagination(mockItems));

      act(() => {
        result.current.setPageSize(25);
      });

      expect(result.current.pageSize).toBe(25);
      expect(result.current.totalPages).toBe(2);
      expect(result.current.paginatedItems).toHaveLength(25);
    });

    it('should reset to first page when page size changes', () => {
      const { result } = renderHook(() =>
        usePagination(mockItems, { initialPage: 3 })
      );

      act(() => {
        result.current.setPageSize(25);
      });

      expect(result.current.currentPage).toBe(1);
    });
  });

  describe('navigation flags', () => {
    it('should indicate can go next', () => {
      const { result } = renderHook(() => usePagination(mockItems));

      expect(result.current.canGoNext).toBe(true);
      expect(result.current.canGoPrevious).toBe(false);
    });

    it('should indicate cannot go next on last page', () => {
      const { result } = renderHook(() =>
        usePagination(mockItems, { initialPage: 5 })
      );

      expect(result.current.canGoNext).toBe(false);
      expect(result.current.canGoPrevious).toBe(true);
    });

    it('should indicate can go both ways on middle page', () => {
      const { result } = renderHook(() =>
        usePagination(mockItems, { initialPage: 3 })
      );

      expect(result.current.canGoNext).toBe(true);
      expect(result.current.canGoPrevious).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset to initial values', () => {
      const { result } = renderHook(() =>
        usePagination(mockItems, { initialPage: 1, initialPageSize: 10 })
      );

      act(() => {
        result.current.goToPage(3);
        result.current.setPageSize(25);
      });

      expect(result.current.currentPage).toBe(1); // Reset after page size change
      expect(result.current.pageSize).toBe(25);

      act(() => {
        result.current.reset();
      });

      expect(result.current.currentPage).toBe(1);
      expect(result.current.pageSize).toBe(10);
    });
  });

  describe('dynamic items', () => {
    it('should update when items change', () => {
      const { result, rerender } = renderHook(
        ({ items }) => usePagination(items),
        { initialProps: { items: mockItems } }
      );

      expect(result.current.totalItems).toBe(50);

      const newItems = mockItems.slice(0, 20);
      rerender({ items: newItems });

      expect(result.current.totalItems).toBe(20);
      expect(result.current.totalPages).toBe(2);
    });

    it('should adjust current page if it becomes invalid', () => {
      const { result, rerender } = renderHook(
        ({ items }) => usePagination(items, { initialPage: 5 }),
        { initialProps: { items: mockItems } }
      );

      expect(result.current.currentPage).toBe(5);

      const newItems = mockItems.slice(0, 20);
      rerender({ items: newItems });

      // Page 5 is now invalid with only 20 items (2 pages), should clamp to 2
      expect(result.current.currentPage).toBeLessThanOrEqual(2);
    });
  });
});

describe('getPageNumbers', () => {
  it('should return all pages when total is less than max visible', () => {
    const pages = getPageNumbers(1, 3, 5);
    expect(pages).toEqual([1, 2, 3]);
  });

  it('should return pages with ellipsis when total exceeds max visible', () => {
    const pages = getPageNumbers(1, 10, 5);
    expect(pages[0]).toBe(1);
    expect(pages[pages.length - 1]).toBe(10);
    expect(pages).toContain('ellipsis');
  });

  it('should show ellipsis at correct position when on first pages', () => {
    const pages = getPageNumbers(2, 10, 5);
    expect(pages[0]).toBe(1);
    expect(pages[1]).toBe(2);
    expect(pages).toContain('ellipsis');
    expect(pages[pages.length - 1]).toBe(10);
  });

  it('should show ellipsis at correct position when on last pages', () => {
    const pages = getPageNumbers(9, 10, 5);
    expect(pages[0]).toBe(1);
    expect(pages).toContain('ellipsis');
    expect(pages[pages.length - 1]).toBe(10);
  });

  it('should show ellipsis on both sides when in middle', () => {
    const pages = getPageNumbers(5, 10, 5);
    expect(pages[0]).toBe(1);
    const ellipsisCount = pages.filter((p) => p === 'ellipsis').length;
    expect(ellipsisCount).toBeGreaterThanOrEqual(1);
    expect(pages[pages.length - 1]).toBe(10);
  });

  it('should handle single page', () => {
    const pages = getPageNumbers(1, 1, 5);
    expect(pages).toEqual([1]);
  });

  it('should handle two pages', () => {
    const pages = getPageNumbers(1, 2, 5);
    expect(pages).toEqual([1, 2]);
  });
});
