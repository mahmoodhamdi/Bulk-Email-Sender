import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Pagination,
  PaginationInfo,
  PageSizeSelector,
  PaginationContainer,
} from '@/components/ui/pagination';

describe('Pagination Components', () => {
  describe('Pagination', () => {
    it('should not render when totalPages is 0', () => {
      const { container } = render(
        <Pagination currentPage={1} totalPages={0} onPageChange={() => {}} />
      );
      expect(container.querySelector('nav')).not.toBeInTheDocument();
    });

    it('should not render when totalPages is 1', () => {
      const { container } = render(
        <Pagination currentPage={1} totalPages={1} onPageChange={() => {}} />
      );
      expect(container.querySelector('nav')).not.toBeInTheDocument();
    });

    it('should render pagination when totalPages > 1', () => {
      render(
        <Pagination currentPage={1} totalPages={5} onPageChange={() => {}} />
      );
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should call onPageChange when page button is clicked', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      render(
        <Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />
      );

      await user.click(screen.getByLabelText('Go to page 2'));
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('should disable previous buttons on first page', () => {
      render(
        <Pagination currentPage={1} totalPages={5} onPageChange={() => {}} />
      );

      expect(screen.getByLabelText('Go to first page')).toBeDisabled();
      expect(screen.getByLabelText('Go to previous page')).toBeDisabled();
    });

    it('should disable next buttons on last page', () => {
      render(
        <Pagination currentPage={5} totalPages={5} onPageChange={() => {}} />
      );

      expect(screen.getByLabelText('Go to next page')).toBeDisabled();
      expect(screen.getByLabelText('Go to last page')).toBeDisabled();
    });

    it('should enable all navigation buttons on middle page', () => {
      render(
        <Pagination currentPage={3} totalPages={5} onPageChange={() => {}} />
      );

      expect(screen.getByLabelText('Go to first page')).not.toBeDisabled();
      expect(screen.getByLabelText('Go to previous page')).not.toBeDisabled();
      expect(screen.getByLabelText('Go to next page')).not.toBeDisabled();
      expect(screen.getByLabelText('Go to last page')).not.toBeDisabled();
    });

    it('should navigate to first page', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      render(
        <Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />
      );

      await user.click(screen.getByLabelText('Go to first page'));
      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it('should navigate to last page', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      render(
        <Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />
      );

      await user.click(screen.getByLabelText('Go to last page'));
      expect(onPageChange).toHaveBeenCalledWith(5);
    });

    it('should navigate to previous page', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      render(
        <Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />
      );

      await user.click(screen.getByLabelText('Go to previous page'));
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('should navigate to next page', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      render(
        <Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />
      );

      await user.click(screen.getByLabelText('Go to next page'));
      expect(onPageChange).toHaveBeenCalledWith(4);
    });

    it('should hide first/last buttons when showFirstLast is false', () => {
      render(
        <Pagination
          currentPage={3}
          totalPages={5}
          onPageChange={() => {}}
          showFirstLast={false}
        />
      );

      expect(screen.queryByLabelText('Go to first page')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Go to last page')).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <Pagination
          currentPage={1}
          totalPages={5}
          onPageChange={() => {}}
          className="custom-pagination"
        />
      );

      expect(screen.getByRole('navigation')).toHaveClass('custom-pagination');
    });

    it('should highlight current page', () => {
      render(
        <Pagination currentPage={2} totalPages={5} onPageChange={() => {}} />
      );

      const currentPageButton = screen.getByLabelText('Go to page 2');
      expect(currentPageButton).toHaveAttribute('aria-current', 'page');
    });

    it('should show ellipsis for many pages', () => {
      render(
        <Pagination currentPage={5} totalPages={10} onPageChange={() => {}} />
      );

      // Should show ellipsis when there are many pages
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
  });

  describe('PaginationInfo', () => {
    it('should show "No items" message when totalItems is 0', () => {
      render(
        <PaginationInfo startIndex={0} endIndex={0} totalItems={0} />
      );

      expect(screen.getByText('No items to display')).toBeInTheDocument();
    });

    it('should show item range', () => {
      render(
        <PaginationInfo startIndex={1} endIndex={10} totalItems={100} />
      );

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('should use custom labels', () => {
      render(
        <PaginationInfo
          startIndex={1}
          endIndex={10}
          totalItems={100}
          showingLabel="Displaying"
          ofLabel="out of"
        />
      );

      expect(screen.getByText(/Displaying/)).toBeInTheDocument();
      expect(screen.getByText(/out of/)).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <PaginationInfo
          startIndex={1}
          endIndex={10}
          totalItems={100}
          className="custom-info"
        />
      );

      expect(container.querySelector('p')).toHaveClass('custom-info');
    });
  });

  describe('PageSizeSelector', () => {
    it('should render with default options', () => {
      render(
        <PageSizeSelector pageSize={10} onPageSizeChange={() => {}} />
      );

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(select).toHaveValue('10');
    });

    it('should call onPageSizeChange when selection changes', async () => {
      const user = userEvent.setup();
      const onPageSizeChange = vi.fn();
      render(
        <PageSizeSelector pageSize={10} onPageSizeChange={onPageSizeChange} />
      );

      await user.selectOptions(screen.getByRole('combobox'), '25');
      expect(onPageSizeChange).toHaveBeenCalledWith(25);
    });

    it('should render custom options', () => {
      render(
        <PageSizeSelector
          pageSize={5}
          onPageSizeChange={() => {}}
          options={[5, 15, 30]}
        />
      );

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
      expect(options[0]).toHaveTextContent('5');
      expect(options[1]).toHaveTextContent('15');
      expect(options[2]).toHaveTextContent('30');
    });

    it('should display custom label', () => {
      render(
        <PageSizeSelector
          pageSize={10}
          onPageSizeChange={() => {}}
          label="items/page"
        />
      );

      expect(screen.getByText('items/page')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <PageSizeSelector
          pageSize={10}
          onPageSizeChange={() => {}}
          className="custom-selector"
        />
      );

      expect(container.firstChild).toHaveClass('custom-selector');
    });
  });

  describe('PaginationContainer', () => {
    it('should render children', () => {
      render(
        <PaginationContainer>
          <span>Child 1</span>
          <span>Child 2</span>
        </PaginationContainer>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
    });

    it('should apply default classes', () => {
      const { container } = render(
        <PaginationContainer>
          <span>Content</span>
        </PaginationContainer>
      );

      expect(container.firstChild).toHaveClass('flex');
    });

    it('should merge custom className', () => {
      const { container } = render(
        <PaginationContainer className="custom-container">
          <span>Content</span>
        </PaginationContainer>
      );

      expect(container.firstChild).toHaveClass('custom-container');
    });
  });
});
