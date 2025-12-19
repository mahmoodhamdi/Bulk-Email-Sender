/**
 * Paymob Payment Gateway Implementation
 * Supports card, wallet, and kiosk payments for the Egyptian market
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
  getAuthToken,
  getPaymobIntegrationIds,
  getPaymobHmacSecret,
  createOrder,
  createPaymentKey,
  refundTransaction,
  getTransaction,
  verifyWebhookSignature,
  isPaymobConfigured,
} from './client';
import { prisma } from '@/lib/db/prisma';

// Paymob subscription products (one-time payments simulating subscriptions)
const PAYMOB_TIER_PRICES: Record<SubscriptionTier, { monthly: number; yearly: number }> = {
  [SubscriptionTier.FREE]: { monthly: 0, yearly: 0 },
  [SubscriptionTier.STARTER]: { monthly: 8000, yearly: 80000 }, // EGP cents (80 EGP)
  [SubscriptionTier.PRO]: { monthly: 24000, yearly: 240000 }, // EGP cents (240 EGP)
  [SubscriptionTier.ENTERPRISE]: { monthly: 80000, yearly: 800000 }, // EGP cents (800 EGP)
};

export class PaymobGateway implements PaymentGateway {
  readonly provider = PaymentProvider.PAYMOB;

  constructor() {
    if (!isPaymobConfigured()) {
      console.warn('Paymob is not fully configured. Some features may not work.');
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

    // Get auth token
    const authToken = await getAuthToken();

    // Get price for tier
    const priceConfig = PAYMOB_TIER_PRICES[tier];
    const amountCents = billingInterval === 'yearly'
      ? priceConfig.yearly
      : priceConfig.monthly;

    if (amountCents === 0) {
      throw new Error('Cannot create checkout for free tier');
    }

    // Get or create customer
    const customerId = await this.getOrCreateCustomer(userId, userEmail, userName);

    // Create order
    const tierConfig = TIER_CONFIG[tier];
    const merchantOrderId = `sub_${userId}_${Date.now()}`;

    const order = await createOrder({
      authToken,
      deliveryNeeded: false,
      amountCents,
      currency: 'EGP',
      merchantOrderId,
      items: [
        {
          name: `${tierConfig.name} Subscription`,
          amountCents,
          description: `${tierConfig.name} plan - ${billingInterval} billing`,
          quantity: 1,
        },
      ],
    });

    // Get integration ID for card payments
    const integrationIds = getPaymobIntegrationIds();
    const integrationId = parseInt(integrationIds.card, 10);

    // Parse name
    const nameParts = (userName || userEmail).split(' ');
    const firstName = nameParts[0] || 'Customer';
    const lastName = nameParts.slice(1).join(' ') || 'Customer';

    // Create payment key
    const paymentKey = await createPaymentKey({
      authToken,
      orderId: order.id,
      amountCents,
      currency: 'EGP',
      integrationId,
      billingData: {
        firstName,
        lastName,
        email: userEmail,
        phone: '+201000000000', // Default phone, should be collected from user
      },
      expiration: 3600, // 1 hour
    });

    // Store order info for webhook processing
    await prisma.paymentWebhookEvent.create({
      data: {
        provider: PaymentProvider.PAYMOB,
        eventId: String(order.id),
        eventType: 'order.created',
        payload: {
          orderId: order.id,
          merchantOrderId,
          userId,
          tier,
          amountCents,
          billingInterval,
          successUrl,
          cancelUrl,
        },
        processed: false,
      },
    });

    // Build iframe URL
    const iframeId = process.env.PAYMOB_IFRAME_ID || '';
    const paymentUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey.token}`;

    return {
      sessionId: String(order.id),
      url: paymentUrl,
      provider: PaymentProvider.PAYMOB,
      expiresAt: new Date(Date.now() + 3600 * 1000),
    };
  }

  async createCustomerPortalSession(
    params: CustomerPortalParams
  ): Promise<CustomerPortalResult> {
    // Paymob doesn't have a customer portal
    // Return a URL to our own billing management page
    const { returnUrl } = params;

    return {
      url: returnUrl || '/billing',
      provider: PaymentProvider.PAYMOB,
    };
  }

  // ===========================================
  // SUBSCRIPTION MANAGEMENT
  // ===========================================

  async getSubscription(subscriptionId: string): Promise<SubscriptionInfo | null> {
    // Paymob uses one-time payments, subscription is tracked in our database
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
      provider: PaymentProvider.PAYMOB,
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
    // For Paymob, updating subscription requires a new payment
    // This is handled differently - user pays for the new tier
    const subscription = await prisma.subscription.findFirst({
      where: { providerSubscriptionId: subscriptionId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Update the subscription tier
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
      provider: PaymentProvider.PAYMOB,
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
      // Cancel immediately - downgrade to free tier
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
      // Cancel at period end
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
      const authToken = await getAuthToken();
      const transaction = await getTransaction(authToken, providerPaymentId);

      // Find user from our database
      const payment = await prisma.payment.findFirst({
        where: { providerPaymentId },
      });

      return {
        id: String(transaction.id),
        userId: payment?.userId || '',
        amount: transaction.amount_cents,
        currency: transaction.currency,
        status: this.mapPaymobTransactionStatus(transaction),
        provider: PaymentProvider.PAYMOB,
        providerPaymentId: String(transaction.id),
        createdAt: new Date(transaction.created_at),
      };
    } catch {
      return null;
    }
  }

  async refundPayment(params: RefundParams): Promise<RefundResult> {
    const { paymentId, amount, reason } = params;

    // Get the payment from our database
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment || !payment.providerPaymentId) {
      throw new Error('Payment not found or no provider payment ID');
    }

    const authToken = await getAuthToken();

    // Determine refund amount
    const refundAmount = amount || payment.amount;

    const refundResult = await refundTransaction({
      authToken,
      transactionId: payment.providerPaymentId,
      amountCents: refundAmount,
    });

    // Update payment record
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
      id: String(refundResult.id),
      paymentId,
      amount: refundAmount,
      currency: refundResult.currency,
      status: refundResult.success ? 'succeeded' : 'failed',
      provider: PaymentProvider.PAYMOB,
    };
  }

  // ===========================================
  // PAYMENT METHODS (Limited for Paymob)
  // ===========================================

  async listPaymentMethods(
    providerCustomerId: string
  ): Promise<PaymentMethodInfo[]> {
    // Paymob doesn't store payment methods
    // Cards are entered fresh each time
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
      provider: PaymentProvider.PAYMOB,
      type: pm.type as PaymentMethodType,
      isDefault: pm.isDefault,
      cardBrand: pm.cardBrand || undefined,
      cardLast4: pm.cardLast4 || undefined,
      cardExpMonth: pm.cardExpMonth || undefined,
      cardExpYear: pm.cardExpYear || undefined,
    }));
  }

  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    // Delete from our database only (Paymob doesn't store cards)
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
    // Paymob doesn't have a customer object
    // We create a reference in our database
    const customerId = `paymob_${userId}_${Date.now()}`;

    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        provider: PaymentProvider.PAYMOB,
        providerCustomerId: customerId,
        emailLimit: TIER_CONFIG[SubscriptionTier.FREE].limits.emailsPerMonth,
        contactLimit: TIER_CONFIG[SubscriptionTier.FREE].limits.contacts,
      },
      update: {
        providerCustomerId: customerId,
        provider: PaymentProvider.PAYMOB,
      },
    });

    return customerId;
  }

  async deleteCustomer(customerId: string): Promise<void> {
    // Just update our database
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
    // Verify HMAC signature
    if (!verifyWebhookSignature(signature, payload)) {
      throw new Error('Invalid webhook signature');
    }

    const transactionObj = payload.obj as Record<string, unknown>;
    const transactionId = transactionObj.id as number;
    const success = transactionObj.success as boolean;
    const orderId = (transactionObj.order as Record<string, unknown>).id as number;

    // Log the webhook event
    await prisma.paymentWebhookEvent.create({
      data: {
        provider: PaymentProvider.PAYMOB,
        eventId: String(transactionId),
        eventType: success ? 'transaction.success' : 'transaction.failed',
        payload: payload as Record<string, unknown>,
        processed: false,
      },
    });

    // Find the original order event to get subscription details
    const orderEvent = await prisma.paymentWebhookEvent.findFirst({
      where: {
        provider: PaymentProvider.PAYMOB,
        eventId: String(orderId),
        eventType: 'order.created',
      },
    });

    if (!orderEvent) {
      console.error('Original order event not found for Paymob webhook');
      return;
    }

    const orderData = orderEvent.payload as Record<string, unknown>;
    const userId = orderData.userId as string;
    const tier = orderData.tier as SubscriptionTier;
    const amountCents = orderData.amountCents as number;

    if (success) {
      // Payment successful - activate subscription
      const tierConfig = TIER_CONFIG[tier];
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          tier,
          status: SubscriptionStatus.ACTIVE,
          provider: PaymentProvider.PAYMOB,
          providerSubscriptionId: String(orderId),
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          emailLimit: tierConfig.limits.emailsPerMonth,
          contactLimit: tierConfig.limits.contacts,
        },
        update: {
          tier,
          status: SubscriptionStatus.ACTIVE,
          providerSubscriptionId: String(orderId),
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          emailLimit: tierConfig.limits.emailsPerMonth,
          contactLimit: tierConfig.limits.contacts,
        },
      });

      // Record the payment
      await prisma.payment.create({
        data: {
          userId,
          amount: amountCents,
          currency: 'EGP',
          status: PaymentStatus.COMPLETED,
          provider: PaymentProvider.PAYMOB,
          providerPaymentId: String(transactionId),
          description: `${tierConfig.name} subscription payment`,
        },
      });

      // Store payment method info if available
      const sourceData = transactionObj.source_data as Record<string, unknown>;
      if (sourceData && sourceData.pan) {
        await prisma.paymentMethod.upsert({
          where: {
            userId_provider_providerMethodId: {
              userId,
              provider: PaymentProvider.PAYMOB,
              providerMethodId: String(transactionId),
            },
          },
          create: {
            userId,
            provider: PaymentProvider.PAYMOB,
            providerMethodId: String(transactionId),
            type: PaymentMethodType.CARD,
            cardLast4: String(sourceData.pan).slice(-4),
            cardBrand: sourceData.sub_type as string,
            isDefault: true,
          },
          update: {
            cardLast4: String(sourceData.pan).slice(-4),
            cardBrand: sourceData.sub_type as string,
          },
        });
      }
    } else {
      // Payment failed - record failed payment
      await prisma.payment.create({
        data: {
          userId,
          amount: amountCents,
          currency: 'EGP',
          status: PaymentStatus.FAILED,
          provider: PaymentProvider.PAYMOB,
          providerPaymentId: String(transactionId),
          failureReason: 'Payment was declined or failed',
        },
      });
    }

    // Mark webhook as processed
    await prisma.paymentWebhookEvent.update({
      where: { id: orderEvent.id },
      data: { processed: true },
    });
  }

  async constructWebhookEvent(
    payload: string,
    signature: string
  ): Promise<Record<string, unknown>> {
    const data = JSON.parse(payload);

    if (!verifyWebhookSignature(signature, data)) {
      throw new Error('Invalid Paymob webhook signature');
    }

    return data;
  }

  // ===========================================
  // WALLET PAYMENTS (Egyptian Mobile Wallets)
  // ===========================================

  async createWalletPayment(params: {
    userId: string;
    userEmail: string;
    tier: SubscriptionTier;
    walletPhone: string;
  }): Promise<{ paymentUrl: string; orderId: string }> {
    const { userId, userEmail, tier, walletPhone } = params;

    const authToken = await getAuthToken();
    const integrationIds = getPaymobIntegrationIds();

    if (!integrationIds.wallet) {
      throw new Error('Wallet payments not configured');
    }

    const priceConfig = PAYMOB_TIER_PRICES[tier];
    const amountCents = priceConfig.monthly;

    if (amountCents === 0) {
      throw new Error('Cannot create payment for free tier');
    }

    // Create order
    const tierConfig = TIER_CONFIG[tier];
    const merchantOrderId = `wallet_${userId}_${Date.now()}`;

    const order = await createOrder({
      authToken,
      deliveryNeeded: false,
      amountCents,
      currency: 'EGP',
      merchantOrderId,
      items: [
        {
          name: `${tierConfig.name} Subscription`,
          amountCents,
          description: `${tierConfig.name} plan - wallet payment`,
          quantity: 1,
        },
      ],
    });

    // Create payment key for wallet
    const paymentKey = await createPaymentKey({
      authToken,
      orderId: order.id,
      amountCents,
      currency: 'EGP',
      integrationId: parseInt(integrationIds.wallet, 10),
      billingData: {
        firstName: 'Customer',
        lastName: 'Customer',
        email: userEmail,
        phone: walletPhone,
      },
    });

    // Store for webhook processing
    await prisma.paymentWebhookEvent.create({
      data: {
        provider: PaymentProvider.PAYMOB,
        eventId: String(order.id),
        eventType: 'order.created',
        payload: {
          orderId: order.id,
          merchantOrderId,
          userId,
          tier,
          amountCents,
          paymentType: 'wallet',
        },
        processed: false,
      },
    });

    // Wallet payment requires redirect to Paymob
    const walletPaymentUrl = `https://accept.paymob.com/api/acceptance/wallet_payment_url/${paymentKey.token}`;

    return {
      paymentUrl: walletPaymentUrl,
      orderId: String(order.id),
    };
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

  private mapPaymobTransactionStatus(
    transaction: { success: boolean; pending: boolean; is_voided: boolean; is_refunded: boolean }
  ): PaymentStatus {
    if (transaction.is_voided) return PaymentStatus.CANCELED;
    if (transaction.is_refunded) return PaymentStatus.REFUNDED;
    if (transaction.pending) return PaymentStatus.PROCESSING;
    if (transaction.success) return PaymentStatus.COMPLETED;
    return PaymentStatus.FAILED;
  }
}

export { isPaymobConfigured } from './client';
