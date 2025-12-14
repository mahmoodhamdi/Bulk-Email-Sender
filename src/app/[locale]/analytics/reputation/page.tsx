'use client';

import {
  ReputationDashboard,
  DeliverabilityMetrics,
  DomainHealth,
  BlacklistChecker,
  Recommendations,
} from '@/components/reputation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import Link from 'next/link';

type TabType = 'overview' | 'deliverability' | 'domain' | 'blacklist' | 'recommendations';

export default function ReputationPage() {
  const t = useTranslations('reputation');
  const tNav = useTranslations('nav');
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: t('overview') },
    { id: 'deliverability', label: t('deliverability') },
    { id: 'domain', label: t('domain') },
    { id: 'blacklist', label: t('blacklist') },
    { id: 'recommendations', label: t('recommendations') },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/analytics"
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {t('senderReputation')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {t('subtitle')}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <ReputationDashboard />}
        {activeTab === 'deliverability' && <DeliverabilityMetrics />}
        {activeTab === 'domain' && <DomainHealth />}
        {activeTab === 'blacklist' && <BlacklistChecker />}
        {activeTab === 'recommendations' && <Recommendations />}
      </main>
    </div>
  );
}
