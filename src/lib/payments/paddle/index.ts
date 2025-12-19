/**
 * Paddle Payment Gateway Implementation
 * Global Merchant of Record (MoR) for international sales with tax compliance
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
  WebhookResult,
  TIER_CONFIG,
} from '../types';
import {
  createCustomer,
  getCustomer,
  listCustomers,
  getSubscription as getPaddleSubscription,
  listSubscriptions,
  updateSubscription as updatePaddleSubscription,
  cancelSubscription as cancelPaddleSubscription,
  resumeSubscription as resumePaddleSubscription,
  getTransaction,
  createTransaction,
  createAdjustment,
  isPaddleConfigured,
  getPaddlePriceIds,
  getPaddleClientToken,
  getPaddleEnvironment,
  verifyWebhookSignature,
  parseWebhookSignature,
  PaddleSubscription,
} from './client';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

export class PaddleGateway implements PaymentGateway {
  readonly provider = PaymentProvider.PADDLE;

  constructor() {
    if (!isPaddleConfigured()) {
      console.warn('Paddle is not fully configured. Some features may not work.');
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
      trialDays,
    } = params;

    if (tier === SubscriptionTier.FREE) {
      throw new Error('Cannot create checkout for free tier');
    }

    // Get or create Paddle customer
    const customerId = await this.getOrCreateCustomer(userId, userEmail, userName);

    // Get price ID for tier
    const priceIds = getPaddlePriceIds();
    const tierKey = tier.toLowerCase() as 'starter' | 'pro' | 'enterprise';
    const priceId = billingInterval === 'yearly'
      ? priceIds[tierKey]?.yearly
      : priceIds[tierKey]?.monthly;

    if (!priceId) {
      throw new Error(`No price ID configured for ${tier} ${billingInterval}`);
    }

    // Create transaction for checkout
    const transaction = await createTransaction({
      items: [{ price_id: priceId, quantity: 1 }],
      customer_id: customerId,
      custom_data: {
        user_id: userId,
        tier,
        billing_interval: billingInterval,
      },
    });

    // Store checkout info for webhook processing
    await prisma.paymentWebhookEvent.create({
      data: {
        provider: PaymentProvider.PADDLE,
        eventId: transaction.id,
        eventType: 'transaction.created',
        payload: {
          transactionId: transaction.id,
          userId,
          tier,
          billingInterval,
          trialDays,
          successUrl,
          cancelUrl,
        },
        processed: false,
      },
    });

    // Build checkout URL
    // Paddle uses overlay checkout in frontend, but we can return transaction URL
    const clientToken = getPaddleClientToken();
    const environment = getPaddleEnvironment();
    const checkoutUrl = transaction.checkout?.url ||
      `${successUrl}?paddle_checkout=true&transaction_id=${transaction.id}&client_token=${clientToken}&environment=${environment}`;

    return {
      sessionId: transaction.id,
      url: checkoutUrl,
      provider: PaymentProvider.PADDLE,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };
  }

  async createCustomerPortalSession(
    params: CustomerPortalParams
  ): Promise<CustomerPortalResult> {
    const { userId, returnUrl } = params;

    // Get subscription for management URLs
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (subscription?.providerSubscriptionId) {
      try {
        const paddleSub = await getPaddleSubscription(subscription.providerSubscriptionId);
        if (paddleSub.management_urls?.update_payment_method) {
          return {
            url: paddleSub.management_urls.update_payment_method,
            provider: PaymentProvider.PADDLE,
          };
        }
      } catch (error) {
        console.warn('Failed to get Paddle subscription management URL:', error);
      }
    }

    // Fallback to our billing page
    return {
      url: returnUrl || '/billing',
      provider: PaymentProvider.PADDLE,
    };
  }

  // ===========================================
  // SUBSCRIPTION MANAGEMENT
  // ===========================================

  async getSubscription(subscriptionId: string): Promise<SubscriptionInfo | null> {
    try {
      const paddleSub = await getPaddleSubscription(subscriptionId);
      return this.mapPaddleSubscription(paddleSub);
    } catch {
      // Try to get from database
      const dbSub = await prisma.subscription.findFirst({
        where: { providerSubscriptionId: subscriptionId },
      });

      if (!dbSub) {
        return null;
      }

      return {
        id: dbSub.id,
        userId: dbSub.userId,
        tier: dbSub.tier as SubscriptionTier,
        status: dbSub.status as SubscriptionStatus,
        provider: PaymentProvider.PADDLE,
        providerSubscriptionId: dbSub.providerSubscriptionId || undefined,
        currentPeriodStart: dbSub.currentPeriodStart || undefined,
        currentPeriodEnd: dbSub.currentPeriodEnd || undefined,
        cancelAtPeriodEnd: dbSub.cancelAtPeriodEnd,
        trialEnd: dbSub.trialEnd || undefined,
      };
    }
  }

  async updateSubscription(
    subscriptionId: string,
    newTier: SubscriptionTier
  ): Promise<SubscriptionInfo> {
    const priceIds = getPaddlePriceIds();
    const tierKey = newTier.toLowerCase() as 'starter' | 'pro' | 'enterprise';
    const priceId = priceIds[tierKey]?.monthly;

    if (!priceId) {
      throw new Error(`No price ID configured for ${newTier}`);
    }

    const paddleSub = await updatePaddleSubscription(subscriptionId, {
      items: [{ price_id: priceId }],
      proration_billing_mode: 'prorated_immediately',
    });

    // Update local database
    const tierConfig = TIER_CONFIG[newTier];
    await prisma.subscription.updateMany({
      where: { providerSubscriptionId: subscriptionId },
      data: {
        tier: newTier,
        emailLimit: tierConfig.limits.emailsPerMonth,
        contactLimit: tierConfig.limits.contacts,
      },
    });

    return this.mapPaddleSubscription(paddleSub);
  }

  async cancelSubscription(
    subscriptionId: string,
    immediately?: boolean
  ): Promise<void> {
    await cancelPaddleSubscription(
      subscriptionId,
      immediately ? 'immediately' : 'next_billing_period'
    );

    if (immediately) {
      const freeConfig = TIER_CONFIG[SubscriptionTier.FREE];
      await prisma.subscription.updateMany({
        where: { providerSubscriptionId: subscriptionId },
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
      await prisma.subscription.updateMany({
        where: { providerSubscriptionId: subscriptionId },
        data: {
          cancelAtPeriodEnd: true,
        },
      });
    }
  }

  async resumeSubscription(subscriptionId: string): Promise<void> {
    await resumePaddleSubscription(subscriptionId);

    await prisma.subscription.updateMany({
      where: { providerSubscriptionId: subscriptionId },
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
      const transaction = await getTransaction(providerPaymentId);

      return {
        id: transaction.id,
        userId: transaction.custom_data?.user_id || '',
        amount: parseInt(transaction.details.totals.total, 10),
        currency: transaction.currency_code,
        status: this.mapPaddleTransactionStatus(transaction.status),
        provider: PaymentProvider.PADDLE,
        providerPaymentId: transaction.id,
        createdAt: new Date(transaction.created_at),
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

    // Get transaction to find line items
    const transaction = await getTransaction(payment.providerPaymentId);

    // Create adjustment (refund)
    const adjustment = await createAdjustment({
      action: 'refund',
      transaction_id: payment.providerPaymentId,
      reason: reason || 'Customer requested refund',
      items: transaction.details.line_items.map(item => ({
        item_id: item.id,
        type: amount && amount < payment.amount ? 'partial' : 'full',
        amount: amount ? String(amount) : undefined,
      })),
    });

    const refundAmount = amount || payment.amount;
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
      id: adjustment.id,
      paymentId,
      amount: refundAmount,
      currency: adjustment.currency_code,
      status: adjustment.status === 'approved' ? 'succeeded' : 'pending',
      provider: PaymentProvider.PADDLE,
    };
  }

  // ===========================================
  // PAYMENT METHODS
  // ===========================================

  async listPaymentMethods(
    providerCustomerId: string
  ): Promise<PaymentMethodInfo[]> {
    // Paddle stores payment methods at transaction/subscription level
    // We track them in our database
    const subscription = await prisma.subscription.findFirst({
      where: { providerCustomerId },
    });

    if (!subscription) {
      return [];
    }

    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { userId: subscription.userId, provider: PaymentProvider.PADDLE },
    });

    return paymentMethods.map(pm => ({
      id: pm.id,
      userId: pm.userId,
      provider: PaymentProvider.PADDLE,
      type: pm.type as PaymentMethodType,
      isDefault: pm.isDefault,
      cardBrand: pm.cardBrand || undefined,
      cardLast4: pm.cardLast4 || undefined,
      cardExpMonth: pm.cardExpMonth || undefined,
      cardExpYear: pm.cardExpYear || undefined,
    }));
  }

  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    await prisma.paymentMethod.delete({
      where: { id: paymentMethodId },
    });
  }

  async setDefaultPaymentMethod(
    providerCustomerId: string,
    providerMethodId: string
  ): Promise<void> {
    const subscription = await prisma.subscription.findFirst({
      where: { providerCustomerId },
    });

    if (!subscription) {
      throw new Error('Customer not found');
    }

    await prisma.paymentMethod.updateMany({
      where: { userId: subscription.userId, provider: PaymentProvider.PADDLE },
      data: { isDefault: false },
    });

    await prisma.paymentMethod.updateMany({
      where: { providerMethodId, provider: PaymentProvider.PADDLE },
      data: { isDefault: true },
    });
  }

  // ===========================================
  // CUSTOMER MANAGEMENT
  // ===========================================

  async getCustomerId(userId: string): Promise<string | null> {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    return subscription?.providerCustomerId || null;
  }

  async createCustomer(
    userId: string,
    email: string,
    name?: string
  ): Promise<string> {
    // Check if customer already exists
    const existingCustomers = await listCustomers(email);
    if (existingCustomers.length > 0) {
      const customerId = existingCustomers[0].id;

      // Update local subscription
      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.ACTIVE,
          provider: PaymentProvider.PADDLE,
          providerCustomerId: customerId,
          emailLimit: TIER_CONFIG[SubscriptionTier.FREE].limits.emailsPerMonth,
          contactLimit: TIER_CONFIG[SubscriptionTier.FREE].limits.contacts,
        },
        update: {
          providerCustomerId: customerId,
          provider: PaymentProvider.PADDLE,
        },
      });

      return customerId;
    }

    // Create new customer
    const customer = await createCustomer(email, name, { user_id: userId });

    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        provider: PaymentProvider.PADDLE,
        providerCustomerId: customer.id,
        emailLimit: TIER_CONFIG[SubscriptionTier.FREE].limits.emailsPerMonth,
        contactLimit: TIER_CONFIG[SubscriptionTier.FREE].limits.contacts,
      },
      update: {
        providerCustomerId: customer.id,
        provider: PaymentProvider.PADDLE,
      },
    });

    return customer.id;
  }

  async deleteCustomer(customerId: string): Promise<void> {
    // Paddle doesn't support customer deletion, just unlink locally
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
    signature: string
  ): Promise<void> {
    const eventType = payload.event_type as string;
    const data = payload.data as Record<string, unknown>;

    // Log the webhook event
    await prisma.paymentWebhookEvent.create({
      data: {
        provider: PaymentProvider.PADDLE,
        eventId: payload.event_id as string,
        eventType,
        payload: payload as Prisma.InputJsonValue,
        processed: false,
      },
    });

    switch (eventType) {
      case 'subscription.created':
      case 'subscription.activated':
        await this.handleSubscriptionActivated(data);
        break;
      case 'subscription.updated':
        await this.handleSubscriptionUpdated(data);
        break;
      case 'subscription.canceled':
        await this.handleSubscriptionCanceled(data);
        break;
      case 'subscription.paused':
        await this.handleSubscriptionPaused(data);
        break;
      case 'subscription.resumed':
        await this.handleSubscriptionResumed(data);
        break;
      case 'transaction.completed':
        await this.handleTransactionCompleted(data);
        break;
      case 'transaction.payment_failed':
        await this.handlePaymentFailed(data);
        break;
      default:
        console.log(`Unhandled Paddle webhook event: ${eventType}`);
    }
  }

  async constructWebhookEvent(
    payload: string,
    signature: string
  ): Promise<Record<string, unknown>> {
    const parsed = parseWebhookSignature(signature);
    if (!parsed) {
      throw new Error('Invalid Paddle webhook signature format');
    }

    if (!verifyWebhookSignature(parsed.h1, parsed.ts, payload)) {
      throw new Error('Invalid Paddle webhook signature');
    }

    return JSON.parse(payload);
  }

  async handleWebhookEvent(event: unknown): Promise<WebhookResult> {
    const payload = event as Record<string, unknown>;
    const eventType = payload.event_type as string;

    try {
      await this.handleWebhook(payload, '');

      return {
        received: true,
        eventType,
        processed: true,
        subscriptionId: (payload.data as Record<string, unknown>)?.id as string,
      };
    } catch (error) {
      return {
        received: true,
        eventType,
        processed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ===========================================
  // WEBHOOK HANDLERS
  // ===========================================

  private async handleSubscriptionActivated(data: Record<string, unknown>): Promise<void> {
    const subscriptionId = data.id as string;
    const customerId = data.customer_id as string;
    const customData = data.custom_data as Record<string, string> | null;
    const userId = customData?.user_id;

    if (!userId) {
      console.error('No user_id in Paddle subscription custom_data');
      return;
    }

    // Determine tier from items
    const items = data.items as Array<{ price: { custom_data?: { tier?: string } } }>;
    const tierFromPrice = items?.[0]?.price?.custom_data?.tier;
    const tier = (tierFromPrice as SubscriptionTier) || SubscriptionTier.STARTER;
    const tierConfig = TIER_CONFIG[tier];

    const currentPeriod = data.current_billing_period as { starts_at: string; ends_at: string } | null;

    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        tier,
        status: SubscriptionStatus.ACTIVE,
        provider: PaymentProvider.PADDLE,
        providerCustomerId: customerId,
        providerSubscriptionId: subscriptionId,
        currentPeriodStart: currentPeriod ? new Date(currentPeriod.starts_at) : new Date(),
        currentPeriodEnd: currentPeriod ? new Date(currentPeriod.ends_at) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        emailLimit: tierConfig.limits.emailsPerMonth,
        contactLimit: tierConfig.limits.contacts,
      },
      update: {
        tier,
        status: SubscriptionStatus.ACTIVE,
        providerSubscriptionId: subscriptionId,
        currentPeriodStart: currentPeriod ? new Date(currentPeriod.starts_at) : new Date(),
        currentPeriodEnd: currentPeriod ? new Date(currentPeriod.ends_at) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        emailLimit: tierConfig.limits.emailsPerMonth,
        contactLimit: tierConfig.limits.contacts,
        cancelAtPeriodEnd: false,
      },
    });
  }

  private async handleSubscriptionUpdated(data: Record<string, unknown>): Promise<void> {
    const subscriptionId = data.id as string;
    const scheduledChange = data.scheduled_change as { action: string } | null;

    await prisma.subscription.updateMany({
      where: { providerSubscriptionId: subscriptionId },
      data: {
        cancelAtPeriodEnd: scheduledChange?.action === 'cancel',
      },
    });
  }

  private async handleSubscriptionCanceled(data: Record<string, unknown>): Promise<void> {
    const subscriptionId = data.id as string;
    const freeConfig = TIER_CONFIG[SubscriptionTier.FREE];

    await prisma.subscription.updateMany({
      where: { providerSubscriptionId: subscriptionId },
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
  }

  private async handleSubscriptionPaused(data: Record<string, unknown>): Promise<void> {
    const subscriptionId = data.id as string;

    await prisma.subscription.updateMany({
      where: { providerSubscriptionId: subscriptionId },
      data: {
        status: SubscriptionStatus.PAUSED,
      },
    });
  }

  private async handleSubscriptionResumed(data: Record<string, unknown>): Promise<void> {
    const subscriptionId = data.id as string;

    await prisma.subscription.updateMany({
      where: { providerSubscriptionId: subscriptionId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: false,
      },
    });
  }

  private async handleTransactionCompleted(data: Record<string, unknown>): Promise<void> {
    const transactionId = data.id as string;
    const customData = data.custom_data as Record<string, string> | null;
    const userId = customData?.user_id;
    const details = data.details as { totals: { total: string; currency_code: string } };

    if (!userId) return;

    // Get tier from custom data or from price metadata
    const tier = (customData?.tier as SubscriptionTier) || SubscriptionTier.STARTER;
    const tierConfig = TIER_CONFIG[tier];

    await prisma.payment.create({
      data: {
        userId,
        amount: parseInt(details.totals.total, 10),
        currency: details.totals.currency_code,
        status: PaymentStatus.COMPLETED,
        provider: PaymentProvider.PADDLE,
        providerPaymentId: transactionId,
        description: `${tierConfig.name} subscription payment`,
      },
    });

    // Store payment method if available
    const payments = data.payments as Array<{
      method_details: {
        type: string;
        card?: { last4: string; type: string; expiry_month: number; expiry_year: number };
      };
    }>;

    if (payments?.[0]?.method_details?.card) {
      const card = payments[0].method_details.card;
      await prisma.paymentMethod.upsert({
        where: {
          provider_providerMethodId: {
            provider: PaymentProvider.PADDLE,
            providerMethodId: transactionId,
          },
        },
        create: {
          userId,
          provider: PaymentProvider.PADDLE,
          providerMethodId: transactionId,
          type: PaymentMethodType.CARD,
          cardLast4: card.last4,
          cardBrand: card.type,
          cardExpMonth: card.expiry_month,
          cardExpYear: card.expiry_year,
          isDefault: true,
        },
        update: {
          cardLast4: card.last4,
          cardBrand: card.type,
          cardExpMonth: card.expiry_month,
          cardExpYear: card.expiry_year,
        },
      });
    }
  }

  private async handlePaymentFailed(data: Record<string, unknown>): Promise<void> {
    const transactionId = data.id as string;
    const customData = data.custom_data as Record<string, string> | null;
    const userId = customData?.user_id;
    const details = data.details as { totals: { total: string; currency_code: string } };

    if (!userId) return;

    const payments = data.payments as Array<{ error_code: string | null }>;
    const errorCode = payments?.[0]?.error_code;

    await prisma.payment.create({
      data: {
        userId,
        amount: parseInt(details.totals.total, 10),
        currency: details.totals.currency_code,
        status: PaymentStatus.FAILED,
        provider: PaymentProvider.PADDLE,
        providerPaymentId: transactionId,
        description: errorCode || 'Payment failed',
      },
    });
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

  private mapPaddleSubscription(sub: PaddleSubscription): SubscriptionInfo {
    // Determine tier from price custom_data
    const tierFromPrice = sub.items?.[0]?.price?.custom_data?.tier;
    const tier = (tierFromPrice as SubscriptionTier) || SubscriptionTier.FREE;

    return {
      id: sub.id,
      userId: sub.custom_data?.user_id || '',
      tier,
      status: this.mapPaddleSubscriptionStatus(sub.status),
      provider: PaymentProvider.PADDLE,
      providerSubscriptionId: sub.id,
      currentPeriodStart: sub.current_billing_period
        ? new Date(sub.current_billing_period.starts_at)
        : undefined,
      currentPeriodEnd: sub.current_billing_period
        ? new Date(sub.current_billing_period.ends_at)
        : undefined,
      cancelAtPeriodEnd: sub.scheduled_change?.action === 'cancel',
      trialEnd: sub.items?.[0]?.trial_dates?.ends_at
        ? new Date(sub.items[0].trial_dates.ends_at)
        : undefined,
    };
  }

  private mapPaddleSubscriptionStatus(status: PaddleSubscription['status']): SubscriptionStatus {
    switch (status) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'paused':
        return SubscriptionStatus.PAUSED;
      case 'canceled':
        return SubscriptionStatus.CANCELED;
      default:
        return SubscriptionStatus.ACTIVE;
    }
  }

  private mapPaddleTransactionStatus(status: string): PaymentStatus {
    switch (status) {
      case 'completed':
      case 'paid':
        return PaymentStatus.COMPLETED;
      case 'billed':
      case 'ready':
        return PaymentStatus.PROCESSING;
      case 'canceled':
        return PaymentStatus.FAILED;
      case 'past_due':
        return PaymentStatus.FAILED;
      default:
        return PaymentStatus.PENDING;
    }
  }
}

export { isPaddleConfigured } from './client';
