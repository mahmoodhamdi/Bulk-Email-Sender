/**
 * PayTabs Payment Gateway Implementation
 * Supports card, Mada, and Apple Pay for MENA region
 */

import {
  PaymentGateway,
  PaymentProvider,
  SubscriptionTier,
  SubscriptionStatus,
  PaymentStatus,
  PaymentMethodType,
  CheckoutParams,
  CheckoutResult,
  CustomerPortalParams,
  CustomerPortalResult,
  SubscriptionInfo,
  PaymentInfo,
  PaymentMethodInfo,
  RefundParams,
  RefundResult,
  TIER_CONFIG,
} from '../types';
import {
  getPayTabsProfileId,
  createPaymentPage,
  queryTransaction,
  refundTransaction as paytabsRefund,
  deleteToken,
  isTransactionSuccessful,
  isPayTabsConfigured,
} from './client';
import { prisma } from '@/lib/db/prisma';

// PayTabs subscription products (prices in SAR cents for Saudi Arabia)
const PAYTABS_TIER_PRICES: Record<SubscriptionTier, { monthly: number; yearly: number }> = {
  [SubscriptionTier.FREE]: { monthly: 0, yearly: 0 },
  [SubscriptionTier.STARTER]: { monthly: 1900, yearly: 19000 }, // 19 SAR
  [SubscriptionTier.PRO]: { monthly: 5600, yearly: 56000 }, // 56 SAR
  [SubscriptionTier.ENTERPRISE]: { monthly: 18700, yearly: 187000 }, // 187 SAR
};

export class PayTabsGateway implements PaymentGateway {
  readonly provider = PaymentProvider.PAYTABS;

  constructor() {
    if (!isPayTabsConfigured()) {
      console.warn('PayTabs is not fully configured. Some features may not work.');
    }
  }

  // ===========================================
  // CHECKOUT & SUBSCRIPTION
  // ===========================================

  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult> {
    const {
      userId,
      userEmail,
      userName,
      tier,
      successUrl,
      cancelUrl,
      billingInterval = 'monthly',
    } = params;

    // Get price for tier
    const priceConfig = PAYTABS_TIER_PRICES[tier];
    const amount = billingInterval === 'yearly'
      ? priceConfig.yearly / 100 // Convert to whole currency
      : priceConfig.monthly / 100;

    if (amount === 0) {
      throw new Error('Cannot create checkout for free tier');
    }

    // Get or create customer
    const customerId = await this.getOrCreateCustomer(userId, userEmail, userName);

    // Create payment page
    const profileId = getPayTabsProfileId();
    const cartId = `sub_${userId}_${Date.now()}`;
    const tierConfig = TIER_CONFIG[tier];

    const nameParts = (userName || userEmail).split(' ');
    const firstName = nameParts[0] || 'Customer';
    const lastName = nameParts.slice(1).join(' ') || 'Customer';

    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/paytabs`;
    const returnUrl = successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`;

    const paymentPage = await createPaymentPage({
      profileId,
      cartId,
      cartAmount: amount,
      cartCurrency: 'SAR', // Default to SAR
      cartDescription: `${tierConfig.name} subscription - ${billingInterval} billing`,
      customerDetails: {
        name: `${firstName} ${lastName}`,
        email: userEmail,
        phone: '+966500000000', // Default phone
      },
      callbackUrl,
      returnUrl,
      paymentMethods: ['creditcard', 'mada', 'applepay'],
      tokenize: 2, // Enable tokenization for recurring
      showSaveCard: true,
    });

    // Store order info for webhook processing
    await prisma.paymentWebhookEvent.create({
      data: {
        provider: PaymentProvider.PAYTABS,
        eventId: paymentPage.tran_ref,
        eventType: 'order.created',
        payload: {
          tranRef: paymentPage.tran_ref,
          cartId,
          userId,
          tier,
          amount: amount * 100, // Store in cents
          billingInterval,
          successUrl,
          cancelUrl,
        },
        processed: false,
      },
    });

    return {
      sessionId: paymentPage.tran_ref,
      url: paymentPage.redirect_url,
      provider: PaymentProvider.PAYTABS,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    };
  }

