'use client';

import { SuppressionList, UnsubscribeStats } from '@/components/unsubscribe';
import { useUnsubscribeStore } from '@/stores/unsubscribe-store';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function SuppressionPage() {
  const t = useTranslations('unsubscribe');
  const tNav = useTranslations('nav');
  const { loadSuppressionList, isLoading } = useUnsubscribeStore();
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');

  useEffect(() => {
    loadSuppressionList();
  }, [loadSuppressionList]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <Link href="/contacts" className="hover:text-primary">
                  {tNav('contacts')}
                </Link>
                <span>/</span>
                <span>{t('suppressionList')}</span>
              </nav>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {t('suppressionList')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {t('suppressionListDesc')}
              </p>
            </div>
          </div>
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
            {t('list')}
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
          <SuppressionList />
        ) : (
          <UnsubscribeStats />
        )}
      </main>
    </div>
  );
}
