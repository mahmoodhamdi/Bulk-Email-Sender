import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Timezone {
  id: string;
  label: string;
  offset: string;
  region: string;
}

export interface ScheduledCampaign {
  id: string;
  campaignId: string;
  campaignName: string;
  scheduledAt: Date;
  timezone: string;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  error?: string;
}

interface ScheduleState {
  // Schedule form state
  selectedDate: Date | null;
  selectedTime: string;
  selectedTimezone: string;
  sendNow: boolean;

  // Scheduled campaigns
  scheduledCampaigns: ScheduledCampaign[];
  isLoading: boolean;
  error: string | null;
}

interface ScheduleActions {
  // Form actions
  setSelectedDate: (date: Date | null) => void;
  setSelectedTime: (time: string) => void;
  setSelectedTimezone: (timezone: string) => void;
  setSendNow: (sendNow: boolean) => void;
  resetScheduleForm: () => void;

  // Schedule actions
  scheduleCampaign: (campaignId: string, campaignName: string) => ScheduledCampaign | null;
  rescheduleCampaign: (scheduleId: string, scheduledAt: Date, timezone: string) => void;
  cancelScheduledCampaign: (scheduleId: string) => void;
  updateScheduleStatus: (scheduleId: string, status: ScheduledCampaign['status'], error?: string) => void;

  // Utility
  getScheduledDateTime: () => Date | null;
  getScheduledDateTimeUTC: () => Date | null;
  validateSchedule: () => { valid: boolean; error?: string };

  // Clear
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

type ScheduleStore = ScheduleState & ScheduleActions;

// Common timezones with their display info
export const TIMEZONES: Timezone[] = [
  { id: 'UTC', label: 'UTC', offset: '+00:00', region: 'Universal' },
  { id: 'America/New_York', label: 'Eastern Time', offset: '-05:00', region: 'Americas' },
  { id: 'America/Chicago', label: 'Central Time', offset: '-06:00', region: 'Americas' },
  { id: 'America/Denver', label: 'Mountain Time', offset: '-07:00', region: 'Americas' },
  { id: 'America/Los_Angeles', label: 'Pacific Time', offset: '-08:00', region: 'Americas' },
  { id: 'America/Anchorage', label: 'Alaska Time', offset: '-09:00', region: 'Americas' },
  { id: 'Pacific/Honolulu', label: 'Hawaii Time', offset: '-10:00', region: 'Americas' },
  { id: 'America/Sao_Paulo', label: 'Brasilia Time', offset: '-03:00', region: 'Americas' },
  { id: 'Europe/London', label: 'London', offset: '+00:00', region: 'Europe' },
  { id: 'Europe/Paris', label: 'Paris', offset: '+01:00', region: 'Europe' },
  { id: 'Europe/Berlin', label: 'Berlin', offset: '+01:00', region: 'Europe' },
  { id: 'Europe/Moscow', label: 'Moscow', offset: '+03:00', region: 'Europe' },
  { id: 'Asia/Dubai', label: 'Dubai', offset: '+04:00', region: 'Asia' },
  { id: 'Asia/Kolkata', label: 'India', offset: '+05:30', region: 'Asia' },
  { id: 'Asia/Singapore', label: 'Singapore', offset: '+08:00', region: 'Asia' },
  { id: 'Asia/Shanghai', label: 'China', offset: '+08:00', region: 'Asia' },
  { id: 'Asia/Tokyo', label: 'Tokyo', offset: '+09:00', region: 'Asia' },
  { id: 'Asia/Seoul', label: 'Seoul', offset: '+09:00', region: 'Asia' },
  { id: 'Australia/Sydney', label: 'Sydney', offset: '+11:00', region: 'Oceania' },
  { id: 'Australia/Perth', label: 'Perth', offset: '+08:00', region: 'Oceania' },
  { id: 'Pacific/Auckland', label: 'Auckland', offset: '+13:00', region: 'Oceania' },
  { id: 'Africa/Cairo', label: 'Cairo', offset: '+02:00', region: 'Africa' },
  { id: 'Africa/Johannesburg', label: 'Johannesburg', offset: '+02:00', region: 'Africa' },
  { id: 'Africa/Lagos', label: 'Lagos', offset: '+01:00', region: 'Africa' },
];

// Get user's local timezone
export const getLocalTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
};

// Format timezone for display
export const formatTimezoneDisplay = (timezoneId: string): string => {
  const tz = TIMEZONES.find((t) => t.id === timezoneId);
  if (tz) {
    return `${tz.label} (${tz.offset})`;
  }
  return timezoneId;
};

// Convert local date/time to specific timezone
export const convertToTimezone = (date: Date, fromTimezone: string, toTimezone: string): Date => {
  try {
    const dateStr = date.toLocaleString('en-US', { timeZone: fromTimezone });
    const targetStr = new Date(dateStr).toLocaleString('en-US', { timeZone: toTimezone });
    return new Date(targetStr);
  } catch {
    return date;
  }
};

// Convert to UTC for storage
export const toUTC = (date: Date, fromTimezone: string): Date => {
  try {
    // Create a formatter that outputs in the specified timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: fromTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '0';

    // Get the UTC offset for the timezone
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: fromTimezone }));
    const offset = utcDate.getTime() - tzDate.getTime();

    return new Date(date.getTime() + offset);
  } catch {
    return date;
  }
};

