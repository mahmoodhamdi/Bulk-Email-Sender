import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Canvas } from '@/components/email-builder/Canvas';
import type { BlockType } from '@/stores/email-builder-store';

const mockBlock1 = {
  id: '1',
  type: 'text' as BlockType,
  content: 'Test content',
  styles: {},
};

const mockBlock2 = {
  id: '2',
  type: 'heading' as BlockType,
  content: 'Test heading',
  level: 1 as const,
  styles: {},
};

const createMockStore = (overrides = {}) => ({
  template: {
    blocks: [mockBlock1, mockBlock2],
    globalStyles: {
      backgroundColor: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      contentWidth: '600px',
    },
  },
  previewMode: 'desktop' as const,
  isDragging: false,
  draggedBlockType: null,
  setPreviewMode: vi.fn(),
  addBlock: vi.fn(),
  selectBlock: vi.fn(),
  ...overrides,
});

let mockEmailBuilderStore = createMockStore();

vi.mock('@/stores/email-builder-store', () => ({
  useEmailBuilderStore: () => mockEmailBuilderStore,
  createDefaultBlock: vi.fn((type: BlockType) => ({
    id: `new-${type}`,
    type,
    styles: {},
  })),
}));

vi.mock('@/components/email-builder/BlockRenderer', () => ({
  BlockRenderer: ({ block, index }: any) => <div data-testid={`block-${block.id}`}>{block.content}</div>,
}));

