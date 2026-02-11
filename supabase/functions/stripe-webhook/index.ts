import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const STRIPE_CONFIG = {
  features: {
    starter: {
      clientRoadmapsLimit: 3,
    },
    professional: {
      clientRoadmapsLimit: 10,
    }
  }
};

const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req: Request) => {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2024-11-20.acacia',
  });

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    return new Response('Missing signature or webhook secret', { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan as 'starter' | 'professional';

        if (userId && plan) {
          const planConfig = STRIPE_CONFIG.features[plan];
          
          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_tier: plan,
              subscription_status: 'active',
              stripe_subscription_id: session.subscription as string,
              client_roadmaps_limit: planConfig.clientRoadmapsLimit,
              client_roadmaps_used: 0,
              billing_period_start: new Date().toISOString(),
              billing_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            })
            .eq('id', userId);

          console.log(`Subscription activated for user ${userId}: ${plan}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Only reset usage on renewal (not first payment)
        if (invoice.billing_reason === 'subscription_cycle') {
          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_status: 'active',
              client_roadmaps_used: 0,
              billing_period_start: new Date().toISOString(),
              billing_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            })
            .eq('stripe_customer_id', customerId);

          console.log(`Subscription renewed for customer ${customerId}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', customerId);

        console.log(`Payment failed for customer ${customerId}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await supabaseAdmin
          .from('profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'canceled',
            client_roadmaps_limit: 0,
            stripe_subscription_id: null
          })
          .eq('stripe_customer_id', customerId);

        console.log(`Subscription canceled for customer ${customerId}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Handle subscription status changes (e.g., trial ending, cancellation scheduled)
        const status = subscription.status;
        let subscriptionStatus = 'active';
        
        if (status === 'past_due') subscriptionStatus = 'past_due';
        else if (status === 'canceled' || status === 'unpaid') subscriptionStatus = 'canceled';
        else if (status === 'active' || status === 'trialing') subscriptionStatus = 'active';
        
        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: subscriptionStatus })
          .eq('stripe_customer_id', customerId);

        console.log(`Subscription updated for customer ${customerId}: ${status}`);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
