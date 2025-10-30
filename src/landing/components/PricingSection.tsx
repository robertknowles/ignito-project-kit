import React from 'react';
import { Check } from 'lucide-react';
import { Button } from './Button';
import { useNavigate } from 'react-router-dom';

export const PricingSection = () => {
  const navigate = useNavigate();

  const freeTrialFeatures = [
    'Access to all platform features',
    'Up to 3 complete client roadmaps',
    'Branded PDF exports',
    'AI plan explanations',
    'Full property data & logic',
    'No credit card required'
  ];

  const starterFeatures = [
    'Up to 10 client plans per month',
    'All property-type data & assumptions',
    'Editable growth, yield & cash-flow settings',
    'Plan explanations in every PDF',
    'Branded PDF exports',
    'Standard support'
  ];

  const professionalFeatures = [
    'Unlimited client plans',
    'Client milestone tracking (next-purchase alerts)',
    'Editable assumptions (growth, yield, cash-flow)',
    'Advanced property logic (trusts, refinance, equity release)',
    'AI plan explanations in every PDF',
    'Priority chat support'
  ];

  return (
    <section className="w-full bg-[#F5F5F5] py-16 md:py-24">
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
                $79
                <span className="text-base font-normal text-gray-600">
                  {' '}
                  / month
                </span>
              </p>
              <p className="text-gray-600 font-figtree font-normal mb-4 tracking-[0.01em] text-sm">
                or $790 / year
              </p>
              <p className="text-gray-600 font-figtree font-normal leading-relaxed tracking-[0.01em] text-sm">
                Includes:
              </p>
            </div>
            <Button 
              className="w-full py-4 mb-8"
              onClick={() => navigate('/signup')}
            >
              Get started
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
                $179
                <span className="text-base font-normal text-gray-600">
                  {' '}
                  / month
                </span>
              </p>
              <p className="text-gray-600 font-figtree font-normal mb-4 tracking-[0.01em] text-sm">
                or $1,790 / year
              </p>
              <p className="text-gray-600 font-figtree font-normal leading-relaxed tracking-[0.01em] text-sm">
                Includes:
              </p>
            </div>
            <Button 
              className="w-full py-4 mb-8"
              onClick={() => navigate('/signup')}
            >
              Get started
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

