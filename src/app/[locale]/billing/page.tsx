'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { PageLayout } from '@/components/layout/PageLayout';
import { BillingPage } from '@/components/billing';
import { Skeleton } from '@/components/ui/skeleton';

function BillingPageContent() {
  return <BillingPage />;
}

function BillingPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function BillingRoute() {
  const t = useTranslations('billing');

  return (
    <PageLayout title={t('billing')} subtitle={t('billingDescription')}>
      <Suspense fallback={<BillingPageSkeleton />}>
        <BillingPageContent />
      </Suspense>
    </PageLayout>
  );
}
