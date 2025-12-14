'use client';

import { cn } from '@/lib/utils';
import { usePreviewStore } from '@/stores/preview-store';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export function TestSendDialog() {
  const t = useTranslations('preview');
  const { testEmails, testSending, testResults, addTestEmail, removeTestEmail, sendTestEmail, clearTestResults } =
    usePreviewStore();
  const [inputEmail, setInputEmail] = useState('');
  const [inputError, setInputError] = useState('');

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleAddEmail = () => {
    if (!inputEmail.trim()) {
      setInputError(t('emailRequired'));
      return;
    }
    if (!validateEmail(inputEmail)) {
      setInputError(t('invalidEmail'));
      return;
    }
    if (testEmails.includes(inputEmail)) {
      setInputError(t('emailAlreadyAdded'));
      return;
    }
    if (testEmails.length >= 5) {
      setInputError(t('maxEmailsReached'));
      return;
    }

    addTestEmail(inputEmail);
    setInputEmail('');
    setInputError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const handleSend = async () => {
    await sendTestEmail();
  };

  return (
    <div className="space-y-6">
      {/* Email Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('testEmailAddresses')}</label>
        <div className="flex gap-2">
          <input
            type="email"
            value={inputEmail}
            onChange={(e) => {
              setInputEmail(e.target.value);
              setInputError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('enterEmail')}
            className={cn(
              'flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
              inputError
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 dark:border-gray-600 focus:ring-primary'
            )}
            disabled={testSending}
          />
          <button
            onClick={handleAddEmail}
            disabled={testSending || testEmails.length >= 5}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
          >
            {t('add')}
          </button>
        </div>
        {inputError && <p className="text-sm text-red-500">{inputError}</p>}
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('maxTestEmails', { max: 5 })}</p>
      </div>

      {/* Email List */}
      {testEmails.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('recipients')}</h4>
          <div className="flex flex-wrap gap-2">
            {testEmails.map((email) => (
              <div
                key={email}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
              >
                <span className="text-gray-700 dark:text-gray-300">{email}</span>
                <button
                  onClick={() => removeTestEmail(email)}
                  disabled={testSending}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send Button */}
      <button
        onClick={handleSend}
        disabled={testEmails.length === 0 || testSending}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors',
          testEmails.length === 0 || testSending
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
            : 'bg-primary text-white hover:bg-primary/90'
        )}
      >
        {testSending ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {t('sending')}
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            {t('sendTestEmail')}
          </>
        )}
      </button>

      {/* Results */}
      {testResults.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('testResults')}</h4>
            <button onClick={clearTestResults} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              {t('clear')}
            </button>
          </div>
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  result.success
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                )}
              >
                <div className="flex items-center gap-3">
                  {result.success ? (
                    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{result.recipient}</p>
                    {result.error && <p className="text-xs text-red-500">{result.error}</p>}
                    {result.messageId && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">ID: {result.messageId}</p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {result.sentAt.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
