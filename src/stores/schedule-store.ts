import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateShortId } from '@/lib/crypto';
import {
  TIMEZONES as TZ_LIST,
  getLocalTimezone as getTz,
  formatTimezoneDisplay as formatTz,
  formatInTimezone,
  parseTimeInTimezone,
  getTimeUntil as getTimeRemaining,
  type TimezoneInfo,
} from '@/lib/timezone';

// Re-export timezone utilities for backward compatibility
export const TIMEZONES = TZ_LIST;
export const getLocalTimezone = getTz;
export const formatTimezoneDisplay = formatTz;
export const getTimeUntil = getTimeRemaining;

// Format date for display (uses new DST-aware utility)
export const formatScheduledDate = (date: Date, timezone: string): string => {
  return formatInTimezone(date, timezone);
};

// Legacy type for backward compatibility
export interface Timezone extends TimezoneInfo {
  offset?: string; // Deprecated - offset is calculated dynamically now
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

        try {
          // Use DST-aware timezone parsing
          return parseTimeInTimezone(selectedDate, selectedTime, selectedTimezone);
        } catch {
          return null;
        }
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

        try {
          // Convert to UTC using DST-aware parsing
          const scheduledUTC = parseTimeInTimezone(selectedDate, selectedTime, selectedTimezone);
          const now = new Date();
          const minTime = new Date(now.getTime() + MIN_SCHEDULE_BUFFER_MS);

          if (scheduledUTC < now) {
            return { valid: false, error: 'Cannot schedule in the past' };
          }

          if (scheduledUTC < minTime) {
            return { valid: false, error: 'Schedule time must be at least 15 minutes in the future' };
          }

          return { valid: true };
        } catch {
          return { valid: false, error: 'Invalid date or timezone' };
        }
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

        // Use DST-aware timezone parsing
        const scheduledAtUTC = parseTimeInTimezone(selectedDate!, selectedTime, selectedTimezone);

        const newSchedule: ScheduledCampaign = {
          id: `schedule-${generateShortId(12)}`,
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
