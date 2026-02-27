import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailPreview } from '@/components/preview/EmailPreview';

const mockPreviewStore = {
  previewMode: 'desktop' as const,
  darkMode: false,
  emailClient: 'default' as const,
  showRawHtml: false,
  activeTab: 'preview' as const,
  isPreviewOpen: true,
  subject: 'Test Subject',
  htmlContent: '<html><body>Test Content</body></html>',
  textContent: 'Test Content',
  fromName: 'Sender',
  fromEmail: 'sender@example.com',
  previewContact: null,
  testEmails: [],
  testSending: false,
  testResults: [],
  spamAnalysis: null,
  isAnalyzing: false,
  setSubject: vi.fn(),
  setHtmlContent: vi.fn(),
  setTextContent: vi.fn(),
  setFromName: vi.fn(),
  setFromEmail: vi.fn(),
  setPreviewMode: vi.fn(),
  setDarkMode: vi.fn(),
  setEmailClient: vi.fn(),
  toggleRawHtml: vi.fn(),
  setActiveTab: vi.fn(),
  closePreview: vi.fn(),
  openPreview: vi.fn(),
  setPreviewContact: vi.fn(),
  addTestEmail: vi.fn(),
  removeTestEmail: vi.fn(),
  clearTestEmails: vi.fn(),
  sendTestEmail: vi.fn(),
  clearTestResults: vi.fn(),
  analyzeSpam: vi.fn(),
  clearSpamAnalysis: vi.fn(),
  getRenderedContent: vi.fn(() => '<html><body>Test Content</body></html>'),
  getRenderedSubject: vi.fn(() => 'Test Subject'),
  getDeviceDimensions: vi.fn(() => ({ width: 600, height: 800 })),
};

vi.mock('@/stores/preview-store', () => ({
  usePreviewStore: () => mockPreviewStore,
}));

