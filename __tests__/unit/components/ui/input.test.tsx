import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/ui/input';

describe('Input Component', () => {
  describe('rendering', () => {
    it('should render an input element', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('should render with value', () => {
      render(<Input value="Test value" onChange={() => {}} />);
      expect(screen.getByDisplayValue('Test value')).toBeInTheDocument();
    });
  });

  describe('types', () => {
    it('should render text input by default', () => {
      render(<Input type="text" />);
      const input = document.querySelector('input[type="text"]');
      expect(input).toBeInTheDocument();
    });

    it('should render email input', () => {
      render(<Input type="email" />);
      // Email inputs have role textbox
      const input = document.querySelector('input[type="email"]');
      expect(input).toBeInTheDocument();
    });

    it('should render password input', () => {
      render(<Input type="password" />);
      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });

    it('should render number input', () => {
      render(<Input type="number" />);
      expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<Input type="search" />);
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
    });

    it('should render tel input', () => {
      render(<Input type="tel" />);
      const input = document.querySelector('input[type="tel"]');
      expect(input).toBeInTheDocument();
    });

    it('should render url input', () => {
      render(<Input type="url" />);
      const input = document.querySelector('input[type="url"]');
      expect(input).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply default styles', () => {
      render(<Input data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input.className).toContain('flex');
      expect(input.className).toContain('h-9');
      expect(input.className).toContain('w-full');
      expect(input.className).toContain('rounded-md');
      expect(input.className).toContain('border');
      expect(input.className).toContain('bg-transparent');
    });

    it('should merge custom className', () => {
      render(<Input data-testid="input" className="my-custom-class" />);
      const input = screen.getByTestId('input');
      expect(input.className).toContain('my-custom-class');
      expect(input.className).toContain('rounded-md');
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should apply disabled styles', () => {
      render(<Input data-testid="input" disabled />);
      const input = screen.getByTestId('input');
      expect(input.className).toContain('disabled:cursor-not-allowed');
      expect(input.className).toContain('disabled:opacity-50');
    });
  });

  describe('user interaction', () => {
    it('should call onChange when typing', async () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'Hello');

      expect(handleChange).toHaveBeenCalled();
    });

    it('should update value on change', () => {
      const handleChange = vi.fn((e) => e.target.value);
      render(<Input onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New value' } });

      expect(handleChange).toHaveBeenCalled();
      expect(handleChange.mock.results[0].value).toBe('New value');
    });

    it('should call onFocus when focused', () => {
      const handleFocus = vi.fn();
      render(<Input onFocus={handleFocus} />);

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('should call onBlur when blurred', () => {
      const handleBlur = vi.fn();
      render(<Input onBlur={handleBlur} />);

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      fireEvent.blur(input);

      expect(handleBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('attributes', () => {
    it('should accept name attribute', () => {
      render(<Input name="email" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('name', 'email');
    });

    it('should accept id attribute', () => {
      render(<Input id="my-input" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('id', 'my-input');
    });

    it('should accept required attribute', () => {
      render(<Input required />);
      expect(screen.getByRole('textbox')).toBeRequired();
    });

    it('should accept readOnly attribute', () => {
      render(<Input readOnly />);
      expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
    });

    it('should accept maxLength attribute', () => {
      render(<Input maxLength={10} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('maxlength', '10');
    });

    it('should accept minLength attribute', () => {
      render(<Input minLength={5} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('minlength', '5');
    });

    it('should accept pattern attribute', () => {
      render(<Input pattern="[A-Za-z]+" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('pattern', '[A-Za-z]+');
    });

    it('should accept autoComplete attribute', () => {
      render(<Input autoComplete="email" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('autocomplete', 'email');
    });

    it('should accept aria-label', () => {
      render(<Input aria-label="Email input" />);
      expect(screen.getByLabelText('Email input')).toBeInTheDocument();
    });
  });

  describe('ref forwarding', () => {
    it('should forward ref to input element', () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<Input ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it('should allow focus via ref', () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<Input ref={ref} />);

      ref.current?.focus();
      expect(document.activeElement).toBe(ref.current);
    });
  });

  describe('display name', () => {
    it('should have correct display name', () => {
      expect(Input.displayName).toBe('Input');
    });
  });
});
