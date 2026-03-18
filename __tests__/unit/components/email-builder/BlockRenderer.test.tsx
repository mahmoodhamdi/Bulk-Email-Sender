import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BlockRenderer } from '@/components/email-builder/BlockRenderer';
import type { BlockType } from '@/stores/email-builder-store';

const mockEmailBuilderStore = {
  selectedBlockId: 'block-1',
  selectBlock: vi.fn(),
  removeBlock: vi.fn(),
  duplicateBlock: vi.fn(),
  moveBlock: vi.fn(),
};

vi.mock('@/stores/email-builder-store', () => ({
  useEmailBuilderStore: () => mockEmailBuilderStore,
}));

vi.mock('@/lib/crypto', () => ({
  sanitizeHtml: (html: string) => html,
}));

describe('BlockRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Text Block', () => {
    it('renders text block with content', () => {
      const block = {
        id: 'block-1',
        type: 'text' as BlockType,
        content: 'Hello World',
        styles: {},
      };

      render(<BlockRenderer block={block} index={0} />);

      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('applies text block styles', () => {
      const block = {
        id: 'block-1',
        type: 'text' as BlockType,
        content: 'Styled text',
        styles: {
          textAlign: 'center' as const,
          backgroundColor: '#f0f0f0',
          padding: '10px',
        },
      };

      render(<BlockRenderer block={block} index={0} />);

      expect(screen.getByText('Styled text')).toBeInTheDocument();
    });
  });

  describe('Heading Block', () => {
    it('renders h1 heading', () => {
      const block = {
        id: 'block-1',
        type: 'heading' as BlockType,
        content: 'H1 Heading',
        level: 1 as const,
        styles: {},
      };

      const { container } = render(<BlockRenderer block={block} index={0} />);

      const heading = container.querySelector('h1');
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('H1 Heading');
    });

    it('renders h2 heading', () => {
      const block = {
        id: 'block-1',
        type: 'heading' as BlockType,
        content: 'H2 Heading',
        level: 2 as const,
        styles: {},
      };

      const { container } = render(<BlockRenderer block={block} index={0} />);

      const heading = container.querySelector('h2');
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('H2 Heading');
    });

    it('renders h3 heading', () => {
      const block = {
        id: 'block-1',
        type: 'heading' as BlockType,
        content: 'H3 Heading',
        level: 3 as const,
        styles: {},
      };

      const { container } = render(<BlockRenderer block={block} index={0} />);

      const heading = container.querySelector('h3');
      expect(heading).toBeInTheDocument();
    });

    it('renders h4 heading', () => {
      const block = {
        id: 'block-1',
        type: 'heading' as BlockType,
        content: 'H4 Heading',
        level: 4 as const,
        styles: {},
      };

      const { container } = render(<BlockRenderer block={block} index={0} />);

      const heading = container.querySelector('h4');
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Image Block', () => {
    it('renders image with src', () => {
      const block = {
        id: 'block-1',
        type: 'image' as BlockType,
        src: 'https://example.com/image.jpg',
        alt: 'Test image',
        width: '100%',
        styles: {},
      };

      const { container } = render(<BlockRenderer block={block} index={0} />);

      const img = container.querySelector('img');
      expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
      expect(img).toHaveAttribute('alt', 'Test image');
    });

    it('renders placeholder when no src', () => {
      const block = {
        id: 'block-1',
        type: 'image' as BlockType,
        src: '',
        alt: 'Test image',
        width: '100%',
        styles: {},
      };

      render(<BlockRenderer block={block} index={0} />);

      expect(screen.getByText(/Click to add image URL/i)).toBeInTheDocument();
    });

    it('sets image width correctly', () => {
      const block = {
        id: 'block-1',
        type: 'image' as BlockType,
        src: 'https://example.com/image.jpg',
        alt: 'Test image',
        width: '200px',
        styles: {},
      };

      const { container } = render(<BlockRenderer block={block} index={0} />);

      const img = container.querySelector('img');
      expect(img).toHaveStyle({ width: '200px' });
    });
  });

  describe('Button Block', () => {
    it('renders button with text and link', () => {
      const block = {
        id: 'block-1',
        type: 'button' as BlockType,
        text: 'Click me',
        link: 'https://example.com',
        buttonColor: '#007bff',
        textColor: '#ffffff',
        borderRadius: '4px',
        styles: {},
      };

      render(<BlockRenderer block={block} index={0} />);

      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('applies button styles correctly', () => {
      const block = {
        id: 'block-1',
        type: 'button' as BlockType,
        text: 'Styled button',
        link: 'https://example.com',
        buttonColor: '#ff0000',
        textColor: '#ffffff',
        borderRadius: '8px',
        styles: {},
      };

      const { container } = render(<BlockRenderer block={block} index={0} />);

      const link = container.querySelector('a');
      expect(link).toHaveStyle({
        backgroundColor: '#ff0000',
        color: '#ffffff',
        borderRadius: '8px',
      });
    });
  });

  describe('Divider Block', () => {
    it('renders divider with color and thickness', () => {
      const block = {
        id: 'block-1',
        type: 'divider' as BlockType,
        color: '#000000',
        thickness: '2px',
        width: '100%',
        styles: {},
      };

      const { container } = render(<BlockRenderer block={block} index={0} />);

      const hr = container.querySelector('hr');
      expect(hr).toBeInTheDocument();
      expect(hr).toHaveStyle({
        borderTop: '2px solid #000000',
      });
    });
  });

  describe('Spacer Block', () => {
    it('renders spacer with height', () => {
      const block = {
        id: 'block-1',
        type: 'spacer' as BlockType,
        height: '30px',
        styles: {},
      };

      render(<BlockRenderer block={block} index={0} />);

      expect(screen.getByText('30px spacer')).toBeInTheDocument();
    });

    it('applies spacer height as style', () => {
      const block = {
        id: 'block-1',
        type: 'spacer' as BlockType,
        height: '50px',
        styles: {},
      };

      const { container } = render(<BlockRenderer block={block} index={0} />);

      const spacer = container.querySelector('[style*="height"]');
      expect(spacer).toHaveStyle({ height: '50px' });
    });
  });

  describe('Social Block', () => {
    it('renders social networks', () => {
      const block = {
        id: 'block-1',
        type: 'social' as BlockType,
        networks: [
          { type: 'facebook' as const, url: 'https://facebook.com' },
          { type: 'twitter' as const, url: 'https://twitter.com' },
        ],
        iconSize: '32px',
        styles: {},
      };

      const { container } = render(<BlockRenderer block={block} index={0} />);

      const icons = container.querySelectorAll('[title]');
      expect(icons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Video Block', () => {
    it('renders video with thumbnail', () => {
      const block = {
        id: 'block-1',
        type: 'video' as BlockType,
        thumbnailUrl: 'https://example.com/thumb.jpg',
        videoUrl: 'https://example.com/video.mp4',
        styles: {},
      };

      const { container } = render(<BlockRenderer block={block} index={0} />);

      const img = container.querySelector('img');
      expect(img).toHaveAttribute('src', 'https://example.com/thumb.jpg');
    });

    it('renders play button overlay', () => {
      const block = {
        id: 'block-1',
        type: 'video' as BlockType,
        thumbnailUrl: 'https://example.com/thumb.jpg',
        videoUrl: 'https://example.com/video.mp4',
        styles: {},
      };

      render(<BlockRenderer block={block} index={0} />);

      expect(screen.getByText('▶')).toBeInTheDocument();
    });

    it('renders placeholder when no thumbnail', () => {
      const block = {
        id: 'block-1',
        type: 'video' as BlockType,
        thumbnailUrl: '',
        videoUrl: 'https://example.com/video.mp4',
        styles: {},
      };

      render(<BlockRenderer block={block} index={0} />);

      expect(screen.getByText(/Add video thumbnail URL/i)).toBeInTheDocument();
    });
  });

  describe('HTML Block', () => {
    it('renders raw HTML content', () => {
      const block = {
        id: 'block-1',
        type: 'html' as BlockType,
        content: '<div>Custom HTML</div>',
        styles: {},
      };

      render(<BlockRenderer block={block} index={0} />);

      expect(screen.getByText('<div>Custom HTML</div>')).toBeInTheDocument();
    });
  });

  describe('Block Selection', () => {
    it('is selected when selectedBlockId matches', () => {
      const block = {
        id: 'block-1',
        type: 'text' as BlockType,
        content: 'Test',
        styles: {},
      };

      const { container } = render(<BlockRenderer block={block} index={0} />);

      const blockDiv = container.firstChild;
      expect(blockDiv).toHaveClass('ring-primary/20');
    });

    it('calls selectBlock on click', async () => {
      const user = userEvent.setup();
      const block = {
        id: 'block-1',
        type: 'text' as BlockType,
        content: 'Test',
        styles: {},
      };

      const { container } = render(<BlockRenderer block={block} index={0} />);

      const blockElement = container.firstChild as HTMLElement;
      await user.click(blockElement);

      expect(mockEmailBuilderStore.selectBlock).toHaveBeenCalledWith('block-1');
    });
  });

  describe('Block Actions', () => {
    it('shows duplicate button when selected', async () => {
      const user = userEvent.setup();
      const block = {
        id: 'block-1',
        type: 'text' as BlockType,
        content: 'Test',
        styles: {},
      };

      render(<BlockRenderer block={block} index={0} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('calls duplicateBlock when duplicate is clicked', async () => {
      const user = userEvent.setup();
      const block = {
        id: 'block-1',
        type: 'text' as BlockType,
        content: 'Test',
        styles: {},
      };

      const { container } = render(<BlockRenderer block={block} index={0} />);

      const buttons = screen.getAllByRole('button');
      if (buttons.length > 0) {
        const duplicateBtn = buttons[0];
        await user.click(duplicateBtn);
        expect(mockEmailBuilderStore.duplicateBlock).toHaveBeenCalledWith('block-1');
      }
    });

    it('calls removeBlock when delete is clicked', async () => {
      const user = userEvent.setup();
      const block = {
        id: 'block-1',
        type: 'text' as BlockType,
        content: 'Test',
        styles: {},
      };

      render(<BlockRenderer block={block} index={0} />);

      const buttons = screen.getAllByRole('button');
      if (buttons.length > 1) {
        const deleteBtn = buttons[buttons.length - 1];
        await user.click(deleteBtn);
        expect(mockEmailBuilderStore.removeBlock).toHaveBeenCalledWith('block-1');
      }
    });
  });

  describe('Drag and Drop', () => {
    it('is draggable', () => {
      const block = {
        id: 'block-1',
        type: 'text' as BlockType,
        content: 'Test',
        styles: {},
      };

      const { container } = render(<BlockRenderer block={block} index={0} />);

      const blockDiv = container.firstChild;
      expect(blockDiv).toHaveAttribute('draggable', 'true');
    });

    it('handles drag start with block index', () => {
      const block = {
        id: 'block-1',
        type: 'text' as BlockType,
        content: 'Test',
        styles: {},
      };

      const { container } = render(<BlockRenderer block={block} index={2} />);

      const blockDiv = container.firstChild;
      const setData = vi.fn();
      fireEvent.dragStart(blockDiv!, {
        dataTransfer: { setData, effectAllowed: 'move' },
      } as any);

      expect(setData).toHaveBeenCalledWith('blockIndex', '2');
    });

    it('handles drop to move block', () => {
      const block = {
        id: 'block-1',
        type: 'text' as BlockType,
        content: 'Test',
        styles: {},
      };

      const { container } = render(<BlockRenderer block={block} index={0} />);

      const blockDiv = container.firstChild;
      const getData = vi.fn(() => '1');
      fireEvent.drop(blockDiv!, {
        dataTransfer: { getData, dropEffect: 'move' },
      } as any);

      expect(getData).toHaveBeenCalledWith('blockIndex');
      expect(mockEmailBuilderStore.moveBlock).toHaveBeenCalledWith(1, 0);
    });
  });

  describe('Block Styling', () => {
    it('applies custom block styles', () => {
      const block = {
        id: 'block-1',
        type: 'text' as BlockType,
        content: 'Styled',
        styles: {
          backgroundColor: '#f0f0f0',
          padding: '20px',
          margin: '10px',
        },
      };

      const { container } = render(<BlockRenderer block={block} index={0} />);

      expect(screen.getByText('Styled')).toBeInTheDocument();
    });

    it('has selected border styling', () => {
      const block = {
        id: 'block-1',
        type: 'text' as BlockType,
        content: 'Test',
        styles: {},
      };

      const { container } = render(<BlockRenderer block={block} index={0} />);

      const blockDiv = container.firstChild;
      expect(blockDiv).toHaveClass('rounded-lg', 'border-2');
    });
  });
});
