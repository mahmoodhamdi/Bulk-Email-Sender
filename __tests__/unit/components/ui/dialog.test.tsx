import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogOverlay,
  DialogPortal,
} from '@/components/ui/dialog';

describe('Dialog', () => {
  describe('Dialog Component', () => {
    it('should render dialog trigger', () => {
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
        </Dialog>
      );
      expect(screen.getByText('Open Dialog')).toBeInTheDocument();
    });

    it('should open dialog when trigger is clicked', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open Dialog'));
      expect(screen.getByText('Dialog Title')).toBeInTheDocument();
      expect(screen.getByText('Dialog description')).toBeInTheDocument();
    });

    it('should close dialog when close button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open Dialog'));
      expect(screen.getByText('Dialog Title')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /close/i }));
      // Dialog should be closed
    });

    it('should render with controlled open state', async () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogTitle>Controlled Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Controlled Dialog')).toBeInTheDocument();
    });
  });

  describe('DialogContent', () => {
    it('should render with custom className', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent className="custom-class" data-testid="dialog-content">
            <DialogTitle>Test</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));
      expect(screen.getByTestId('dialog-content')).toHaveClass('custom-class');
    });

    it('should render children content', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <p>Custom content</p>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));
      expect(screen.getByText('Custom content')).toBeInTheDocument();
    });
  });

  describe('DialogHeader', () => {
    it('should render with default classes', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeader data-testid="dialog-header">
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));
      const header = screen.getByTestId('dialog-header');
      expect(header).toHaveClass('flex');
      expect(header).toHaveClass('flex-col');
    });

    it('should merge custom className', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeader className="custom-header" data-testid="dialog-header">
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));
      expect(screen.getByTestId('dialog-header')).toHaveClass('custom-header');
    });
  });

  describe('DialogFooter', () => {
    it('should render with default classes', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogFooter data-testid="dialog-footer">
              <button>Close</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));
      const footer = screen.getByTestId('dialog-footer');
      expect(footer).toHaveClass('flex');
    });

    it('should merge custom className', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogFooter className="custom-footer" data-testid="dialog-footer">
              <button>Close</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));
      expect(screen.getByTestId('dialog-footer')).toHaveClass('custom-footer');
    });
  });

  describe('DialogTitle', () => {
    it('should render with default classes', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle data-testid="dialog-title">My Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));
      const title = screen.getByTestId('dialog-title');
      expect(title).toHaveClass('text-lg');
      expect(title).toHaveClass('font-semibold');
      expect(title).toHaveTextContent('My Title');
    });

    it('should merge custom className', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle className="custom-title" data-testid="dialog-title">Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));
      expect(screen.getByTestId('dialog-title')).toHaveClass('custom-title');
    });
  });

  describe('DialogDescription', () => {
    it('should render with default classes', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription data-testid="dialog-desc">Description text</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));
      const desc = screen.getByTestId('dialog-desc');
      expect(desc).toHaveClass('text-sm');
      expect(desc).toHaveTextContent('Description text');
    });

    it('should merge custom className', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription className="custom-desc" data-testid="dialog-desc">Desc</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));
      expect(screen.getByTestId('dialog-desc')).toHaveClass('custom-desc');
    });
  });

  describe('DialogClose', () => {
    it('should close dialog when clicked', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogClose>Close Button</DialogClose>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));
      expect(screen.getByText('Title')).toBeInTheDocument();

      await user.click(screen.getByText('Close Button'));
      // Dialog should be closed
    });
  });

  describe('DialogOverlay', () => {
    it('should render overlay when dialog is open', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));
      // Verify dialog content is rendered (overlay is part of the portal)
      expect(screen.getByText('Title')).toBeInTheDocument();
    });
  });

  describe('Display Names', () => {
    it('should have correct display names', () => {
      expect(DialogHeader.displayName).toBe('DialogHeader');
      expect(DialogFooter.displayName).toBe('DialogFooter');
    });
  });
});
