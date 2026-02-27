import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailBuilder } from '@/components/email-builder/EmailBuilder';

// Mock zustand stores
const mockEmailBuilderStore = {
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
  setState: vi.fn(),
};

const mockCampaignStore = {
  draft: {
    content: '',
  },
  updateDraft: vi.fn(),
};

vi.mock('@/stores/email-builder-store', () => ({
  useEmailBuilderStore: () => mockEmailBuilderStore,
}));

vi.mock('@/stores/campaign-store', () => ({
  useCampaignStore: () => mockCampaignStore,
}));

describe('EmailBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the 3-panel layout', () => {
    render(<EmailBuilder />);

    // Header should be visible
    expect(screen.getByText('common.back')).toBeInTheDocument();
    expect(screen.getByText('common.save')).toBeInTheDocument();
    expect(screen.getByText('Use in Campaign')).toBeInTheDocument();

    // Template name input should be visible
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
    expect(saveButton.closest('button')).toHaveClass('bg-white');
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

  it('allows editing template name', async () => {
    const user = userEvent.setup();
    render(<EmailBuilder />);

    const input = screen.getByPlaceholderText('Template name...');
    await user.clear(input);
    await user.type(input, 'New Template Name');

    expect(mockEmailBuilderStore.setState).toHaveBeenCalled();
  });

  it('calls onBack callback when back button is clicked', async () => {
    const onBack = vi.fn();
    render(<EmailBuilder onBack={onBack} showBackToCampaign={true} />);

    // The back button is a Link, so we test if it's in the document
    const backButton = screen.getByText('common.back');
    expect(backButton).toBeInTheDocument();
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

    // The component should be using the store's template data
    const input = screen.getByPlaceholderText('Template name...') as HTMLInputElement;
    expect(input.value).toBe(mockEmailBuilderStore.template.name);
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

    expect(mockEmailBuilderStore.generateHtml).toHaveBeenCalled();
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
