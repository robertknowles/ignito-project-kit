import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const STRIPE_CONFIG = {
  prices: {
    professional: 'price_1SzXmt5J88riWhKxJQwvkZdy',
    starter: 'price_1SzXmI5J88riWhKxSPFtRLz1'
  },
  features: {
    starter: {
      clientRoadmapsLimit: 3,
    },
    professional: {
      clientRoadmapsLimit: 10,
    }
  }
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-11-20.acacia',
    });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { plan, userId } = await req.json();

    if (!plan || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing plan or userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!STRIPE_CONFIG.prices[plan as keyof typeof STRIPE_CONFIG.prices]) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user email from auth.users
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (authError || !authUser?.user?.email) {
      return new Response(
        JSON.stringify({ error: 'Could not retrieve user email' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userEmail = authUser.user.email;

    // Create or retrieve Stripe customer
    let customerId = profile.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          supabase_user_id: userId
        }
      });
      customerId = customer.id;
      
      // Save customer ID to profile
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Get the app URL from environment or default
    const appUrl = Deno.env.get('APP_URL') || 'https://ignito.app';

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{
        price: STRIPE_CONFIG.prices[plan as keyof typeof STRIPE_CONFIG.prices],
        quantity: 1,
      }],
      success_url: `${appUrl}/clients?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/upgrade`,
      metadata: {
        supabase_user_id: userId,
        plan: plan
      },
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
          plan: plan
        }
      }
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
