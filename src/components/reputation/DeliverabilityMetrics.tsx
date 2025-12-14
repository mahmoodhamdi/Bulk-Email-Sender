'use client';

import { useReputationStore } from '@/stores/reputation-store';
import { useTranslations } from 'next-intl';

const MetricCard = ({
  label,
  value,
  suffix = '%',
  trend,
  status,
}: {
  label: string;
  value: number;
  suffix?: string;
  trend?: 'up' | 'down' | 'stable';
  status?: 'good' | 'warning' | 'bad';
}) => {
  const statusColors = {
    good: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    bad: 'text-red-600 dark:text-red-400',
  };

  const trendIcons = {
    up: (
      <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    ),
    down: (
      <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ),
    stable: (
      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    ),
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
          <p className={`text-2xl font-bold ${status ? statusColors[status] : 'text-gray-900 dark:text-gray-100'}`}>
            {typeof value === 'number' ? value.toFixed(value < 1 ? 3 : 1) : value}
            {suffix}
          </p>
        </div>
        {trend && trendIcons[trend]}
      </div>
    </div>
  );
};

const DeliveryFunnel = ({
  totalSent,
  totalDelivered,
  totalBounced,
}: {
  totalSent: number;
  totalDelivered: number;
  totalBounced: number;
}) => {
  const t = useTranslations('reputation');
  const deliveryRate = ((totalDelivered / totalSent) * 100).toFixed(1);
  const bounceRate = ((totalBounced / totalSent) * 100).toFixed(1);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        {t('deliveryFunnel')}
      </h3>
      <div className="space-y-4">
        {/* Sent */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">{t('sent')}</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {totalSent.toLocaleString()}
            </span>
          </div>
          <div className="h-3 bg-blue-500 rounded-full" />
        </div>

        {/* Delivered */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">{t('delivered')}</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {totalDelivered.toLocaleString()} ({deliveryRate}%)
            </span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${deliveryRate}%` }}
            />
          </div>
        </div>

        {/* Bounced */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">{t('bounced')}</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {totalBounced.toLocaleString()} ({bounceRate}%)
            </span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full"
              style={{ width: `${bounceRate}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export function DeliverabilityMetrics() {
  const t = useTranslations('reputation');
  const { metrics, trends } = useReputationStore();

  const getStatus = (value: number, thresholds: { good: number; warning: number }): 'good' | 'warning' | 'bad' => {
    if (value >= thresholds.good) return 'good';
    if (value >= thresholds.warning) return 'warning';
    return 'bad';
  };

  const getBounceStatus = (value: number): 'good' | 'warning' | 'bad' => {
    if (value <= 1) return 'good';
    if (value <= 3) return 'warning';
    return 'bad';
  };

  const getComplaintStatus = (value: number): 'good' | 'warning' | 'bad' => {
    if (value <= 0.05) return 'good';
    if (value <= 0.1) return 'warning';
    return 'bad';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        {t('deliverabilityMetrics')}
      </h2>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label={t('inboxRate')}
          value={metrics.inboxRate}
          status={getStatus(metrics.inboxRate, { good: 90, warning: 80 })}
          trend="stable"
        />
        <MetricCard
          label={t('spamRate')}
          value={metrics.spamRate}
          status={metrics.spamRate <= 2 ? 'good' : metrics.spamRate <= 5 ? 'warning' : 'bad'}
        />
        <MetricCard
          label={t('bounceRate')}
          value={metrics.bounceRate}
          status={getBounceStatus(metrics.bounceRate)}
        />
        <MetricCard
          label={t('complaintRate')}
          value={metrics.complaintRate}
          status={getComplaintStatus(metrics.complaintRate)}
        />
      </div>

      {/* Bounce Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          label={t('hardBounceRate')}
          value={metrics.hardBounceRate}
          status={getBounceStatus(metrics.hardBounceRate)}
        />
        <MetricCard
          label={t('softBounceRate')}
          value={metrics.softBounceRate}
          status={getBounceStatus(metrics.softBounceRate)}
        />
      </div>

      {/* Delivery Funnel */}
      <DeliveryFunnel
        totalSent={metrics.totalSent}
        totalDelivered={metrics.totalDelivered}
        totalBounced={metrics.totalBounced}
      />

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('totalSent')}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {metrics.totalSent.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('totalDelivered')}</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {metrics.totalDelivered.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('totalComplaints')}</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {metrics.totalComplaints.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Trend Chart Placeholder */}
      {trends.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            {t('deliverabilityTrend')}
          </h3>
          <div className="h-48 flex items-end justify-between gap-1">
            {trends.slice(-14).map((point, i) => (
              <div
                key={i}
                className="flex-1 bg-blue-500 rounded-t"
                style={{ height: `${point.inboxRate}%` }}
                title={`${new Date(point.date).toLocaleDateString()}: ${point.inboxRate.toFixed(1)}%`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{t('last14Days')}</span>
            <span>{t('inboxRate')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeliverabilityMetrics;