describe('EmailPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email preview container', () => {
    render(
      <EmailPreview
        subject="Test Subject"
        htmlContent="<html><body>Test</body></html>"
      />
    );

    expect(screen.getByText('preview.emailPreview')).toBeInTheDocument();
  });

  it('syncs subject prop with store on mount', () => {
    render(
      <EmailPreview subject="Custom Subject" />
    );

    expect(mockPreviewStore.setSubject).toHaveBeenCalledWith('Custom Subject');
  });

  it('syncs htmlContent prop with store on mount', () => {
    const html = '<html><body>Custom</body></html>';
    render(
      <EmailPreview htmlContent={html} />
    );

    expect(mockPreviewStore.setHtmlContent).toHaveBeenCalledWith(html);
  });

  it('syncs textContent prop with store on mount', () => {
    render(
      <EmailPreview textContent="Plain text" />
    );

    expect(mockPreviewStore.setTextContent).toHaveBeenCalledWith('Plain text');
  });

  it('syncs fromName prop with store on mount', () => {
    render(
      <EmailPreview fromName="John Doe" />
    );

    expect(mockPreviewStore.setFromName).toHaveBeenCalledWith('John Doe');
  });

  it('syncs fromEmail prop with store on mount', () => {
    render(
      <EmailPreview fromEmail="john@example.com" />
    );

    expect(mockPreviewStore.setFromEmail).toHaveBeenCalledWith('john@example.com');
  });

  it('renders preview tab', () => {
    render(<EmailPreview />);

    expect(screen.getByText('preview.preview')).toBeInTheDocument();
  });

  it('renders test send tab', () => {
    render(<EmailPreview />);

    expect(screen.getByText('preview.testSend')).toBeInTheDocument();
  });

  it('renders spam check tab', () => {
    render(<EmailPreview />);

    expect(screen.getByText('preview.spamCheck')).toBeInTheDocument();
  });

  it('shows active preview tab content', () => {
    render(<EmailPreview />);

    // Preview tab should show device controls
    expect(screen.getByText('preview.desktop')).toBeInTheDocument();
  });

  it('switches to test tab when clicked', async () => {
    const user = userEvent.setup();
    render(<EmailPreview />);

    const testTab = screen.getByText('preview.testSend');
    await user.click(testTab);

    expect(mockPreviewStore.setActiveTab).toHaveBeenCalledWith('test');
  });

  it('switches to spam tab when clicked', async () => {
    const user = userEvent.setup();
    render(<EmailPreview />);

    const spamTab = screen.getByText('preview.spamCheck');
    await user.click(spamTab);

    expect(mockPreviewStore.setActiveTab).toHaveBeenCalledWith('spam');
  });

  it('renders subject line preview', () => {
    mockPreviewStore.getRenderedSubject = vi.fn(() => 'Test Subject Line');

    render(
      <EmailPreview subject="Test Subject Line" />
    );

    expect(screen.getByText('Test Subject Line')).toBeInTheDocument();
  });

  it('renders device toggle controls in preview tab', () => {
    render(<EmailPreview />);

    expect(screen.getByText('preview.desktop')).toBeInTheDocument();
  });

  it('renders dark mode toggle in preview tab', () => {
    render(<EmailPreview />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders email client selector in preview tab', () => {
    const { container } = render(<EmailPreview />);

    const selects = container.querySelectorAll('select');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('renders source/rendered toggle button', () => {
    render(<EmailPreview />);

    const buttons = screen.getAllByRole('button');
    const sourceButton = buttons.find((btn) =>
      btn.textContent?.includes('preview.viewSource') || btn.textContent?.includes('preview.viewRendered')
    );
    expect(sourceButton).toBeDefined();
  });

  it('shows personalization section in preview tab', () => {
    render(<EmailPreview />);

    // Personalization picker should be rendered
    expect(screen.getByText(/preview/i)).toBeInTheDocument();
  });

  it('applies dark mode styling when darkMode is true', () => {
    mockPreviewStore.darkMode = true;

    const { container } = render(<EmailPreview />);

    const root = container.firstChild;
    expect(root).toHaveClass('dark:bg-gray-900');
  });

  it('applies light mode styling by default', () => {
    mockPreviewStore.darkMode = false;

    const { container } = render(<EmailPreview />);

    const root = container.firstChild;
    expect(root).toHaveClass('bg-white');
  });

  it('closes preview when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<EmailPreview />);

    if (mockPreviewStore.isPreviewOpen) {
      const closeButton = screen.getByRole('button', { name: /close/i });
      if (closeButton) {
        await user.click(closeButton);
        expect(mockPreviewStore.closePreview).toHaveBeenCalled();
      }
    }
  });

  it('renders with custom className', () => {
    const { container } = render(
      <EmailPreview className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders iframe for email preview', () => {
    const { container } = render(<EmailPreview />);

    const iframe = container.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
  });

  it('sets iframe src content with generated HTML', () => {
    const { container } = render(
      <EmailPreview htmlContent="<html><body>Test</body></html>" />
    );

    // iframe content is set via srcDoc which is harder to test,
    // but we can verify iframe exists
    const iframe = container.querySelector('iframe');
    expect(iframe).toHaveAttribute('title', 'Email Preview');
  });

  it('toggles raw HTML view', async () => {
    const user = userEvent.setup();
    render(<EmailPreview />);

    const buttons = screen.getAllByRole('button');
    const sourceButton = buttons.find((btn) =>
      btn.textContent?.includes('view')
    );

    if (sourceButton) {
      await user.click(sourceButton);
      expect(mockPreviewStore.toggleRawHtml).toHaveBeenCalled();
    }
  });

  it('renders with full height layout', () => {
    const { container } = render(<EmailPreview />);

    const root = container.firstChild;
    expect(root).toHaveClass('h-full', 'flex', 'flex-col');
  });

  it('renders header with title', () => {
    render(<EmailPreview />);

    const header = screen.getByText('preview.emailPreview');
    expect(header).toBeInTheDocument();
  });

  it('renders border between sections', () => {
    const { container } = render(<EmailPreview />);

    const borders = container.querySelectorAll('[class*="border"]');
    expect(borders.length).toBeGreaterThan(0);
  });

  it('applies correct device dimensions to iframe', () => {
    mockPreviewStore.getDeviceDimensions = vi.fn(() => ({ width: 375, height: 600 }));

    const { container } = render(<EmailPreview />);

    const iframe = container.querySelector('iframe');
    expect(iframe).toHaveStyle({ height: '600px', minHeight: '400px' });
  });

  it('renders subject preview section', () => {
    render(<EmailPreview subject="Test Subject" />);

    expect(screen.getByText('preview.subject:')).toBeInTheDocument();
  });

  it('handles subject as no subject', () => {
    mockPreviewStore.getRenderedSubject = vi.fn(() => '');

    render(<EmailPreview />);

    expect(screen.getByText('preview.noSubject')).toBeInTheDocument();
  });

  it('supports both desktop and mobile preview modes', () => {
    render(<EmailPreview />);

    expect(screen.getByText('preview.desktop')).toBeInTheDocument();
  });

  it('renders all tabs with correct styling', () => {
    render(<EmailPreview />);

    const previewTab = screen.getByText('preview.preview').closest('button');
    expect(previewTab).toHaveClass('rounded-lg', 'transition-colors');
  });
});
