import React, { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PlanKey } from '@/config/stripe';

const PricingSection: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);

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
    <section id="pricing" className="py-24 bg-offwhite border-t border-gray-100 scroll-mt-28">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl mb-4">Pricing that matches how you work.</h2>
          <p className="text-gray-500">Choose the plan that fits your agency's size.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Starter Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm flex flex-col hover:shadow-md transition-shadow duration-300"
          >
            <h3 className="text-2xl font-serif text-gray-900 mb-2">Starter</h3>
            <p className="text-gray-500 text-sm mb-6 h-auto min-h-[40px]">For solo buyers' agents and small teams</p>
            
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-4xl font-serif font-semibold">$699</span>
              <span className="text-gray-400 font-medium">AUD / year</span>
            </div>
            
            <div className="mb-8 flex-1">
               <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4 block">Includes</span>
                <ul className="space-y-4">
                  {[
                    "Unlimited internal simulations & drafts",
                    "Up to 3 client roadmaps per month",
                    "Visual multi-property roadmaps",
                    "Strategy scenario comparison",
                    "Editable assumptions (growth, yield, cashflow…)",
                    "Strategy explanations and exports",
                    "Email support"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                      <Check size={18} className="text-green-600 mt-0.5 shrink-0" />
                      <span className="leading-tight">{item}</span>
                    </li>
                  ))}
                </ul>
            </div>

             <div className="mt-auto pt-6 border-t border-gray-100">
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
          </motion.div>

          {/* Professional Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-3xl p-8 border border-gray-200 shadow-lg relative flex flex-col ring-1 ring-black/5 hover:shadow-xl transition-shadow duration-300"
          >
            <h3 className="text-2xl font-serif text-gray-900 mb-2">Professional</h3>
            <p className="text-gray-500 text-sm mb-6 h-auto min-h-[40px]">For growing agencies and larger teams</p>
            
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-4xl font-serif font-semibold">$999</span>
              <span className="text-gray-400 font-medium">AUD / year</span>
            </div>

            <div className="mb-8 flex-1">
               <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4 block">Includes everything in Starter, plus:</span>
                <ul className="space-y-4">
                  {[
                    "Up to 10 client roadmaps per month",
                    "Unlimited client-ready roadmap exports",
                    "White-labelling",
                    "Equity release modelling",
                    "Refinance sequencing",
                    "Client milestone tracking (next-purchase visibility)",
                    "Greater control over assumptions and strategy inputs",
                    "Priority support"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                      <Check size={18} className="text-black mt-0.5 shrink-0" />
                      <span className="leading-tight">{item}</span>
                    </li>
                  ))}
                </ul>
            </div>

            <div className="mt-auto pt-6 border-t border-gray-100">
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
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
