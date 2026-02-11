export const STRIPE_CONFIG = {
  products: {
    professional: 'prod_TxSi6EgWYI2T05',
    starter: 'prod_TxShljiBpQ8ESf'
  },
  prices: {
    professional: 'price_1SzXmt5J88riWhKxJQwvkZdy',
    starter: 'price_1SzXmI5J88riWhKxSPFtRLz1'
  },
  features: {
    starter: {
      name: 'Starter',
      price: 699, // $699 AUD
      clientRoadmapsLimit: 3,
      features: [
        'unlimited_simulations',
        'visual_roadmaps',
        'scenario_comparison',
        'editable_assumptions',
        'strategy_exports',
        'email_support'
      ]
    },
    professional: {
      name: 'Professional',
      price: 999, // $999 AUD
      clientRoadmapsLimit: 10,
      features: [
        'unlimited_simulations',
        'visual_roadmaps',
        'scenario_comparison',
        'editable_assumptions',
        'strategy_exports',
        'email_support',
        'white_labeling',
        'equity_release_modelling',
        'refinance_sequencing',
        'milestone_tracking',
        'advanced_assumptions',
        'priority_support'
      ]
    }
  }
} as const;

export type SubscriptionTier = 'starter' | 'professional' | 'free';
export type SubscriptionStatus = 'active' | 'inactive' | 'past_due' | 'canceled';

export type PlanKey = keyof typeof STRIPE_CONFIG.prices;