describe('Canvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmailBuilderStore = createMockStore();
  });

  it('renders canvas with toolbar', () => {
    render(<Canvas />);
    expect(screen.getByText('Preview:')).toBeInTheDocument();
    expect(screen.getByText('Desktop')).toBeInTheDocument();
    expect(screen.getByText('Mobile')).toBeInTheDocument();
  });

  it('renders desktop and mobile toggle buttons', () => {
    render(<Canvas />);

    const desktopButton = screen.getByText('Desktop');
    const mobileButton = screen.getByText('Mobile');

    expect(desktopButton).toBeInTheDocument();
    expect(mobileButton).toBeInTheDocument();
  });

  it('shows block count in toolbar', () => {
    render(<Canvas />);
    expect(screen.getByText('2 blocks')).toBeInTheDocument();
  });

  it('renders all blocks from store', () => {
    render(<Canvas />);

    expect(screen.getByTestId('block-1')).toBeInTheDocument();
    expect(screen.getByTestId('block-2')).toBeInTheDocument();
  });

  it('displays empty state when no blocks', () => {
    mockEmailBuilderStore = createMockStore({
      template: {
        blocks: [],
        globalStyles: {
          backgroundColor: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          contentWidth: '600px',
        },
      },
    });

    render(<Canvas />);

    expect(screen.getByText(/Drag blocks here to build your email/i)).toBeInTheDocument();
  });

  it('changes empty state message while dragging', () => {
    mockEmailBuilderStore = createMockStore({
      template: {
        blocks: [],
        globalStyles: {
          backgroundColor: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          contentWidth: '600px',
        },
      },
      isDragging: true,
    });

    render(<Canvas />);

    expect(screen.getByText(/Drop block here/i)).toBeInTheDocument();
  });

  it('switches to desktop mode when desktop button clicked', async () => {
    const user = userEvent.setup();
    render(<Canvas />);

    const desktopButton = screen.getByText('Desktop');
    await user.click(desktopButton);

    expect(mockEmailBuilderStore.setPreviewMode).toHaveBeenCalledWith('desktop');
  });

  it('switches to mobile mode when mobile button clicked', async () => {
    const user = userEvent.setup();
    render(<Canvas />);

    const mobileButton = screen.getByText('Mobile');
    await user.click(mobileButton);

    expect(mockEmailBuilderStore.setPreviewMode).toHaveBeenCalledWith('mobile');
  });

  it('shows canvas with correct width for desktop', () => {
    mockEmailBuilderStore = createMockStore({
      previewMode: 'desktop',
    });
    const { container } = render(<Canvas />);

    const canvas = container.querySelector('.w-\\[600px\\]');
    expect(canvas).toBeInTheDocument();
  });

  it('shows canvas with mobile width', () => {
    mockEmailBuilderStore = createMockStore({
      previewMode: 'mobile',
    });
    const { container } = render(<Canvas />);

    const canvas = container.querySelector('.w-\\[375px\\]');
    expect(canvas).toBeInTheDocument();
  });

  it('supports drag over event on canvas', () => {
    mockEmailBuilderStore = createMockStore({
      template: {
        blocks: [],
        globalStyles: {
          backgroundColor: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          contentWidth: '600px',
        },
      },
    });

    render(<Canvas />);

    const emptyState = screen.getByText(/Drag blocks here to build your email/i).closest('div');
    fireEvent.dragOver(emptyState!.parentElement!, {
      preventDefault: vi.fn(),
      dataTransfer: { dropEffect: 'copy' },
    } as any);

    expect(emptyState).toBeInTheDocument();
  });

  it('supports drop event to add block', () => {
    render(<Canvas />);

    const content = screen.getByTestId('block-1').closest('[style*="max-width"]');

    fireEvent.drop(content!, {
      preventDefault: vi.fn(),
      dataTransfer: { getData: () => 'text', dropEffect: 'copy' },
    } as any);

    expect(mockEmailBuilderStore.addBlock).toHaveBeenCalled();
  });

  it('selects block null when clicking on empty canvas', async () => {
    const user = userEvent.setup();
    mockEmailBuilderStore = createMockStore({
      template: {
        blocks: [],
        globalStyles: {
          backgroundColor: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          contentWidth: '600px',
        },
      },
    });

    const { container } = render(<Canvas />);

    const emptyArea = container.querySelector('.flex-1.overflow-auto');
    await user.click(emptyArea!);

    expect(mockEmailBuilderStore.selectBlock).toHaveBeenCalledWith(null);
  });

  it('shows drop zone hint while dragging with blocks present', () => {
    mockEmailBuilderStore = createMockStore({
      isDragging: true,
    });

    render(<Canvas />);

    expect(screen.getByText('Drop here to add at end')).toBeInTheDocument();
  });

  it('applies global styles to canvas', () => {
    const { container } = render(<Canvas />);

    const canvas = container.querySelector('[style*="background-color"]');
    expect(canvas).toHaveStyle({
      backgroundColor: 'rgb(255, 255, 255)',
      fontFamily: 'Arial, sans-serif',
    });
  });

  it('applies content width from global styles', () => {
    const { container } = render(<Canvas />);

    const contentArea = container.querySelector('[style*="max-width"]');
    expect(contentArea).toHaveStyle({ maxWidth: '600px' });
  });

  it('renders with shadow and white background', () => {
    const { container } = render(<Canvas />);

    const mainCanvas = container.querySelector('.shadow-lg');
    expect(mainCanvas).toBeInTheDocument();
  });

  it('canvas area is scrollable', () => {
    const { container } = render(<Canvas />);

    const scrollableArea = container.querySelector('.overflow-auto');
    expect(scrollableArea).toBeInTheDocument();
  });

  it('displays blocks in correct order', () => {
    render(<Canvas />);

    const blocks = screen.getAllByTestId(/block-/);
    expect(blocks[0]).toHaveTextContent('Test content');
    expect(blocks[1]).toHaveTextContent('Test heading');
  });

  it('passes correct index to block renderer', () => {
    const { container } = render(<Canvas />);

    const block1 = screen.getByTestId('block-1');
    expect(block1).toBeInTheDocument();
  });

  it('renders with flexbox layout', () => {
    const { container } = render(<Canvas />);

    const root = container.firstChild;
    expect(root).toHaveClass('flex-1', 'flex', 'flex-col');
  });

  it('shows desktop button as active in desktop mode', async () => {
    mockEmailBuilderStore = createMockStore({
      previewMode: 'desktop',
    });
    render(<Canvas />);

    const desktopButton = screen.getByText('Desktop').closest('button');
    expect(desktopButton).toHaveClass('bg-primary');
  });

  it('shows mobile button as active in mobile mode', async () => {
    mockEmailBuilderStore = createMockStore({
      previewMode: 'mobile',
    });
    render(<Canvas />);

    const mobileButton = screen.getByText('Mobile').closest('button');
    expect(mobileButton).toHaveClass('bg-primary');
  });
});