// Format date for display
export const formatScheduledDate = (date: Date, timezone: string): string => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return date.toISOString();
  }
};

// Get time until scheduled date
export const getTimeUntil = (scheduledAt: Date): { days: number; hours: number; minutes: number } | null => {
  const now = new Date();
  const diff = scheduledAt.getTime() - now.getTime();

  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes };
};

// Minimum time before sending (15 minutes)
const MIN_SCHEDULE_BUFFER_MS = 15 * 60 * 1000;

const initialState: ScheduleState = {
  selectedDate: null,
  selectedTime: '09:00',
  selectedTimezone: getLocalTimezone(),
  sendNow: true,
  scheduledCampaigns: [],
  isLoading: false,
  error: null,
};

export const useScheduleStore = create<ScheduleStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setSelectedDate: (date) => set({ selectedDate: date }),

      setSelectedTime: (time) => set({ selectedTime: time }),

      setSelectedTimezone: (timezone) => set({ selectedTimezone: timezone }),

      setSendNow: (sendNow) => set({ sendNow }),

      resetScheduleForm: () =>
        set({
          selectedDate: null,
          selectedTime: '09:00',
          selectedTimezone: getLocalTimezone(),
          sendNow: true,
          error: null,
        }),

      getScheduledDateTime: () => {
        const { selectedDate, selectedTime } = get();
        if (!selectedDate) return null;

        const [hours, minutes] = selectedTime.split(':').map(Number);
        const scheduledDate = new Date(selectedDate);
        scheduledDate.setHours(hours, minutes, 0, 0);
        return scheduledDate;
      },

      getScheduledDateTimeUTC: () => {
        const { selectedDate, selectedTime, selectedTimezone } = get();
        if (!selectedDate) return null;

        const [hours, minutes] = selectedTime.split(':').map(Number);
        const scheduledDate = new Date(selectedDate);
        scheduledDate.setHours(hours, minutes, 0, 0);

        return toUTC(scheduledDate, selectedTimezone);
      },

      validateSchedule: () => {
        const { sendNow, selectedDate, selectedTime, selectedTimezone } = get();

        if (sendNow) {
          return { valid: true };
        }

        if (!selectedDate) {
          return { valid: false, error: 'Please select a date' };
        }

        const [hours, minutes] = selectedTime.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) {
          return { valid: false, error: 'Please select a valid time' };
        }

        const scheduledDate = new Date(selectedDate);
        scheduledDate.setHours(hours, minutes, 0, 0);

        // Convert to UTC for comparison
        const scheduledUTC = toUTC(scheduledDate, selectedTimezone);
        const now = new Date();
        const minTime = new Date(now.getTime() + MIN_SCHEDULE_BUFFER_MS);

        if (scheduledUTC < now) {
          return { valid: false, error: 'Cannot schedule in the past' };
        }

        if (scheduledUTC < minTime) {
          return { valid: false, error: 'Schedule time must be at least 15 minutes in the future' };
        }

        return { valid: true };
      },

      scheduleCampaign: (campaignId, campaignName) => {
        const { selectedDate, selectedTime, selectedTimezone, validateSchedule, sendNow } = get();

        if (sendNow) {
          return null;
        }

        const validation = validateSchedule();
        if (!validation.valid) {
          set({ error: validation.error || 'Invalid schedule' });
          return null;
        }

        const [hours, minutes] = selectedTime.split(':').map(Number);
        const scheduledDate = new Date(selectedDate!);
        scheduledDate.setHours(hours, minutes, 0, 0);
        const scheduledAtUTC = toUTC(scheduledDate, selectedTimezone);

        const newSchedule: ScheduledCampaign = {
          id: `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          campaignId,
          campaignName,
          scheduledAt: scheduledAtUTC,
          timezone: selectedTimezone,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          scheduledCampaigns: [...state.scheduledCampaigns, newSchedule],
          error: null,
        }));

        return newSchedule;
      },

      rescheduleCampaign: (scheduleId, scheduledAt, timezone) => {
        set((state) => ({
          scheduledCampaigns: state.scheduledCampaigns.map((sc) =>
            sc.id === scheduleId
              ? {
                  ...sc,
                  scheduledAt,
                  timezone,
                  status: 'pending' as const,
                  updatedAt: new Date(),
                }
              : sc
          ),
        }));
      },

      cancelScheduledCampaign: (scheduleId) => {
        set((state) => ({
          scheduledCampaigns: state.scheduledCampaigns.map((sc) =>
            sc.id === scheduleId
              ? {
                  ...sc,
                  status: 'cancelled' as const,
                  updatedAt: new Date(),
                }
              : sc
          ),
        }));
      },

      updateScheduleStatus: (scheduleId, status, error) => {
        set((state) => ({
          scheduledCampaigns: state.scheduledCampaigns.map((sc) =>
            sc.id === scheduleId
              ? {
                  ...sc,
                  status,
                  error,
                  updatedAt: new Date(),
                }
              : sc
          ),
        }));
      },

      clearError: () => set({ error: null }),

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'schedule-storage',
      partialize: (state) => ({
        scheduledCampaigns: state.scheduledCampaigns,
        selectedTimezone: state.selectedTimezone,
      }),
    }
  )
);
