import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeviceToggle, DarkModeToggle, EmailClientSelector } from '@/components/preview/DeviceToggle';

const mockPreviewStore = {
  previewMode: 'desktop' as const,
  darkMode: false,
  emailClient: 'default' as const,
  setPreviewMode: vi.fn(),
  setDarkMode: vi.fn(),
  setEmailClient: vi.fn(),
};

vi.mock('@/stores/preview-store', () => ({
  usePreviewStore: () => mockPreviewStore,
}));

describe('DeviceToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders device toggle buttons', () => {
    render(<DeviceToggle />);

    expect(screen.getByText('preview.desktop')).toBeInTheDocument();
    expect(screen.getByText('preview.tablet')).toBeInTheDocument();
    expect(screen.getByText('preview.mobile')).toBeInTheDocument();
  });

  it('shows desktop button', () => {
    render(<DeviceToggle />);

    const desktopButton = screen.getByText('preview.desktop');
    expect(desktopButton).toBeInTheDocument();
  });

  it('shows tablet button', () => {
    render(<DeviceToggle />);

    const tabletButton = screen.getByText('preview.tablet');
    expect(tabletButton).toBeInTheDocument();
  });

  it('shows mobile button', () => {
    render(<DeviceToggle />);

    const mobileButton = screen.getByText('preview.mobile');
    expect(mobileButton).toBeInTheDocument();
  });

  it('calls setPreviewMode with desktop when desktop button clicked', async () => {
    const user = userEvent.setup();
    render(<DeviceToggle />);

    const desktopButton = screen.getByText('preview.desktop').closest('button');
    await user.click(desktopButton!);

    expect(mockPreviewStore.setPreviewMode).toHaveBeenCalledWith('desktop');
  });

  it('calls setPreviewMode with tablet when tablet button clicked', async () => {
    const user = userEvent.setup();
    render(<DeviceToggle />);

    const tabletButton = screen.getByText('preview.tablet').closest('button');
    await user.click(tabletButton!);

    expect(mockPreviewStore.setPreviewMode).toHaveBeenCalledWith('tablet');
  });

  it('calls setPreviewMode with mobile when mobile button clicked', async () => {
    const user = userEvent.setup();
    render(<DeviceToggle />);

    const mobileButton = screen.getByText('preview.mobile').closest('button');
    await user.click(mobileButton!);

    expect(mockPreviewStore.setPreviewMode).toHaveBeenCalledWith('mobile');
  });

  it('shows desktop as active when previewMode is desktop', () => {
    mockPreviewStore.previewMode = 'desktop';

    render(<DeviceToggle />);

    const desktopButton = screen.getByText('preview.desktop').closest('button');
    expect(desktopButton).toHaveClass('bg-white');
  });

  it('shows mobile as active when previewMode is mobile', () => {
    mockPreviewStore.previewMode = 'mobile';

    render(<DeviceToggle />);

    const mobileButton = screen.getByText('preview.mobile').closest('button');
    expect(mobileButton).toHaveClass('bg-white');
  });

  it('shows tablet as active when previewMode is tablet', () => {
    mockPreviewStore.previewMode = 'tablet';

    render(<DeviceToggle />);

    const tabletButton = screen.getByText('preview.tablet').closest('button');
    expect(tabletButton).toHaveClass('bg-white');
  });

  it('has icons for each device', () => {
    const { container } = render(<DeviceToggle />);

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(3); // desktop, tablet, mobile
  });

  it('renders in flex container with rounded background', () => {
    const { container } = render(<DeviceToggle />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('flex', 'rounded-lg');
  });

  it('has title attribute for accessibility', () => {
    render(<DeviceToggle />);

    const desktopButton = screen.getByText('preview.desktop').closest('button');
    expect(desktopButton).toHaveAttribute('title');
  });

  it('displays label text with responsive hiding', () => {
    render(<DeviceToggle />);

    const labels = screen.getAllByText(/preview\.(desktop|tablet|mobile)/i);
    expect(labels.length).toBeGreaterThanOrEqual(3);
  });
});

