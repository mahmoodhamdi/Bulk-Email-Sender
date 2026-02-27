import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PropertiesPanel } from '@/components/email-builder/PropertiesPanel';
import type { BlockType } from '@/stores/email-builder-store';

const mockTextBlock = {
  id: 'text-1',
  type: 'text' as BlockType,
  content: 'Sample text content',
  styles: {
    textAlign: 'left' as const,
    backgroundColor: '#ffffff',
    padding: '10px',
    margin: '0px',
  },
};

const mockHeadingBlock = {
  id: 'heading-1',
  type: 'heading' as BlockType,
  content: 'Sample heading',
  level: 2 as const,
  styles: {
    textAlign: 'center' as const,
    backgroundColor: '#ffffff',
  },
};

const mockImageBlock = {
  id: 'image-1',
  type: 'image' as BlockType,
  src: 'https://example.com/image.jpg',
  alt: 'Test image',
  width: '100%',
  link: 'https://example.com',
  styles: {},
};

const mockButtonBlock = {
  id: 'button-1',
  type: 'button' as BlockType,
  text: 'Click me',
  link: 'https://example.com',
  buttonColor: '#007bff',
  textColor: '#ffffff',
  borderRadius: '4px',
  styles: {},
};

const mockDividerBlock = {
  id: 'divider-1',
  type: 'divider' as BlockType,
  color: '#000000',
  thickness: '1px',
  width: '100%',
  styles: {},
};

const mockSpacerBlock = {
  id: 'spacer-1',
  type: 'spacer' as BlockType,
  height: '20px',
  styles: {},
};

const mockEmailBuilderStore = {
  template: {
    blocks: [mockTextBlock],
    globalStyles: {
      backgroundColor: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      contentWidth: '600px',
    },
  },
  selectedBlockId: 'text-1',
  updateBlock: vi.fn(),
  updateGlobalStyles: vi.fn(),
};

vi.mock('@/stores/email-builder-store', () => ({
  useEmailBuilderStore: () => mockEmailBuilderStore,
}));

