'use client';

import { cn } from '@/lib/utils';
import { useUnsubscribeStore, type UnsubscribeReason } from '@/stores/unsubscribe-store';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface UnsubscribeFormProps {
  email?: string;
  campaignName?: string;
  onComplete?: () => void;
  className?: string;
}

export function UnsubscribeForm({ email, campaignName, onComplete, className }: UnsubscribeFormProps) {
  const t = useTranslations('unsubscribe');
  const { addToSuppression, isEmailSuppressed, error, clearError } = useUnsubscribeStore();

  const [step, setStep] = useState<'confirm' | 'feedback' | 'success'>('confirm');
  const [selectedReason, setSelectedReason] = useState<UnsubscribeReason>('not_interested');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reasons: { id: UnsubscribeReason; label: string }[] = [
    { id: 'not_interested', label: t('reasons.notInterested') },
    { id: 'too_frequent', label: t('reasons.tooFrequent') },
    { id: 'never_subscribed', label: t('reasons.neverSubscribed') },
    { id: 'inappropriate_content', label: t('reasons.inappropriateContent') },
    { id: 'other', label: t('reasons.other') },
  ];

  const handleConfirm = () => {
    setStep('feedback');
  };

  const handleSubmit = async () => {
    if (!email) return;

    setIsSubmitting(true);
    clearError();

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    addToSuppression(email, selectedReason, 'link', feedback || undefined);
    setIsSubmitting(false);

    if (!error) {
      setStep('success');
      onComplete?.();
    }
  };

  const handleSkipFeedback = async () => {
    if (!email) return;

    setIsSubmitting(true);
    clearError();

    await new Promise((resolve) => setTimeout(resolve, 500));

    addToSuppression(email, 'not_interested', 'link');
    setIsSubmitting(false);

    if (!error) {
      setStep('success');
      onComplete?.();
    }
  };

  // Check if already unsubscribed
  if (email && isEmailSuppressed(email)) {
    return (
      <div className={cn('text-center p-8', className)}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {t('alreadyUnsubscribed')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('alreadyUnsubscribedDesc')}
        </p>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className={cn('text-center p-8', className)}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {t('successTitle')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {t('successMessage')}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          {t('resubscribeHint')}
        </p>
      </div>
    );
  }

  if (step === 'feedback') {
    return (
      <div className={cn('p-6', className)}>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {t('feedbackTitle')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {t('feedbackDescription')}
        </p>

        {/* Reason selection */}
        <div className="space-y-3 mb-6">
          {reasons.map((reason) => (
            <label
              key={reason.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                selectedReason === reason.id
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
              )}
            >
              <input
                type="radio"
                name="reason"
                value={reason.id}
                checked={selectedReason === reason.id}
                onChange={() => setSelectedReason(reason.id)}
                className="w-4 h-4 text-primary"
              />
              <span className="text-gray-700 dark:text-gray-300">{reason.label}</span>
            </label>
          ))}
        </div>

        {/* Additional feedback */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('additionalFeedback')}
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={t('feedbackPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
            rows={3}
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 mb-4">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSkipFeedback}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {t('skip')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? t('submitting') : t('submit')}
          </button>
        </div>
      </div>
    );
  }

  // Confirm step
  return (
    <div className={cn('p-6 text-center', className)}>
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {t('confirmTitle')}
      </h2>

      {email && (
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          {email}
        </p>
      )}

      {campaignName && (
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
          {t('fromCampaign', { name: campaignName })}
        </p>
      )}

      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {t('confirmMessage')}
      </p>

      <button
        onClick={handleConfirm}
        className="w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
      >
        {t('confirmButton')}
      </button>

      <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
        {t('accidentalClick')}
      </p>
    </div>
  );
}
