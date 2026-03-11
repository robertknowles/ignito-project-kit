# Stripe Integration Setup Guide

This document explains how to configure the Stripe subscription billing integration.

## Architecture

The integration uses:
- **Supabase Edge Functions** for server-side Stripe operations
- **Supabase Database** for storing subscription status on user profiles
- **Stripe Checkout** for secure payment handling
- **Stripe Webhooks** for real-time subscription updates

## Prerequisites

1. A Stripe account (https://stripe.com)
2. Stripe products and prices already configured:
   - Starter: `prod_TxShljiBpQ8ESf` / `price_1SzXmI5J88riWhKxSPFtRLz1`
   - Professional: `prod_TxSi6EgWYI2T05` / `price_1SzXmt5J88riWhKxJQwvkZdy`

## Setup Steps

### 1. Configure Supabase Edge Function Secrets

Go to your Supabase Dashboard → Project Settings → Edge Functions → Secrets

Add the following secrets:

| Secret Name | Description | Where to Find |
|-------------|-------------|---------------|
| `STRIPE_SECRET_KEY` | Your Stripe secret key | Stripe Dashboard → Developers → API keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | Created in step 2 below |
| `APP_URL` | Your app's public URL | e.g., `https://ignito.app` or `http://localhost:5173` for dev |

### 2. Set Up Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter webhook URL: `https://gaoqzrdzihmrwipwsbwo.supabase.co/functions/v1/stripe-webhook`
4. Select the following events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)
7. Add this as `STRIPE_WEBHOOK_SECRET` in Supabase secrets (step 1)

### 3. Test the Integration

1. Use Stripe test mode (toggle in Stripe Dashboard)
2. Use test card number: `4242 4242 4242 4242`
3. Any future expiry date and any 3-digit CVC

## Database Schema

The following columns were added to the `profiles` table:

| Column | Type | Description |
|--------|------|-------------|
| `subscription_tier` | text | 'free', 'starter', or 'professional' |
| `subscription_status` | text | 'active', 'inactive', 'past_due', 'canceled' |
| `stripe_customer_id` | text | Stripe customer ID |
| `stripe_subscription_id` | text | Stripe subscription ID |
| `client_roadmaps_used` | integer | Roadmaps created this billing period |
| `client_roadmaps_limit` | integer | Max roadmaps per billing period |
| `billing_period_start` | timestamptz | Current billing period start |
| `billing_period_end` | timestamptz | Current billing period end |

## Edge Functions

### create-checkout

Creates a Stripe Checkout Session for subscription purchases.

**Endpoint:** `POST /functions/v1/create-checkout`

**Request body:**
```json
{
  "plan": "starter" | "professional",
  "userId": "uuid"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

### stripe-webhook

Handles Stripe webhook events to update subscription status.

**Endpoint:** `POST /functions/v1/stripe-webhook`

**Events handled:**
- `checkout.session.completed` - Activates subscription
- `invoice.payment_succeeded` - Renews subscription, resets usage
- `invoice.payment_failed` - Marks subscription as past_due
- `customer.subscription.deleted` - Cancels subscription
- `customer.subscription.updated` - Updates subscription status

## Frontend Usage

### Check Subscription Status

```typescript
import { useAuth } from '@/contexts/AuthContext';

const MyComponent = () => {
  const { 
    subscriptionTier,
    subscriptionStatus,
    clientRoadmapsLimit,
    clientRoadmapsUsed 
  } = useAuth();

  if (subscriptionTier === 'free') {
    return <UpgradePrompt />;
  }

  return <PremiumFeature />;
};
```

### Initiate Checkout

```typescript
import { supabase } from '@/integrations/supabase/client';

const handleSubscribe = async (plan: 'starter' | 'professional') => {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { plan, userId: user.id }
  });

  if (data?.url) {
    window.location.href = data.url;
  }
};
```

### Refresh Subscription After Checkout

After successful checkout, the user is redirected to `/dashboard?success=true`. You can handle this to refresh the subscription data:

```typescript
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const { refreshSubscription } = useAuth();

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      // Wait a moment for webhook to process
      setTimeout(() => {
        refreshSubscription();
      }, 2000);
    }
  }, [searchParams]);
};
```

## Pricing

| Plan | Price (AUD/year) | Client Roadmaps |
|------|------------------|-----------------|
| Free | $0 | 3 (trial) |
| Starter | $699 | 3/month |
| Professional | $999 | 10/month |

## Troubleshooting

### Webhook not receiving events
- Verify the webhook URL is correct
- Check Stripe Dashboard → Webhooks → click your endpoint → "Webhook attempts" tab
- Ensure the endpoint is accessible (not behind auth)

### Checkout fails
- Check Supabase Edge Function logs: Dashboard → Edge Functions → create-checkout → Logs
- Verify `STRIPE_SECRET_KEY` is set correctly
- Ensure the price IDs in the config match your Stripe products

### Subscription status not updating
- Check webhook logs in Stripe Dashboard
- Verify `STRIPE_WEBHOOK_SECRET` matches the signing secret
- Check Supabase Edge Function logs for stripe-webhook

## Local Development

For local development with Stripe webhooks:

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Run: `stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook`
3. Copy the webhook signing secret it provides
4. Use that for local testing
