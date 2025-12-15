'use client';

import React, { useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Calendar, Clock, Globe, AlertCircle, CheckCircle2, Timer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  useScheduleStore,
  TIMEZONES,
  formatScheduledDate,
  getTimeUntil,
  getLocalTimezone,
} from '@/stores/schedule-store';
import { formatTimezoneOffset } from '@/lib/timezone';
import { cn } from '@/lib/utils';

interface ScheduleSelectorProps {
  className?: string;
  showCountdown?: boolean;
  onScheduleChange?: (sendNow: boolean, scheduledAt: Date | null, timezone: string) => void;
}

export function ScheduleSelector({ className, showCountdown = true, onScheduleChange }: ScheduleSelectorProps) {
  const t = useTranslations('schedule');
  const {
    selectedDate,
    selectedTime,
    selectedTimezone,
    sendNow,
    error,
    setSelectedDate,
    setSelectedTime,
    setSelectedTimezone,
    setSendNow,
    validateSchedule,
    getScheduledDateTimeUTC,
    clearError,
  } = useScheduleStore();

  // Group timezones by region
  const groupedTimezones = useMemo(() => {
    const groups: Record<string, typeof TIMEZONES> = {};
    TIMEZONES.forEach((tz) => {
      if (!groups[tz.region]) {
        groups[tz.region] = [];
      }
      groups[tz.region].push(tz);
    });
    return groups;
  }, []);

  // Calculate time until send
  const timeUntil = useMemo(() => {
    if (sendNow || !selectedDate) return null;
    const scheduledUTC = getScheduledDateTimeUTC();
    if (!scheduledUTC) return null;
    return getTimeUntil(scheduledUTC);
  }, [sendNow, selectedDate, selectedTime, selectedTimezone, getScheduledDateTimeUTC]);

  // Validation state
  const validation = useMemo(() => validateSchedule(), [sendNow, selectedDate, selectedTime, selectedTimezone, validateSchedule]);

  // Notify parent of changes
  useEffect(() => {
    if (onScheduleChange) {
      const scheduledAt = sendNow ? null : getScheduledDateTimeUTC();
      onScheduleChange(sendNow, scheduledAt, selectedTimezone);
    }
  }, [sendNow, selectedDate, selectedTime, selectedTimezone, onScheduleChange, getScheduledDateTimeUTC]);

  // Format date for input
  const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  // Get min date (today)
  const minDate = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearError();
    const value = e.target.value;
    if (value) {
      setSelectedDate(new Date(value + 'T00:00:00'));
    } else {
      setSelectedDate(null);
    }
  };

  // Handle time change
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearError();
    setSelectedTime(e.target.value);
  };

  // Handle timezone change
  const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    clearError();
    setSelectedTimezone(e.target.value);
  };

  // Detect local timezone on mount
  useEffect(() => {
    const localTz = getLocalTimezone();
    const isKnownTz = TIMEZONES.some((tz) => tz.id === localTz);
    if (isKnownTz && !selectedTimezone) {
      setSelectedTimezone(localTz);
    }
  }, [selectedTimezone, setSelectedTimezone]);

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('selectWhen')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Send Now / Schedule Toggle */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant={sendNow ? 'default' : 'outline'}
            className={cn('flex-1 h-auto py-4 flex flex-col items-center gap-2', sendNow && 'ring-2 ring-primary')}
            onClick={() => {
              setSendNow(true);
              clearError();
            }}
          >
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">{t('sendNow')}</span>
            <span className="text-xs text-muted-foreground">{t('sendNowDesc')}</span>
          </Button>

          <Button
            type="button"
            variant={!sendNow ? 'default' : 'outline'}
            className={cn('flex-1 h-auto py-4 flex flex-col items-center gap-2', !sendNow && 'ring-2 ring-primary')}
            onClick={() => {
              setSendNow(false);
              clearError();
            }}
          >
            <Timer className="h-5 w-5" />
            <span className="font-medium">{t('sendLater')}</span>
            <span className="text-xs text-muted-foreground">{t('sendLaterDesc')}</span>
          </Button>
        </div>

        {/* Schedule Options */}
        {!sendNow && (
          <div className="space-y-4 pt-4 border-t">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label htmlFor="schedule-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t('date')}
              </Label>
              <Input
                id="schedule-date"
                type="date"
                value={formatDateForInput(selectedDate)}
                onChange={handleDateChange}
                min={minDate}
                className="w-full"
              />
            </div>

            {/* Time Picker */}
            <div className="space-y-2">
              <Label htmlFor="schedule-time" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('time')}
              </Label>
              <Input id="schedule-time" type="time" value={selectedTime} onChange={handleTimeChange} className="w-full" />
            </div>

            {/* Timezone Selector */}
            <div className="space-y-2">
              <Label htmlFor="schedule-timezone" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                {t('timezone')}
              </Label>
              <select
                id="schedule-timezone"
                value={selectedTimezone}
                onChange={handleTimezoneChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {Object.entries(groupedTimezones).map(([region, timezones]) => (
                  <optgroup key={region} label={region}>
                    {timezones.map((tz) => (
                      <option key={tz.id} value={tz.id}>
                        {tz.label} ({formatTimezoneOffset(tz.id)})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Scheduled Time Display */}
            {selectedDate && validation.valid && (
              <div className="rounded-lg bg-muted p-4">
                <div className="text-sm font-medium text-muted-foreground mb-1">{t('scheduledFor')}</div>
                <div className="text-lg font-semibold">
                  {formatScheduledDate(
                    new Date(selectedDate.toISOString().split('T')[0] + 'T' + selectedTime + ':00'),
                    selectedTimezone
                  )}
                </div>

                {/* Countdown */}
                {showCountdown && timeUntil && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Timer className="h-4 w-4" />
                    <span>
                      {t('countdown')}:{' '}
                      {timeUntil.days > 0 && `${timeUntil.days} ${t('days')} `}
                      {timeUntil.hours > 0 && `${timeUntil.hours} ${t('hours')} `}
                      {timeUntil.minutes} {t('minutes')}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Error Display */}
            {(error || (!validation.valid && !sendNow && selectedDate)) && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{error || validation.error}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for inline use
export function ScheduleSelectorInline({
  className,
  onScheduleChange,
}: {
  className?: string;
  onScheduleChange?: (sendNow: boolean, scheduledAt: Date | null, timezone: string) => void;
}) {
  const t = useTranslations('schedule');
  const {
    selectedDate,
    selectedTime,
    selectedTimezone,
    sendNow,
    error,
    setSelectedDate,
    setSelectedTime,
    setSelectedTimezone,
    setSendNow,
    validateSchedule,
    getScheduledDateTimeUTC,
    clearError,
  } = useScheduleStore();

  const validation = useMemo(() => validateSchedule(), [sendNow, selectedDate, selectedTime, selectedTimezone, validateSchedule]);

  // Notify parent of changes
  useEffect(() => {
    if (onScheduleChange) {
      const scheduledAt = sendNow ? null : getScheduledDateTimeUTC();
      onScheduleChange(sendNow, scheduledAt, selectedTimezone);
    }
  }, [sendNow, selectedDate, selectedTime, selectedTimezone, onScheduleChange, getScheduledDateTimeUTC]);

  const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const minDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toggle Buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={sendNow ? 'default' : 'outline'}
          onClick={() => {
            setSendNow(true);
            clearError();
          }}
        >
          {t('sendNow')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={!sendNow ? 'default' : 'outline'}
          onClick={() => {
            setSendNow(false);
            clearError();
          }}
        >
          {t('sendLater')}
        </Button>
      </div>

      {/* Schedule Inputs */}
      {!sendNow && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            type="date"
            value={formatDateForInput(selectedDate)}
            onChange={(e) => {
              clearError();
              setSelectedDate(e.target.value ? new Date(e.target.value + 'T00:00:00') : null);
            }}
            min={minDate}
            placeholder={t('selectDate')}
          />
          <Input
            type="time"
            value={selectedTime}
            onChange={(e) => {
              clearError();
              setSelectedTime(e.target.value);
            }}
          />
          <select
            value={selectedTimezone}
            onChange={(e) => {
              clearError();
              setSelectedTimezone(e.target.value);
            }}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.id} value={tz.id}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Error */}
      {(error || (!validation.valid && !sendNow && selectedDate)) && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error || validation.error}
        </p>
      )}
    </div>
  );
}

// Schedule Summary Component
export function ScheduleSummary({ className }: { className?: string }) {
  const t = useTranslations('schedule');
  const { sendNow, selectedDate, selectedTime, selectedTimezone, getScheduledDateTimeUTC } = useScheduleStore();

  const timeUntil = useMemo(() => {
    if (sendNow || !selectedDate) return null;
    const scheduledUTC = getScheduledDateTimeUTC();
    if (!scheduledUTC) return null;
    return getTimeUntil(scheduledUTC);
  }, [sendNow, selectedDate, selectedTime, selectedTimezone, getScheduledDateTimeUTC]);

  if (sendNow) {
    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <span>{t('sendingImmediately')}</span>
      </div>
    );
  }

  if (!selectedDate) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <Calendar className="h-4 w-4" />
        <span>{t('noScheduleSet')}</span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center gap-2 text-sm">
        <Calendar className="h-4 w-4 text-blue-500" />
        <span className="font-medium">
          {formatScheduledDate(new Date(selectedDate.toISOString().split('T')[0] + 'T' + selectedTime + ':00'), selectedTimezone)}
        </span>
      </div>
      {timeUntil && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Timer className="h-3 w-3" />
          <span>
            {t('countdown')}:{' '}
            {timeUntil.days > 0 && `${timeUntil.days}d `}
            {timeUntil.hours > 0 && `${timeUntil.hours}h `}
            {timeUntil.minutes}m
          </span>
        </div>
      )}
    </div>
  );
}

export default ScheduleSelector;
