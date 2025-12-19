'use client';

/**
 * CheckoutButton Component
 * Button to initiate checkout with optional provider selection
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CreditCard, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { SubscriptionTier, PaymentProvider } from '@/lib/payments/types';
import { useBillingStore } from '@/stores/billing-store';

interface CheckoutButtonProps {
  tier: SubscriptionTier;
  billingInterval?: 'monthly' | 'yearly';
  showProviderSelector?: boolean;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

const PROVIDER_LABELS: Record<PaymentProvider, string> = {
  [PaymentProvider.STRIPE]: 'Credit Card (Stripe)',
  [PaymentProvider.PAYMOB]: 'Paymob (Egypt)',
  [PaymentProvider.PAYTABS]: 'PayTabs (MENA)',
  [PaymentProvider.PADDLE]: 'Paddle (Global)',
};

const PROVIDER_ICONS: Record<PaymentProvider, string> = {
  [PaymentProvider.STRIPE]: '/icons/stripe.svg',
  [PaymentProvider.PAYMOB]: '/icons/paymob.svg',
  [PaymentProvider.PAYTABS]: '/icons/paytabs.svg',
  [PaymentProvider.PADDLE]: '/icons/paddle.svg',
};

export function CheckoutButton({
  tier,
  billingInterval = 'monthly',
  showProviderSelector = false,
  variant = 'default',
  size = 'default',
  className,
  children,
}: CheckoutButtonProps) {
  const t = useTranslations('billing');
  const { createCheckout, isCheckingOut, checkoutError, clearError } = useBillingStore();
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | undefined>();

  const handleCheckout = async (provider?: PaymentProvider) => {
    const url = await createCheckout(tier, provider, billingInterval);
    if (url) {
      window.location.href = url;
    } else if (checkoutError) {
      setShowErrorDialog(true);
    }
  };

  const handleCloseErrorDialog = () => {
    setShowErrorDialog(false);
    clearError();
  };

  // Available providers based on configuration
  const availableProviders = [
    PaymentProvider.STRIPE,
    PaymentProvider.PADDLE,
    // PaymentProvider.PAYMOB, // Uncomment when configured
    // PaymentProvider.PAYTABS, // Uncomment when configured
  ];

  if (tier === SubscriptionTier.FREE) {
    return null;
  }

  return (
    <>
      {showProviderSelector && availableProviders.length > 1 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={variant}
              size={size}
              disabled={isCheckingOut}
              className={className}
            >
              {isCheckingOut ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              {children || t('subscribe')}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {availableProviders.map((provider) => (
              <DropdownMenuItem
                key={provider}
                onClick={() => handleCheckout(provider)}
                disabled={isCheckingOut}
              >
                {PROVIDER_LABELS[provider]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          variant={variant}
          size={size}
          disabled={isCheckingOut}
          onClick={() => handleCheckout(selectedProvider)}
          className={className}
        >
          {isCheckingOut ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4 mr-2" />
          )}
          {children || t('subscribe')}
        </Button>
      )}

      {/* Error dialog */}
      <Dialog open={showErrorDialog} onOpenChange={handleCloseErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('checkoutError')}</DialogTitle>
            <DialogDescription>
              {checkoutError || t('checkoutErrorMessage')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={handleCloseErrorDialog}>{t('close')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CheckoutButton;
