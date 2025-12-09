import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Label } from '@/components/ui/label';

describe('Label Component', () => {
  describe('rendering', () => {
    it('should render a label element', () => {
      render(<Label>Email</Label>);
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('should render children correctly', () => {
      render(<Label>Username</Label>);
      expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('should render with complex children', () => {
      render(
        <Label>
          <span>Required</span> Field
        </Label>
      );
      expect(screen.getByText('Required')).toBeInTheDocument();
      expect(screen.getByText(/Field/)).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply default styles', () => {
      render(<Label data-testid="label">Test</Label>);
      const label = screen.getByTestId('label');
      expect(label.className).toContain('text-sm');
      expect(label.className).toContain('font-medium');
      expect(label.className).toContain('leading-none');
    });

    it('should include peer-disabled styles', () => {
      render(<Label data-testid="label">Test</Label>);
      const label = screen.getByTestId('label');
      expect(label.className).toContain('peer-disabled:cursor-not-allowed');
      expect(label.className).toContain('peer-disabled:opacity-70');
    });

    it('should merge custom className', () => {
      render(<Label data-testid="label" className="text-red-500">Error Label</Label>);
      const label = screen.getByTestId('label');
      expect(label.className).toContain('text-red-500');
      expect(label.className).toContain('font-medium');
    });
  });

  describe('htmlFor attribute', () => {
    it('should accept htmlFor attribute', () => {
      render(<Label htmlFor="email-input">Email</Label>);
      const label = screen.getByText('Email');
      expect(label).toHaveAttribute('for', 'email-input');
    });

    it('should associate with input element', () => {
      render(
        <>
          <Label htmlFor="test-input">Test Label</Label>
          <input id="test-input" type="text" />
        </>
      );

      const label = screen.getByText('Test Label');
      const input = screen.getByRole('textbox');

      expect(label).toHaveAttribute('for', 'test-input');
      expect(input).toHaveAttribute('id', 'test-input');
    });
  });

  describe('ref forwarding', () => {
    it('should forward ref to label element', () => {
      const ref = { current: null as HTMLLabelElement | null };
      render(<Label ref={ref}>Test</Label>);
      expect(ref.current).toBeInstanceOf(HTMLLabelElement);
    });
  });

  describe('display name', () => {
    it('should have correct display name', () => {
      // Label uses the primitive's displayName
      expect(Label.displayName).toBeDefined();
    });
  });

  describe('accessibility', () => {
    it('should be accessible as a label', () => {
      render(
        <>
          <Label htmlFor="accessible-input">Accessible Input</Label>
          <input id="accessible-input" type="text" />
        </>
      );

      expect(screen.getByLabelText('Accessible Input')).toBeInTheDocument();
    });

    it('should support aria attributes', () => {
      render(
        <Label data-testid="label" aria-describedby="hint">
          Field
        </Label>
      );
      expect(screen.getByTestId('label')).toHaveAttribute('aria-describedby', 'hint');
    });
  });

  describe('integration with inputs', () => {
    it('should work with Input component pattern', () => {
      render(
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="email">Email</Label>
          <input type="email" id="email" placeholder="Email" />
        </div>
      );

      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    });
  });
});
