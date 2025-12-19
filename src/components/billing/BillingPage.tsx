'use client';

/**
 * BillingPage Component
 * Full billing management page
 */

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useBillingStore, selectTier } from '@/stores/billing-store';
import { SubscriptionStatus } from './SubscriptionStatus';
import { PricingTable } from './PricingTable';
import { PaymentHistory } from './PaymentHistory';

interface BillingPageProps {
  className?: string;
}

export function BillingPage({ className }: BillingPageProps) {
  const t = useTranslations('billing');
  const searchParams = useSearchParams();
  const { fetchSubscription } = useBillingStore();
  const currentTier = useBillingStore(selectTier);

  const success = searchParams.get('success') === 'true';
  const canceled = searchParams.get('canceled') === 'true';

  useEffect(() => {
    // Refresh subscription data on success
    if (success) {
      fetchSubscription();
    }
  }, [success, fetchSubscription]);

  return (
    <div className={cn('space-y-8', className)}>
      {/* Success/Cancel alerts */}
      {success && (
        <Alert variant="default" className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle>{t('subscriptionSuccess')}</AlertTitle>
          <AlertDescription>{t('subscriptionSuccessMessage')}</AlertDescription>
        </Alert>
      )}

      {canceled && (
        <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <XCircle className="h-4 w-4 text-yellow-500" />
          <AlertTitle>{t('checkoutCanceled')}</AlertTitle>
          <AlertDescription>{t('checkoutCanceledMessage')}</AlertDescription>
        </Alert>
      )}

      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold">{t('billing')}</h1>
        <p className="text-muted-foreground">{t('billingDescription')}</p>
      </div>

      {/* Tabs for billing sections */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
          <TabsTrigger value="plans">{t('plans')}</TabsTrigger>
          <TabsTrigger value="history">{t('history')}</TabsTrigger>
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <SubscriptionStatus showUsage={true} showActions={true} />
            <PaymentHistory limit={5} />
          </div>
        </TabsContent>

        {/* Plans tab */}
        <TabsContent value="plans">
          <PricingTable currentTier={currentTier} showCurrentBadge={true} />
        </TabsContent>

        {/* History tab */}
        <TabsContent value="history">
          <PaymentHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default BillingPage;
