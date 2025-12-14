'use client';

import { useReputationStore, AuthStatus, DomainHealth as DomainHealthType } from '@/stores/reputation-store';
import { useTranslations } from 'next-intl';

const AuthCard = ({
  label,
  status,
  description,
  helpLink,
}: {
  label: string;
  status: AuthStatus;
  description: string;
  helpLink?: string;
}) => {
  const t = useTranslations('reputation');

  const statusConfig = {
    valid: {
      icon: (
        <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-700 dark:text-green-400',
    },
    invalid: {
      icon: (
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-400',
    },
    missing: {
      icon: (
        <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-700 dark:text-yellow-400',
    },
    unknown: {
      icon: (
        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bg: 'bg-gray-50 dark:bg-gray-700',
      border: 'border-gray-200 dark:border-gray-600',
      text: 'text-gray-600 dark:text-gray-400',
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} p-4`}>
      <div className="flex items-start gap-4">
        {config.icon}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">{label}</h4>
            <span className={`text-sm font-medium ${config.text}`}>
              {t(`authStatus.${status}`)}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
          {helpLink && status !== 'valid' && (
            <a
              href={helpLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
            >
              {t('learnMore')}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export function DomainHealth() {
  const t = useTranslations('reputation');
  const { domainHealth, ipHealth, isCheckingDomain, checkDomainHealth } = useReputationStore();

  if (!domainHealth) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">{t('noDomainData')}</p>
        <button
          onClick={checkDomainHealth}
          disabled={isCheckingDomain}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {isCheckingDomain ? t('checking') : t('checkDomain')}
        </button>
      </div>
    );
  }

  const getReputationBadge = (level: string) => {
    const styles: Record<string, string> = {
      excellent: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      good: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      fair: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      poor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return styles[level] || styles.fair;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {t('domainHealth')}
        </h2>
        <button
          onClick={checkDomainHealth}
          disabled={isCheckingDomain}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 ${isCheckingDomain ? 'animate-spin' : ''}`}
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
          {t('recheck')}
        </button>
      </div>

      {/* Domain Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {domainHealth.domain}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('domainAge', { days: domainHealth.age })}
            </p>
          </div>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getReputationBadge(domainHealth.reputation)}`}>
            {t(`levels.${domainHealth.reputation}`)}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('lastChecked')}: {new Date(domainHealth.lastChecked).toLocaleString()}
        </p>
      </div>

      {/* Authentication Records */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          {t('emailAuthentication')}
        </h3>

        <AuthCard
          label="SPF (Sender Policy Framework)"
          status={domainHealth.spf}
          description={t('spfDescription')}
          helpLink="https://example.com/spf-guide"
        />

        <AuthCard
          label="DKIM (DomainKeys Identified Mail)"
          status={domainHealth.dkim}
          description={t('dkimDescription')}
          helpLink="https://example.com/dkim-guide"
        />

        <AuthCard
          label="DMARC (Domain-based Message Authentication)"
          status={domainHealth.dmarc}
          description={t('dmarcDescription')}
          helpLink="https://example.com/dmarc-guide"
        />
      </div>

      {/* IP Health */}
      {ipHealth && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            {t('ipHealth')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('ipAddress')}</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">{ipHealth.ip}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('ipType')}</p>
              <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">{ipHealth.type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('reputation')}</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">{ipHealth.reputation}/100</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('warmingStatus')}</p>
              <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                {t(`warming.${ipHealth.warmingStatus}`)}
              </p>
            </div>
          </div>

          {ipHealth.warmingStatus === 'warming' && ipHealth.warmingProgress !== undefined && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">{t('warmingProgress')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {ipHealth.warmingProgress}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${ipHealth.warmingProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('dailyVolume')}</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {ipHealth.dailyVolume.toLocaleString()} {t('emailsPerDay')}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {ipHealth.volumeTrend === 'increasing' && (
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
              {ipHealth.volumeTrend === 'decreasing' && (
                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              {ipHealth.volumeTrend === 'stable' && (
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                </svg>
              )}
              <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                {t(`trend.${ipHealth.volumeTrend}`)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DomainHealth;
