import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Purchasable plans. Amounts are the single source of truth for what Stripe
// charges; the display copy in src/config/stripe.ts must be kept in sync.
// Prices are created inline (price_data) so changing an amount here needs no
// Stripe dashboard work.
const PLANS: Record<string, {
  name: string;
  amountCents: number; // AUD, per month
  clientRoadmapsLimit: number;
  seatLimit: number;
}> = {
  founding: {
    name: "PropPath Founding Member",
    amountCents: 9000, // $90/mo — the landing-page early-adopter deal
    clientRoadmapsLimit: 10,
    seatLimit: 5,
  },
};

const ALLOWED_ORIGINS = [
  "https://www.proppath.app",
  "https://proppath.app",
  "http://localhost:8080",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ---- Authenticate the caller from their JWT (never trust body ids) ----
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return json({ error: "Not authenticated" }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    if (userError || !userData?.user) {
      return json({ error: "Not authenticated" }, 401);
    }
    const user = userData.user;

    const { plan } = await req.json();
    const planConfig = PLANS[plan];
    if (!planConfig) {
      return json({ error: "Invalid plan" }, 400);
    }

    // ---- Resolve the caller's company; only owners can subscribe ----------
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, company_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return json({ error: "Profile not found" }, 404);
    }
    if (profile.role !== "owner") {
      return json({ error: "Only the company owner can manage the subscription" }, 403);
    }
    if (!profile.company_id) {
      return json({ error: "No company found for this account" }, 400);
    }

    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id, stripe_customer_id, subscription_status")
      .eq("id", profile.company_id)
      .single();

    if (companyError || !company) {
      return json({ error: "Company not found" }, 404);
    }
    if (company.subscription_status === "comped" || company.subscription_status === "active") {
      return json({ error: "This company already has full access" }, 400);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-11-20.acacia",
    });

    // ---- Create or reuse the company's Stripe customer --------------------
    let customerId = company.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          company_id: company.id,
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      const { error: saveError } = await supabaseAdmin
        .from("companies")
        .update({ stripe_customer_id: customerId })
        .eq("id", company.id);
      if (saveError) {
        return json({ error: "Failed to store billing details" }, 500);
      }
    }

    // ---- Checkout session --------------------------------------------------
    const origin = req.headers.get("origin") ?? "";
    const appUrl = ALLOWED_ORIGINS.includes(origin)
      ? origin
      : (Deno.env.get("APP_URL") || "https://www.proppath.app");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{
        price_data: {
          currency: "aud",
          unit_amount: planConfig.amountCents,
          recurring: { interval: "month" },
          product_data: { name: planConfig.name },
        },
        quantity: 1,
      }],
      // /upgrade is not subscription-gated, so the user can sit there while
      // the webhook flips their company to active (the page polls for it).
      success_url: `${appUrl}/upgrade?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/upgrade`,
      metadata: {
        company_id: company.id,
        supabase_user_id: user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          company_id: company.id,
          supabase_user_id: user.id,
          plan,
        },
      },
    });

    return json({ url: session.url }, 200);
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