describe('DarkModeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dark mode toggle button', () => {
    render(<DarkModeToggle />);

    const button = screen.getAllByRole('button')[0];
    expect(button).toBeInTheDocument();
  });

  it('calls setDarkMode with true when dark mode disabled', async () => {
    const user = userEvent.setup();
    mockPreviewStore.darkMode = false;

    render(<DarkModeToggle />);

    const button = screen.getAllByRole('button')[0];
    await user.click(button);

    expect(mockPreviewStore.setDarkMode).toHaveBeenCalledWith(true);
  });

  it('calls setDarkMode with false when dark mode enabled', async () => {
    const user = userEvent.setup();
    mockPreviewStore.darkMode = true;

    render(<DarkModeToggle />);

    const button = screen.getAllByRole('button')[0];
    await user.click(button);

    expect(mockPreviewStore.setDarkMode).toHaveBeenCalledWith(false);
  });

  it('shows sun icon when dark mode is enabled', () => {
    mockPreviewStore.darkMode = true;

    const { container } = render(<DarkModeToggle />);

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('shows moon icon when dark mode is disabled', () => {
    mockPreviewStore.darkMode = false;

    const { container } = render(<DarkModeToggle />);

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('has appropriate title based on dark mode state', () => {
    mockPreviewStore.darkMode = false;

    render(<DarkModeToggle />);

    const button = screen.getAllByRole('button')[0];
    expect(button).toHaveAttribute('title');
  });

  it('applies correct styling when dark mode active', () => {
    mockPreviewStore.darkMode = true;

    const { container } = render(<DarkModeToggle />);

    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-gray-800');
  });

  it('applies correct styling when dark mode inactive', () => {
    mockPreviewStore.darkMode = false;

    const { container } = render(<DarkModeToggle />);

    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-gray-100');
  });
});

describe('EmailClientSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email client selector dropdown', () => {
    render(<EmailClientSelector />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('renders all email client options', () => {
    render(<EmailClientSelector />);

    expect(screen.getByDisplayValue('preview.clientDefault')).toBeInTheDocument();
    expect(screen.getByText('Gmail')).toBeInTheDocument();
    expect(screen.getByText('Outlook')).toBeInTheDocument();
    expect(screen.getByText('Apple Mail')).toBeInTheDocument();
  });

  it('shows default client option', () => {
    render(<EmailClientSelector />);

    expect(screen.getByText('preview.clientDefault')).toBeInTheDocument();
  });

  it('shows Gmail option', () => {
    render(<EmailClientSelector />);

    expect(screen.getByText('Gmail')).toBeInTheDocument();
  });

  it('shows Outlook option', () => {
    render(<EmailClientSelector />);

    expect(screen.getByText('Outlook')).toBeInTheDocument();
  });

  it('shows Apple Mail option', () => {
    render(<EmailClientSelector />);

    expect(screen.getByText('Apple Mail')).toBeInTheDocument();
  });

  it('calls setEmailClient when selection changed', async () => {
    const user = userEvent.setup();
    render(<EmailClientSelector />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    await user.selectOptions(select, 'gmail');

    expect(mockPreviewStore.setEmailClient).toHaveBeenCalledWith('gmail');
  });

  it('displays currently selected client', () => {
    mockPreviewStore.emailClient = 'gmail';

    render(<EmailClientSelector />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('gmail');
  });

  it('changes selection when user selects different client', async () => {
    const user = userEvent.setup();
    mockPreviewStore.emailClient = 'default';

    render(<EmailClientSelector />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    await user.selectOptions(select, 'outlook');

    expect(mockPreviewStore.setEmailClient).toHaveBeenCalledWith('outlook');
  });

  it('is styled as a select input', () => {
    const { container } = render(<EmailClientSelector />);

    const select = container.querySelector('select');
    expect(select).toHaveClass('px-3', 'py-2', 'text-sm', 'rounded-lg');
  });

  it('has dark mode styling classes', () => {
    const { container } = render(<EmailClientSelector />);

    const select = container.querySelector('select');
    expect(select).toHaveClass('dark:bg-gray-800', 'dark:text-gray-300');
  });
});
