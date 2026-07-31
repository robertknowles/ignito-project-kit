// Display config for purchasable plans. The authoritative charge amounts live
// in supabase/functions/create-checkout/index.ts (PLANS) — keep the two in
// sync when changing pricing.
export const STRIPE_CONFIG = {
  plans: {
    founding: {
      name: 'Founding Member',
      pricePerMonth: 90, // AUD
      clientRoadmapsLimit: 10,
      seatLimit: 5,
    },
  },
} as const;

export type PlanKey = keyof typeof STRIPE_CONFIG.plans;

// Tiers/statuses stored on companies.subscription_tier / subscription_status.
// 'starter' and 'professional' are legacy tiers kept for old rows; 'comped'
// marks team + beta companies the Stripe webhook is forbidden to touch.
export type SubscriptionTier = 'free' | 'founding' | 'starter' | 'professional';
export type SubscriptionStatus = 'active' | 'inactive' | 'past_due' | 'canceled' | 'comped';

// past_due keeps access during Stripe's retry window rather than locking a
// paying customer out over a failed card retry.
export const hasFullAccess = (status: SubscriptionStatus | null | undefined): boolean =>
  status === 'active' || status === 'comped' || status === 'past_due';
