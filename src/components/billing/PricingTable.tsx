'use client';

/**
 * PricingTable Component
 * Displays subscription tiers with pricing and features
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { SubscriptionTier, TIER_CONFIG } from '@/lib/payments/types';
import { useBillingStore } from '@/stores/billing-store';

interface PricingTableProps {
  currentTier?: SubscriptionTier;
  onSelectTier?: (tier: SubscriptionTier) => void;
  showCurrentBadge?: boolean;
  className?: string;
}

export function PricingTable({
  currentTier = SubscriptionTier.FREE,
  onSelectTier,
  showCurrentBadge = true,
  className,
}: PricingTableProps) {
  const t = useTranslations('billing');
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const { isCheckingOut, createCheckout } = useBillingStore();

  const tiers = [
    SubscriptionTier.FREE,
    SubscriptionTier.STARTER,
    SubscriptionTier.PRO,
    SubscriptionTier.ENTERPRISE,
  ];

  const handleSelectTier = async (tier: SubscriptionTier) => {
    if (tier === SubscriptionTier.FREE || tier === currentTier) {
      return;
    }

    if (onSelectTier) {
      onSelectTier(tier);
    } else {
      const url = await createCheckout(tier, undefined, billingInterval);
      if (url) {
        window.location.href = url;
      }
    }
  };

  const formatPrice = (priceInCents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(priceInCents / 100);
  };

  const getPrice = (tier: SubscriptionTier) => {
    const config = TIER_CONFIG[tier];
    return billingInterval === 'yearly' ? config.yearlyPrice / 12 : config.monthlyPrice;
  };

  const getYearlySavings = (tier: SubscriptionTier) => {
    const config = TIER_CONFIG[tier];
    const monthlyTotal = config.monthlyPrice * 12;
    const yearlyTotal = config.yearlyPrice;
    return monthlyTotal - yearlyTotal;
  };

  return (
    <div className={cn('space-y-8', className)}>
      {/* Billing interval toggle */}
      <div className="flex items-center justify-center gap-4">
        <Label htmlFor="billing-interval" className={cn(billingInterval === 'monthly' && 'font-semibold')}>
          {t('monthly')}
        </Label>
        <Switch
          id="billing-interval"
          checked={billingInterval === 'yearly'}
          onCheckedChange={(checked: boolean) => setBillingInterval(checked ? 'yearly' : 'monthly')}
        />
        <Label htmlFor="billing-interval" className={cn(billingInterval === 'yearly' && 'font-semibold')}>
          {t('yearly')}
          <Badge variant="secondary" className="ml-2">
            {t('save2Months')}
          </Badge>
        </Label>
      </div>

      {/* Pricing cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {tiers.map((tier) => {
          const config = TIER_CONFIG[tier];
          const isCurrentTier = tier === currentTier;
          const isPro = tier === SubscriptionTier.PRO;
          const canUpgrade = tier !== SubscriptionTier.FREE && !isCurrentTier && tier > currentTier;

          return (
            <Card
              key={tier}
              className={cn(
                'relative flex flex-col',
                isPro && 'border-primary shadow-lg',
                isCurrentTier && 'ring-2 ring-primary'
              )}
            >
              {isPro && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  {t('mostPopular')}
                </Badge>
              )}
              {showCurrentBadge && isCurrentTier && (
                <Badge variant="secondary" className="absolute -top-3 right-4">
                  {t('currentPlan')}
                </Badge>
              )}

              <CardHeader>
                <CardTitle>{config.name}</CardTitle>
                <CardDescription>{config.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1">
                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    {tier === SubscriptionTier.FREE ? t('free') : formatPrice(getPrice(tier))}
                  </span>
                  {tier !== SubscriptionTier.FREE && (
                    <span className="text-muted-foreground">/{t('month')}</span>
                  )}
                  {billingInterval === 'yearly' && tier !== SubscriptionTier.FREE && (
                    <p className="text-sm text-green-600 mt-1">
                      {t('saveAmount', { amount: formatPrice(getYearlySavings(tier)) })} {t('perYear')}
                    </p>
                  )}
                </div>

                {/* Limits */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>
                      {config.limits.emailsPerMonth === null
                        ? t('unlimitedEmails')
                        : t('emailsPerMonth', { count: config.limits.emailsPerMonth.toLocaleString() })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>
                      {config.limits.contacts === null
                        ? t('unlimitedContacts')
                        : t('contactsLimit', { count: config.limits.contacts.toLocaleString() })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>
                      {t('smtpConfigs', { count: config.limits.smtpConfigs })}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2">
                  {[
                    { key: 'templates', label: t('features.templates'), available: config.limits.templates !== null && config.limits.templates > 0 },
                    { key: 'abTesting', label: t('features.abTesting'), available: config.limits.abTesting },
                    { key: 'automation', label: t('features.automation'), available: config.limits.automation },
                    { key: 'apiAccess', label: t('features.apiAccess'), available: config.limits.apiAccess },
                    { key: 'webhooks', label: t('features.webhooks'), available: config.limits.webhooks },
                    { key: 'prioritySupport', label: t('features.prioritySupport'), available: config.limits.prioritySupport },
                    { key: 'customIntegrations', label: t('features.customIntegrations'), available: config.limits.customIntegrations },
                  ].map(({ key, label, available }) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      {available ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={cn(!available && 'text-muted-foreground')}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={isPro ? 'default' : 'outline'}
                  disabled={tier === SubscriptionTier.FREE || isCurrentTier || isCheckingOut}
                  onClick={() => handleSelectTier(tier)}
                >
                  {isCurrentTier
                    ? t('currentPlan')
                    : tier === SubscriptionTier.FREE
                      ? t('free')
                      : canUpgrade
                        ? t('upgrade')
                        : t('downgrade')}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default PricingTable;
