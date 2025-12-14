'use client';

import { cn } from '@/lib/utils';
import { useUnsubscribeStore, type UnsubscribeReason, type SuppressionSource } from '@/stores/unsubscribe-store';
import { useTranslations } from 'next-intl';

interface StatCardProps {
  title: string;
  value: number | string;
  trend?: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, trend, icon, color }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between">
        <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', color)}>
          {icon}
        </div>
        {trend !== undefined && (
          <span
            className={cn(
              'text-sm font-medium',
              trend > 0 ? 'text-red-500' : trend < 0 ? 'text-green-500' : 'text-gray-500'
            )}
          >
            {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
      </div>
    </div>
  );
}

function ReasonChart() {
  const t = useTranslations('unsubscribe');
  const { stats } = useUnsubscribeStore();

  const reasons: { id: UnsubscribeReason; label: string; color: string }[] = [
    { id: 'not_interested', label: t('reasons.notInterested'), color: 'bg-gray-500' },
    { id: 'too_frequent', label: t('reasons.tooFrequent'), color: 'bg-yellow-500' },
    { id: 'never_subscribed', label: t('reasons.neverSubscribed'), color: 'bg-red-500' },
    { id: 'inappropriate_content', label: t('reasons.inappropriateContent'), color: 'bg-orange-500' },
    { id: 'other', label: t('reasons.other'), color: 'bg-blue-500' },
  ];

  const total = Object.values(stats.byReason).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {t('byReason')}
      </h3>
      <div className="space-y-3">
        {reasons.map((reason) => {
          const count = stats.byReason[reason.id];
          const percentage = total > 0 ? (count / total) * 100 : 0;

          return (
            <div key={reason.id}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">{reason.label}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {count} ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', reason.color)}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SourceChart() {
  const t = useTranslations('unsubscribe');
  const { stats } = useUnsubscribeStore();

  const sources: { id: SuppressionSource; label: string; color: string }[] = [
    { id: 'link', label: t('sources.link'), color: 'bg-green-500' },
    { id: 'manual', label: t('sources.manual'), color: 'bg-blue-500' },
    { id: 'import', label: t('sources.import'), color: 'bg-purple-500' },
    { id: 'bounce', label: t('sources.bounce'), color: 'bg-orange-500' },
    { id: 'complaint', label: t('sources.complaint'), color: 'bg-red-500' },
  ];

  const total = Object.values(stats.bySource).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {t('bySource')}
      </h3>
      <div className="space-y-3">
        {sources.map((source) => {
          const count = stats.bySource[source.id];
          const percentage = total > 0 ? (count / total) * 100 : 0;

          return (
            <div key={source.id}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">{source.label}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {count} ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', source.color)}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function UnsubscribeStats() {
  const t = useTranslations('unsubscribe');
  const { stats } = useUnsubscribeStore();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('totalSuppressed')}
          value={stats.totalSuppressed}
          icon={
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          }
          color="bg-red-100 dark:bg-red-900/30"
        />
        <StatCard
          title={t('last7Days')}
          value={stats.last7Days}
          icon={
            <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          color="bg-orange-100 dark:bg-orange-900/30"
        />
        <StatCard
          title={t('last30Days')}
          value={stats.last30Days}
          trend={stats.trend}
          icon={
            <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          color="bg-yellow-100 dark:bg-yellow-900/30"
        />
        <StatCard
          title={t('complaintRate')}
          value={`${stats.totalSuppressed > 0 ? ((stats.bySource.complaint / stats.totalSuppressed) * 100).toFixed(2) : 0}%`}
          icon={
            <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          color="bg-purple-100 dark:bg-purple-900/30"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReasonChart />
        <SourceChart />
      </div>
    </div>
  );
}
