import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { addUserCredits, setUserPro } from '../../credit-chat/route';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// Map price amounts to credit amounts
const CREDIT_AMOUNTS: Record<number, number> = {
  500: 500,    // €5 = 500 credits
  1000: 1100,  // €10 = 1,100 credits
  2500: 3000,  // €25 = 3,000 credits
};

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
      // In development without webhook secret, parse directly
      event = JSON.parse(body) as Stripe.Event;
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userToken = extractUserToken(session);
        if (!userToken) {
          console.error('No user token found in session:', session.id);
          break;
        }

        if (session.mode === 'payment') {
          // One-time credit purchase
          const amount = session.amount_total || 0;
          const credits = CREDIT_AMOUNTS[amount] || 0;
          if (credits > 0) {
            addUserCredits(userToken, credits);
            console.log(`Added ${credits} credits to user ${userToken}`);
          }
        } else if (session.mode === 'subscription') {
          // Pro subscription
          const expiresAt = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
          setUserPro(userToken, expiresAt);
          console.log(`Set Pro status for user ${userToken}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        // Pro subscription cancelled - would need to look up user token from customer
        console.log('Subscription cancelled:', (event.data.object as any).id);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          // Recurring pro payment - extend pro status
          const userToken = invoice.metadata?.user_token || invoice.subscription_details?.metadata?.user_token;
          if (userToken) {
            const expiresAt = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
            setUserPro(userToken as string, expiresAt);
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

function extractUserToken(session: Stripe.Checkout.Session): string | null {
  // Check metadata first
  if (session.metadata?.user_token) return session.metadata.user_token;
  // Check custom fields
  const customFields = (session as any).custom_fields;
  if (Array.isArray(customFields)) {
    const tokenField = customFields.find((f: any) => f.key === 'user_token');
    if (tokenField?.text?.value) return tokenField.text.value;
  }
  return null;
}
