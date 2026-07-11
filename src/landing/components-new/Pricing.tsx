import React, { useState } from 'react';
import { Check, ArrowRight, Loader2, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PlanKey } from '@/config/stripe';

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);

  const handleSubscribe = async (_plan: PlanKey) => {
    if (!user) {
      navigate('/signup');
      return;
    }
    alert('Subscriptions are temporarily unavailable while PropPath is in private testing.');
  };

  return (
    <section id="pricing" className="py-24 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-start">
        {/* Left - headline + deal card */}
        <div>
          <h2 className="text-4xl md:text-[44px] font-semibold text-gray-900 leading-[1.15] mb-5">
            The "Compound Interest"<br />Pricing Model
          </h2>
          <p className="text-gray-500 text-[18px] leading-[28px] max-w-md mb-12">
            Most tools charge more as they add features. This one rewards you for joining early. We're building this <em>live</em>.
          </p>

          <div className="border border-gray-200 rounded-2xl p-8">
            <div className="flex items-center gap-2.5 mb-5">
              <TrendingUp size={20} className="text-emerald-600" />
              <span className="font-semibold text-gray-900 text-[17px]">The Deal</span>
            </div>
            <p className="text-gray-700 text-[15px] leading-relaxed mb-4">
              Get in now at <span className="font-semibold text-gray-900">$90/month</span> for 6 months, and you get <span className="font-bold text-gray-900">EVERY future update for free.</span>
            </p>
            <p className="text-gray-400 text-[14px] leading-relaxed italic">
              You are investing in the ground floor of a platform that will eventually sell for $699+/month.
            </p>
          </div>
        </div>

        {/* Right - version timeline */}
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[11px] top-[12px] bottom-4 w-px bg-gray-200 hidden md:block" />

          {/* v1.0 - Current */}
          <div className="relative mb-6">
            <div className="flex items-start gap-6">
              <div className="relative z-10 w-[22px] h-[22px] rounded-full bg-gray-900 border-[3px] border-gray-900 shrink-0 mt-1 hidden md:block" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div />
                  <span className="px-2.5 py-0.5 bg-gray-900 text-white text-[11px] font-semibold uppercase tracking-wider rounded-md">
                    Current
                  </span>
                </div>
                <div className="border border-gray-200 rounded-2xl p-8 bg-white shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">v1.0 (Today)</h3>
                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-5xl font-semibold text-gray-900">$90</span>
                    <span className="text-gray-400 text-sm">/ month</span>
                  </div>
                  <div className="space-y-3 mb-8">
                    {[
                      'Full planning engine',
                      'Unlimited simulations & drafts',
                      'Client-ready roadmap exports',
                      'All future updates included',
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 text-[14px] text-gray-700">
                        <Check size={16} className="text-[#a855f7] shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleSubscribe('starter')}
                    disabled={loadingPlan !== null}
                    className="w-full py-3 bg-gradient-to-r from-[#7c3aed] to-[#a855f7] text-white rounded-xl font-semibold text-[14px] hover:from-[#6d28d9] hover:to-[#9333ea] transition-all flex items-center justify-between px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingPlan === 'starter' ? (
                      <span className="flex items-center gap-2 mx-auto">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      <>
                        <span>Get Access Now</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* v1.1 - Next Month */}
          <div className="relative mb-6">
            <div className="flex items-start gap-6">
              <div className="relative z-10 w-[22px] h-[22px] rounded-full bg-white border-2 border-gray-300 shrink-0 mt-1 hidden md:block" />
              <div className="flex-1">
                <div className="border border-dashed border-gray-200 rounded-2xl p-8 bg-gray-50/50">
                  <h3 className="text-lg font-semibold text-gray-400 mb-1">v1.1 (Next Month)</h3>
                  <p className="text-gray-400 text-[14px] italic mb-4">Price Increases</p>
                  <div className="space-y-3">
                    {[
                      'Scenario comparison tools',
                      'BA toolkit (calculators & analysis)',
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 text-[14px] text-gray-400">
                        <span className="text-gray-300">+</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* v1.2 - Future */}
          <div className="relative">
            <div className="flex items-start gap-6">
              <div className="relative z-10 w-[22px] h-[22px] rounded-full bg-white border-2 border-gray-200 shrink-0 mt-1 hidden md:block" />
              <div className="flex-1">
                <div className="border border-dashed border-gray-100 rounded-2xl p-8">
                  <h3 className="text-lg font-semibold text-gray-300 mb-1">v1.2 (Month After)</h3>
                  <p className="text-gray-300 text-[14px] italic mb-4">Price Increases</p>
                  <div className="space-y-3">
                    {[
                      'Partner & referral management',
                      'Team collaboration dashboard',
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 text-[14px] text-gray-300">
                        <span className="text-gray-200">+</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
