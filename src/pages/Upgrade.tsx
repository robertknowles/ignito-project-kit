import React, { useEffect, useState } from 'react';
import { Check, Loader2, LogOut, TrendingUp } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PlanKey, STRIPE_CONFIG, hasFullAccess } from '@/config/stripe';
import { toast } from 'sonner';

const foundingFeatures = [
  'Full planning engine — unlimited internal simulations & drafts',
  'Up to 10 client roadmaps per month',
  'Client-ready roadmap exports & shareable links',
  'White-labelling with your agency branding',
  'Equity release modelling & refinance sequencing',
  'Up to 5 team seats',
  'Every future update included, at this price',
];

export function Upgrade() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, role, subscriptionStatus, signOut, refreshSubscription } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);

  const plan = STRIPE_CONFIG.plans.founding;
  const checkoutSuccess = searchParams.get('checkout') === 'success';
  const fullAccess = hasFullAccess(subscriptionStatus);

  // Back from Stripe: the webhook flips the company to active asynchronously,
  // so poll the subscription until it lands (or give up after ~30s).
  useEffect(() => {
    if (!checkoutSuccess || fullAccess) return;
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      await refreshSubscription();
      if (attempts >= 15) clearInterval(timer);
    }, 2000);
    return () => clearInterval(timer);
  }, [checkoutSuccess, fullAccess]);

  // Payment confirmed — take them into the app.
  useEffect(() => {
    if (checkoutSuccess && fullAccess) {
      navigate('/clients', { replace: true });
    }
  }, [checkoutSuccess, fullAccess, navigate]);

  if (checkoutSuccess && !fullAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <h1 className="text-2xl font-serif font-bold text-gray-900">Confirming your payment...</h1>
        <p className="text-gray-600 max-w-md">
          This usually takes a few seconds. You'll be taken to your dashboard automatically.
        </p>
      </div>
    );
  }

  const handleSubscribe = async (planKey: PlanKey) => {
    if (!user) {
      navigate('/login');
      return;
    }

    setLoadingPlan(planKey);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan: planKey },
      });

      if (error || !data?.url) {
        const message = (data as any)?.error || 'Could not start checkout. Please try again.';
        toast.error(message);
        return;
      }

      window.location.href = data.url;
    } catch {
      toast.error('Could not start checkout. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Already-subscribed (or comped team/beta) accounts shouldn't see a paywall.
  if (hasFullAccess(subscriptionStatus)) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center gap-4">
        <h1 className="text-2xl font-serif font-bold text-gray-900">You already have full access</h1>
        <p className="text-gray-600 max-w-md">
          This account's company has an active PropPath subscription.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-3 rounded-full bg-black text-white font-medium hover:bg-gray-800 transition-all text-sm uppercase tracking-wide"
        >
          Go to dashboard
        </button>
      </div>
    );
  }

  // Agents can't subscribe — their company owner holds the subscription.
  const isAgent = role === 'agent';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4">
            Become a Founding Member
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Get in at the ground floor and keep every future update at today's price.
          </p>
        </div>

        {/* Founding Member card */}
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg relative flex flex-col ring-1 ring-black/5">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white text-xs font-semibold px-3 py-1 rounded-full">
            EARLY-ADOPTER PRICE
          </div>
          <div className="flex items-center gap-2.5 mb-2">
            <TrendingUp size={20} className="text-emerald-600" />
            <h3 className="text-2xl font-serif text-gray-900">{plan.name}</h3>
          </div>
          <p className="text-gray-500 text-sm mb-6">For buyers' agents building their client roadmap practice</p>

          <div className="flex items-baseline gap-1 mb-8">
            <span className="text-4xl font-serif font-semibold">${plan.pricePerMonth}</span>
            <span className="text-gray-400 font-medium">AUD / month</span>
          </div>

          <div className="mb-8 flex-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4 block">Includes</span>
            <ul className="space-y-3">
              {foundingFeatures.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                  <Check size={18} className="text-green-600 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {isAgent ? (
            <p className="text-sm text-gray-500 text-center">
              Your company's subscription is managed by its owner — ask them to subscribe to unlock access for the whole team.
            </p>
          ) : (
            <button
              onClick={() => handleSubscribe('founding')}
              disabled={loadingPlan !== null}
              className="w-full py-4 rounded-full bg-black text-white font-medium hover:bg-gray-800 transition-all shadow-md hover:shadow-lg text-sm uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loadingPlan === 'founding' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Taking you to checkout...
                </>
              ) : (
                'Get Access Now'
              )}
            </button>
          )}
        </div>

        {/* Sign out option */}
        <div className="text-center mt-8">
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm"
          >
            <LogOut size={16} />
            Sign out and use a different account
          </button>
        </div>
      </div>
    </div>
  );
}
