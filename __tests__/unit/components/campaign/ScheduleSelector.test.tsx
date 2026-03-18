import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScheduleSelector } from '@/components/campaign/ScheduleSelector';

const mockScheduleStore = {
  selectedDate: null,
  selectedTime: '09:00',
  selectedTimezone: 'America/New_York',
  sendNow: true,
  error: null,
  setSelectedDate: vi.fn(),
  setSelectedTime: vi.fn(),
  setSelectedTimezone: vi.fn(),
  setSendNow: vi.fn(),
  validateSchedule: vi.fn(() => ({ valid: true })),
  getScheduledDateTimeUTC: vi.fn(() => null),
  clearError: vi.fn(),
};

vi.mock('@/stores/schedule-store', () => ({
  useScheduleStore: () => mockScheduleStore,
  TIMEZONES: [
    { id: 'America/New_York', label: 'Eastern Time', region: 'America', offset: '-5' },
    { id: 'America/Chicago', label: 'Central Time', region: 'America', offset: '-6' },
    { id: 'Europe/London', label: 'London', region: 'Europe', offset: '+0' },
    { id: 'Asia/Tokyo', label: 'Tokyo', region: 'Asia', offset: '+9' },
  ],
  getLocalTimezone: vi.fn(() => 'America/New_York'),
  formatScheduledDate: vi.fn((date, tz) => 'Test Date'),
  getTimeUntil: vi.fn(() => ({ days: 1, hours: 2, minutes: 30 })),
}));

vi.mock('@/lib/timezone', () => ({
  formatTimezoneOffset: (tz: string) => '-5:00',
}));

