import React, { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { STRIPE_CONFIG, PlanKey } from '@/config/stripe';

export const PricingSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);

  const freeTrialFeatures = [
    'Access to all platform features',
    'Up to 3 complete client roadmaps',
    'Branded PDF exports',
    'AI plan explanations',
    'Full property data & logic',
    'No credit card required'
  ];

  const starterFeatures = [
    'Up to 3 client roadmaps per month',
    'All property-type data & assumptions',
    'Editable growth, yield & cash-flow settings',
    'Plan explanations in every PDF',
    'Branded PDF exports',
    'Standard support'
  ];

  const professionalFeatures = [
    'Up to 10 client roadmaps per month',
    'Client milestone tracking (next-purchase alerts)',
    'Editable assumptions (growth, yield, cash-flow)',
    'Advanced property logic (trusts, refinance, equity release)',
    'AI plan explanations in every PDF',
    'Priority chat support'
  ];

  const handleSubscribe = async (plan: PlanKey) => {
    if (!user) {
      // Store the selected plan and redirect to signup
      localStorage.setItem('pending_subscription_plan', plan);
      navigate('/signup');
      return;
    }

    setLoadingPlan(plan);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          plan,
          userId: user.id
        }
      });

      if (error) {
        console.error('Checkout error:', error);
        alert('Failed to start checkout. Please try again.');
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section id="pricing" className="w-full bg-[#F5F5F5] py-16 md:py-24">
      <div className="px-20">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-normal mb-6 font-hedvig leading-[1.15] tracking-[0.02em]">
            Pricing
          </h2>
          <p className="text-lg text-gray-600 font-figtree font-normal leading-relaxed tracking-[0.01em] max-w-3xl mx-auto">
            Choose the plan that works best for you and/or your team. We are
            always available to help you find the plan that works best or help
            you develop a custom plan for your needs.
          </p>
        </div>
        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Free Trial */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-10">
            <div className="mb-8">
              <h3 className="text-2xl font-medium mb-2 font-figtree tracking-[0.01em]">
                Free Trial
              </h3>
              <p className="text-gray-600 font-figtree font-normal mb-4 tracking-[0.01em]">
                7 Days
              </p>
              <p className="text-gray-600 font-figtree font-normal leading-relaxed tracking-[0.01em] text-sm">
                Includes:
              </p>
            </div>
            <Button 
              className="w-full py-4 mb-8"
              onClick={() => navigate('/signup')}
            >
              Start free trial
            </Button>
            <ul className="space-y-4">
              {freeTrialFeatures.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 font-figtree font-normal tracking-[0.01em]"
                >
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Starter Plan */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-10">
            <div className="mb-8">
              <h3 className="text-2xl font-medium mb-2 font-figtree tracking-[0.01em]">
                Starter
              </h3>
              <p className="text-gray-600 font-figtree font-normal mb-1 tracking-[0.01em] text-sm">
                Start presenting like a pro
              </p>
              <p className="text-3xl font-medium mb-2 font-figtree tracking-[0.01em]">
                ${STRIPE_CONFIG.features.starter.price}
                <span className="text-base font-normal text-gray-600">
                  {' '}
                  AUD / year
                </span>
              </p>
              <p className="text-gray-600 font-figtree font-normal mb-4 tracking-[0.01em] text-sm">
                (${Math.round(STRIPE_CONFIG.features.starter.price / 12)} / month)
              </p>
              <p className="text-gray-600 font-figtree font-normal leading-relaxed tracking-[0.01em] text-sm">
                Includes:
              </p>
            </div>
            <Button 
              className="w-full py-4 mb-8"
              onClick={() => handleSubscribe('starter')}
              disabled={loadingPlan !== null}
            >
              {loadingPlan === 'starter' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Get started'
              )}
            </Button>
            <ul className="space-y-4">
              {starterFeatures.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 font-figtree font-normal tracking-[0.01em]"
                >
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Professional Plan */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-10">
            <div className="mb-8">
              <h3 className="text-2xl font-medium mb-2 font-figtree tracking-[0.01em]">
                Professional
              </h3>
              <p className="text-gray-600 font-figtree font-normal mb-1 tracking-[0.01em] text-sm">
                Run your agency with complete clarity
              </p>
              <p className="text-3xl font-medium mb-2 font-figtree tracking-[0.01em]">
                ${STRIPE_CONFIG.features.professional.price}
                <span className="text-base font-normal text-gray-600">
                  {' '}
                  AUD / year
                </span>
              </p>
              <p className="text-gray-600 font-figtree font-normal mb-4 tracking-[0.01em] text-sm">
                (${Math.round(STRIPE_CONFIG.features.professional.price / 12)} / month)
              </p>
              <p className="text-gray-600 font-figtree font-normal leading-relaxed tracking-[0.01em] text-sm">
                Includes:
              </p>
            </div>
            <Button 
              className="w-full py-4 mb-8"
              onClick={() => handleSubscribe('professional')}
              disabled={loadingPlan !== null}
            >
              {loadingPlan === 'professional' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Get started'
              )}
            </Button>
            <ul className="space-y-4">
              {professionalFeatures.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 font-figtree font-normal tracking-[0.01em]"
                >
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};