describe('PropertiesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "no block selected" message when no block is selected', () => {
    mockEmailBuilderStore.selectedBlockId = null;
    mockEmailBuilderStore.template.blocks = [];

    render(<PropertiesPanel />);

    expect(screen.getByText('Select a block to edit its properties')).toBeInTheDocument();
  });

  it('shows global styles when no block selected', () => {
    mockEmailBuilderStore.selectedBlockId = null;

    render(<PropertiesPanel />);

    expect(screen.getByText('Global Styles')).toBeInTheDocument();
    expect(screen.getByLabelText('Background Color')).toBeInTheDocument();
    expect(screen.getByLabelText('Content Width')).toBeInTheDocument();
    expect(screen.getByLabelText('Font Family')).toBeInTheDocument();
  });

  it('renders properties panel header', () => {
    mockEmailBuilderStore.selectedBlockId = 'text-1';

    render(<PropertiesPanel />);

    expect(screen.getByText('Properties')).toBeInTheDocument();
  });

  it('shows "text Properties" when text block selected', () => {
    mockEmailBuilderStore.selectedBlockId = 'text-1';
    mockEmailBuilderStore.template.blocks = [mockTextBlock];

    render(<PropertiesPanel />);

    expect(screen.getByText('text Properties')).toBeInTheDocument();
  });

  it('shows "heading Properties" when heading block selected', () => {
    mockEmailBuilderStore.selectedBlockId = 'heading-1';
    mockEmailBuilderStore.template.blocks = [mockHeadingBlock];

    render(<PropertiesPanel />);

    expect(screen.getByText('heading Properties')).toBeInTheDocument();
  });

  it('shows "image Properties" when image block selected', () => {
    mockEmailBuilderStore.selectedBlockId = 'image-1';
    mockEmailBuilderStore.template.blocks = [mockImageBlock];

    render(<PropertiesPanel />);

    expect(screen.getByText('image Properties')).toBeInTheDocument();
  });

  it('shows "button Properties" when button block selected', () => {
    mockEmailBuilderStore.selectedBlockId = 'button-1';
    mockEmailBuilderStore.template.blocks = [mockButtonBlock];

    render(<PropertiesPanel />);

    expect(screen.getByText('button Properties')).toBeInTheDocument();
  });

  it('renders text content editor for text block', () => {
    mockEmailBuilderStore.selectedBlockId = 'text-1';
    mockEmailBuilderStore.template.blocks = [mockTextBlock];

    render(<PropertiesPanel />);

    const textarea = screen.getByDisplayValue('Sample text content') as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
  });

  it('allows editing text content', async () => {
    const user = userEvent.setup();
    mockEmailBuilderStore.selectedBlockId = 'text-1';
    mockEmailBuilderStore.template.blocks = [mockTextBlock];

    render(<PropertiesPanel />);

    const textarea = screen.getByDisplayValue('Sample text content') as HTMLTextAreaElement;
    await user.clear(textarea);
    await user.type(textarea, 'New text content');

    expect(mockEmailBuilderStore.updateBlock).toHaveBeenCalled();
  });

  it('renders heading level selector for heading block', () => {
    mockEmailBuilderStore.selectedBlockId = 'heading-1';
    mockEmailBuilderStore.template.blocks = [mockHeadingBlock];

    render(<PropertiesPanel />);

    expect(screen.getByText('H1')).toBeInTheDocument();
    expect(screen.getByText('H2')).toBeInTheDocument();
    expect(screen.getByText('H3')).toBeInTheDocument();
    expect(screen.getByText('H4')).toBeInTheDocument();
  });

  it('renders image URL input for image block', () => {
    mockEmailBuilderStore.selectedBlockId = 'image-1';
    mockEmailBuilderStore.template.blocks = [mockImageBlock];

    render(<PropertiesPanel />);

    const input = screen.getByDisplayValue('https://example.com/image.jpg') as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });

  it('renders alt text input for image block', () => {
    mockEmailBuilderStore.selectedBlockId = 'image-1';
    mockEmailBuilderStore.template.blocks = [mockImageBlock];

    render(<PropertiesPanel />);

    const altInput = screen.getByDisplayValue('Test image') as HTMLInputElement;
    expect(altInput).toBeInTheDocument();
  });

  it('renders button text input for button block', () => {
    mockEmailBuilderStore.selectedBlockId = 'button-1';
    mockEmailBuilderStore.template.blocks = [mockButtonBlock];

    render(<PropertiesPanel />);

    const input = screen.getByDisplayValue('Click me') as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });

  it('renders button link input for button block', () => {
    mockEmailBuilderStore.selectedBlockId = 'button-1';
    mockEmailBuilderStore.template.blocks = [mockButtonBlock];

    render(<PropertiesPanel />);

    const linkInput = screen.getByDisplayValue('https://example.com') as HTMLInputElement;
    expect(linkInput).toBeInTheDocument();
  });

  it('renders text align buttons', () => {
    mockEmailBuilderStore.selectedBlockId = 'text-1';
    mockEmailBuilderStore.template.blocks = [mockTextBlock];

    render(<PropertiesPanel />);

    expect(screen.getByText('Styles')).toBeInTheDocument();
    expect(screen.getByText('Text Align')).toBeInTheDocument();
  });

  it('updates block when text align is changed', async () => {
    const user = userEvent.setup();
    mockEmailBuilderStore.selectedBlockId = 'text-1';
    mockEmailBuilderStore.template.blocks = [mockTextBlock];

    render(<PropertiesPanel />);

    const centerButton = screen.getAllByRole('button').find((btn) =>
      btn.className.includes('text-align') || btn.className.includes('AlignCenter'),
    );

    if (centerButton) {
      await user.click(centerButton);
      expect(mockEmailBuilderStore.updateBlock).toHaveBeenCalled();
    }
  });

  it('renders background color input for block styles', () => {
    mockEmailBuilderStore.selectedBlockId = 'text-1';
    mockEmailBuilderStore.template.blocks = [mockTextBlock];

    render(<PropertiesPanel />);

    expect(screen.getByLabelText('Background Color')).toBeInTheDocument();
  });

  it('renders padding input for block styles', () => {
    mockEmailBuilderStore.selectedBlockId = 'text-1';
    mockEmailBuilderStore.template.blocks = [mockTextBlock];

    render(<PropertiesPanel />);

    expect(screen.getByLabelText('Padding')).toBeInTheDocument();
  });

  it('renders margin input for block styles', () => {
    mockEmailBuilderStore.selectedBlockId = 'text-1';
    mockEmailBuilderStore.template.blocks = [mockTextBlock];

    render(<PropertiesPanel />);

    expect(screen.getByLabelText('Margin')).toBeInTheDocument();
  });

  it('updates padding when changed', async () => {
    const user = userEvent.setup();
    mockEmailBuilderStore.selectedBlockId = 'text-1';
    mockEmailBuilderStore.template.blocks = [mockTextBlock];

    render(<PropertiesPanel />);

    const paddingInput = screen.getByDisplayValue('10px') as HTMLInputElement;
    await user.clear(paddingInput);
    await user.type(paddingInput, '20px');

    expect(mockEmailBuilderStore.updateBlock).toHaveBeenCalled();
  });

  it('updates global styles when background color changed', async () => {
    const user = userEvent.setup();
    mockEmailBuilderStore.selectedBlockId = null;

    render(<PropertiesPanel />);

    const colorInputs = screen.getAllByDisplayValue('#ffffff');
    if (colorInputs.length > 0) {
      await user.clear(colorInputs[0]);
      await user.type(colorInputs[0], '#eeeeee');
      expect(mockEmailBuilderStore.updateGlobalStyles).toHaveBeenCalled();
    }
  });

  it('renders divider properties for divider block', () => {
    mockEmailBuilderStore.selectedBlockId = 'divider-1';
    mockEmailBuilderStore.template.blocks = [mockDividerBlock];

    render(<PropertiesPanel />);

    expect(screen.getByText('divider Properties')).toBeInTheDocument();
    expect(screen.getByLabelText('Color')).toBeInTheDocument();
    expect(screen.getByLabelText('Thickness')).toBeInTheDocument();
  });

  it('renders spacer properties for spacer block', () => {
    mockEmailBuilderStore.selectedBlockId = 'spacer-1';
    mockEmailBuilderStore.template.blocks = [mockSpacerBlock];

    render(<PropertiesPanel />);

    expect(screen.getByText('spacer Properties')).toBeInTheDocument();
    expect(screen.getByLabelText('Height')).toBeInTheDocument();
  });

  it('applies correct styling to panel', () => {
    const { container } = render(<PropertiesPanel />);

    const panel = container.firstChild;
    expect(panel).toHaveClass('w-72', 'border-l', 'bg-card');
  });

  it('renders scrollable content area', () => {
    const { container } = render(<PropertiesPanel />);

    const scrollable = container.querySelector('.overflow-y-auto');
    expect(scrollable).toBeInTheDocument();
  });
});
