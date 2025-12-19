/**
 * Stripe Payment Gateway Implementation
 * Implements the PaymentGateway interface for Stripe payments
 */

import Stripe from 'stripe';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';
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
  WebhookResult,
  SubscriptionInfo,
  PaymentInfo,
  PaymentMethodInfo,
  RefundParams,
  RefundResult,
  TIER_CONFIG,
  PAYMENT_WEBHOOK_EVENTS,
} from '../types';
import {
  getStripeClient,
  getStripePriceIds,
  getStripeWebhookSecret,
} from './client';

export class StripeGateway implements PaymentGateway {
  readonly provider = PaymentProvider.STRIPE;
  private stripe: Stripe;

  constructor() {
    this.stripe = getStripeClient();
  }

  // ===========================================
  // CHECKOUT & SUBSCRIPTIONS
  // ===========================================

  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult> {
    const {
      userId,
      userEmail,
      userName,
      tier,
      successUrl,
      cancelUrl,
      couponCode,
      trialDays,
      billingInterval = 'monthly',
      metadata,
    } = params;

    // Get or create Stripe customer
    let customerId = await this.getCustomerId(userId);
    if (!customerId) {
      customerId = await this.createCustomer(userId, userEmail, userName);
    }

    // Get the price ID for the selected tier
    const priceId = this.getPriceIdForTier(tier, billingInterval);
    if (!priceId) {
      throw new Error(`No Stripe price configured for tier: ${tier} (${billingInterval})`);
    }

    // Build session configuration
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        tier,
        billingInterval,
        ...metadata,
      },
      subscription_data: {
        metadata: {
          userId,
          tier,
        },
      },
      allow_promotion_codes: true,
    };

    // Add trial period if specified
    if (trialDays && trialDays > 0) {
      sessionConfig.subscription_data!.trial_period_days = trialDays;
    }

    // Add coupon if provided
    if (couponCode) {
      try {
        const coupon = await this.stripe.coupons.retrieve(couponCode);
        if (coupon.valid) {
          sessionConfig.discounts = [{ coupon: couponCode }];
          // Remove allow_promotion_codes when using specific coupon
          delete sessionConfig.allow_promotion_codes;
        }
      } catch {
        // Coupon doesn't exist in Stripe, ignore
        console.warn(`Coupon ${couponCode} not found in Stripe`);
      }
    }

    const session = await this.stripe.checkout.sessions.create(sessionConfig);

    return {
      sessionId: session.id,
      url: session.url!,
      provider: PaymentProvider.STRIPE,
      expiresAt: new Date(session.expires_at * 1000),
    };
  }

  async createCustomerPortalSession(
    params: CustomerPortalParams
  ): Promise<CustomerPortalResult> {
    const { userId, returnUrl } = params;

    const customerId = await this.getCustomerId(userId);
    if (!customerId) {
      throw new Error('No Stripe customer found for this user');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return {
      url: session.url,
      provider: PaymentProvider.STRIPE,
    };
  }

  async getSubscription(providerSubscriptionId: string): Promise<SubscriptionInfo | null> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(
        providerSubscriptionId,
        { expand: ['customer'] }
      );

      const customer = subscription.customer as Stripe.Customer;
      const userId = customer.metadata?.userId;

      if (!userId) {
        return null;
      }

      return this.mapStripeSubscription(subscription, userId);
    } catch (error) {
      if ((error as Stripe.errors.StripeError).code === 'resource_missing') {
        return null;
      }
      throw error;
    }
  }

  async cancelSubscription(
    providerSubscriptionId: string,
    immediately = false
  ): Promise<void> {
    if (immediately) {
      await this.stripe.subscriptions.cancel(providerSubscriptionId);
    } else {
      await this.stripe.subscriptions.update(providerSubscriptionId, {
        cancel_at_period_end: true,
      });
    }
  }

  async resumeSubscription(providerSubscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.update(providerSubscriptionId, {
      cancel_at_period_end: false,
    });
  }

  async updateSubscription(
    providerSubscriptionId: string,
    newTier: SubscriptionTier
  ): Promise<SubscriptionInfo> {
    const subscription = await this.stripe.subscriptions.retrieve(
      providerSubscriptionId
    );

    // Determine billing interval from current subscription
    const currentPrice = subscription.items.data[0]?.price;
    const billingInterval = currentPrice?.recurring?.interval === 'year' ? 'yearly' : 'monthly';

    // Get new price ID
    const newPriceId = this.getPriceIdForTier(newTier, billingInterval);
    if (!newPriceId) {
      throw new Error(`No Stripe price configured for tier: ${newTier} (${billingInterval})`);
    }

    // Update subscription
    const updatedSubscription = await this.stripe.subscriptions.update(
      providerSubscriptionId,
      {
        items: [
          {
            id: subscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: 'create_prorations',
        metadata: {
          ...subscription.metadata,
          tier: newTier,
        },
      }
    );

    const customer = await this.stripe.customers.retrieve(
      updatedSubscription.customer as string
    ) as Stripe.Customer;
    const userId = customer.metadata?.userId || '';

    return this.mapStripeSubscription(updatedSubscription, userId);
  }

  // ===========================================
  // PAYMENTS
  // ===========================================

  async getPayment(providerPaymentId: string): Promise<PaymentInfo | null> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(
        providerPaymentId,
        { expand: ['customer'] }
      );

      return this.mapStripePaymentIntent(paymentIntent);
    } catch (error) {
      if ((error as Stripe.errors.StripeError).code === 'resource_missing') {
        return null;
      }
      throw error;
    }
  }

  async refundPayment(params: RefundParams): Promise<RefundResult> {
    const { paymentId, amount, reason } = params;

    // Get the payment from our database to find the provider payment ID
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment || !payment.providerPaymentId) {
      throw new Error('Payment not found or no provider payment ID');
    }

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: payment.providerPaymentId,
    };

    if (amount) {
      refundParams.amount = amount;
    }

    if (reason) {
      refundParams.reason = 'requested_by_customer';
      refundParams.metadata = { reason };
    }

    const refund = await this.stripe.refunds.create(refundParams);

    // Update the payment record
    const newRefundedAmount = payment.refundedAmount + (refund.amount || 0);
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
      id: refund.id,
      paymentId,
      amount: refund.amount || 0,
      currency: refund.currency,
      status: refund.status || 'succeeded',
      provider: PaymentProvider.STRIPE,
    };
  }

  // ===========================================
  // PAYMENT METHODS
  // ===========================================

  async listPaymentMethods(providerCustomerId: string): Promise<PaymentMethodInfo[]> {
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: providerCustomerId,
      type: 'card',
    });

    // Get customer to check default payment method
    const customer = await this.stripe.customers.retrieve(
      providerCustomerId
    ) as Stripe.Customer;
    const defaultMethodId = customer.invoice_settings?.default_payment_method;

    return paymentMethods.data.map((pm) =>
      this.mapStripePaymentMethod(pm, defaultMethodId as string | undefined)
    );
  }

  async deletePaymentMethod(providerMethodId: string): Promise<void> {
    await this.stripe.paymentMethods.detach(providerMethodId);
  }

  async setDefaultPaymentMethod(
    providerCustomerId: string,
    providerMethodId: string
  ): Promise<void> {
    await this.stripe.customers.update(providerCustomerId, {
      invoice_settings: {
        default_payment_method: providerMethodId,
      },
    });
  }

  // ===========================================
  // WEBHOOKS
  // ===========================================

  async constructWebhookEvent(
    payload: string | Buffer,
    signature: string
  ): Promise<Stripe.Event> {
    const webhookSecret = getStripeWebhookSecret();
    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  async handleWebhookEvent(event: unknown): Promise<WebhookResult> {
    const stripeEvent = event as Stripe.Event;

    try {
      switch (stripeEvent.type) {
        // Checkout completed
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(
            stripeEvent.data.object as Stripe.Checkout.Session
          );
          break;

        // Subscription events
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(
            stripeEvent.data.object as Stripe.Subscription
          );
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(
            stripeEvent.data.object as Stripe.Subscription
          );
          break;

        // Payment events
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(
            stripeEvent.data.object as Stripe.Invoice
          );
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(
            stripeEvent.data.object as Stripe.Invoice
          );
          break;

        // Customer events
        case 'customer.deleted':
          await this.handleCustomerDeleted(
            stripeEvent.data.object as Stripe.Customer
          );
          break;

        default:
          console.log(`Unhandled Stripe event type: ${stripeEvent.type}`);
      }

      // Log the webhook event
      await prisma.paymentWebhookEvent.create({
        data: {
          provider: PaymentProvider.STRIPE,
          eventType: stripeEvent.type,
          eventId: stripeEvent.id,
          payload: stripeEvent as unknown as Prisma.InputJsonValue,
          processed: true,
          processedAt: new Date(),
        },
      });

      return {
        received: true,
        eventType: stripeEvent.type,
        processed: true,
      };
    } catch (error) {
      console.error('Error processing Stripe webhook:', error);

      // Log the failed webhook event
      await prisma.paymentWebhookEvent.create({
        data: {
          provider: PaymentProvider.STRIPE,
          eventType: stripeEvent.type,
          eventId: stripeEvent.id,
          payload: stripeEvent as unknown as Prisma.InputJsonValue,
          processed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      return {
        received: true,
        eventType: stripeEvent.type,
        processed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ===========================================
  // CUSTOMER MANAGEMENT
  // ===========================================

  async getCustomerId(userId: string): Promise<string | null> {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: { providerCustomerId: true, provider: true },
    });

    if (subscription?.provider === PaymentProvider.STRIPE) {
      return subscription.providerCustomerId;
    }

    return null;
  }

  async createCustomer(
    userId: string,
    email: string,
    name?: string
  ): Promise<string> {
    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata: {
        userId,
      },
    });

    // Update or create subscription record with customer ID
    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        provider: PaymentProvider.STRIPE,
        providerCustomerId: customer.id,
      },
      update: {
        provider: PaymentProvider.STRIPE,
        providerCustomerId: customer.id,
      },
    });

    return customer.id;
  }

  async deleteCustomer(providerCustomerId: string): Promise<void> {
    await this.stripe.customers.del(providerCustomerId);
  }

  // ===========================================
  // PRIVATE HELPER METHODS
  // ===========================================

  private getPriceIdForTier(
    tier: SubscriptionTier,
    interval: 'monthly' | 'yearly'
  ): string | undefined {
    const priceIds = getStripePriceIds();

    switch (tier) {
      case SubscriptionTier.STARTER:
        return interval === 'yearly' ? priceIds.starter.yearly : priceIds.starter.monthly;
      case SubscriptionTier.PRO:
        return interval === 'yearly' ? priceIds.pro.yearly : priceIds.pro.monthly;
      case SubscriptionTier.ENTERPRISE:
        return interval === 'yearly' ? priceIds.enterprise.yearly : priceIds.enterprise.monthly;
      default:
        return undefined;
    }
  }

  private mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    switch (status) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'canceled':
        return SubscriptionStatus.CANCELED;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      case 'paused':
        return SubscriptionStatus.PAUSED;
      case 'unpaid':
        return SubscriptionStatus.UNPAID;
      default:
        return SubscriptionStatus.ACTIVE;
    }
  }

  private mapStripeSubscription(
    subscription: Stripe.Subscription,
    userId: string
  ): SubscriptionInfo {
    const tier = (subscription.metadata?.tier as SubscriptionTier) || SubscriptionTier.FREE;
    // Cast to access properties that may not be in TypeScript definitions
    const sub = subscription as Stripe.Subscription & {
      current_period_start?: number;
      current_period_end?: number;
    };

    return {
      id: subscription.id,
      userId,
      tier,
      status: this.mapStripeStatus(subscription.status),
      provider: PaymentProvider.STRIPE,
      providerSubscriptionId: subscription.id,
      currentPeriodStart: sub.current_period_start
        ? new Date(sub.current_period_start * 1000)
        : new Date(),
      currentPeriodEnd: sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : new Date(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : undefined,
    };
  }

  private mapStripePaymentIntent(paymentIntent: Stripe.PaymentIntent): PaymentInfo {
    const customer = paymentIntent.customer as Stripe.Customer | null;
    const userId = customer?.metadata?.userId || '';

    let status: PaymentStatus;
    switch (paymentIntent.status) {
      case 'succeeded':
        status = PaymentStatus.COMPLETED;
        break;
      case 'processing':
        status = PaymentStatus.PROCESSING;
        break;
      case 'canceled':
        status = PaymentStatus.FAILED;
        break;
      default:
        status = PaymentStatus.PENDING;
    }

    return {
      id: paymentIntent.id,
      userId,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency.toUpperCase(),
      status,
      provider: PaymentProvider.STRIPE,
      providerPaymentId: paymentIntent.id,
      description: paymentIntent.description || undefined,
      receiptUrl: undefined, // Would need to get from charge
      createdAt: new Date(paymentIntent.created * 1000),
    };
  }

  private mapStripePaymentMethod(
    pm: Stripe.PaymentMethod,
    defaultMethodId?: string
  ): PaymentMethodInfo {
    return {
      id: pm.id,
      userId: '', // Will be populated from customer metadata
      provider: PaymentProvider.STRIPE,
      type: PaymentMethodType.CARD,
      isDefault: pm.id === defaultMethodId,
      cardBrand: pm.card?.brand,
      cardLast4: pm.card?.last4,
      cardExpMonth: pm.card?.exp_month,
      cardExpYear: pm.card?.exp_year,
    };
  }

  // ===========================================
  // WEBHOOK HANDLERS
  // ===========================================

  private async handleCheckoutCompleted(
    session: Stripe.Checkout.Session
  ): Promise<void> {
    const userId = session.metadata?.userId;
    const tier = session.metadata?.tier as SubscriptionTier;

    if (!userId || !tier) {
      console.warn('Missing userId or tier in checkout session metadata');
      return;
    }

    // Subscription is handled by customer.subscription.created event
    console.log(`Checkout completed for user ${userId}, tier: ${tier}`);
  }

  private async handleSubscriptionUpdated(
    subscription: Stripe.Subscription
  ): Promise<void> {
    const customer = await this.stripe.customers.retrieve(
      subscription.customer as string
    ) as Stripe.Customer;

    const userId = customer.metadata?.userId;
    if (!userId) {
      console.warn('No userId found in customer metadata');
      return;
    }

    const tier = (subscription.metadata?.tier as SubscriptionTier) || SubscriptionTier.FREE;
    const tierConfig = TIER_CONFIG[tier];
    // Cast to access properties that may not be in TypeScript definitions
    const sub = subscription as Stripe.Subscription & {
      current_period_start?: number;
      current_period_end?: number;
    };

    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        tier,
        status: this.mapStripeStatus(subscription.status),
        provider: PaymentProvider.STRIPE,
        providerSubscriptionId: subscription.id,
        providerCustomerId: customer.id,
        providerPriceId: subscription.items.data[0]?.price.id,
        currentPeriodStart: sub.current_period_start
          ? new Date(sub.current_period_start * 1000)
          : new Date(),
        currentPeriodEnd: sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : new Date(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialStart: subscription.trial_start
          ? new Date(subscription.trial_start * 1000)
          : null,
        trialEnd: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null,
        emailLimit: tierConfig.limits.emailsPerMonth,
        contactLimit: tierConfig.limits.contacts,
      },
      update: {
        tier,
        status: this.mapStripeStatus(subscription.status),
        providerSubscriptionId: subscription.id,
        providerPriceId: subscription.items.data[0]?.price.id,
        currentPeriodStart: sub.current_period_start
          ? new Date(sub.current_period_start * 1000)
          : new Date(),
        currentPeriodEnd: sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : new Date(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : null,
        trialEnd: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null,
        emailLimit: tierConfig.limits.emailsPerMonth,
        contactLimit: tierConfig.limits.contacts,
      },
    });
  }

  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription
  ): Promise<void> {
    const customer = await this.stripe.customers.retrieve(
      subscription.customer as string
    ) as Stripe.Customer;

    const userId = customer.metadata?.userId;
    if (!userId) {
      return;
    }

    // Downgrade to FREE tier
    const freeConfig = TIER_CONFIG[SubscriptionTier.FREE];

    await prisma.subscription.update({
      where: { userId },
      data: {
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
        providerSubscriptionId: null,
        providerPriceId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        emailLimit: freeConfig.limits.emailsPerMonth,
        contactLimit: freeConfig.limits.contacts,
      },
    });
  }

  private async handleInvoicePaymentSucceeded(
    invoice: Stripe.Invoice
  ): Promise<void> {
    // Access subscription through parent in newer API
    const subscriptionId = invoice.parent?.subscription_details?.subscription;
    if (!subscriptionId || !invoice.customer) {
      return;
    }

    const customer = await this.stripe.customers.retrieve(
      invoice.customer as string
    ) as Stripe.Customer;

    const userId = customer.metadata?.userId;
    if (!userId) {
      return;
    }

    // Cast to access properties that may not be in TypeScript definitions
    const inv = invoice as unknown as {
      amount_paid: number;
      currency: string;
      id: string;
      lines: { data: Array<{ description?: string }> };
      hosted_invoice_url?: string;
      number?: string;
    };

    // Create payment record
    await prisma.payment.create({
      data: {
        userId,
        amount: inv.amount_paid,
        currency: inv.currency.toUpperCase(),
        status: PaymentStatus.COMPLETED,
        provider: PaymentProvider.STRIPE,
        providerPaymentId: inv.id,
        paymentMethodType: 'card',
        description: `Subscription payment - ${inv.lines.data[0]?.description || 'Monthly'}`,
        receiptUrl: inv.hosted_invoice_url || undefined,
        receiptNumber: inv.number || undefined,
      },
    });

    // Reset usage counters on successful payment (new billing cycle)
    await prisma.subscription.update({
      where: { userId },
      data: {
        emailsSentThisMonth: 0,
        usageResetAt: new Date(),
      },
    });
  }

  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice
  ): Promise<void> {
    // Access subscription through parent in newer API
    const subscriptionId = invoice.parent?.subscription_details?.subscription;
    if (!subscriptionId || !invoice.customer) {
      return;
    }

    const customer = await this.stripe.customers.retrieve(
      invoice.customer as string
    ) as Stripe.Customer;

    const userId = customer.metadata?.userId;
    if (!userId) {
      return;
    }

    // Cast to access properties that may not be in TypeScript definitions
    const inv = invoice as unknown as {
      amount_due: number;
      currency: string;
      id: string;
    };

    // Create failed payment record
    await prisma.payment.create({
      data: {
        userId,
        amount: inv.amount_due,
        currency: inv.currency.toUpperCase(),
        status: PaymentStatus.FAILED,
        provider: PaymentProvider.STRIPE,
        providerPaymentId: inv.id,
        paymentMethodType: 'card',
        description: `Failed subscription payment`,
      },
    });

    // Update subscription status
    await prisma.subscription.update({
      where: { userId },
      data: {
        status: SubscriptionStatus.PAST_DUE,
      },
    });
  }

  private async handleCustomerDeleted(customer: Stripe.Customer): Promise<void> {
    const userId = customer.metadata?.userId;
    if (!userId) {
      return;
    }

    // Reset subscription to FREE
    const freeConfig = TIER_CONFIG[SubscriptionTier.FREE];

    await prisma.subscription.update({
      where: { userId },
      data: {
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        provider: null,
        providerCustomerId: null,
        providerSubscriptionId: null,
        providerPriceId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        emailLimit: freeConfig.limits.emailsPerMonth,
        contactLimit: freeConfig.limits.contacts,
      },
    });
  }
}

// Export singleton instance getter
let stripeGatewayInstance: StripeGateway | null = null;

export function getStripeGateway(): StripeGateway {
  if (!stripeGatewayInstance) {
    stripeGatewayInstance = new StripeGateway();
  }
  return stripeGatewayInstance;
}

export function clearStripeGateway(): void {
  stripeGatewayInstance = null;
}