describe('ScheduleSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScheduleStore.sendNow = true;
    mockScheduleStore.selectedDate = null;
    mockScheduleStore.error = null;
    mockScheduleStore.selectedTimezone = 'America/New_York';
  });

  it('renders schedule selector card', () => {
    render(<ScheduleSelector />);

    expect(screen.getByText('schedule.title')).toBeInTheDocument();
  });

  it('renders send now button', () => {
    render(<ScheduleSelector />);

    expect(screen.getByText('schedule.sendNow')).toBeInTheDocument();
  });

  it('renders send later button', () => {
    render(<ScheduleSelector />);

    expect(screen.getByText('schedule.sendLater')).toBeInTheDocument();
  });

  it('shows send now as active when sendNow is true', () => {
    mockScheduleStore.sendNow = true;

    render(<ScheduleSelector />);

    const sendNowButton = screen.getByText('schedule.sendNow').closest('button');
    expect(sendNowButton).toHaveClass('bg-primary');
  });

  it('shows send later as active when sendNow is false', () => {
    mockScheduleStore.sendNow = false;

    render(<ScheduleSelector />);

    const sendLaterButton = screen.getByText('schedule.sendLater').closest('button');
    expect(sendLaterButton).toHaveClass('bg-primary');
  });

  it('calls setSendNow when send now clicked', async () => {
    const user = userEvent.setup();
    mockScheduleStore.sendNow = false;

    render(<ScheduleSelector />);

    const sendNowButton = screen.getByText('schedule.sendNow').closest('button');
    await user.click(sendNowButton!);

    expect(mockScheduleStore.setSendNow).toHaveBeenCalledWith(true);
  });

  it('calls setSendNow when send later clicked', async () => {
    const user = userEvent.setup();
    mockScheduleStore.sendNow = true;

    render(<ScheduleSelector />);

    const sendLaterButton = screen.getByText('schedule.sendLater').closest('button');
    await user.click(sendLaterButton!);

    expect(mockScheduleStore.setSendNow).toHaveBeenCalledWith(false);
  });

  it('does not show schedule options when send now is selected', () => {
    mockScheduleStore.sendNow = true;

    render(<ScheduleSelector />);

    // Date label should not be visible
    expect(screen.queryByText('schedule.date')).not.toBeInTheDocument();
  });

  it('shows schedule options when send later is selected', () => {
    mockScheduleStore.sendNow = false;

    render(<ScheduleSelector />);

    expect(screen.getByText('schedule.date')).toBeInTheDocument();
    expect(screen.getByText('schedule.time')).toBeInTheDocument();
    expect(screen.getByText('schedule.timezone')).toBeInTheDocument();
  });

  it('renders date picker', () => {
    mockScheduleStore.sendNow = false;

    const { container } = render(<ScheduleSelector />);

    const dateInput = container.querySelector('input[type="date"]');
    expect(dateInput).toBeInTheDocument();
  });

  it('renders time picker', () => {
    mockScheduleStore.sendNow = false;

    const { container } = render(<ScheduleSelector />);

    const timeInput = container.querySelector('input[type="time"]');
    expect(timeInput).toBeInTheDocument();
  });

  it('renders timezone selector', () => {
    mockScheduleStore.sendNow = false;

    const { container } = render(<ScheduleSelector />);

    const select = container.querySelector('select');
    expect(select).toBeInTheDocument();
  });

  it('shows timezone options grouped by region', () => {
    mockScheduleStore.sendNow = false;

    render(<ScheduleSelector />);

    // Should have optgroup elements for regions
    const { container } = render(<ScheduleSelector />);
    const optgroups = container.querySelectorAll('optgroup');
    expect(optgroups.length).toBeGreaterThan(0);
  });

  it('calls setSelectedDate when date changed', async () => {
    const user = userEvent.setup();
    mockScheduleStore.sendNow = false;

    const { container } = render(<ScheduleSelector />);

    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    await user.type(dateInput, '2025-12-25');

    expect(mockScheduleStore.setSelectedDate).toHaveBeenCalled();
  });

  it('calls setSelectedTime when time changed', async () => {
    const user = userEvent.setup();
    mockScheduleStore.sendNow = false;

    const { container } = render(<ScheduleSelector />);

    const timeInput = container.querySelector('input[type="time"]') as HTMLInputElement;
    await user.type(timeInput, '14:30');

    expect(mockScheduleStore.setSelectedTime).toHaveBeenCalled();
  });

  it('calls setSelectedTimezone when timezone changed', async () => {
    const user = userEvent.setup();
    mockScheduleStore.sendNow = false;

    const { container } = render(<ScheduleSelector />);

    const select = container.querySelector('select') as HTMLSelectElement;
    await user.selectOptions(select, 'Europe/London');

    expect(mockScheduleStore.setSelectedTimezone).toHaveBeenCalled();
  });

  it('shows scheduled time display when date selected', () => {
    mockScheduleStore.sendNow = false;
    mockScheduleStore.selectedDate = new Date('2025-12-25');
    mockScheduleStore.validateSchedule = vi.fn(() => ({ valid: true }));

    render(<ScheduleSelector />);

    expect(screen.getByText('schedule.scheduledFor')).toBeInTheDocument();
  });

  it('shows countdown when date selected and showCountdown is true', () => {
    mockScheduleStore.sendNow = false;
    mockScheduleStore.selectedDate = new Date('2025-12-25');
    mockScheduleStore.validateSchedule = vi.fn(() => ({ valid: true }));
    mockScheduleStore.getScheduledDateTimeUTC = vi.fn(
      () => new Date(Date.now() + 25 * 60 * 60 * 1000 + 30 * 60 * 1000)
    );

    render(<ScheduleSelector showCountdown={true} />);

    expect(screen.getByText(/schedule.countdown:/)).toBeInTheDocument();
  });

  it('does not show countdown when showCountdown is false', () => {
    mockScheduleStore.sendNow = false;
    mockScheduleStore.selectedDate = new Date('2025-12-25');
    mockScheduleStore.validateSchedule = vi.fn(() => ({ valid: true }));

    render(<ScheduleSelector showCountdown={false} />);

    // Countdown text should not be visible
    const countdownTexts = screen.queryAllByText(/schedule.countdown:/);
    expect(countdownTexts.length).toBe(0);
  });

  it('displays validation error when schedule invalid', () => {
    mockScheduleStore.sendNow = false;
    mockScheduleStore.selectedDate = new Date('2020-01-01'); // past date
    mockScheduleStore.validateSchedule = vi.fn(() => ({
      valid: false,
      error: 'Date must be in the future',
    }));

    render(<ScheduleSelector />);

    expect(screen.getByText('Date must be in the future')).toBeInTheDocument();
  });

  it('displays error from store', () => {
    mockScheduleStore.sendNow = false;
    mockScheduleStore.selectedDate = new Date('2025-12-25');
    mockScheduleStore.error = 'Scheduling failed';

    render(<ScheduleSelector />);

    expect(screen.getByText('Scheduling failed')).toBeInTheDocument();
  });

  it('clears error when send now clicked', async () => {
    const user = userEvent.setup();
    mockScheduleStore.sendNow = false;
    mockScheduleStore.error = 'Some error';

    render(<ScheduleSelector />);

    const sendNowButton = screen.getByText('schedule.sendNow').closest('button');
    await user.click(sendNowButton!);

    expect(mockScheduleStore.clearError).toHaveBeenCalled();
  });

  it('sets minimum date to today', () => {
    mockScheduleStore.sendNow = false;

    const { container } = render(<ScheduleSelector />);

    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput).toHaveAttribute('min');
  });

  it('calls onScheduleChange callback when values change', async () => {
    const onScheduleChange = vi.fn();
    mockScheduleStore.sendNow = true;

    render(<ScheduleSelector onScheduleChange={onScheduleChange} />);

    // Should be called during setup
    expect(onScheduleChange).toHaveBeenCalled();
  });

  it('passes sendNow state to callback', async () => {
    const onScheduleChange = vi.fn();
    mockScheduleStore.sendNow = true;

    render(<ScheduleSelector onScheduleChange={onScheduleChange} />);

    // Check that callback receives sendNow state
    const calls = onScheduleChange.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
  });

  it('renders with card styling', () => {
    const { container } = render(<ScheduleSelector />);

    const card = container.firstChild;
    expect(card).toHaveClass('w-full');
  });

  it('renders card header with title and description', () => {
    render(<ScheduleSelector />);

    expect(screen.getByText('schedule.title')).toBeInTheDocument();
    expect(screen.getByText('schedule.selectWhen')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<ScheduleSelector className="custom-class" />);

    const card = container.firstChild;
    expect(card).toHaveClass('custom-class');
  });

  it('shows send now description', () => {
    render(<ScheduleSelector />);

    expect(screen.getByText('schedule.sendNowDesc')).toBeInTheDocument();
  });

  it('shows send later description', () => {
    render(<ScheduleSelector />);

    expect(screen.getByText('schedule.sendLaterDesc')).toBeInTheDocument();
  });

  it('renders with icon in title', () => {
    const { container } = render(<ScheduleSelector />);

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('has proper label elements for accessibility', () => {
    mockScheduleStore.sendNow = false;

    render(<ScheduleSelector />);

    expect(screen.getByText('schedule.date')).toBeInTheDocument();
    expect(screen.getByText('schedule.time')).toBeInTheDocument();
  });

  it('displays all day/hour/minute counts in countdown', () => {
    mockScheduleStore.sendNow = false;
    mockScheduleStore.selectedDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    mockScheduleStore.validateSchedule = vi.fn(() => ({ valid: true }));
    mockScheduleStore.getScheduledDateTimeUTC = vi.fn(
      () => new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    );

    render(<ScheduleSelector showCountdown={true} />);

    // Should show days, hours, minutes
    expect(screen.getByText(/schedule.days/)).toBeInTheDocument();
  });

  it('renders error with alert icon', () => {
    mockScheduleStore.sendNow = false;
    mockScheduleStore.selectedDate = new Date('2020-01-01');
    mockScheduleStore.validateSchedule = vi.fn(() => ({
      valid: false,
      error: 'Invalid date',
    }));

    const { container } = render(<ScheduleSelector />);

    // Should have alert styling
    const alert = container.querySelector('[class*="destructive"]');
    expect(alert).toBeInTheDocument();
  });

  it('detects local timezone on mount', () => {
    // When selectedTimezone is empty, the component calls setSelectedTimezone
    mockScheduleStore.selectedTimezone = '';

    render(<ScheduleSelector />);

    // Should auto-detect timezone (mocked to return America/New_York)
    expect(mockScheduleStore.setSelectedTimezone).toHaveBeenCalled();
  });
});