  async createCustomerPortalSession(
    params: CustomerPortalParams
  ): Promise<CustomerPortalResult> {
    // PayTabs doesn't have a customer portal
    const { returnUrl } = params;

    return {
      url: returnUrl || '/billing',
      provider: PaymentProvider.PAYTABS,
    };
  }

  // ===========================================
  // SUBSCRIPTION MANAGEMENT
  // ===========================================

  async getSubscription(subscriptionId: string): Promise<SubscriptionInfo | null> {
    const subscription = await prisma.subscription.findFirst({
      where: { providerSubscriptionId: subscriptionId },
    });

    if (!subscription) {
      return null;
    }

    return {
      id: subscription.id,
      userId: subscription.userId,
      tier: subscription.tier as SubscriptionTier,
      status: subscription.status as SubscriptionStatus,
      provider: PaymentProvider.PAYTABS,
      providerSubscriptionId: subscription.providerSubscriptionId || undefined,
      currentPeriodStart: subscription.currentPeriodStart || undefined,
      currentPeriodEnd: subscription.currentPeriodEnd || undefined,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      trialEnd: subscription.trialEnd || undefined,
    };
  }

  async updateSubscription(
    subscriptionId: string,
    newTier: SubscriptionTier
  ): Promise<SubscriptionInfo> {
    const subscription = await prisma.subscription.findFirst({
      where: { providerSubscriptionId: subscriptionId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const tierConfig = TIER_CONFIG[newTier];
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        tier: newTier,
        status: SubscriptionStatus.ACTIVE,
        emailLimit: tierConfig.limits.emailsPerMonth,
        contactLimit: tierConfig.limits.contacts,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      tier: newTier,
      status: SubscriptionStatus.ACTIVE,
      provider: PaymentProvider.PAYTABS,
      providerSubscriptionId: updated.providerSubscriptionId || undefined,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    };
  }

  async cancelSubscription(
    subscriptionId: string,
    immediately?: boolean
  ): Promise<void> {
    const subscription = await prisma.subscription.findFirst({
      where: { providerSubscriptionId: subscriptionId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (immediately) {
      const freeConfig = TIER_CONFIG[SubscriptionTier.FREE];
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.CANCELED,
          canceledAt: new Date(),
          cancelAtPeriodEnd: false,
          providerSubscriptionId: null,
          emailLimit: freeConfig.limits.emailsPerMonth,
          contactLimit: freeConfig.limits.contacts,
        },
      });
    } else {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          cancelAtPeriodEnd: true,
        },
      });
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<void> {
    const subscription = await prisma.subscription.findFirst({
      where: { providerSubscriptionId: subscriptionId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: false,
        status: SubscriptionStatus.ACTIVE,
      },
    });
  }

  // ===========================================
  // PAYMENTS
  // ===========================================

  async getPayment(providerPaymentId: string): Promise<PaymentInfo | null> {
    try {
      const transaction = await queryTransaction(providerPaymentId);

      const payment = await prisma.payment.findFirst({
        where: { providerPaymentId },
      });

      return {
        id: transaction.tran_ref,
        userId: payment?.userId || '',
        amount: parseFloat(transaction.cart_amount) * 100,
        currency: transaction.cart_currency,
        status: this.mapPayTabsStatus(transaction.payment_result.response_status),
        provider: PaymentProvider.PAYTABS,
        providerPaymentId: transaction.tran_ref,
        createdAt: new Date(transaction.payment_result.transaction_time),
      };
    } catch {
      return null;
    }
  }

  async refundPayment(params: RefundParams): Promise<RefundResult> {
    const { paymentId, amount, reason } = params;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment || !payment.providerPaymentId) {
      throw new Error('Payment not found or no provider payment ID');
    }

    const refundAmount = amount || payment.amount;
    const refundAmountDecimal = refundAmount / 100; // Convert cents to whole currency

    const refundResult = await paytabsRefund({
      transRef: payment.providerPaymentId,
      amount: refundAmountDecimal,
      currency: payment.currency,
      cartId: `refund_${payment.id}_${Date.now()}`,
      cartDescription: reason || 'Refund',
    });

    const newRefundedAmount = payment.refundedAmount + refundAmount;
    const newStatus = newRefundedAmount >= payment.amount
      ? PaymentStatus.REFUNDED
      : PaymentStatus.PARTIALLY_REFUNDED;

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        refundedAmount: newRefundedAmount,
        status: newStatus,
        refundReason: reason,
      },
    });

    return {
      id: refundResult.tran_ref,
      paymentId,
      amount: refundAmount,
      currency: refundResult.cart_currency,
      status: refundResult.payment_result.response_status === 'A' ? 'succeeded' : 'failed',
      provider: PaymentProvider.PAYTABS,
    };
  }

  // ===========================================
  // PAYMENT METHODS
  // ===========================================

  async listPaymentMethods(
    providerCustomerId: string
  ): Promise<PaymentMethodInfo[]> {
    const subscription = await prisma.subscription.findFirst({
      where: { providerCustomerId },
      include: { paymentMethods: true },
    });

    if (!subscription) {
      return [];
    }

    return subscription.paymentMethods.map(pm => ({
      id: pm.id,
      userId: pm.userId,
      provider: PaymentProvider.PAYTABS,
      type: pm.type as PaymentMethodType,
      isDefault: pm.isDefault,
      cardBrand: pm.cardBrand || undefined,
      cardLast4: pm.cardLast4 || undefined,
      cardExpMonth: pm.cardExpMonth || undefined,
      cardExpYear: pm.cardExpYear || undefined,
    }));
  }

  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    });

    if (paymentMethod?.providerMethodId) {
      try {
        await deleteToken(paymentMethod.providerMethodId);
      } catch (error) {
        console.warn('Failed to delete PayTabs token:', error);
      }
    }

    await prisma.paymentMethod.delete({
      where: { id: paymentMethodId },
    });
  }

  // ===========================================
  // CUSTOMER MANAGEMENT
  // ===========================================

  async createCustomer(
    userId: string,
    email: string,
    name?: string
  ): Promise<string> {
    const customerId = `paytabs_${userId}_${Date.now()}`;

    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        provider: PaymentProvider.PAYTABS,
        providerCustomerId: customerId,
        emailLimit: TIER_CONFIG[SubscriptionTier.FREE].limits.emailsPerMonth,
        contactLimit: TIER_CONFIG[SubscriptionTier.FREE].limits.contacts,
      },
      update: {
        providerCustomerId: customerId,
        provider: PaymentProvider.PAYTABS,
      },
    });

    return customerId;
  }

  async deleteCustomer(customerId: string): Promise<void> {
    await prisma.subscription.updateMany({
      where: { providerCustomerId: customerId },
      data: {
        providerCustomerId: null,
      },
    });
  }

  // ===========================================
  // WEBHOOK HANDLING
  // ===========================================

  async handleWebhook(
    payload: Record<string, unknown>,
    _signature: string
  ): Promise<void> {
    const tranRef = payload.tran_ref as string;
    const responseStatus = (payload.payment_result as Record<string, unknown>)?.response_status as string;
    const cartId = payload.cart_id as string;

    // Log the webhook event
    await prisma.paymentWebhookEvent.create({
      data: {
        provider: PaymentProvider.PAYTABS,
        eventId: tranRef,
        eventType: responseStatus === 'A' ? 'transaction.success' : 'transaction.failed',
        payload: payload as Record<string, unknown>,
        processed: false,
      },
    });

    // Find the original order event
    const orderEvent = await prisma.paymentWebhookEvent.findFirst({
      where: {
        provider: PaymentProvider.PAYTABS,
        eventType: 'order.created',
        payload: {
          path: ['cartId'],
          equals: cartId,
        },
      },
    });

    if (!orderEvent) {
      console.error('Original order event not found for PayTabs webhook');
      return;
    }

    const orderData = orderEvent.payload as Record<string, unknown>;
    const userId = orderData.userId as string;
    const tier = orderData.tier as SubscriptionTier;
    const amountCents = orderData.amount as number;

    if (responseStatus === 'A') {
      // Payment successful
      const tierConfig = TIER_CONFIG[tier];
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          tier,
          status: SubscriptionStatus.ACTIVE,
          provider: PaymentProvider.PAYTABS,
          providerSubscriptionId: tranRef,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          emailLimit: tierConfig.limits.emailsPerMonth,
          contactLimit: tierConfig.limits.contacts,
        },
        update: {
          tier,
          status: SubscriptionStatus.ACTIVE,
          providerSubscriptionId: tranRef,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          emailLimit: tierConfig.limits.emailsPerMonth,
          contactLimit: tierConfig.limits.contacts,
        },
      });

      await prisma.payment.create({
        data: {
          userId,
          amount: amountCents,
          currency: payload.cart_currency as string || 'SAR',
          status: PaymentStatus.COMPLETED,
          provider: PaymentProvider.PAYTABS,
          providerPaymentId: tranRef,
          description: `${tierConfig.name} subscription payment`,
        },
      });

      // Save payment token if provided
      const token = payload.token as string;
      if (token) {
        const paymentInfo = payload.payment_info as Record<string, unknown>;
        await prisma.paymentMethod.upsert({
          where: {
            userId_provider_providerMethodId: {
              userId,
              provider: PaymentProvider.PAYTABS,
              providerMethodId: token,
            },
          },
          create: {
            userId,
            provider: PaymentProvider.PAYTABS,
            providerMethodId: token,
            type: PaymentMethodType.CARD,
            cardLast4: (paymentInfo?.payment_description as string)?.slice(-4),
            cardBrand: paymentInfo?.card_scheme as string,
            isDefault: true,
          },
          update: {
            cardLast4: (paymentInfo?.payment_description as string)?.slice(-4),
            cardBrand: paymentInfo?.card_scheme as string,
          },
        });
      }
    } else {
      // Payment failed
      await prisma.payment.create({
        data: {
          userId,
          amount: amountCents,
          currency: payload.cart_currency as string || 'SAR',
          status: PaymentStatus.FAILED,
          provider: PaymentProvider.PAYTABS,
          providerPaymentId: tranRef,
          failureReason: (payload.payment_result as Record<string, unknown>)?.response_message as string,
        },
      });
    }

    // Mark original event as processed
    await prisma.paymentWebhookEvent.update({
      where: { id: orderEvent.id },
      data: { processed: true },
    });
  }

  async constructWebhookEvent(
    payload: string,
    _signature: string
  ): Promise<Record<string, unknown>> {
    // PayTabs sends JSON directly, no signature verification on raw payload
    return JSON.parse(payload);
  }

  // ===========================================
  // HELPER METHODS
  // ===========================================

  private async getOrCreateCustomer(
    userId: string,
    email: string,
    name?: string
  ): Promise<string> {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (subscription?.providerCustomerId) {
      return subscription.providerCustomerId;
    }

    return this.createCustomer(userId, email, name);
  }

  private mapPayTabsStatus(status: string): PaymentStatus {
    switch (status) {
      case 'A': return PaymentStatus.COMPLETED;
      case 'H': return PaymentStatus.PROCESSING;
      case 'P': return PaymentStatus.PENDING;
      case 'V': return PaymentStatus.CANCELED;
      case 'E':
      case 'D': return PaymentStatus.FAILED;
      default: return PaymentStatus.PENDING;
    }
  }
}

export { isPayTabsConfigured } from './client';
