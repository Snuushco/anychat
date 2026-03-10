import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { addCredits, clearPro, hasProcessedStripeEvent, markStripeEventProcessed, setPro } from '@/lib/server/credit-store';

export const runtime = 'nodejs';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

const CREDIT_AMOUNTS: Record<number, number> = {
  500: 500,
  1000: 1100,
  2500: 3000,
};

function getProExpiryFromTimestamp(unixSeconds?: number | null): string {
  if (unixSeconds && Number.isFinite(unixSeconds)) {
    return new Date(unixSeconds * 1000).toISOString();
  }
  return new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    let event: Stripe.Event;
    const stripe = getStripe();

    if (WEBHOOK_SECRET && sig) {
      try {
        event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }

    if (await hasProcessedStripeEvent(event.id)) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userToken = extractUserToken(session);
        if (!userToken) {
          console.error('No user token found in checkout.session.completed:', session.id);
          break;
        }

        if (session.payment_status !== 'paid' && session.mode === 'payment') {
          break;
        }

        if (session.mode === 'payment') {
          const amount = session.amount_total || 0;
          const credits = CREDIT_AMOUNTS[amount] || 0;
          if (credits > 0) {
            await addCredits(userToken, credits, event.id, {
              checkoutSessionId: session.id,
              amount,
              mode: session.mode,
            });
          }
        } else if (session.mode === 'subscription') {
          await setPro(userToken, getProExpiryFromTimestamp(undefined));
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
          lines?: { data?: Array<{ period?: { end?: number } }> };
          parent?: { subscription_details?: { metadata?: Record<string, string> } };
        };

        const userToken =
          invoice.metadata?.user_token ||
          invoice.parent?.subscription_details?.metadata?.user_token ||
          null;

        if (invoice.billing_reason === 'subscription_create' || invoice.subscription) {
          if (userToken) {
            const periodEnd = invoice.lines?.data?.[0]?.period?.end;
            await setPro(userToken, getProExpiryFromTimestamp(periodEnd));
          }
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription & { current_period_end?: number };
        const userToken = subscription.metadata?.user_token || null;
        if (!userToken) break;

        if (event.type === 'customer.subscription.deleted' || subscription.status === 'canceled' || subscription.status === 'unpaid') {
          await clearPro(userToken);
        } else {
          await setPro(userToken, getProExpiryFromTimestamp(subscription.current_period_end));
        }
        break;
      }
    }

    await markStripeEventProcessed(event.id);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

function extractUserToken(session: Stripe.Checkout.Session): string | null {
  if (session.client_reference_id) return session.client_reference_id;
  if (session.metadata?.user_token) return session.metadata.user_token;
  if (session.metadata?.userToken) return session.metadata.userToken;

  const customFields = (session as Stripe.Checkout.Session & { custom_fields?: Array<{ key?: string; text?: { value?: string } }> }).custom_fields;
  if (Array.isArray(customFields)) {
    const tokenField = customFields.find((f) => f.key === 'user_token' || f.key === 'userToken');
    if (tokenField?.text?.value) return tokenField.text.value;
  }

  return null;
}
