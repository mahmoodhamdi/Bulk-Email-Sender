'use client';

import { useReputationStore, ReputationLevel } from '@/stores/reputation-store';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

const ScoreGauge = ({ score, size = 'large' }: { score: number; size?: 'small' | 'large' }) => {
  const getColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 75) return 'text-blue-500';
    if (score >= 50) return 'text-yellow-500';
    if (score >= 25) return 'text-orange-500';
    return 'text-red-500';
  };

  const radius = size === 'large' ? 80 : 40;
  const strokeWidth = size === 'large' ? 12 : 6;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className={`relative ${size === 'large' ? 'w-48 h-48' : 'w-24 h-24'}`}>
      <svg className="transform -rotate-90" viewBox={`0 0 ${(radius + strokeWidth) * 2} ${(radius + strokeWidth) * 2}`}>
        <circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx={radius + strokeWidth}
          cy={radius + strokeWidth}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className={getColor(score)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold ${size === 'large' ? 'text-4xl' : 'text-xl'} ${getColor(score)}`}>
          {score}
        </span>
        {size === 'large' && (
          <span className="text-sm text-gray-500 dark:text-gray-400">/ 100</span>
        )}
      </div>
    </div>
  );
};

const ScoreBar = ({ label, score, color }: { label: string; score: number; color: string }) => {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600 dark:text-gray-400">{label}</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{score}</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${color}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
};

const getLevelBadge = (level: ReputationLevel) => {
  const styles: Record<ReputationLevel, string> = {
    excellent: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    good: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    fair: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    poor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return styles[level];
};

export function ReputationDashboard() {
  const t = useTranslations('reputation');
  const {
    overallScore,
    scores,
    metrics,
    domainHealth,
    recommendations,
    isLoading,
    lastUpdated,
    loadReputationData,
    refreshMetrics,
    getScoreLevel,
  } = useReputationStore();

  useEffect(() => {
    loadReputationData();
  }, [loadReputationData]);

  if (isLoading && !lastUpdated) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const level = getScoreLevel(overallScore);
  const activeRecommendations = recommendations.filter((r) => !r.dismissed);
  const criticalCount = activeRecommendations.filter((r) => r.priority === 'critical').length;

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('senderReputation')}
          </h2>
          {lastUpdated && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('lastUpdated')}: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
        <button
          onClick={refreshMetrics}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {t('refresh')}
        </button>
      </div>

      {/* Main score section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overall Score */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col items-center">
            <ScoreGauge score={overallScore} />
            <div className="mt-4 text-center">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getLevelBadge(level)}`}>
                {t(`levels.${level}`)}
              </span>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {t('overallScore')}
              </p>
            </div>
          </div>
        </div>

        {/* Score Components */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            {t('scoreComponents')}
          </h3>
          <div className="space-y-4">
            <ScoreBar label={t('bounceRateScore')} score={scores.bounceRate} color="bg-blue-500" />
            <ScoreBar label={t('spamComplaintScore')} score={scores.spamComplaint} color="bg-purple-500" />
            <ScoreBar label={t('engagementScore')} score={scores.engagement} color="bg-green-500" />
            <ScoreBar label={t('authenticationScore')} score={scores.authentication} color="bg-teal-500" />
            <ScoreBar label={t('listQualityScore')} score={scores.listQuality} color="bg-orange-500" />
          </div>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {metrics.inboxRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{t('inboxRate')}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {metrics.spamRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{t('spamRate')}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {metrics.bounceRate.toFixed(2)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{t('bounceRate')}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {metrics.complaintRate.toFixed(3)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{t('complaintRate')}</div>
        </div>
      </div>

      {/* Domain Health Quick View */}
      {domainHealth && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            {t('domainHealth')}
          </h3>
          <div className="flex flex-wrap gap-4">
            <AuthBadge label="SPF" status={domainHealth.spf} />
            <AuthBadge label="DKIM" status={domainHealth.dkim} />
            <AuthBadge label="DMARC" status={domainHealth.dmarc} />
          </div>
        </div>
      )}

      {/* Recommendations Preview */}
      {activeRecommendations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {t('recommendations')}
            </h3>
            {criticalCount > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                {criticalCount} {t('critical')}
              </span>
            )}
          </div>
          <div className="space-y-3">
            {activeRecommendations.slice(0, 3).map((rec) => (
              <div
                key={rec.id}
                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <PriorityIcon priority={rec.priority} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{rec.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {rec.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AuthBadge({ label, status }: { label: string; status: string }) {
  const isValid = status === 'valid';
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
        isValid
          ? 'bg-green-100 dark:bg-green-900/30'
          : 'bg-red-100 dark:bg-red-900/30'
      }`}
    >
      {isValid ? (
        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span className={`font-medium ${isValid ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
        {label}
      </span>
    </div>
  );
}

function PriorityIcon({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    critical: 'text-red-500',
    high: 'text-orange-500',
    medium: 'text-yellow-500',
    low: 'text-blue-500',
  };

  return (
    <svg className={`w-5 h-5 ${colors[priority] || colors.low}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

export default ReputationDashboard;
