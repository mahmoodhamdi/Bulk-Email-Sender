import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

describe('Card Components', () => {
  describe('Card', () => {
    it('should render a card element', () => {
      render(<Card data-testid="card">Content</Card>);
      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('should render children', () => {
      render(<Card>Card Content</Card>);
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('should apply default styles', () => {
      render(<Card data-testid="card">Content</Card>);
      const card = screen.getByTestId('card');
      expect(card.className).toContain('rounded-xl');
      expect(card.className).toContain('border');
      expect(card.className).toContain('bg-card');
      expect(card.className).toContain('shadow');
    });

    it('should merge custom className', () => {
      render(<Card data-testid="card" className="custom-class">Content</Card>);
      const card = screen.getByTestId('card');
      expect(card.className).toContain('custom-class');
      expect(card.className).toContain('rounded-xl');
    });

    it('should forward ref', () => {
      const ref = { current: null as HTMLDivElement | null };
      render(<Card ref={ref}>Content</Card>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should have correct display name', () => {
      expect(Card.displayName).toBe('Card');
    });
  });

  describe('CardHeader', () => {
    it('should render header element', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>);
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('should render children', () => {
      render(<CardHeader>Header Content</CardHeader>);
      expect(screen.getByText('Header Content')).toBeInTheDocument();
    });

    it('should apply default styles', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>);
      const header = screen.getByTestId('header');
      expect(header.className).toContain('flex');
      expect(header.className).toContain('flex-col');
      expect(header.className).toContain('space-y-1.5');
      expect(header.className).toContain('p-6');
    });

    it('should merge custom className', () => {
      render(<CardHeader data-testid="header" className="my-class">Header</CardHeader>);
      const header = screen.getByTestId('header');
      expect(header.className).toContain('my-class');
    });

    it('should forward ref', () => {
      const ref = { current: null as HTMLDivElement | null };
      render(<CardHeader ref={ref}>Header</CardHeader>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should have correct display name', () => {
      expect(CardHeader.displayName).toBe('CardHeader');
    });
  });

  describe('CardTitle', () => {
    it('should render title element', () => {
      render(<CardTitle data-testid="title">Title</CardTitle>);
      expect(screen.getByTestId('title')).toBeInTheDocument();
    });

    it('should render children', () => {
      render(<CardTitle>My Title</CardTitle>);
      expect(screen.getByText('My Title')).toBeInTheDocument();
    });

    it('should apply default styles', () => {
      render(<CardTitle data-testid="title">Title</CardTitle>);
      const title = screen.getByTestId('title');
      expect(title.className).toContain('font-semibold');
      expect(title.className).toContain('leading-none');
      expect(title.className).toContain('tracking-tight');
    });

    it('should merge custom className', () => {
      render(<CardTitle data-testid="title" className="text-xl">Title</CardTitle>);
      const title = screen.getByTestId('title');
      expect(title.className).toContain('text-xl');
    });

    it('should forward ref', () => {
      const ref = { current: null as HTMLDivElement | null };
      render(<CardTitle ref={ref}>Title</CardTitle>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should have correct display name', () => {
      expect(CardTitle.displayName).toBe('CardTitle');
    });
  });

  describe('CardDescription', () => {
    it('should render description element', () => {
      render(<CardDescription data-testid="desc">Description</CardDescription>);
      expect(screen.getByTestId('desc')).toBeInTheDocument();
    });

    it('should render children', () => {
      render(<CardDescription>My Description</CardDescription>);
      expect(screen.getByText('My Description')).toBeInTheDocument();
    });

    it('should apply default styles', () => {
      render(<CardDescription data-testid="desc">Description</CardDescription>);
      const desc = screen.getByTestId('desc');
      expect(desc.className).toContain('text-sm');
      expect(desc.className).toContain('text-muted-foreground');
    });

    it('should merge custom className', () => {
      render(
        <CardDescription data-testid="desc" className="italic">
          Description
        </CardDescription>
      );
      const desc = screen.getByTestId('desc');
      expect(desc.className).toContain('italic');
    });

    it('should forward ref', () => {
      const ref = { current: null as HTMLDivElement | null };
      render(<CardDescription ref={ref}>Description</CardDescription>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should have correct display name', () => {
      expect(CardDescription.displayName).toBe('CardDescription');
    });
  });

  describe('CardContent', () => {
    it('should render content element', () => {
      render(<CardContent data-testid="content">Content</CardContent>);
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should render children', () => {
      render(<CardContent>Body Content</CardContent>);
      expect(screen.getByText('Body Content')).toBeInTheDocument();
    });

    it('should apply default styles', () => {
      render(<CardContent data-testid="content">Content</CardContent>);
      const content = screen.getByTestId('content');
      expect(content.className).toContain('p-6');
      expect(content.className).toContain('pt-0');
    });

    it('should merge custom className', () => {
      render(
        <CardContent data-testid="content" className="bg-gray-100">
          Content
        </CardContent>
      );
      const content = screen.getByTestId('content');
      expect(content.className).toContain('bg-gray-100');
    });

    it('should forward ref', () => {
      const ref = { current: null as HTMLDivElement | null };
      render(<CardContent ref={ref}>Content</CardContent>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should have correct display name', () => {
      expect(CardContent.displayName).toBe('CardContent');
    });
  });

  describe('CardFooter', () => {
    it('should render footer element', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('should render children', () => {
      render(<CardFooter>Footer Content</CardFooter>);
      expect(screen.getByText('Footer Content')).toBeInTheDocument();
    });

    it('should apply default styles', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);
      const footer = screen.getByTestId('footer');
      expect(footer.className).toContain('flex');
      expect(footer.className).toContain('items-center');
      expect(footer.className).toContain('p-6');
      expect(footer.className).toContain('pt-0');
    });

    it('should merge custom className', () => {
      render(
        <CardFooter data-testid="footer" className="justify-between">
          Footer
        </CardFooter>
      );
      const footer = screen.getByTestId('footer');
      expect(footer.className).toContain('justify-between');
    });

    it('should forward ref', () => {
      const ref = { current: null as HTMLDivElement | null };
      render(<CardFooter ref={ref}>Footer</CardFooter>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should have correct display name', () => {
      expect(CardFooter.displayName).toBe('CardFooter');
    });
  });

  describe('Card composition', () => {
    it('should render complete card with all subcomponents', () => {
      render(
        <Card data-testid="card">
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
            <CardDescription>Test Description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Test Content</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });
  });
});
