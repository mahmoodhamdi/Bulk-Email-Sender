'use client';

import React, { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Send,
  Mail,
  MousePointerClick,
  AlertTriangle,
  UserMinus,
  TrendingUp,
  RefreshCw,
  Download,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLayout } from '@/components/layout/PageLayout';
import {
  MetricCard,
  SimpleLineChart,
  SimpleBarChart,
  SimpleDonutChart,
  CampaignTable,
  ProgressBar,
} from '@/components/analytics';
import {
  useAnalyticsStore,
  formatNumber,
  formatPercentage,
  type DateRange,
} from '@/stores/analytics-store';
import { cn } from '@/lib/utils';

export default function AnalyticsPage() {
  const t = useTranslations('analytics');
  const {
    campaigns,
    timeSeries,
    emailClients,
    devices,
    topLinks,
    summary,
    comparison,
    dateRange,
    isLoading,
    setDateRange,
    loadAnalytics,
    refreshAnalytics,
    exportToCSV,
  } = useAnalyticsStore();

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const dateRanges: { value: DateRange; label: string }[] = [
    { value: '7d', label: t('last7days') },
    { value: '30d', label: t('last30days') },
    { value: '90d', label: t('last90days') },
    { value: 'all', label: t('allTime') },
  ];

  const handleExport = () => {
    const csv = exportToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Prepare chart data
  const opensChartData = timeSeries.map((d) => ({
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: d.opens,
  }));

  const clicksChartData = timeSeries.map((d) => ({
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: d.clicks,
  }));

  const emailClientColors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#6b7280'];
  const emailClientChartData = emailClients.map((ec, i) => ({
    label: ec.client,
    value: ec.count,
    color: emailClientColors[i % emailClientColors.length],
  }));

  const deviceColors = ['#22c55e', '#3b82f6', '#f59e0b'];
  const deviceChartData = devices.map((d, i) => ({
    label: d.device,
    value: d.count,
    color: deviceColors[i % deviceColors.length],
  }));

  return (
    <PageLayout
      title={t('title')}
      subtitle={t('subtitle')}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border p-1">
            {dateRanges.map((range) => (
              <Button
                key={range.value}
                variant={dateRange === range.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDateRange(range.value)}
                className="text-xs"
              >
                {range.label}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={refreshAnalytics} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            {t('refresh')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            {t('export')}
          </Button>
        </div>
      }
    >
      {/* Key Metrics Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          title={t('metrics.sent')}
          value={formatNumber(summary.totalSent)}
          change={comparison?.changes.sentChange}
          changeLabel={t('vsPrevious')}
          icon={<Send className="h-5 w-5" />}
        />
        <MetricCard
          title={t('metrics.deliveryRate')}
          value={summary.deliveryRate}
          format="percentage"
          change={comparison?.changes.deliveryRateChange}
          icon={<Mail className="h-5 w-5" />}
        />
        <MetricCard
          title={t('metrics.openRate')}
          value={summary.openRate}
          format="percentage"
          change={comparison?.changes.openRateChange}
          icon={<Mail className="h-5 w-5" />}
        />
        <MetricCard
          title={t('metrics.clickRate')}
          value={summary.clickRate}
          format="percentage"
          change={comparison?.changes.clickRateChange}
          icon={<MousePointerClick className="h-5 w-5" />}
        />
        <MetricCard
          title={t('metrics.bounceRate')}
          value={summary.bounceRate}
          format="percentage"
          change={comparison?.changes.bounceRateChange}
          icon={<AlertTriangle className="h-5 w-5" />}
          inverseColors
        />
        <MetricCard
          title={t('metrics.unsubscribeRate')}
          value={summary.unsubscribeRate}
          format="percentage"
          icon={<UserMinus className="h-5 w-5" />}
          inverseColors
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <SimpleLineChart
          data={opensChartData}
          title={t('charts.opensOverTime')}
          description={t('opensDescription')}
          color="#8b5cf6"
          height={220}
        />
        <SimpleLineChart
          data={clicksChartData}
          title={t('charts.clicksOverTime')}
          description={t('clicksDescription')}
          color="#22c55e"
          height={220}
        />
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <SimpleDonutChart
          data={emailClientChartData}
          title={t('charts.emailClients')}
          description={t('emailClientsDescription')}
          centerValue={formatNumber(summary.totalOpened)}
          centerLabel={t('totalOpens')}
        />
        <SimpleDonutChart
          data={deviceChartData}
          title={t('charts.devices')}
          description={t('devicesDescription')}
          centerValue={formatNumber(summary.totalClicked)}
          centerLabel={t('totalClicks')}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t('charts.topLinks')}
            </CardTitle>
            <CardDescription>{t('topLinksDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topLinks.slice(0, 5).map((link, i) => (
              <ProgressBar
                key={i}
                value={link.clicks}
                max={topLinks[0]?.clicks || 100}
                label={link.url.replace(/^https?:\/\//, '').slice(0, 30) + '...'}
                color={i === 0 ? '#22c55e' : '#3b82f6'}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <div className="grid gap-6 lg:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('totalEmails')}</p>
                <p className="text-2xl font-bold">{formatNumber(summary.totalSent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('totalDelivered')}</p>
                <p className="text-2xl font-bold">{formatNumber(summary.totalDelivered)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Mail className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('totalOpened')}</p>
                <p className="text-2xl font-bold">{formatNumber(summary.totalOpened)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                <MousePointerClick className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('totalClicked')}</p>
                <p className="text-2xl font-bold">{formatNumber(summary.totalClicked)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Performance Table */}
      <CampaignTable campaigns={campaigns} onExport={handleExport} />
    </PageLayout>
  );
}
