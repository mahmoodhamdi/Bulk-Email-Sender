import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import {
  useScheduleStore,
  TIMEZONES,
  getLocalTimezone,
  formatTimezoneDisplay,
  convertToTimezone,
  toUTC,
  formatScheduledDate,
  getTimeUntil,
} from '@/stores/schedule-store';

describe('Schedule Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    act(() => {
      useScheduleStore.setState({
        selectedDate: null,
        selectedTime: '09:00',
        selectedTimezone: getLocalTimezone(),
        sendNow: true,
        scheduledCampaigns: [],
        isLoading: false,
        error: null,
      });
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useScheduleStore.getState();
      expect(state.selectedDate).toBeNull();
      expect(state.selectedTime).toBe('09:00');
      expect(state.sendNow).toBe(true);
      expect(state.scheduledCampaigns).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('Form Actions', () => {
    it('should set selected date', () => {
      const testDate = new Date('2025-01-15');
      act(() => {
        useScheduleStore.getState().setSelectedDate(testDate);
      });
      expect(useScheduleStore.getState().selectedDate).toEqual(testDate);
    });

    it('should set selected time', () => {
      act(() => {
        useScheduleStore.getState().setSelectedTime('14:30');
      });
      expect(useScheduleStore.getState().selectedTime).toBe('14:30');
    });

    it('should set selected timezone', () => {
      act(() => {
        useScheduleStore.getState().setSelectedTimezone('America/New_York');
      });
      expect(useScheduleStore.getState().selectedTimezone).toBe('America/New_York');
    });

    it('should set sendNow flag', () => {
      act(() => {
        useScheduleStore.getState().setSendNow(false);
      });
      expect(useScheduleStore.getState().sendNow).toBe(false);

      act(() => {
        useScheduleStore.getState().setSendNow(true);
      });
      expect(useScheduleStore.getState().sendNow).toBe(true);
    });

    it('should reset schedule form', () => {
      // Set some values first
      act(() => {
        const store = useScheduleStore.getState();
        store.setSelectedDate(new Date('2025-01-15'));
        store.setSelectedTime('14:30');
        store.setSelectedTimezone('America/New_York');
        store.setSendNow(false);
      });

      // Reset
      act(() => {
        useScheduleStore.getState().resetScheduleForm();
      });

      const state = useScheduleStore.getState();
      expect(state.selectedDate).toBeNull();
      expect(state.selectedTime).toBe('09:00');
      expect(state.sendNow).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('Validation', () => {
    it('should validate when sendNow is true', () => {
      const result = useScheduleStore.getState().validateSchedule();
      expect(result.valid).toBe(true);
    });

    it('should fail validation when date is not selected', () => {
      act(() => {
        useScheduleStore.getState().setSendNow(false);
      });
      const result = useScheduleStore.getState().validateSchedule();
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Please select a date');
    });

    it('should fail validation for invalid time format', () => {
      act(() => {
        const store = useScheduleStore.getState();
        store.setSendNow(false);
        store.setSelectedDate(new Date('2025-12-25'));
        store.setSelectedTime('invalid');
      });
      const result = useScheduleStore.getState().validateSchedule();
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Please select a valid time');
    });

    it('should fail validation for past date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      act(() => {
        const store = useScheduleStore.getState();
        store.setSendNow(false);
        store.setSelectedDate(pastDate);
        store.setSelectedTime('10:00');
      });

      const result = useScheduleStore.getState().validateSchedule();
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cannot schedule in the past');
    });

    it('should fail validation for time less than 15 minutes in future', () => {
      const now = new Date();
      const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);

      act(() => {
        const store = useScheduleStore.getState();
        store.setSendNow(false);
        store.setSelectedDate(tenMinutesFromNow);
        store.setSelectedTime(
          `${tenMinutesFromNow.getHours().toString().padStart(2, '0')}:${tenMinutesFromNow.getMinutes().toString().padStart(2, '0')}`
        );
        store.setSelectedTimezone('UTC');
      });

      const result = useScheduleStore.getState().validateSchedule();
      expect(result.valid).toBe(false);
    });

    it('should pass validation for future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      act(() => {
        const store = useScheduleStore.getState();
        store.setSendNow(false);
        store.setSelectedDate(futureDate);
        store.setSelectedTime('10:00');
        store.setSelectedTimezone('UTC');
      });

      const result = useScheduleStore.getState().validateSchedule();
      expect(result.valid).toBe(true);
    });
  });

  describe('Schedule Actions', () => {
    it('should return null when scheduling with sendNow true', () => {
      const result = useScheduleStore.getState().scheduleCampaign('campaign-1', 'Test Campaign');
      expect(result).toBeNull();
    });

    it('should create scheduled campaign when valid', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      act(() => {
        const store = useScheduleStore.getState();
        store.setSendNow(false);
        store.setSelectedDate(futureDate);
        store.setSelectedTime('10:00');
        store.setSelectedTimezone('UTC');
      });

      let result: ReturnType<typeof useScheduleStore.getState>['scheduledCampaigns'][0] | null = null;
      act(() => {
        result = useScheduleStore.getState().scheduleCampaign('campaign-1', 'Test Campaign');
      });

      expect(result).not.toBeNull();
      expect(result!.campaignId).toBe('campaign-1');
      expect(result!.campaignName).toBe('Test Campaign');
      expect(result!.status).toBe('pending');
      expect(result!.timezone).toBe('UTC');

      const state = useScheduleStore.getState();
      expect(state.scheduledCampaigns).toHaveLength(1);
    });

    it('should set error when scheduling with invalid data', () => {
      act(() => {
        useScheduleStore.getState().setSendNow(false);
      });

      let result: ReturnType<typeof useScheduleStore.getState>['scheduledCampaigns'][0] | null = null;
      act(() => {
        result = useScheduleStore.getState().scheduleCampaign('campaign-1', 'Test Campaign');
      });

      expect(result).toBeNull();
      expect(useScheduleStore.getState().error).toBe('Please select a date');
    });

    it('should reschedule campaign', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      // Create initial schedule
      act(() => {
        const store = useScheduleStore.getState();
        store.setSendNow(false);
        store.setSelectedDate(futureDate);
        store.setSelectedTime('10:00');
        store.setSelectedTimezone('UTC');
        store.scheduleCampaign('campaign-1', 'Test Campaign');
      });

      const scheduleId = useScheduleStore.getState().scheduledCampaigns[0].id;
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 2);

      act(() => {
        useScheduleStore.getState().rescheduleCampaign(scheduleId, newDate, 'America/New_York');
      });

      const scheduled = useScheduleStore.getState().scheduledCampaigns[0];
      expect(scheduled.scheduledAt).toEqual(newDate);
      expect(scheduled.timezone).toBe('America/New_York');
      expect(scheduled.status).toBe('pending');
    });

    it('should cancel scheduled campaign', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      act(() => {
        const store = useScheduleStore.getState();
        store.setSendNow(false);
        store.setSelectedDate(futureDate);
        store.setSelectedTime('10:00');
        store.setSelectedTimezone('UTC');
        store.scheduleCampaign('campaign-1', 'Test Campaign');
      });

      const scheduleId = useScheduleStore.getState().scheduledCampaigns[0].id;

      act(() => {
        useScheduleStore.getState().cancelScheduledCampaign(scheduleId);
      });

      const scheduled = useScheduleStore.getState().scheduledCampaigns[0];
      expect(scheduled.status).toBe('cancelled');
    });

    it('should update schedule status', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      act(() => {
        const store = useScheduleStore.getState();
        store.setSendNow(false);
        store.setSelectedDate(futureDate);
        store.setSelectedTime('10:00');
        store.setSelectedTimezone('UTC');
        store.scheduleCampaign('campaign-1', 'Test Campaign');
      });

      const scheduleId = useScheduleStore.getState().scheduledCampaigns[0].id;

      act(() => {
        useScheduleStore.getState().updateScheduleStatus(scheduleId, 'executing');
      });
      expect(useScheduleStore.getState().scheduledCampaigns[0].status).toBe('executing');

      act(() => {
        useScheduleStore.getState().updateScheduleStatus(scheduleId, 'completed');
      });
      expect(useScheduleStore.getState().scheduledCampaigns[0].status).toBe('completed');

      act(() => {
        useScheduleStore.getState().updateScheduleStatus(scheduleId, 'failed', 'SMTP error');
      });
      const scheduled = useScheduleStore.getState().scheduledCampaigns[0];
      expect(scheduled.status).toBe('failed');
      expect(scheduled.error).toBe('SMTP error');
    });
  });

  describe('Utility Functions', () => {
    it('should clear error', () => {
      act(() => {
        useScheduleStore.setState({ error: 'Some error' });
      });
      expect(useScheduleStore.getState().error).toBe('Some error');

      act(() => {
        useScheduleStore.getState().clearError();
      });
      expect(useScheduleStore.getState().error).toBeNull();
    });

    it('should set loading state', () => {
      act(() => {
        useScheduleStore.getState().setLoading(true);
      });
      expect(useScheduleStore.getState().isLoading).toBe(true);

      act(() => {
        useScheduleStore.getState().setLoading(false);
      });
      expect(useScheduleStore.getState().isLoading).toBe(false);
    });

    it('should get scheduled datetime', () => {
      expect(useScheduleStore.getState().getScheduledDateTime()).toBeNull();

      const testDate = new Date('2025-01-15');
      act(() => {
        useScheduleStore.getState().setSelectedDate(testDate);
        useScheduleStore.getState().setSelectedTime('14:30');
      });

      const result = useScheduleStore.getState().getScheduledDateTime();
      expect(result).not.toBeNull();
      expect(result!.getHours()).toBe(14);
      expect(result!.getMinutes()).toBe(30);
    });

    it('should get scheduled datetime UTC', () => {
      expect(useScheduleStore.getState().getScheduledDateTimeUTC()).toBeNull();

      const testDate = new Date('2025-01-15');
      act(() => {
        useScheduleStore.getState().setSelectedDate(testDate);
        useScheduleStore.getState().setSelectedTime('14:30');
        useScheduleStore.getState().setSelectedTimezone('UTC');
      });

      const result = useScheduleStore.getState().getScheduledDateTimeUTC();
      expect(result).not.toBeNull();
    });
  });
});

