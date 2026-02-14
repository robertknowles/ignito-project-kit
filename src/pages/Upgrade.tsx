import React, { useState } from 'react';
import { Check, Loader2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PlanKey } from '@/config/stripe';

export function Upgrade() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);

  const handleSubscribe = async (plan: PlanKey) => {
    if (!user) {
      navigate('/login');
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const starterFeatures = [
    'Unlimited internal simulations & drafts',
    'Up to 3 client roadmaps per month',
    'Visual multi-property roadmaps',
    'Strategy scenario comparison',
    'Editable assumptions (growth, yield, cashflow…)',
    'Strategy explanations and exports',
    'Email support'
  ];

  const professionalFeatures = [
    'Up to 10 client roadmaps per month',
    'Unlimited client-ready roadmap exports',
    'White-labelling',
    'Equity release modelling',
    'Refinance sequencing',
    'Client milestone tracking (next-purchase visibility)',
    'Greater control over assumptions and strategy inputs',
    'Priority support'
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Subscribe to access PropPath and start creating professional property roadmaps for your clients.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Starter Card */}
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm flex flex-col">
            <h3 className="text-2xl font-serif text-gray-900 mb-2">Starter</h3>
            <p className="text-gray-500 text-sm mb-6">For solo buyers' agents and small teams</p>
            
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-4xl font-serif font-semibold">$699</span>
              <span className="text-gray-400 font-medium">AUD / year</span>
            </div>
            
            <div className="mb-8 flex-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4 block">Includes</span>
              <ul className="space-y-3">
                {starterFeatures.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                    <Check size={18} className="text-green-600 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button 
              onClick={() => handleSubscribe('starter')}
              disabled={loadingPlan !== null}
              className="w-full py-4 rounded-full border border-gray-200 font-medium hover:border-black hover:bg-gray-50 transition-all text-sm uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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

          {/* Professional Card */}
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg relative flex flex-col ring-1 ring-black/5">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white text-xs font-semibold px-3 py-1 rounded-full">
              RECOMMENDED
            </div>
            <h3 className="text-2xl font-serif text-gray-900 mb-2">Professional</h3>
            <p className="text-gray-500 text-sm mb-6">For growing agencies and larger teams</p>
            
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-4xl font-serif font-semibold">$999</span>
              <span className="text-gray-400 font-medium">AUD / year</span>
            </div>

            <div className="mb-8 flex-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4 block">Includes everything in Starter, plus:</span>
              <ul className="space-y-3">
                {professionalFeatures.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                    <Check size={18} className="text-black mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button 
              onClick={() => handleSubscribe('professional')}
              disabled={loadingPlan !== null}
              className="w-full py-4 rounded-full bg-black text-white font-medium hover:bg-gray-800 transition-all shadow-md hover:shadow-lg text-sm uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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

        {/* Sign out option */}
        <div className="text-center">
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
