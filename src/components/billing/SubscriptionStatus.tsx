'use client';

/**
 * SubscriptionStatus Component
 * Displays current subscription status, usage, and management options
 */

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, CheckCircle, Clock, CreditCard, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { SubscriptionTier, SubscriptionStatus as SubStatus, TIER_CONFIG } from '@/lib/payments/types';
import { useBillingStore, selectSubscription, selectTier, selectStatus, selectUsage } from '@/stores/billing-store';

interface SubscriptionStatusProps {
  className?: string;
  showUsage?: boolean;
  showActions?: boolean;
}

export function SubscriptionStatus({
  className,
  showUsage = true,
  showActions = true,
}: SubscriptionStatusProps) {
  const t = useTranslations('billing');
  const {
    fetchSubscription,
    openCustomerPortal,
    cancelSubscription,
    resumeSubscription,
    isLoading,
    isOpeningPortal,
    error,
  } = useBillingStore();

  const subscription = useBillingStore(selectSubscription);
  const tier = useBillingStore(selectTier);
  const status = useBillingStore(selectStatus);
  const usage = useBillingStore(selectUsage);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const tierConfig = TIER_CONFIG[tier];

  const getStatusBadge = () => {
    switch (status) {
      case SubStatus.ACTIVE:
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t('status.active')}
          </Badge>
        );
      case SubStatus.TRIALING:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {t('status.trialing')}
          </Badge>
        );
      case SubStatus.PAST_DUE:
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            {t('status.pastDue')}
          </Badge>
        );
      case SubStatus.CANCELED:
        return (
          <Badge variant="outline">
            {t('status.canceled')}
          </Badge>
        );
      case SubStatus.PAUSED:
        return (
          <Badge variant="secondary">
            {t('status.paused')}
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleManageBilling = async () => {
    const url = await openCustomerPortal();
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleCancelSubscription = async () => {
    if (confirm(t('confirmCancel'))) {
      await cancelSubscription();
    }
  };

  const handleResumeSubscription = async () => {
    await resumeSubscription();
  };

  if (isLoading && !subscription) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('error')}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {tierConfig.name}
              {getStatusBadge()}
            </CardTitle>
            <CardDescription>{tierConfig.description}</CardDescription>
          </div>
          {tier !== SubscriptionTier.FREE && subscription?.currentPeriodEnd && (
            <div className="text-right text-sm text-muted-foreground">
              <p>{subscription.cancelAtPeriodEnd ? t('cancelsOn') : t('renewsOn')}</p>
              <p className="font-medium">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Usage section */}
        {showUsage && usage && (
          <div className="space-y-4">
            {/* Email usage */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('emailUsage')}</span>
                <span className={cn(usage.emailsPercentage >= 90 && 'text-destructive')}>
                  {usage.emailLimit === null
                    ? t('unlimited')
                    : `${usage.emailsSentThisMonth.toLocaleString()} / ${usage.emailLimit.toLocaleString()}`}
                </span>
              </div>
              {usage.emailLimit !== null && (
                <Progress
                  value={usage.emailsPercentage}
                  className={cn(usage.emailsPercentage >= 90 && '[&>div]:bg-destructive')}
                />
              )}
            </div>

            {/* Contact usage */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('contactUsage')}</span>
                <span className={cn(usage.contactsPercentage >= 90 && 'text-destructive')}>
                  {usage.contactLimit === null
                    ? t('unlimited')
                    : `${usage.contactsCount.toLocaleString()} / ${usage.contactLimit.toLocaleString()}`}
                </span>
              </div>
              {usage.contactLimit !== null && (
                <Progress
                  value={usage.contactsPercentage}
                  className={cn(usage.contactsPercentage >= 90 && '[&>div]:bg-destructive')}
                />
              )}
            </div>

            {/* Reset date */}
            {usage.usageResetAt && (
              <p className="text-xs text-muted-foreground">
                {t('usageResetsOn', {
                  date: new Date(usage.usageResetAt).toLocaleDateString(),
                })}
              </p>
            )}
          </div>
        )}

        {/* Cancellation warning */}
        {subscription?.cancelAtPeriodEnd && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('scheduledCancellation')}</AlertTitle>
            <AlertDescription>
              {t('cancellationMessage', {
                date: subscription.currentPeriodEnd
                  ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                  : '',
              })}
            </AlertDescription>
          </Alert>
        )}

        {/* Payment issue warning */}
        {status === SubStatus.PAST_DUE && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('paymentIssue')}</AlertTitle>
            <AlertDescription>{t('paymentIssueMessage')}</AlertDescription>
          </Alert>
        )}

        {/* Action buttons */}
        {showActions && (
          <div className="flex flex-wrap gap-2">
            {tier !== SubscriptionTier.FREE && (
              <Button
                variant="outline"
                onClick={handleManageBilling}
                disabled={isOpeningPortal}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {t('manageBilling')}
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            )}

            {subscription?.cancelAtPeriodEnd ? (
              <Button variant="default" onClick={handleResumeSubscription}>
                {t('resumeSubscription')}
              </Button>
            ) : tier !== SubscriptionTier.FREE ? (
              <Button variant="ghost" onClick={handleCancelSubscription}>
                {t('cancelSubscription')}
              </Button>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SubscriptionStatus;
