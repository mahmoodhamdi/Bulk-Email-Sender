'use client';

import { cn } from '@/lib/utils';
import { usePreviewStore, type SpamAnalysis, type SpamIssue } from '@/stores/preview-store';
import { useTranslations } from 'next-intl';

interface SpamScoreGaugeProps {
  score: number;
  rating: SpamAnalysis['rating'];
}

function SpamScoreGauge({ score, rating }: SpamScoreGaugeProps) {
  const t = useTranslations('preview');

  const colors = {
    excellent: 'text-green-500',
    good: 'text-blue-500',
    fair: 'text-yellow-500',
    poor: 'text-red-500',
  };

  const bgColors = {
    excellent: 'bg-green-100 dark:bg-green-900/30',
    good: 'bg-blue-100 dark:bg-blue-900/30',
    fair: 'bg-yellow-100 dark:bg-yellow-900/30',
    poor: 'bg-red-100 dark:bg-red-900/30',
  };

  const strokeColors = {
    excellent: '#22c55e',
    good: '#3b82f6',
    fair: '#eab308',
    poor: '#ef4444',
  };

  // Calculate the stroke dash offset for the gauge
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 transform -rotate-90">
          <circle cx="56" cy="56" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-200 dark:text-gray-700" />
          <circle
            cx="56"
            cy="56"
            r="40"
            stroke={strokeColors[rating]}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-2xl font-bold', colors[rating])}>{100 - score}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">/100</span>
        </div>
      </div>
      <div className={cn('mt-2 px-3 py-1 rounded-full text-sm font-medium', bgColors[rating], colors[rating])}>
        {t(`spamRating.${rating}`)}
      </div>
    </div>
  );
}

interface IssueItemProps {
  issue: SpamIssue;
}

function IssueItem({ issue }: IssueItemProps) {
  const icons = {
    error: (
      <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const bgColors = {
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  };

  return (
    <div className={cn('p-3 rounded-lg border', bgColors[issue.type])}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icons[issue.type]}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{issue.message}</p>
          {issue.suggestion && <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{issue.suggestion}</p>}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wider">{issue.category}</span>
      </div>
    </div>
  );
}

export function SpamScoreCard() {
  const t = useTranslations('preview');
  const { spamAnalysis, isAnalyzing, analyzeSpam } = usePreviewStore();

  if (!spamAnalysis && !isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{t('spamCheck')}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('spamCheckDescription')}</p>
        <button
          onClick={analyzeSpam}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          {t('analyzeSpam')}
        </button>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('analyzing')}</p>
      </div>
    );
  }

  if (!spamAnalysis) return null;

  const errorCount = spamAnalysis.issues.filter((i) => i.type === 'error').length;
  const warningCount = spamAnalysis.issues.filter((i) => i.type === 'warning').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SpamScoreGauge score={spamAnalysis.score} rating={spamAnalysis.rating} />
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-4 text-sm">
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {errorCount} {t('errors')}
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1 text-yellow-500">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {warningCount} {t('warnings')}
              </span>
            )}
          </div>
          <button
            onClick={analyzeSpam}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            {t('reanalyze')}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('issues')}</h4>
        {spamAnalysis.issues.map((issue, index) => (
          <IssueItem key={index} issue={issue} />
        ))}
      </div>
    </div>
  );
}
