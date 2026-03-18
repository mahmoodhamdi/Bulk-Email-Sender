import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BlockPalette } from '@/components/email-builder/BlockPalette';
import type { BlockType } from '@/stores/email-builder-store';

const mockEmailBuilderStore = {
  addBlock: vi.fn(),
  setDraggedBlockType: vi.fn(),
  setIsDragging: vi.fn(),
};

vi.mock('@/stores/email-builder-store', () => ({
  useEmailBuilderStore: () => mockEmailBuilderStore,
  createDefaultBlock: vi.fn((type: BlockType) => ({
    id: `block-${type}`,
    type,
    content: '',
    styles: {},
  })),
}));

describe('BlockPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders block palette sidebar', () => {
    render(<BlockPalette />);
    expect(screen.getByText('Blocks')).toBeInTheDocument();
  });

  it('displays all block type buttons', () => {
    render(<BlockPalette />);

    const blockTypes = ['Text', 'Heading', 'Image', 'Button', 'Divider', 'Spacer', 'Columns', 'Social', 'Video', 'HTML'];
    blockTypes.forEach((type) => {
      expect(screen.getByText(type)).toBeInTheDocument();
    });
  });

  it('renders text block button', () => {
    render(<BlockPalette />);
    expect(screen.getByText('Text')).toBeInTheDocument();
  });

  it('renders heading block button', () => {
    render(<BlockPalette />);
    expect(screen.getByText('Heading')).toBeInTheDocument();
  });

  it('renders image block button', () => {
    render(<BlockPalette />);
    expect(screen.getByText('Image')).toBeInTheDocument();
  });

  it('renders button block button', () => {
    render(<BlockPalette />);
    expect(screen.getByText('Button')).toBeInTheDocument();
  });

  it('renders divider block button', () => {
    render(<BlockPalette />);
    expect(screen.getByText('Divider')).toBeInTheDocument();
  });

  it('renders spacer block button', () => {
    render(<BlockPalette />);
    expect(screen.getByText('Spacer')).toBeInTheDocument();
  });

  it('renders columns block button', () => {
    render(<BlockPalette />);
    expect(screen.getByText('Columns')).toBeInTheDocument();
  });

  it('renders social block button', () => {
    render(<BlockPalette />);
    expect(screen.getByText('Social')).toBeInTheDocument();
  });

  it('renders video block button', () => {
    render(<BlockPalette />);
    expect(screen.getByText('Video')).toBeInTheDocument();
  });

  it('renders HTML block button', () => {
    render(<BlockPalette />);
    expect(screen.getByText('HTML')).toBeInTheDocument();
  });

  it('calls addBlock when text block is clicked', async () => {
    const user = userEvent.setup();
    render(<BlockPalette />);

    const textButton = screen.getByText('Text').closest('button');
    await user.click(textButton!);

    expect(mockEmailBuilderStore.addBlock).toHaveBeenCalled();
  });

  it('calls addBlock when heading block is clicked', async () => {
    const user = userEvent.setup();
    render(<BlockPalette />);

    const headingButton = screen.getByText('Heading').closest('button');
    await user.click(headingButton!);

    expect(mockEmailBuilderStore.addBlock).toHaveBeenCalled();
  });

  it('calls addBlock when image block is clicked', async () => {
    const user = userEvent.setup();
    render(<BlockPalette />);

    const imageButton = screen.getByText('Image').closest('button');
    await user.click(imageButton!);

    expect(mockEmailBuilderStore.addBlock).toHaveBeenCalled();
  });

  it('calls addBlock when button block is clicked', async () => {
    const user = userEvent.setup();
    render(<BlockPalette />);

    const buttonButton = screen.getByText('Button').closest('button');
    await user.click(buttonButton!);

    expect(mockEmailBuilderStore.addBlock).toHaveBeenCalled();
  });

  it('supports drag start for text block', () => {
    render(<BlockPalette />);

    const textButton = screen.getByText('Text').closest('button');
    fireEvent.dragStart(textButton!, {
      dataTransfer: { setData: vi.fn() },
    } as any);

    expect(mockEmailBuilderStore.setDraggedBlockType).toHaveBeenCalled();
    expect(mockEmailBuilderStore.setIsDragging).toHaveBeenCalled();
  });

  it('supports drag end', () => {
    render(<BlockPalette />);

    const textButton = screen.getByText('Text').closest('button');
    fireEvent.dragEnd(textButton!);

    expect(mockEmailBuilderStore.setDraggedBlockType).toHaveBeenCalledWith(null);
    expect(mockEmailBuilderStore.setIsDragging).toHaveBeenCalledWith(false);
  });

  it('sets data transfer data on drag start', () => {
    render(<BlockPalette />);

    const textButton = screen.getByText('Text').closest('button');
    const dataTransfer = {
      setData: vi.fn(),
    };

    fireEvent.dragStart(textButton!, { dataTransfer } as any);

    expect(dataTransfer.setData).toHaveBeenCalledWith('blockType', 'text');
  });

  it('renders instructions text', () => {
    render(<BlockPalette />);
    expect(screen.getByText(/Drag blocks to canvas or click to add/i)).toBeInTheDocument();
  });

  it('applies correct styling classes to buttons', () => {
    render(<BlockPalette />);

    const textButton = screen.getByText('Text').closest('button');
    expect(textButton).toHaveClass('rounded-lg', 'border', 'cursor-grab');
  });

  it('shows block icons with correct sizing', () => {
    const { container } = render(<BlockPalette />);

    const icons = container.querySelectorAll('svg');
    // Should have icons for each block type (10 blocks)
    expect(icons.length).toBeGreaterThanOrEqual(10);
  });

  it('renders in correct sidebar width', () => {
    const { container } = render(<BlockPalette />);

    const sidebar = container.firstChild;
    expect(sidebar).toHaveClass('w-64', 'border-r');
  });

  it('all block buttons are draggable', () => {
    const { container } = render(<BlockPalette />);

    const buttons = container.querySelectorAll('button[draggable="true"]');
    expect(buttons.length).toBe(10); // 10 block types
  });

  it('blocks are in 2-column grid', () => {
    const { container } = render(<BlockPalette />);

    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('grid-cols-2');
  });

  it('renders padding container', () => {
    const { container } = render(<BlockPalette />);

    const sidebar = container.firstChild;
    expect(sidebar).toHaveClass('p-4');
  });
});
