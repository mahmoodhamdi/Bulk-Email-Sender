'use client';

import { useReputationStore } from '@/stores/reputation-store';
import { useTranslations } from 'next-intl';

export function BlacklistChecker() {
  const t = useTranslations('reputation');
  const { blacklistStatus, isCheckingBlacklist, checkBlacklists } = useReputationStore();

  const listedCount = blacklistStatus.filter((bl) => bl.listed).length;
  const cleanCount = blacklistStatus.filter((bl) => !bl.listed).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('blacklistChecker')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('blacklistDescription')}
          </p>
        </div>
        <button
          onClick={checkBlacklists}
          disabled={isCheckingBlacklist}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {isCheckingBlacklist ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t('scanning')}
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {t('scanBlacklists')}
            </>
          )}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-lg border p-4 ${
          listedCount === 0
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-3">
            {listedCount === 0 ? (
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            <div>
              <p className={`text-2xl font-bold ${
                listedCount === 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
              }`}>
                {listedCount}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('listedOn')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {blacklistStatus.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('listsChecked')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Blacklist Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
          {blacklistStatus.map((bl) => (
            <div
              key={bl.id}
              className={`p-4 flex items-center justify-between ${
                bl.listed ? 'bg-red-50 dark:bg-red-900/10' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {bl.listed ? (
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                ) : (
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{bl.name}</p>
                  {bl.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{bl.description}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`text-sm font-medium ${
                    bl.listed ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                  }`}
                >
                  {bl.listed ? t('listed') : t('clean')}
                </span>
                {bl.listed && bl.delistUrl && (
                  <a
                    href={bl.delistUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-primary hover:underline mt-1"
                  >
                    {t('requestDelist')}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Last Checked */}
      {blacklistStatus.length > 0 && blacklistStatus[0].checkedAt && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          {t('lastChecked')}: {new Date(blacklistStatus[0].checkedAt).toLocaleString()}
        </p>
      )}

      {/* Help Section */}
      {listedCount > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                {t('blacklistHelp')}
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                {t('blacklistHelpText')}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                <li>• {t('blacklistTip1')}</li>
                <li>• {t('blacklistTip2')}</li>
                <li>• {t('blacklistTip3')}</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BlacklistChecker;
