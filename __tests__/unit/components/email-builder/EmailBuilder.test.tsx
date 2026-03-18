import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailBuilder } from '@/components/email-builder/EmailBuilder';

// Mock window.alert
global.alert = vi.fn();

// Mock zustand stores - define before vi.mock calls
let mockEmailBuilderStoreState = {
  template: {
    id: '1',
    name: 'Test Template',
    blocks: [],
    globalStyles: {
      backgroundColor: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      contentWidth: '600px',
    },
  },
  generateHtml: vi.fn(() => '<html><body>Test</body></html>'),
  resetTemplate: vi.fn(),
};

const mockEmailBuilderStore = {
  get template() {
    return mockEmailBuilderStoreState.template;
  },
  get generateHtml() {
    return mockEmailBuilderStoreState.generateHtml;
  },
  get resetTemplate() {
    return mockEmailBuilderStoreState.resetTemplate;
  },
};

const mockCampaignStore = {
  draft: {
    content: '',
  },
  updateDraft: vi.fn(),
};

vi.mock('@/stores/email-builder-store', () => ({
  useEmailBuilderStore: Object.assign(
    () => mockEmailBuilderStore,
    {
      setState: vi.fn((updates) => {
        if (typeof updates === 'function') {
          updates(mockEmailBuilderStoreState);
        } else {
          mockEmailBuilderStoreState = { ...mockEmailBuilderStoreState, ...updates };
        }
      }),
    }
  ),
}));

vi.mock('@/stores/campaign-store', () => ({
  useCampaignStore: () => mockCampaignStore,
}));

vi.mock('@/components/email-builder/BlockPalette', () => ({
  BlockPalette: () => <div data-testid="block-palette">Block Palette</div>,
}));

vi.mock('@/components/email-builder/Canvas', () => ({
  Canvas: () => <div data-testid="canvas">Canvas</div>,
}));

vi.mock('@/components/email-builder/PropertiesPanel', () => ({
  PropertiesPanel: () => <div data-testid="properties-panel">Properties Panel</div>,
}));

describe('EmailBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmailBuilderStoreState = {
      template: {
        id: '1',
        name: 'Test Template',
        blocks: [],
        globalStyles: {
          backgroundColor: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          contentWidth: '600px',
        },
      },
      generateHtml: vi.fn(() => '<html><body>Test</body></html>'),
      resetTemplate: vi.fn(),
    };
  });

  it('renders the 3-panel layout', () => {
    render(<EmailBuilder />);

    expect(screen.getByText('common.back')).toBeInTheDocument();
    expect(screen.getByText('common.save')).toBeInTheDocument();
    expect(screen.getByText('Use in Campaign')).toBeInTheDocument();

    const templateInput = screen.getByPlaceholderText('Template name...');
    expect(templateInput).toBeInTheDocument();
  });

  it('displays back button when showBackToCampaign is true', () => {
    render(<EmailBuilder showBackToCampaign={true} />);
    const backButton = screen.getByText('common.back');
    expect(backButton).toBeInTheDocument();
  });

  it('hides back button when showBackToCampaign is false', () => {
    render(<EmailBuilder showBackToCampaign={false} />);
    const backButton = screen.queryByText('common.back');
    expect(backButton).not.toBeInTheDocument();
  });

  it('renders save button with correct icon and text', () => {
    render(<EmailBuilder />);
    const saveButton = screen.getByText('common.save');
    expect(saveButton).toBeInTheDocument();
    expect(saveButton.closest('button')).toBeInTheDocument();
  });

  it('renders preview button', () => {
    render(<EmailBuilder />);
    const previewButton = screen.getByText('campaign.content.preview');
    expect(previewButton).toBeInTheDocument();
  });

  it('renders "View HTML" button', () => {
    render(<EmailBuilder />);
    const htmlButton = screen.getByText('View HTML');
    expect(htmlButton).toBeInTheDocument();
  });

  it('renders "Use in Campaign" button', () => {
    render(<EmailBuilder />);
    const useButton = screen.getByText('Use in Campaign');
    expect(useButton).toBeInTheDocument();
  });

  it('calls onSave callback when save button is clicked', async () => {
    const onSave = vi.fn();
    render(<EmailBuilder onSave={onSave} />);

    const saveButton = screen.getByText('common.save');
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith('<html><body>Test</body></html>');
  });

  it('updates campaign draft when save is clicked', async () => {
    render(<EmailBuilder />);

    const saveButton = screen.getByText('common.save');
    fireEvent.click(saveButton);

    expect(mockCampaignStore.updateDraft).toHaveBeenCalledWith({
      content: '<html><body>Test</body></html>',
    });
  });

  it('shows template name input with current value', () => {
    render(<EmailBuilder />);
    const input = screen.getByPlaceholderText('Template name...') as HTMLInputElement;
    expect(input.value).toBe('Test Template');
  });

  it('displays all action buttons in header', () => {
    render(<EmailBuilder />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);

    expect(screen.getByText('View HTML')).toBeInTheDocument();
    expect(screen.getByText('campaign.content.preview')).toBeInTheDocument();
    expect(screen.getByText('common.save')).toBeInTheDocument();
    expect(screen.getByText('Use in Campaign')).toBeInTheDocument();
  });

  it('integrates with email builder store', () => {
    render(<EmailBuilder />);

    const input = screen.getByPlaceholderText('Template name...') as HTMLInputElement;
    expect(input.value).toBe(mockEmailBuilderStoreState.template.name);
  });

  it('integrates with campaign store on save', () => {
    render(<EmailBuilder />);

    const saveButton = screen.getByText('common.save');
    fireEvent.click(saveButton);

    expect(mockCampaignStore.updateDraft).toHaveBeenCalled();
  });

  it('generates HTML before saving', () => {
    render(<EmailBuilder />);

    const saveButton = screen.getByText('common.save');
    fireEvent.click(saveButton);

    expect(mockEmailBuilderStoreState.generateHtml).toHaveBeenCalled();
  });

  it('applies full screen flex layout', () => {
    const { container } = render(<EmailBuilder />);
    const root = container.firstChild;
    expect(root).toHaveClass('flex', 'h-screen', 'flex-col');
  });

  it('renders header with border', () => {
    const { container } = render(<EmailBuilder />);
    const header = container.querySelector('header');
    expect(header).toHaveClass('border-b', 'bg-background');
  });
});
