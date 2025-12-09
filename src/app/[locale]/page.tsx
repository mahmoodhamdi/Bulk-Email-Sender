import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import {
  Mail,
  Users,
  BarChart3,
  Send,
  FileText,
  Settings,
  Plus,
  Upload,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function DashboardPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <DashboardContent />;
}

function DashboardContent() {
  const t = useTranslations();

  const stats = [
    {
      title: t('dashboard.totalCampaigns'),
      value: '12',
      icon: Mail,
      change: '+2',
      changeType: 'positive' as const,
    },
    {
      title: t('dashboard.totalContacts'),
      value: '2,847',
      icon: Users,
      change: '+124',
      changeType: 'positive' as const,
    },
    {
      title: t('dashboard.emailsSent'),
      value: '45,291',
      icon: Send,
      change: '+1,234',
      changeType: 'positive' as const,
    },
    {
      title: t('dashboard.avgOpenRate'),
      value: '24.5%',
      icon: BarChart3,
      change: '+2.1%',
      changeType: 'positive' as const,
    },
  ];

  const quickActions = [
    {
      title: t('dashboard.newCampaign'),
      description: t('campaign.create.subtitle'),
      icon: Plus,
      href: '/campaigns/new',
    },
    {
      title: t('dashboard.importContacts'),
      description: t('contacts.import.subtitle'),
      icon: Upload,
      href: '/contacts/import',
    },
    {
      title: t('dashboard.viewAnalytics'),
      description: t('analytics.subtitle'),
      icon: TrendingUp,
      href: '/analytics',
    },
  ];

  const recentCampaigns = [
    {
      name: 'Newsletter March 2024',
      status: 'completed',
      sent: 1250,
      opened: 312,
      clicked: 89,
    },
    {
      name: 'Product Launch',
      status: 'sending',
      sent: 450,
      opened: 0,
      clicked: 0,
    },
    {
      name: 'Weekly Update',
      status: 'draft',
      sent: 0,
      opened: 0,
      clicked: 0,
    },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 border-r bg-card lg:block">
        <div className="flex h-16 items-center border-b px-6">
          <Mail className="h-6 w-6 text-primary" />
          <span className="ml-2 text-lg font-semibold">
            {t('common.appName')}
          </span>
        </div>
        <nav className="space-y-1 p-4">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-2 text-primary"
          >
            <BarChart3 className="h-5 w-5" />
            {t('nav.dashboard')}
          </Link>
          <Link
            href="/campaigns"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Mail className="h-5 w-5" />
            {t('nav.campaigns')}
          </Link>
          <Link
            href="/templates"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <FileText className="h-5 w-5" />
            {t('nav.templates')}
          </Link>
          <Link
            href="/contacts"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Users className="h-5 w-5" />
            {t('nav.contacts')}
          </Link>
          <Link
            href="/analytics"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <TrendingUp className="h-5 w-5" />
            {t('nav.analytics')}
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Settings className="h-5 w-5" />
            {t('nav.settings')}
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b px-6">
          <div>
            <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('dashboard.welcome')}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button asChild>
              <Link href="/campaigns/new">
                <Plus className="mr-2 h-4 w-4" />
                {t('campaigns.newCampaign')}
              </Link>
            </Button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6">
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p
                    className={`text-xs ${
                      stat.changeType === 'positive'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {stat.change} {t('analytics.last30days')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions & Recent Campaigns */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.quickActions')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {quickActions.map((action) => (
                  <Link
                    key={action.title}
                    href={action.href}
                    className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <action.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{action.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* Recent Campaigns */}
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.recentCampaigns')}</CardTitle>
                <CardDescription>
                  {t('campaigns.subtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentCampaigns.map((campaign) => (
                    <div
                      key={campaign.name}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <h4 className="font-medium">{campaign.name}</h4>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            campaign.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : campaign.status === 'sending'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {t(`campaigns.status.${campaign.status}`)}
                        </span>
                      </div>
                      <div className="text-right text-sm">
                        <p>
                          {t('campaigns.stats.sent')}: {campaign.sent}
                        </p>
                        <p className="text-muted-foreground">
                          {t('campaigns.stats.opened')}: {campaign.opened}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t p-6 text-center text-sm text-muted-foreground">
          <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          <p className="mt-1">
            {t('footer.contact')}: mwm.softwars.solutions@gmail.com | +201019793768
          </p>
        </footer>
      </main>
    </div>
  );
}