describe('Timezone Utilities', () => {
  describe('TIMEZONES', () => {
    it('should have common timezones', () => {
      expect(TIMEZONES.length).toBeGreaterThan(0);
      expect(TIMEZONES.some((tz) => tz.id === 'UTC')).toBe(true);
      expect(TIMEZONES.some((tz) => tz.id === 'America/New_York')).toBe(true);
      expect(TIMEZONES.some((tz) => tz.id === 'Europe/London')).toBe(true);
      expect(TIMEZONES.some((tz) => tz.id === 'Asia/Tokyo')).toBe(true);
    });

    it('should have required fields for each timezone', () => {
      TIMEZONES.forEach((tz) => {
        expect(tz.id).toBeDefined();
        expect(tz.label).toBeDefined();
        expect(tz.offset).toBeDefined();
        expect(tz.region).toBeDefined();
      });
    });

    it('should have valid offset format', () => {
      TIMEZONES.forEach((tz) => {
        expect(tz.offset).toMatch(/^[+-]\d{2}:\d{2}$/);
      });
    });
  });

  describe('getLocalTimezone', () => {
    it('should return a string', () => {
      const result = getLocalTimezone();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('formatTimezoneDisplay', () => {
    it('should format known timezone', () => {
      const result = formatTimezoneDisplay('America/New_York');
      expect(result).toBe('Eastern Time (-05:00)');
    });

    it('should return id for unknown timezone', () => {
      const result = formatTimezoneDisplay('Unknown/Timezone');
      expect(result).toBe('Unknown/Timezone');
    });

    it('should format UTC', () => {
      const result = formatTimezoneDisplay('UTC');
      expect(result).toBe('UTC (+00:00)');
    });
  });

  describe('getTimeUntil', () => {
    it('should return null for past date', () => {
      const pastDate = new Date(Date.now() - 1000);
      const result = getTimeUntil(pastDate);
      expect(result).toBeNull();
    });

    it('should calculate time until future date', () => {
      const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000 + 30 * 60 * 1000);
      const result = getTimeUntil(futureDate);
      expect(result).not.toBeNull();
      expect(result!.days).toBe(2);
      expect(result!.hours).toBe(3);
      expect(result!.minutes).toBeGreaterThanOrEqual(29);
      expect(result!.minutes).toBeLessThanOrEqual(31);
    });

    it('should handle same day future time', () => {
      const futureDate = new Date(Date.now() + 45 * 60 * 1000);
      const result = getTimeUntil(futureDate);
      expect(result).not.toBeNull();
      expect(result!.days).toBe(0);
      expect(result!.hours).toBe(0);
      expect(result!.minutes).toBeGreaterThanOrEqual(44);
      expect(result!.minutes).toBeLessThanOrEqual(46);
    });
  });

  describe('formatScheduledDate', () => {
    it('should format date with timezone', () => {
      const date = new Date('2025-12-25T10:00:00Z');
      const result = formatScheduledDate(date, 'UTC');
      expect(result).toContain('2025');
      expect(result).toContain('December');
    });

    it('should handle invalid timezone gracefully', () => {
      const date = new Date('2025-12-25T10:00:00Z');
      const result = formatScheduledDate(date, 'Invalid/Timezone');
      // Should return ISO string or formatted date
      expect(result).toBeDefined();
    });
  });

  describe('toUTC', () => {
    it('should convert date to UTC', () => {
      const date = new Date('2025-01-15T10:00:00');
      const result = toUTC(date, 'UTC');
      expect(result).toBeInstanceOf(Date);
    });

    it('should handle invalid timezone gracefully', () => {
      const date = new Date('2025-01-15T10:00:00');
      const result = toUTC(date, 'Invalid/Timezone');
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('convertToTimezone', () => {
    it('should convert between timezones', () => {
      const date = new Date('2025-01-15T10:00:00Z');
      const result = convertToTimezone(date, 'UTC', 'America/New_York');
      expect(result).toBeInstanceOf(Date);
    });

    it('should handle invalid timezone gracefully', () => {
      const date = new Date('2025-01-15T10:00:00Z');
      const result = convertToTimezone(date, 'Invalid/From', 'Invalid/To');
      expect(result).toBeInstanceOf(Date);
    });
  });
});

describe('Multiple Scheduled Campaigns', () => {
  beforeEach(() => {
    act(() => {
      useScheduleStore.setState({
        selectedDate: null,
        selectedTime: '09:00',
        selectedTimezone: 'UTC',
        sendNow: true,
        scheduledCampaigns: [],
        isLoading: false,
        error: null,
      });
    });
  });

  it('should handle multiple scheduled campaigns', () => {
    const futureDate1 = new Date();
    futureDate1.setDate(futureDate1.getDate() + 1);
    const futureDate2 = new Date();
    futureDate2.setDate(futureDate2.getDate() + 2);

    // Schedule first campaign
    act(() => {
      const store = useScheduleStore.getState();
      store.setSendNow(false);
      store.setSelectedDate(futureDate1);
      store.setSelectedTime('10:00');
      store.scheduleCampaign('campaign-1', 'Campaign 1');
    });

    // Schedule second campaign
    act(() => {
      const store = useScheduleStore.getState();
      store.setSelectedDate(futureDate2);
      store.setSelectedTime('14:00');
      store.scheduleCampaign('campaign-2', 'Campaign 2');
    });

    const campaigns = useScheduleStore.getState().scheduledCampaigns;
    expect(campaigns).toHaveLength(2);
    expect(campaigns[0].campaignName).toBe('Campaign 1');
    expect(campaigns[1].campaignName).toBe('Campaign 2');
  });

  it('should update correct campaign when multiple exist', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    // Create two campaigns
    act(() => {
      const store = useScheduleStore.getState();
      store.setSendNow(false);
      store.setSelectedDate(futureDate);
      store.setSelectedTime('10:00');
      store.scheduleCampaign('campaign-1', 'Campaign 1');
      store.scheduleCampaign('campaign-2', 'Campaign 2');
    });

    const campaigns = useScheduleStore.getState().scheduledCampaigns;
    const secondCampaignId = campaigns[1].id;

    // Cancel only second campaign
    act(() => {
      useScheduleStore.getState().cancelScheduledCampaign(secondCampaignId);
    });

    const updatedCampaigns = useScheduleStore.getState().scheduledCampaigns;
    expect(updatedCampaigns[0].status).toBe('pending');
    expect(updatedCampaigns[1].status).toBe('cancelled');
  });
});
