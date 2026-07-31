import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Must stay in sync with PLANS in create-checkout/index.ts.
const PLAN_LIMITS: Record<string, { clientRoadmapsLimit: number; seatLimit: number }> = {
  founding: { clientRoadmapsLimit: 10, seatLimit: 5 },
  starter: { clientRoadmapsLimit: 3, seatLimit: 1 },
  professional: { clientRoadmapsLimit: 10, seatLimit: 5 },
};

const cryptoProvider = Stripe.createSubtleCryptoProvider();

function periodFromSubscription(subscription: Stripe.Subscription) {
  return {
    billing_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    billing_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  };
}

Deno.serve(async (req: Request) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2024-11-20.acacia",
  });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Update a company's billing state, keyed by Stripe customer id.
  // Comped companies (team + beta) are never touched by webhook events.
  const updateCompanyByCustomer = async (customerId: string, fields: Record<string, unknown>) => {
    const { error } = await supabaseAdmin
      .from("companies")
      .update(fields)
      .eq("stripe_customer_id", customerId)
      .neq("subscription_status", "comped");
    if (error) {
      throw new Error(`Company update failed for customer ${customerId}: ${error.message}`);
    }
  };

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", (err as Error).message);
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const companyId = session.metadata?.company_id;
        const plan = session.metadata?.plan ?? "";
        const planLimits = PLAN_LIMITS[plan];

        if (companyId && planLimits && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

          const { error } = await supabaseAdmin
            .from("companies")
            .update({
              subscription_tier: plan,
              subscription_status: "active",
              stripe_subscription_id: subscription.id,
              client_roadmaps_limit: planLimits.clientRoadmapsLimit,
              seat_limit: planLimits.seatLimit,
              ...periodFromSubscription(subscription),
            })
            .eq("id", companyId)
            .neq("subscription_status", "comped");
          if (error) {
            throw new Error(`Activation failed for company ${companyId}: ${error.message}`);
          }
          console.log(`Subscription activated for company ${companyId}: ${plan}`);
        } else {
          console.error("checkout.session.completed missing metadata", session.id);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Only reset the billing period on renewal (not the first payment,
        // which checkout.session.completed already handled).
        if (invoice.billing_reason === "subscription_cycle" && invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          await updateCompanyByCustomer(customerId, {
            subscription_status: "active",
            ...periodFromSubscription(subscription),
          });
          console.log(`Subscription renewed for customer ${customerId}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await updateCompanyByCustomer(invoice.customer as string, {
          subscription_status: "past_due",
        });
        console.log(`Payment failed for customer ${invoice.customer}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await updateCompanyByCustomer(subscription.customer as string, {
          subscription_tier: "free",
          subscription_status: "canceled",
          client_roadmaps_limit: 0,
          stripe_subscription_id: null,
        });
        console.log(`Subscription canceled for customer ${subscription.customer}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const status = subscription.status;
        let subscriptionStatus = "active";
        if (status === "past_due") subscriptionStatus = "past_due";
        else if (status === "canceled" || status === "unpaid") subscriptionStatus = "canceled";
        else if (status === "active" || status === "trialing") subscriptionStatus = "active";

        await updateCompanyByCustomer(subscription.customer as string, {
          subscription_status: subscriptionStatus,
          ...periodFromSubscription(subscription),
        });
        console.log(`Subscription updated for customer ${subscription.customer}: ${status}`);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
