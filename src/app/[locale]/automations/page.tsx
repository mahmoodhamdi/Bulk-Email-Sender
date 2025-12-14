'use client';

import { AutomationList, AutomationStats } from '@/components/automation';
import { useAutomationStore } from '@/stores/automation-store';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AutomationsPage() {
  const t = useTranslations('automation');
  const tNav = useTranslations('nav');
  const { loadAutomations, automations, isLoading } = useAutomationStore();
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');

  useEffect(() => {
    loadAutomations();
  }, [loadAutomations]);

  const activeCount = automations.filter((a) => a.status === 'active').length;
  const totalEmails = automations.reduce((sum, a) => sum + a.stats.emailsSent, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {t('title')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{t('subtitle')}</p>
            </div>
            <Link
              href="/automations/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {t('newAutomation')}
            </Link>
          </div>

          {/* Quick stats */}
          {!isLoading && automations.length > 0 && (
            <div className="flex gap-6 mt-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">{t('totalAutomations')}: </span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {automations.length}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">{t('activeAutomations')}: </span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {activeCount}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">{t('totalEmailsSent')}: </span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {totalEmails.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'list'
                ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {t('automations')}
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'stats'
                ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {t('statistics')}
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === 'list' ? (
          <AutomationList />
        ) : (
          <AutomationStats />
        )}
      </main>
    </div>
  );
}
