import Stripe from "stripe";
import User from "../models/User.js";
import { PLANS, TRIAL_DAYS, planSlugByPriceId } from "../../config/plans.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Gets or creates a Stripe Customer for the user.
 */
async function getOrCreateCustomer(user) {
  if (user.stripeCustomerId) {
    try {
      await stripe.customers.retrieve(user.stripeCustomerId);
      return user.stripeCustomerId;
    } catch {
      // Customer deleted on Stripe, create new one
    }
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: String(user._id) },
  });

  user.stripeCustomerId = customer.id;
  await user.save();
  return customer.id;
}

/**
 * Syncs Stripe subscription state → User document.
 */
async function syncSubscription(subscription) {
  const customerId = subscription.customer;
  const user = await User.findOne({ stripeCustomerId: customerId });
  if (!user) {
    console.warn(`[Stripe] No user found for customer ${customerId}`);
    return;
  }

  const priceId = subscription.items?.data?.[0]?.price?.id;
  const newPlan = planSlugByPriceId(priceId);
  const status = subscription.status; // active, past_due, canceled, incomplete, etc.

  user.stripeSubscriptionId = subscription.id;
  user.stripeSubscriptionStatus = status;

  if (["active", "trialing"].includes(status) && newPlan) {
    user.plan = newPlan;
    user.planExpiresAt = new Date(subscription.current_period_end * 1000);
  }

  // Downgrade to free on cancel/unpaid
  if (["canceled", "unpaid", "incomplete_expired"].includes(status)) {
    user.plan = "free";
    user.planExpiresAt = null;
    user.stripeSubscriptionId = null;
    user.stripeSubscriptionStatus = null;
  }

  await user.save();
  console.log(`[Stripe] User ${user.email} → plan=${user.plan} status=${status}`);
}

// ─── Controller ─────────────────────────────────────────────────

const StripeController = {
  /**
   * POST /api/stripe/checkout
   * Creates a Stripe Checkout Session for the given plan.
   * Returns { url } for redirect.
   */
  async createCheckout(req, res) {
    try {
      const { planSlug } = req.body;
      const plan = PLANS[planSlug];

      if (!plan || !plan.stripePriceId) {
        return res.status(400).json({ error: "Plano inválido ou gratuito" });
      }

      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

      const customerId = await getOrCreateCustomer(user);
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

      const sessionParams = {
        customer: customerId,
        mode: "subscription",
        allow_promotion_codes: true,
        payment_method_types: ["card"],
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        success_url: `${frontendUrl}/plans?session_id={CHECKOUT_SESSION_ID}&status=success`,
        cancel_url: `${frontendUrl}/plans?status=canceled`,
        metadata: {
          userId: String(user._id),
          planSlug,
        },
        subscription_data: {
          trial_period_days: TRIAL_DAYS,
          metadata: {
            userId: String(user._id),
            planSlug,
          },
        },
      };

      // If user already has an active subscription, switch plan instead
      if (user.stripeSubscriptionId && ["active", "trialing"].includes(user.stripeSubscriptionStatus)) {
        try {
          const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          const updated = await stripe.subscriptions.update(user.stripeSubscriptionId, {
            items: [{ id: sub.items.data[0].id, price: plan.stripePriceId }],
            proration_behavior: "create_prorations",
            metadata: { userId: String(user._id), planSlug },
          });
          await syncSubscription(updated);
          return res.json({ updated: true, plan: planSlug });
        } catch (err) {
          console.warn("[Stripe] Could not update subscription, creating new checkout:", err.message);
        }
      }

      const session = await stripe.checkout.sessions.create(sessionParams);
      return res.json({ url: session.url });
    } catch (err) {
      console.error("[Stripe] createCheckout error:", err);
      return res.status(500).json({ error: "Erro ao criar sessão de pagamento" });
    }
  },

  /**
   * POST /api/stripe/portal
   * Creates a Stripe Customer Portal session.
   * User can manage payment methods, view invoices, cancel subscription.
   */
  async createPortal(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: "Nenhuma assinatura ativa" });
      }

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${frontendUrl}/plans`,
      });

      return res.json({ url: session.url });
    } catch (err) {
      console.error("[Stripe] createPortal error:", err);
      return res.status(500).json({ error: "Erro ao abrir portal de cobrança" });
    }
  },

  /**
   * GET /api/stripe/status
   * Returns current subscription status for the logged user.
   */
  async status(req, res) {
    try {
      const user = await User.findById(req.user.id).select(
        "plan planExpiresAt stripeSubscriptionId stripeSubscriptionStatus"
      );

      if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

      const result = {
        plan: user.plan,
        planConfig: PLANS[user.plan],
        isPlanActive: user.isPlanActive,
        subscription: null,
      };

      // Fetch live data from Stripe if subscription exists
      if (user.stripeSubscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          result.subscription = {
            id: sub.id,
            status: sub.status,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
          };
        } catch {
          // Subscription may have been deleted
        }
      }

      return res.json(result);
    } catch (err) {
      return res.status(500).json({ error: "Erro ao buscar status" });
    }
  },

  /**
   * POST /api/stripe/downgrade
   * Cancels subscription at period end and sets user to free after that.
   */
  async downgrade(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user?.stripeSubscriptionId) {
        return res.status(400).json({ error: "Nenhuma assinatura para cancelar" });
      }

      const sub = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      return res.json({
        ok: true,
        message: "Assinatura será cancelada ao fim do período",
        cancelAt: new Date(sub.current_period_end * 1000),
      });
    } catch (err) {
      console.error("[Stripe] downgrade error:", err);
      return res.status(500).json({ error: "Erro ao cancelar assinatura" });
    }
  },
};

// ─── Webhook (exported separately for raw body mounting) ────────

/**
 * Stripe webhook handler.
 * Mounted in index.js BEFORE express.json() with express.raw().
 */
export async function stripeWebhookRoute(req, res) {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      // Checkout completed → first subscription creation
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          await syncSubscription(sub);
        }
        break;
      }

      // Subscription created directly (Dashboard, API, manual trials)
      case "customer.subscription.created": {
        await syncSubscription(event.data.object);
        break;
      }

      // Subscription updated (upgrade, downgrade, renewal)
      case "customer.subscription.updated": {
        await syncSubscription(event.data.object);
        break;
      }

      // Subscription deleted (immediate cancel or end of period)
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object);
        break;
      }

      // Payment failed on renewal
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription);
          await syncSubscription(sub);
        }
        break;
      }

      default:
        // Unhandled event type — ignore silently
        break;
    }
  } catch (err) {
    console.error(`[Stripe Webhook] Error handling ${event.type}:`, err);
    // Return 200 anyway to prevent Stripe retries on our bugs
  }

  return res.json({ received: true });
}

export default StripeController;
