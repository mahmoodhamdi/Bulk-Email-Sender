'use client';

import { useAutomationStore, type AutomationStats as Stats } from '@/stores/automation-store';
import { useTranslations } from 'next-intl';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      </div>
    </div>
  );
}

export function AutomationStats() {
  const t = useTranslations('automation');
  const { currentAutomation, automations } = useAutomationStore();

  // Calculate aggregate stats if no automation is selected
  const stats: Stats = currentAutomation
    ? currentAutomation.stats
    : automations.reduce(
        (acc, auto) => ({
          totalEntered: acc.totalEntered + auto.stats.totalEntered,
          totalCompleted: acc.totalCompleted + auto.stats.totalCompleted,
          totalActive: acc.totalActive + auto.stats.totalActive,
          emailsSent: acc.emailsSent + auto.stats.emailsSent,
          openRate:
            acc.openRate +
            (auto.stats.emailsSent > 0 ? auto.stats.openRate * auto.stats.emailsSent : 0),
          clickRate:
            acc.clickRate +
            (auto.stats.emailsSent > 0 ? auto.stats.clickRate * auto.stats.emailsSent : 0),
        }),
        {
          totalEntered: 0,
          totalCompleted: 0,
          totalActive: 0,
          emailsSent: 0,
          openRate: 0,
          clickRate: 0,
        }
      );

  // Calculate weighted averages for rates
  const totalEmails = automations.reduce((acc, auto) => acc + auto.stats.emailsSent, 0);
  const avgOpenRate = totalEmails > 0 ? stats.openRate / totalEmails : 0;
  const avgClickRate = totalEmails > 0 ? stats.clickRate / totalEmails : 0;

  const displayStats = currentAutomation
    ? stats
    : { ...stats, openRate: avgOpenRate, clickRate: avgClickRate };

  const completionRate =
    stats.totalEntered > 0
      ? ((stats.totalCompleted / stats.totalEntered) * 100).toFixed(1)
      : '0';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={t('stats.totalEntered')}
          value={displayStats.totalEntered}
          color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
        />

        <StatCard
          title={t('stats.activeContacts')}
          value={displayStats.totalActive}
          color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />

        <StatCard
          title={t('stats.emailsSent')}
          value={displayStats.emailsSent}
          color="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          }
        />

        <StatCard
          title={t('stats.completionRate')}
          value={`${completionRate}%`}
          color="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
          subtitle={`${displayStats.totalCompleted} ${t('completed')}`}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          }
        />
      </div>

      {/* Engagement rates */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('stats.engagement')}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('stats.openRate')}
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {displayStats.openRate.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${Math.min(displayStats.openRate, 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('stats.clickRate')}
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {displayStats.clickRate.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${Math.min(displayStats.clickRate * 2, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
