'use client';

import { BounceManager } from '@/components/reputation';
import { useReputationStore } from '@/stores/reputation-store';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import Link from 'next/link';

export default function BouncesPage() {
  const t = useTranslations('reputation');
  const { loadReputationData, lastUpdated, isLoading } = useReputationStore();

  useEffect(() => {
    if (!lastUpdated) {
      loadReputationData();
    }
  }, [loadReputationData, lastUpdated]);

  if (isLoading && !lastUpdated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/analytics/reputation"
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {t('bounceManager')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {t('bounceManagerSubtitle')}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BounceManager />
      </main>
    </div>
  );
}
