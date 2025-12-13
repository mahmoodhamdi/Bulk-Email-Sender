import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import {
  Send,
  Mail,
  MousePointerClick,
  AlertTriangle,
  UserMinus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageLayout } from '@/components/layout/PageLayout';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function AnalyticsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AnalyticsContent />;
}

function AnalyticsContent() {
  const t = useTranslations();

  // Mock data - will be replaced with actual data from database
  const metrics = [
    {
      title: t('analytics.metrics.sent'),
      value: '45,291',
      icon: Send,
      change: '+12%',
      color: 'text-blue-600',
    },
    {
      title: t('analytics.metrics.delivered'),
      value: '44,890',
      subtitle: '99.1%',
      icon: Mail,
      change: '+0.5%',
      color: 'text-green-600',
    },
    {
      title: t('analytics.metrics.opened'),
      value: '11,073',
      subtitle: '24.5%',
      icon: Mail,
      change: '+2.1%',
      color: 'text-purple-600',
    },
    {
      title: t('analytics.metrics.clicked'),
      value: '3,547',
      subtitle: '7.9%',
      icon: MousePointerClick,
      change: '+1.2%',
      color: 'text-orange-600',
    },
    {
      title: t('analytics.metrics.bounced'),
      value: '401',
      subtitle: '0.9%',
      icon: AlertTriangle,
      change: '-0.2%',
      color: 'text-red-600',
    },
    {
      title: t('analytics.metrics.unsubscribed'),
      value: '127',
      subtitle: '0.3%',
      icon: UserMinus,
      change: '-0.1%',
      color: 'text-yellow-600',
    },
  ];

  const dateRanges = ['last7days', 'last30days', 'last90days', 'allTime'];

  return (
    <PageLayout
      title={t('analytics.title')}
      subtitle={t('analytics.subtitle')}
      actions={
        <div className="flex gap-2">
          {dateRanges.map((range) => (
            <Button
              key={range}
              variant={range === 'last30days' ? 'default' : 'outline'}
              size="sm"
            >
              {t(`analytics.${range}`)}
            </Button>
          ))}
        </div>
      }
    >
      {/* Metrics Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <metric.icon className={`h-5 w-5 ${metric.color}`} />
                <span className="text-xs text-green-600">{metric.change}</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{metric.value}</p>
              {metric.subtitle && (
                <p className="text-sm text-muted-foreground">{metric.subtitle}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">{metric.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Opens Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>{t('analytics.charts.opensOverTime')}</CardTitle>
            <CardDescription>{t('analytics.last30days')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center rounded-lg bg-muted">
              <p className="text-muted-foreground">
                Chart will be rendered here using Recharts
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Clicks Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>{t('analytics.charts.clicksOverTime')}</CardTitle>
            <CardDescription>{t('analytics.last30days')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center rounded-lg bg-muted">
              <p className="text-muted-foreground">
                Chart will be rendered here using Recharts
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Top Clicked Links */}
        <Card>
          <CardHeader>
            <CardTitle>{t('analytics.charts.topLinks')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { url: 'https://example.com/product', clicks: 1234 },
                { url: 'https://example.com/pricing', clicks: 856 },
                { url: 'https://example.com/signup', clicks: 642 },
                { url: 'https://example.com/demo', clicks: 421 },
                { url: 'https://example.com/contact', clicks: 394 },
              ].map((link) => (
                <div
                  key={link.url}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <span className="truncate text-sm">{link.url}</span>
                  <span className="ml-4 text-sm font-medium">{link.clicks}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Email Clients */}
        <Card>
          <CardHeader>
            <CardTitle>{t('analytics.charts.emailClients')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { client: 'Gmail', percentage: 45 },
                { client: 'Apple Mail', percentage: 25 },
                { client: 'Outlook', percentage: 18 },
                { client: 'Yahoo Mail', percentage: 8 },
                { client: 'Other', percentage: 4 },
              ].map((item) => (
                <div key={item.client} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{item.client}</span>
                    <span>{item.percentage}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
