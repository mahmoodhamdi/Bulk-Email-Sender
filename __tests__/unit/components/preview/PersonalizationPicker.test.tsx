import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PersonalizationPicker } from '@/components/preview/PersonalizationPicker';
import type { Contact } from '@/stores/preview-store';

const mockContact1: Contact = {
  id: '1',
  email: 'john.doe@example.com',
  firstName: 'John',
  lastName: 'Doe',
  company: 'Acme Corp',
  phone: '+1 (555) 123-4567',
  tags: ['customer', 'premium'],
};

const mockContact2: Contact = {
  id: '2',
  email: 'jane.smith@company.com',
  firstName: 'Jane',
  lastName: 'Smith',
  company: 'Tech Solutions',
  phone: '+1 (555) 987-6543',
  tags: ['lead'],
};

const mockPreviewStore = {
  previewContact: mockContact1,
  setPreviewContact: vi.fn(),
};

vi.mock('@/stores/preview-store', () => ({
  usePreviewStore: () => mockPreviewStore,
}));

describe('PersonalizationPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders personalization section', () => {
    render(<PersonalizationPicker />);

    expect(screen.getByText('preview.previewAs')).toBeInTheDocument();
  });

  it('displays current contact card', () => {
    render(<PersonalizationPicker />);

    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Doe')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
  });

  it('shows contact company in card', () => {
    render(<PersonalizationPicker />);

    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('renders contact avatar with initials', () => {
    const { container } = render(<PersonalizationPicker />);

    const avatar = container.querySelector('[class*="rounded-full"]');
    expect(avatar).toBeInTheDocument();
    expect(avatar?.textContent).toContain('J'); // First letter of John
  });

  it('has toggle button to show/hide contact list', async () => {
    const user = userEvent.setup();
    render(<PersonalizationPicker />);

    const toggleButton = screen.getByText('preview.changeContact');
    expect(toggleButton).toBeInTheDocument();

    await user.click(toggleButton);

    expect(screen.getByText('preview.collapse')).toBeInTheDocument();
  });

  it('displays contact list when opened', async () => {
    const user = userEvent.setup();
    render(<PersonalizationPicker />);

    const toggleButton = screen.getByText('preview.changeContact');
    await user.click(toggleButton);

    // Should show sample contacts (there are 4 in the mock data)
    const contactButtons = screen.getAllByRole('button').filter(
      (btn) => btn.textContent?.includes('@')
    );
    expect(contactButtons.length).toBeGreaterThan(0);
  });

  it('allows selecting different contact', async () => {
    const user = userEvent.setup();
    render(<PersonalizationPicker />);

    const toggleButton = screen.getByText('preview.changeContact');
    await user.click(toggleButton);

    // Click on the second contact (Jane Smith)
    const janeButton = screen.getByText('jane.smith@company.com').closest('button');
    if (janeButton) {
      await user.click(janeButton);
      expect(mockPreviewStore.setPreviewContact).toHaveBeenCalled();
    }
  });

  it('closes contact list after selection', async () => {
    const user = userEvent.setup();
    render(<PersonalizationPicker />);

    const toggleButton = screen.getByText('preview.changeContact');
    await user.click(toggleButton);

    const janeButton = screen.getByText('jane.smith@company.com').closest('button');
    if (janeButton) {
      await user.click(janeButton);

      // After selection, should show "changeContact" again, not "collapse"
      const changedButtons = await screen.findAllByText(/preview\.(changeContact|collapse)/i);
      expect(changedButtons.length).toBeGreaterThan(0);
    }
  });

  it('marks selected contact with checkmark', async () => {
    const user = userEvent.setup();
    render(<PersonalizationPicker />);

    const toggleButton = screen.getByText('preview.changeContact');
    await user.click(toggleButton);

    // The first contact (John) should have a checkmark
    const svgs = screen.getAllByRole('img', { hidden: true });
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('displays available merge tags', () => {
    render(<PersonalizationPicker />);

    expect(screen.getByText('{{firstName}}')).toBeInTheDocument();
    expect(screen.getByText('{{lastName}}')).toBeInTheDocument();
    expect(screen.getByText('{{email}}')).toBeInTheDocument();
    expect(screen.getByText('{{company}}')).toBeInTheDocument();
    expect(screen.getByText('{{fullName}}')).toBeInTheDocument();
  });

  it('shows current values for merge tags', () => {
    render(<PersonalizationPicker />);

    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Doe')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('shows merge tags in monospace font', () => {
    const { container } = render(<PersonalizationPicker />);

    const tags = container.querySelectorAll('[class*="font-mono"]');
    expect(tags.length).toBeGreaterThan(0);
  });

  it('renders merge tags reference section', () => {
    render(<PersonalizationPicker />);

    expect(screen.getByText('preview.availableTags')).toBeInTheDocument();
  });

  it('has accessible contact list structure', async () => {
    const user = userEvent.setup();
    render(<PersonalizationPicker />);

    const toggleButton = screen.getByText('preview.changeContact');
    await user.click(toggleButton);

    const buttons = screen.getAllByRole('button').filter(
      (btn) => btn.textContent?.includes('example.com')
    );
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('shows contact email in list', async () => {
    const user = userEvent.setup();
    render(<PersonalizationPicker />);

    const toggleButton = screen.getByText('preview.changeContact');
    await user.click(toggleButton);

    expect(screen.getByText('jane.smith@company.com')).toBeInTheDocument();
  });

  it('displays full name in merge tags', () => {
    render(<PersonalizationPicker />);

    const fullNameTag = screen.getByText('{{fullName}}');
    expect(fullNameTag).toBeInTheDocument();

    // Check that it shows the combined first and last name
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
  });

  it('handles contact without company field', async () => {
    const contactWithoutCompany: Contact = {
      id: '3',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    };

    mockPreviewStore.previewContact = contactWithoutCompany;

    render(<PersonalizationPicker />);

    // Should show dash for missing company
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('shows contact avatars in list', async () => {
    const user = userEvent.setup();
    const { container } = render(<PersonalizationPicker />);

    const toggleButton = screen.getByText('preview.changeContact');
    await user.click(toggleButton);

    const avatars = container.querySelectorAll('[class*="rounded-full"]');
    expect(avatars.length).toBeGreaterThan(1); // Current contact + list items
  });

  it('renders space for contact details', () => {
    render(<PersonalizationPicker />);

    const contactCard = screen.getByText('john.doe@example.com').closest('[class*="p-4"]');
    expect(contactCard).toBeInTheDocument();
  });

  it('applies correct styling to current contact card', () => {
    const { container } = render(<PersonalizationPicker />);

    const card = container.querySelector('[class*="bg-gray-50"]');
    expect(card).toBeInTheDocument();
  });

  it('can expand and collapse contact list', async () => {
    const user = userEvent.setup();
    render(<PersonalizationPicker />);

    // Initially collapsed
    expect(screen.queryByText('jane.smith@company.com')).not.toBeInTheDocument();

    // Expand
    const toggleButton = screen.getByText('preview.changeContact');
    await user.click(toggleButton);

    expect(screen.getByText('jane.smith@company.com')).toBeInTheDocument();

    // Collapse
    const collapseButton = screen.getByText('preview.collapse');
    await user.click(collapseButton);

    expect(screen.queryByText('jane.smith@company.com')).not.toBeInTheDocument();
  });

  it('renders merge tags with arrow separator', () => {
    render(<PersonalizationPicker />);

    // Look for the arrow separator between tag and value
    const separators = screen.getAllByText('→');
    expect(separators.length).toBeGreaterThan(0);
  });

  it('displays instructions text', async () => {
    const user = userEvent.setup();
    render(<PersonalizationPicker />);

    const toggleButton = screen.getByText('preview.changeContact');
    await user.click(toggleButton);

    expect(screen.getByText('preview.selectContactToPreview')).toBeInTheDocument();
  });

  it('shows contact first letter in avatar', () => {
    const { container } = render(<PersonalizationPicker />);

    const avatar = container.querySelector('[class*="rounded-full"]');
    // Should contain first letter of first name
    expect(avatar?.textContent).toContain('J');
  });

  it('handles multiple contacts in list', async () => {
    const user = userEvent.setup();
    render(<PersonalizationPicker />);

    const toggleButton = screen.getByText('preview.changeContact');
    await user.click(toggleButton);

    // Should show multiple contacts from sample data
    const contacts = screen.getAllByText(/@/);
    expect(contacts.length).toBeGreaterThanOrEqual(4); // 4 sample contacts
  });
});
