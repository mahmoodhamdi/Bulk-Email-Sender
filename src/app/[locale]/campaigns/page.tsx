import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { Plus, Search, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export default async function CampaignsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <CampaignsContent />;
}

function CampaignsContent() {
  const t = useTranslations();

  // Mock data - will be replaced with actual data from database
  const campaigns = [
    {
      id: '1',
      name: 'Newsletter March 2024',
      subject: 'Your monthly update',
      status: 'completed',
      totalRecipients: 1250,
      sentCount: 1250,
      openedCount: 312,
      clickedCount: 89,
      createdAt: '2024-03-01',
    },
    {
      id: '2',
      name: 'Product Launch',
      subject: 'Introducing our new product',
      status: 'sending',
      totalRecipients: 2500,
      sentCount: 450,
      openedCount: 0,
      clickedCount: 0,
      createdAt: '2024-03-10',
    },
    {
      id: '3',
      name: 'Weekly Update',
      subject: 'This week at Company',
      status: 'draft',
      totalRecipients: 0,
      sentCount: 0,
      openedCount: 0,
      clickedCount: 0,
      createdAt: '2024-03-12',
    },
    {
      id: '4',
      name: 'Holiday Special',
      subject: 'Special holiday offers',
      status: 'scheduled',
      totalRecipients: 3000,
      sentCount: 0,
      openedCount: 0,
      clickedCount: 0,
      createdAt: '2024-03-15',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'sending':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'paused':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <PageLayout
      title={t('campaigns.title')}
      subtitle={t('campaigns.subtitle')}
      actions={
        <Button asChild>
          <Link href="/campaigns/new">
            <Plus className="mr-2 h-4 w-4" />
            {t('campaigns.newCampaign')}
          </Link>
        </Button>
      }
    >
      {/* Search and Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('campaigns.searchPlaceholder')}
            className="pl-10"
          />
        </div>
      </div>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Mail className="h-12 w-12 text-muted-foreground" />
          <CardHeader className="text-center">
            <CardTitle>{t('campaigns.noCampaigns')}</CardTitle>
            <CardDescription>{t('campaigns.noCampaignsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/campaigns/new">
                <Plus className="mr-2 h-4 w-4" />
                {t('campaigns.createFirst')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{campaign.name}</h3>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                        campaign.status
                      )}`}
                    >
                      {t(`campaigns.status.${campaign.status}`)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {campaign.subject}
                  </p>
                </div>

                <div className="flex items-center gap-8 text-sm">
                  <div className="text-center">
                    <p className="font-medium">{campaign.totalRecipients}</p>
                    <p className="text-muted-foreground">
                      {t('campaigns.stats.recipients')}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{campaign.sentCount}</p>
                    <p className="text-muted-foreground">
                      {t('campaigns.stats.sent')}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{campaign.openedCount}</p>
                    <p className="text-muted-foreground">
                      {t('campaigns.stats.opened')}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{campaign.clickedCount}</p>
                    <p className="text-muted-foreground">
                      {t('campaigns.stats.clicked')}
                    </p>
                  </div>
                </div>

                <div className="ml-4">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/campaigns/${campaign.id}`}>
                      {t('common.view')}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
