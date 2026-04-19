import React, { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PlanKey } from '@/config/stripe';

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);

  const handleSubscribe = async (plan: PlanKey) => {
    console.log('[Pricing] handleSubscribe called with plan:', plan, 'user:', user?.id);

    if (!user) {
      console.log('[Pricing] No user, storing plan in localStorage and redirecting to signup');
      localStorage.setItem('pending_subscription_plan', plan);
      navigate('/signup');
      return;
    }

    setLoadingPlan(plan);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan, userId: user.id },
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
    <section id="pricing" className="py-32 max-w-[1400px] mx-auto px-6 md:px-8 scroll-mt-24">
      <div className="mb-16 md:mb-20">
        <h2 className="text-3xl font-semibold mb-4">Pricing that makes sense.</h2>
        <p className="text-linear-muted max-w-xl">Choose the plan that fits your agency's size.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-black/[0.05] border border-black/[0.05] rounded-2xl overflow-hidden">
        {/* Starter */}
        <div className="bg-white p-10 md:p-12 flex flex-col">
          <div className="mb-10">
            <h3 className="text-xl font-semibold mb-2">Starter</h3>
            <p className="text-linear-muted text-[15px]">For solo buyers' agents and small teams</p>
          </div>
          <div className="mb-10">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-semibold">$699</span>
              <span className="text-linear-muted text-sm">aud / year</span>
            </div>
          </div>
          <div className="flex-1 space-y-4 mb-12">
            {[
              'Unlimited internal simulations & drafts',
              'Up to 3 client roadmaps per month',
              'Visual multi-property roadmaps',
              'Strategy scenario comparison',
              'Editable assumptions (growth, yield, cashflow)',
              'Strategy explanations and exports',
              'Email support',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 text-[14px]">
                <CheckCircle2 size={16} className="text-linear-muted shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => handleSubscribe('starter')}
            disabled={loadingPlan !== null}
            className="w-full py-2.5 bg-black/5 border border-black/10 rounded-lg font-medium hover:bg-black/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loadingPlan === 'starter' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Get Started'
            )}
          </button>
        </div>

        {/* Professional */}
        <div className="bg-black/[0.02] p-10 md:p-12 flex flex-col relative">
          <div className="absolute top-6 right-10 md:right-12 px-2 py-0.5 bg-black/10 border border-black/20 rounded text-[11px] font-semibold text-black uppercase tracking-wider">
            Popular
          </div>
          <div className="mb-10">
            <h3 className="text-xl font-semibold mb-2">Professional</h3>
            <p className="text-linear-muted text-[15px]">For growing agencies and larger teams</p>
          </div>
          <div className="mb-10">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-semibold">$999</span>
              <span className="text-linear-muted text-sm">aud / year</span>
            </div>
          </div>
          <div className="flex-1 space-y-4 mb-12">
            {[
              'Up to 10 client roadmaps per month',
              'Unlimited client-ready roadmap exports',
              'White-labelling',
              'Equity release modelling',
              'Refinance sequencing',
              'Client milestone tracking',
              'Greater control over assumptions and strategy inputs',
              'Priority support',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 text-[14px]">
                <CheckCircle2 size={16} className="text-black shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => handleSubscribe('professional')}
            disabled={loadingPlan !== null}
            className="w-full py-2.5 bg-black text-white rounded-lg font-medium hover:bg-black/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loadingPlan === 'professional' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Get Started'
            )}
          </button>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
