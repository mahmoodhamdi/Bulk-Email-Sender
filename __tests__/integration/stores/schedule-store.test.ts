import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import {
  useScheduleStore,
  getLocalTimezone,
  TIMEZONES,
} from '@/stores/schedule-store';

describe('Schedule Store Integration', () => {
  beforeEach(() => {
    // Reset to clean state
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

  describe('Full Scheduling Workflow', () => {
    it('should complete a full scheduling workflow', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      // Step 1: User decides to schedule instead of send now
      act(() => {
        useScheduleStore.getState().setSendNow(false);
      });
      expect(useScheduleStore.getState().sendNow).toBe(false);

      // Step 2: Validation should fail (no date selected)
      let validation = useScheduleStore.getState().validateSchedule();
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Please select a date');

      // Step 3: User selects a date
      act(() => {
        useScheduleStore.getState().setSelectedDate(futureDate);
      });
      expect(useScheduleStore.getState().selectedDate).toEqual(futureDate);

      // Step 4: User selects a time
      act(() => {
        useScheduleStore.getState().setSelectedTime('14:30');
      });
      expect(useScheduleStore.getState().selectedTime).toBe('14:30');

      // Step 5: User selects a timezone
      act(() => {
        useScheduleStore.getState().setSelectedTimezone('America/New_York');
      });
      expect(useScheduleStore.getState().selectedTimezone).toBe('America/New_York');

      // Step 6: Validation should pass
      validation = useScheduleStore.getState().validateSchedule();
      expect(validation.valid).toBe(true);

      // Step 7: Schedule the campaign
      let scheduled: ReturnType<typeof useScheduleStore.getState>['scheduledCampaigns'][0] | null = null;
      act(() => {
        scheduled = useScheduleStore.getState().scheduleCampaign('campaign-123', 'Marketing Newsletter');
      });

      expect(scheduled).not.toBeNull();
      expect(scheduled!.campaignId).toBe('campaign-123');
      expect(scheduled!.campaignName).toBe('Marketing Newsletter');
      expect(scheduled!.status).toBe('pending');
      expect(scheduled!.timezone).toBe('America/New_York');

      // Step 8: Verify campaign is in list
      const campaigns = useScheduleStore.getState().scheduledCampaigns;
      expect(campaigns).toHaveLength(1);
    });

    it('should handle rescheduling workflow', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      // Schedule initial campaign
      act(() => {
        const store = useScheduleStore.getState();
        store.setSendNow(false);
        store.setSelectedDate(futureDate);
        store.setSelectedTime('10:00');
        store.setSelectedTimezone('UTC');
        store.scheduleCampaign('campaign-1', 'Initial Campaign');
      });

      const scheduleId = useScheduleStore.getState().scheduledCampaigns[0].id;
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 14);

      // Reschedule to new date and timezone
      act(() => {
        useScheduleStore.getState().rescheduleCampaign(scheduleId, newDate, 'Europe/London');
      });

      const rescheduled = useScheduleStore.getState().scheduledCampaigns[0];
      expect(rescheduled.scheduledAt).toEqual(newDate);
      expect(rescheduled.timezone).toBe('Europe/London');
      expect(rescheduled.status).toBe('pending');
      expect(rescheduled.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle cancellation workflow', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);

      // Schedule campaign
      act(() => {
        const store = useScheduleStore.getState();
        store.setSendNow(false);
        store.setSelectedDate(futureDate);
        store.setSelectedTime('09:00');
        store.setSelectedTimezone('Asia/Tokyo');
        store.scheduleCampaign('campaign-to-cancel', 'Will Be Cancelled');
      });

      expect(useScheduleStore.getState().scheduledCampaigns[0].status).toBe('pending');

      // Cancel the campaign
      const scheduleId = useScheduleStore.getState().scheduledCampaigns[0].id;
      act(() => {
        useScheduleStore.getState().cancelScheduledCampaign(scheduleId);
      });

      const cancelled = useScheduleStore.getState().scheduledCampaigns[0];
      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.campaignName).toBe('Will Be Cancelled');
    });
  });

  describe('Campaign Status Lifecycle', () => {
    it('should transition through all status states', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      // Create scheduled campaign
      act(() => {
        const store = useScheduleStore.getState();
        store.setSendNow(false);
        store.setSelectedDate(futureDate);
        store.setSelectedTime('10:00');
        store.setSelectedTimezone('UTC');
        store.scheduleCampaign('lifecycle-test', 'Lifecycle Test');
      });

      const scheduleId = useScheduleStore.getState().scheduledCampaigns[0].id;

      // Verify initial status
      expect(useScheduleStore.getState().scheduledCampaigns[0].status).toBe('pending');

      // Transition to executing (when send time arrives)
      act(() => {
        useScheduleStore.getState().updateScheduleStatus(scheduleId, 'executing');
      });
      expect(useScheduleStore.getState().scheduledCampaigns[0].status).toBe('executing');

      // Transition to completed
      act(() => {
        useScheduleStore.getState().updateScheduleStatus(scheduleId, 'completed');
      });
      expect(useScheduleStore.getState().scheduledCampaigns[0].status).toBe('completed');
    });

    it('should handle failed status with error message', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      act(() => {
        const store = useScheduleStore.getState();
        store.setSendNow(false);
        store.setSelectedDate(futureDate);
        store.setSelectedTime('10:00');
        store.setSelectedTimezone('UTC');
        store.scheduleCampaign('will-fail', 'Will Fail');
      });

      const scheduleId = useScheduleStore.getState().scheduledCampaigns[0].id;

      // Transition to executing
      act(() => {
        useScheduleStore.getState().updateScheduleStatus(scheduleId, 'executing');
      });

      // Fail with error
      act(() => {
        useScheduleStore.getState().updateScheduleStatus(scheduleId, 'failed', 'SMTP connection failed');
      });

      const failed = useScheduleStore.getState().scheduledCampaigns[0];
      expect(failed.status).toBe('failed');
      expect(failed.error).toBe('SMTP connection failed');
    });
  });

  describe('Multiple Campaigns Management', () => {
    it('should manage multiple campaigns independently', () => {
      const dates = [
        new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      ];

      // Schedule three campaigns
      dates.forEach((date, index) => {
        act(() => {
          const store = useScheduleStore.getState();
          store.setSendNow(false);
          store.setSelectedDate(date);
          store.setSelectedTime(`${10 + index}:00`);
          store.setSelectedTimezone('UTC');
          store.scheduleCampaign(`campaign-${index + 1}`, `Campaign ${index + 1}`);
        });
      });

      expect(useScheduleStore.getState().scheduledCampaigns).toHaveLength(3);

      // Update second campaign to executing
      const campaigns = useScheduleStore.getState().scheduledCampaigns;
      act(() => {
        useScheduleStore.getState().updateScheduleStatus(campaigns[1].id, 'executing');
      });

      // Verify other campaigns unchanged
      const updatedCampaigns = useScheduleStore.getState().scheduledCampaigns;
      expect(updatedCampaigns[0].status).toBe('pending');
      expect(updatedCampaigns[1].status).toBe('executing');
      expect(updatedCampaigns[2].status).toBe('pending');

      // Complete first campaign
      act(() => {
        useScheduleStore.getState().updateScheduleStatus(campaigns[0].id, 'completed');
      });

      // Cancel third campaign
      act(() => {
        useScheduleStore.getState().cancelScheduledCampaign(campaigns[2].id);
      });

      const finalCampaigns = useScheduleStore.getState().scheduledCampaigns;
      expect(finalCampaigns[0].status).toBe('completed');
      expect(finalCampaigns[1].status).toBe('executing');
      expect(finalCampaigns[2].status).toBe('cancelled');
    });

    it('should preserve campaign data through status changes', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      act(() => {
        const store = useScheduleStore.getState();
        store.setSendNow(false);
        store.setSelectedDate(futureDate);
        store.setSelectedTime('15:00');
        store.setSelectedTimezone('America/Los_Angeles');
        store.scheduleCampaign('preserve-test', 'Important Campaign');
      });

      const initial = useScheduleStore.getState().scheduledCampaigns[0];
      const { id, campaignId, campaignName, timezone, createdAt } = initial;

      // Go through status changes
      act(() => {
        useScheduleStore.getState().updateScheduleStatus(id, 'executing');
      });
      act(() => {
        useScheduleStore.getState().updateScheduleStatus(id, 'completed');
      });

      const final = useScheduleStore.getState().scheduledCampaigns[0];
      expect(final.id).toBe(id);
      expect(final.campaignId).toBe(campaignId);
      expect(final.campaignName).toBe(campaignName);
      expect(final.timezone).toBe(timezone);
      expect(final.createdAt).toEqual(createdAt);
      expect(final.status).toBe('completed');
      expect(final.updatedAt.getTime()).toBeGreaterThan(createdAt.getTime());
    });
  });

  describe('Timezone Handling', () => {
    it('should work with all common timezones', () => {
      const commonTimezones = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney'];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      commonTimezones.forEach((tz, index) => {
        act(() => {
          const store = useScheduleStore.getState();
          store.setSendNow(false);
          store.setSelectedDate(futureDate);
          store.setSelectedTime('10:00');
          store.setSelectedTimezone(tz);
          store.scheduleCampaign(`tz-campaign-${index}`, `Campaign in ${tz}`);
        });
      });

      const campaigns = useScheduleStore.getState().scheduledCampaigns;
      expect(campaigns).toHaveLength(5);

      campaigns.forEach((campaign, index) => {
        expect(campaign.timezone).toBe(commonTimezones[index]);
      });
    });

    it('should preserve timezone through reschedule', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      act(() => {
        const store = useScheduleStore.getState();
        store.setSendNow(false);
        store.setSelectedDate(futureDate);
        store.setSelectedTime('10:00');
        store.setSelectedTimezone('America/Chicago');
        store.scheduleCampaign('tz-preserve', 'Timezone Test');
      });

      const scheduleId = useScheduleStore.getState().scheduledCampaigns[0].id;
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 7);

      // Reschedule with different timezone
      act(() => {
        useScheduleStore.getState().rescheduleCampaign(scheduleId, newDate, 'Asia/Singapore');
      });

      const rescheduled = useScheduleStore.getState().scheduledCampaigns[0];
      expect(rescheduled.timezone).toBe('Asia/Singapore');
      expect(rescheduled.scheduledAt).toEqual(newDate);
    });
  });

  describe('Error Handling', () => {
    it('should set error when validation fails', () => {
      act(() => {
        useScheduleStore.getState().setSendNow(false);
      });

      act(() => {
        useScheduleStore.getState().scheduleCampaign('error-test', 'Error Test');
      });

      expect(useScheduleStore.getState().error).toBe('Please select a date');
    });

    it('should clear error on successful scheduling', () => {
      // First fail to trigger error
      act(() => {
        useScheduleStore.getState().setSendNow(false);
        useScheduleStore.getState().scheduleCampaign('error-test', 'Error Test');
      });
      expect(useScheduleStore.getState().error).toBe('Please select a date');

      // Then succeed
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      act(() => {
        useScheduleStore.getState().setSelectedDate(futureDate);
        useScheduleStore.getState().setSelectedTime('10:00');
        useScheduleStore.getState().setSelectedTimezone('UTC');
        useScheduleStore.getState().scheduleCampaign('success-test', 'Success Test');
      });

      expect(useScheduleStore.getState().error).toBeNull();
    });

    it('should clear error manually', () => {
      act(() => {
        useScheduleStore.setState({ error: 'Test error' });
      });
      expect(useScheduleStore.getState().error).toBe('Test error');

      act(() => {
        useScheduleStore.getState().clearError();
      });
      expect(useScheduleStore.getState().error).toBeNull();
    });
  });

  describe('Form Reset', () => {
    it('should reset form state completely', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      // Set up complex state
      act(() => {
        const store = useScheduleStore.getState();
        store.setSendNow(false);
        store.setSelectedDate(futureDate);
        store.setSelectedTime('23:45');
        store.setSelectedTimezone('Pacific/Auckland');
        store.scheduleCampaign('before-reset', 'Before Reset');
      });

      expect(useScheduleStore.getState().sendNow).toBe(false);
      expect(useScheduleStore.getState().selectedDate).toEqual(futureDate);
      expect(useScheduleStore.getState().selectedTime).toBe('23:45');
      expect(useScheduleStore.getState().selectedTimezone).toBe('Pacific/Auckland');
      expect(useScheduleStore.getState().scheduledCampaigns).toHaveLength(1);

      // Reset form
      act(() => {
        useScheduleStore.getState().resetScheduleForm();
      });

      // Verify form is reset
      expect(useScheduleStore.getState().sendNow).toBe(true);
      expect(useScheduleStore.getState().selectedDate).toBeNull();
      expect(useScheduleStore.getState().selectedTime).toBe('09:00');
      expect(useScheduleStore.getState().error).toBeNull();

      // But scheduled campaigns should remain
      expect(useScheduleStore.getState().scheduledCampaigns).toHaveLength(1);
    });
  });

  describe('DateTime Calculations', () => {
    it('should correctly calculate scheduled datetime', () => {
      const testDate = new Date('2025-06-15');

      act(() => {
        const store = useScheduleStore.getState();
        store.setSelectedDate(testDate);
        store.setSelectedTime('14:30');
        store.setSelectedTimezone('UTC');
      });

      const scheduledDateTime = useScheduleStore.getState().getScheduledDateTime();
      expect(scheduledDateTime).not.toBeNull();
      expect(scheduledDateTime!.getHours()).toBe(14);
      expect(scheduledDateTime!.getMinutes()).toBe(30);
    });

    it('should handle midnight time correctly', () => {
      const testDate = new Date('2025-06-15');

      act(() => {
        const store = useScheduleStore.getState();
        store.setSelectedDate(testDate);
        store.setSelectedTime('00:00');
        store.setSelectedTimezone('UTC');
      });

      const scheduledDateTime = useScheduleStore.getState().getScheduledDateTime();
      expect(scheduledDateTime).not.toBeNull();
      expect(scheduledDateTime!.getHours()).toBe(0);
      expect(scheduledDateTime!.getMinutes()).toBe(0);
    });

    it('should handle end of day time correctly', () => {
      const testDate = new Date('2025-06-15');

      act(() => {
        const store = useScheduleStore.getState();
        store.setSelectedDate(testDate);
        store.setSelectedTime('23:59');
        store.setSelectedTimezone('UTC');
      });

      const scheduledDateTime = useScheduleStore.getState().getScheduledDateTime();
      expect(scheduledDateTime).not.toBeNull();
      expect(scheduledDateTime!.getHours()).toBe(23);
      expect(scheduledDateTime!.getMinutes()).toBe(59);
    });
  });

  describe('Validation Edge Cases', () => {
    it('should validate time well into the future', () => {
      // Schedule for tomorrow to avoid any edge case timing issues
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      act(() => {
        const store = useScheduleStore.getState();
        store.setSendNow(false);
        store.setSelectedDate(tomorrow);
        store.setSelectedTime('10:00');
        store.setSelectedTimezone('UTC');
      });

      const validation = useScheduleStore.getState().validateSchedule();
      expect(validation.valid).toBe(true);
    });

    it('should reject schedule in the past', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      act(() => {
        const store = useScheduleStore.getState();
        store.setSendNow(false);
        store.setSelectedDate(yesterday);
        store.setSelectedTime('10:00');
        store.setSelectedTimezone('UTC');
      });

      const validation = useScheduleStore.getState().validateSchedule();
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Cannot schedule in the past');
    });
  });
});
